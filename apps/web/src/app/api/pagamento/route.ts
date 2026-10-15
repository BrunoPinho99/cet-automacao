import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { asaasClient, getAsaasConfig } from '@/lib/asaas';
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
    const { apiKey } = getAsaasConfig();
    const hasRealAsaasKey = !!apiKey && apiKey !== 'OBTER_NO_PAINEL_ASAAS';
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
    const {
      ficha_id,
      empresa,
      cnpj,
      whatsapp,
      nome,
      email,
      metodo = 'pix',
      cartao,
    } = body;

    // Valor Oficial Único: R$ 19,90 COMPLETO (Taxa única)
    const valorCobrar = 19.90;
    const produtoNome = 'diagnostico_completo';

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
          primeira_intencao: `Contratação de Diagnóstico Completo SST (R$ 19,90)`,
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

    // Chave de idempotência única por lead + valor + timestamp
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${targetLeadId}-${valorCobrar}-${produtoNome}-${metodo}-${Date.now().toString().slice(0, 8)}`)
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
    let pagamentoAprovadoNaHora = false;

    const { apiKey } = getAsaasConfig();
    const hasRealAsaasKey = !!apiKey && apiKey !== 'OBTER_NO_PAINEL_ASAAS';

    if (hasRealAsaasKey) {
      try {
        // 1. Criar ou Obter Customer no Asaas (Deduplicando se já existir)
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

        asaasCustomerId = await asaasClient.getOrCreateCustomer(customerPayload);

        // 2. Data de vencimento
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2);
        const dueDateString = dueDate.toISOString().split('T')[0];

        // 3. SE FOR CARTÃO DE CRÉDITO (CHECKOUT TRANSPARENTE)
        if (metodo === 'cartao') {
          if (!cartao || !cartao.numero || !cartao.nomeTitular || !cartao.validade || !cartao.cvv) {
            return NextResponse.json(
              { erro: 'Por favor, preencha todos os dados do cartão de crédito (número, titular, validade e CVV).' },
              { status: 400 }
            );
          }

          const validadeLimpa = cartao.validade.replace(/\s/g, '');
          const partesValidade = validadeLimpa.split('/');
          const mesValidade = (partesValidade[0] || '12').padStart(2, '0');
          let anoValidade = partesValidade[1] || '2026';
          if (anoValidade.length === 2) {
            anoValidade = `20${anoValidade}`;
          }

          const asaasPayment = await asaasClient.createPayment({
            customer: asaasCustomerId,
            billingType: 'CREDIT_CARD',
            value: valorCobrar,
            dueDate: dueDateString,
            description: 'Diagnóstico Completo SST - CET Segurança e Medicina do Trabalho',
            externalReference: idempotencyKey,
            creditCard: {
              holderName: cartao.nomeTitular.trim(),
              number: cartao.numero.replace(/\D/g, ''),
              expiryMonth: mesValidade,
              expiryYear: anoValidade,
              ccv: cartao.cvv.replace(/\D/g, ''),
            },
            creditCardHolderInfo: {
              name: cartao.nomeTitular.trim(),
              email: email || 'financeiro@empresa.com.br',
              cpfCnpj: (cartao.cpfTitular || docCnpj || '00000000000').replace(/\D/g, ''),
              phone: telE164,
              mobilePhone: telE164,
              postalCode: (cartao.cep || '01310100').replace(/\D/g, ''),
              addressNumber: cartao.numeroEndereco || '1',
            },
          });

          asaasPaymentId = asaasPayment.id;
          checkoutUrl = asaasPayment.invoiceUrl || checkoutUrl;
          pagamentoAprovadoNaHora = asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED';
        } else {
          // 4. SE FOR PIX
          const paymentPayload = {
            customer: asaasCustomerId,
            billingType: 'PIX' as const,
            value: valorCobrar,
            dueDate: dueDateString,
            description: 'Diagnóstico Completo SST - CET Segurança e Medicina do Trabalho',
            externalReference: idempotencyKey,
          };

          const asaasPayment = await asaasClient.createPayment(paymentPayload);
          asaasPaymentId = asaasPayment.id;
          checkoutUrl = asaasPayment.invoiceUrl || checkoutUrl;

          // Obter QR Code Oficial do Asaas
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
        }
      } catch (asaasErr: any) {
        console.error('[Asaas API] Falha na integração externa:', asaasErr?.message);
        if (metodo === 'cartao') {
          return NextResponse.json(
            { erro: asaasErr?.message || 'Falha ao processar o pagamento com cartão no Asaas. Verifique os dados e tente novamente.' },
            { status: 400 }
          );
        }
      }
    }

    // Se não tiver imagem base64 do Asaas no PIX, gera QR Code visual via gerador público seguro
    if (!pixQrCodeImage) {
      pixQrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixPayload)}`;
    }

    // Salvar Pedido no Banco de Dados
    const pedidoCriado = await prisma.pedido.create({
      data: {
        lead_id: targetLeadId,
        produto: produtoNome,
        valor_centavos: Math.round(valorCobrar * 100),
        status: pagamentoAprovadoNaHora ? 'pago' : 'pendente',
        pago_em: pagamentoAprovadoNaHora ? new Date() : null,
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPaymentId,
        checkout_url: checkoutUrl,
        idempotency_key: idempotencyKey,
      },
    });

    if (pagamentoAprovadoNaHora) {
      await prisma.domainEvent.create({
        data: {
          tipo: DomainEvents.PAGAMENTO_CONFIRMADO,
          payload: {
            pedido_id: pedidoCriado.id,
            lead_id: pedidoCriado.lead_id,
            valor_centavos: pedidoCriado.valor_centavos,
            payment_id: asaasPaymentId,
          },
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      sucesso: true,
      pago: pagamentoAprovadoNaHora,
      status: pagamentoAprovadoNaHora ? 'pago' : 'pendente',
      pedido_id: pedidoCriado.id,
      token_ficha: targetFichaToken,
      checkout_url: pedidoCriado.checkout_url,
      asaas_payment_id: asaasPaymentId,
      pix_copia_cola: pixPayload,
      pix_qr_code: pixQrCodeImage,
      valor: valorCobrar,
      plano: produtoNome,
    });
  } catch (error: any) {
    console.error('[Pagamento Error]:', error);
    return NextResponse.json({ erro: error.message || 'Erro interno ao processar pagamento' }, { status: 500 });
  }
}
