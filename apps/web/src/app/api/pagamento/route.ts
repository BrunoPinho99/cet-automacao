import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { asaasClient } from '@/lib/asaas';
import crypto from 'node:crypto';

// Formata telefone para E.164 (+55DDD9XXXXXXXX)
function normalizarTelefoneE164(tel: string): string {
  const digitos = tel.replace(/\D/g, '');
  if (digitos.startsWith('55') && digitos.length >= 12) {
    return `+${digitos}`;
  }
  if (digitos.length >= 10) {
    return `+55${digitos}`;
  }
  return `+55${digitos.padEnd(11, '0')}`;
}

// Gera payload EMV PIX padrão BACEN (BR Code) com CRC16 válido aceito por todos os bancos
function gerarPixPayloadEstatico(chavePix: string, nomeRecebedor: string, cidade: string, valor: number, txid: string = 'CET'): string {
  const formatField = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

  const payloadFormat = formatField('00', '01');
  const merchantAccountInfo = formatField('26', [
    formatField('00', 'br.gov.bcb.pix'),
    formatField('01', chavePix),
  ].join(''));
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  const transactionAmount = formatField('54', valor.toFixed(2));
  const countryCode = formatField('58', 'BR');
  const merchantName = formatField('59', nomeRecebedor.slice(0, 25).toUpperCase());
  const merchantCity = formatField('60', cidade.slice(0, 15).toUpperCase());
  const additionalDataField = formatField('62', formatField('05', txid.slice(0, 25)));

  const rawPayloadWithoutCrc = [
    payloadFormat,
    merchantAccountInfo,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    additionalDataField,
    '6304',
  ].join('');

  // Cálculo CRC16-CCITT (0x1021) padrão Banco Central
  let crc = 0xffff;
  for (let i = 0; i < rawPayloadWithoutCrc.length; i++) {
    crc ^= rawPayloadWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return `${rawPayloadWithoutCrc}${crcHex}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedido_id');
    const token = searchParams.get('token');
    const simularPagamento = searchParams.get('simular_pagamento') === 'true';

    if (!pedidoId && !token) {
      return NextResponse.json({ erro: 'pedido_id ou token obrigatório' }, { status: 400 });
    }

    let pedido = null;

    if (pedidoId) {
      pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          lead: {
            include: {
              fichas: {
                orderBy: { criado_em: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    } else if (token) {
      const ficha = await prisma.ficha.findUnique({
        where: { token_retomada: token },
        include: {
          lead: {
            include: {
              pedidos: {
                orderBy: { criado_em: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
      pedido = ficha?.lead?.pedidos?.[0] || null;
    }

    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 });
    }

    // Se solicitado para simular pagamento em teste/desenvolvimento
    if (simularPagamento && pedido.status !== 'pago') {
      const [pedidoAtualizado] = await prisma.$transaction([
        prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            status: 'pago',
            pago_em: new Date(),
          },
        }),
        prisma.domainEvent.create({
          data: {
            tipo: DomainEvents.PAGAMENTO_CONFIRMADO,
            payload: {
              pedido_id: pedido.id,
              lead_id: pedido.lead_id,
              valor_centavos: pedido.valor_centavos,
              payment_id: pedido.asaas_payment_id || 'simulado',
            },
          },
        }),
      ]);

      const tokenFicha = (pedido as any)?.lead?.fichas?.[0]?.token_retomada || '';
      return NextResponse.json({
        status: 'pago',
        pago: true,
        pedido_id: pedidoAtualizado.id,
        pago_em: pedidoAtualizado.pago_em,
        token_ficha: tokenFicha,
        mensagem: 'Pagamento aprovado com sucesso via simulação',
      });
    }

    // Se o pedido está pendente e possui ID no Asaas, checar na API do Asaas em tempo real
    const asaasKey = process.env.ASAAS_API_KEY || '';
    const hasRealAsaasKey = asaasKey && asaasKey !== 'OBTER_NO_PAINEL_ASAAS';
    if (hasRealAsaasKey && pedido.status !== 'pago' && pedido.asaas_payment_id && !pedido.asaas_payment_id.startsWith('simulado')) {
      try {
        const asaasPay = await asaasClient.getPayment(pedido.asaas_payment_id);
        if (asaasPay.status === 'RECEIVED' || asaasPay.status === 'CONFIRMED') {
          await prisma.$transaction([
            prisma.pedido.update({
              where: { id: pedido.id },
              data: {
                status: 'pago',
                pago_em: new Date(),
              },
            }),
            prisma.domainEvent.create({
              data: {
                tipo: DomainEvents.PAGAMENTO_CONFIRMADO,
                payload: {
                  pedido_id: pedido.id,
                  lead_id: pedido.lead_id,
                  valor_centavos: pedido.valor_centavos,
                  payment_id: pedido.asaas_payment_id,
                },
              },
            }),
          ]);
          pedido.status = 'pago';
        }
      } catch (checkErr) {
        console.warn('[Asaas Check Payment]:', checkErr);
      }
    }

    const tokenFicha = (pedido as any)?.lead?.fichas?.[0]?.token_retomada || '';

    return NextResponse.json({
      status: pedido.status,
      pago: pedido.status === 'pago',
      pedido_id: pedido.id,
      pago_em: pedido.pago_em,
      token_ficha: tokenFicha,
      checkout_url: pedido.checkout_url,
    });
  } catch (err: any) {
    console.error('[GET /api/pagamento] Erro:', err);
    return NextResponse.json({ erro: 'Erro ao consultar status do pagamento' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ficha_id, plano = 'essencial', empresa, cnpj, whatsapp, nome, email } = body;

    // Valores oficiais das Rotas B e C:
    // Essencial: R$ 19,90 | Completo: R$ 29,90
    const isCompleto = plano === 'completo';
    const valorCobrar = isCompleto ? 29.90 : 19.90;
    const produtoNome = isCompleto ? 'diagnostico_completo' : 'diagnostico_essencial';

    let targetLeadId: string = '';
    let targetFichaToken: string = '';
    let nomeCliente = nome || 'Responsável';
    let docCnpj = (cnpj || '').replace(/\D/g, '');
    let razaoSocial = empresa || 'Empresa Cliente';
    let telE164 = normalizarTelefoneE164(whatsapp || '11999999999');

    // =========================================================================
    // CENÁRIO 1: Requisição originada da Landing Page (cria lead + ficha + pedido)
    // =========================================================================
    if (!ficha_id) {
      if (!whatsapp || whatsapp.replace(/\D/g, '').length < 9) {
        return NextResponse.json(
          { erro: 'Informe um WhatsApp válido para receber o diagnóstico' },
          { status: 400 }
        );
      }

      // 1. Criar ou Obter Empresa no banco
      let empresaDb = null;
      if (docCnpj && docCnpj.length === 14) {
        empresaDb = await prisma.empresa.upsert({
          where: { cnpj: docCnpj },
          update: {
            razao_social: razaoSocial,
          },
          create: {
            cnpj: docCnpj,
            razao_social: razaoSocial,
            cidade: 'São Paulo',
            uf: 'SP',
            grau_risco: 2,
          },
        });
      }

      // 2. Criar ou Obter Contato no banco
      const contatoDb = await prisma.contato.upsert({
        where: { telefone_e164: telE164 },
        update: {
          nome: nomeCliente,
          email: email || undefined,
          empresa_id: empresaDb?.id || undefined,
        },
        create: {
          nome: nomeCliente,
          telefone_e164: telE164,
          email: email || undefined,
          empresa_id: empresaDb?.id || undefined,
        },
      });

      // 3. Criar Lead
      const protocolo = `CET-${Date.now().toString().slice(-6)}`;
      const leadDb = await prisma.lead.create({
        data: {
          canal: 'landing_page',
          protocolo,
          contato_id: contatoDb.id,
          empresa_id: empresaDb?.id || undefined,
          primeira_intencao: `Contratação de Diagnóstico SST (${isCompleto ? 'Completo R$ 29,90' : 'Essencial R$ 19,90'})`,
        },
      });
      targetLeadId = leadDb.id;

      // 4. Criar Ficha Inteligente com respostas preliminares
      const fichaDb = await prisma.ficha.create({
        data: {
          lead_id: leadDb.id,
          status: 'iniciada',
          bloco_atual: 1,
          respostas: {
            bloco_1: {
              cnpj: docCnpj.length === 14 ? docCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '',
              razao_social: razaoSocial,
              nome_fantasia: razaoSocial,
              cidade: empresaDb?.cidade || 'São Paulo',
              uf: empresaDb?.uf || 'SP',
              atividade_real: 'Comércio e Serviços Gerais',
            },
          },
        },
      });
      targetFichaToken = fichaDb.token_retomada;
    } else {
      // =========================================================================
      // CENÁRIO 2: Requisição com ficha_id existente
      // =========================================================================
      const ficha = await prisma.ficha.findUnique({
        where: { id: ficha_id },
        include: {
          lead: {
            include: {
              empresa: true,
              contato: true,
            },
          },
        },
      });

      if (!ficha || !ficha.lead) {
        return NextResponse.json({ erro: 'Ficha ou Lead não encontrado' }, { status: 404 });
      }

      targetLeadId = ficha.lead_id;
      targetFichaToken = ficha.token_retomada;
      nomeCliente = ficha.lead.contato?.nome || nomeCliente;
      razaoSocial = ficha.lead.empresa?.razao_social || razaoSocial;
      docCnpj = ficha.lead.empresa?.cnpj || docCnpj;
      telE164 = ficha.lead.contato?.telefone_e164 || telE164;
    }

    // Chave de idempotência única por lead + produto + valor
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${targetLeadId}-${valorCobrar}-${produtoNome}-${Date.now().toString().slice(0, 8)}`)
      .digest('hex');

    let asaasCustomerId = 'simulado_cust_' + targetLeadId;
    let asaasPaymentId = 'simulado_pay_' + Date.now();
    let checkoutUrl = `https://cet-automacao.vercel.app/portal/${targetFichaToken}?pagamento_pendente=true`;
    let pixPayload = gerarPixPayloadEstatico(
      'financeiro@cetseguranca.com.br',
      'CET CLINICA ESPECIALIZADA',
      'SAO PAULO',
      valorCobrar,
      `CET${targetLeadId.slice(-6)}`
    );
    let pixQrCodeImage = '';

    const asaasKey = process.env.ASAAS_API_KEY || '';
    const hasRealAsaasKey = asaasKey && asaasKey !== 'OBTER_NO_PAINEL_ASAAS';

    if (hasRealAsaasKey) {
      try {
        // 1. Criar ou Obter Customer no Asaas
        const isValidCpfCnpj = (docCnpj.length === 11 || docCnpj.length === 14) && !/^(\d)\1+$/.test(docCnpj);
        const customerPayload: any = {
          name: (razaoSocial || nomeCliente).slice(0, 70),
          mobilePhone: telE164,
          externalReference: targetLeadId,
        };
        if (isValidCpfCnpj) {
          customerPayload.cpfCnpj = docCnpj;
        }
        if (email && email.includes('@')) {
          customerPayload.email = email;
        }

        asaasCustomerId = await asaasClient.createCustomer(customerPayload);

        // 2. Criar Cobrança no Asaas (PIX)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2);
        const dueDateString = dueDate.toISOString().split('T')[0];

        const paymentPayload = {
          customer: asaasCustomerId,
          billingType: 'PIX' as const,
          value: valorCobrar,
          dueDate: dueDateString,
          description: `Diagnóstico CET - ${isCompleto ? 'Completo (R$ 29,90)' : 'Essencial (R$ 19,90)'}`,
          externalReference: idempotencyKey,
        };

        const asaasPayment = await asaasClient.createPayment(paymentPayload);
        asaasPaymentId = asaasPayment.id;
        checkoutUrl = asaasPayment.invoiceUrl || checkoutUrl;

        // 3. Obter QR Code Oficial do Asaas
        try {
          const pixInfo = await asaasClient.getPixQrCode(asaasPaymentId);
          if (pixInfo?.payload) {
            pixPayload = pixInfo.payload;
          }
          if (pixInfo?.encodedImage) {
            pixQrCodeImage = `data:image/png;base64,${pixInfo.encodedImage}`;
          }
        } catch (pixErr) {
          console.warn('[Asaas QR Code] Erro ao buscar QR Code:', pixErr);
        }
      } catch (asaasErr: any) {
        console.error('[Asaas API] Falha na integração externa:', asaasErr?.message);
      }
    }

    // Se não tiver imagem base64 do Asaas, gera QR Code visual via gerador público seguro
    if (!pixQrCodeImage) {
      pixQrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixPayload)}`;
    }

    // 3. Salvar Pedido no Banco de Dados com status pendente
    const pedidoCriado = await prisma.pedido.create({
      data: {
        lead_id: targetLeadId,
        produto: produtoNome,
        valor_centavos: Math.round(valorCobrar * 100),
        status: 'pendente',
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPaymentId,
        checkout_url: checkoutUrl,
        idempotency_key: idempotencyKey,
      },
    });

    return NextResponse.json({
      sucesso: true,
      pedido_id: pedidoCriado.id,
      token_ficha: targetFichaToken,
      checkout_url: pedidoCriado.checkout_url,
      asaas_payment_id: asaasPaymentId,
      pix_copia_cola: pixPayload,
      pix_qr_code: pixQrCodeImage,
      valor: valorCobrar,
      plano: produtoNome,
      status: 'pendente',
    });
  } catch (error: any) {
    console.error('[Pagamento Error]:', error);
    return NextResponse.json({ erro: error.message || 'Erro interno ao processar pagamento' }, { status: 500 });
  }
}
