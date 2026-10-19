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

// Validador matemático de CPF oficial da Receita Federal (módulo 11)
function validarCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(clean.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(clean.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(clean.charAt(10));
}

// Validador matemático de CNPJ oficial da Receita Federal (módulo 11)
function validarCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false;
  let tamanho = clean.length - 2;
  let numeros = clean.substring(0, tamanho);
  const digitos = clean.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = clean.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
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

    // Se solicitado para simular pagamento em teste/desenvolvimento (estritamente bloqueado em produção)
    if (simularPagamento && process.env.NODE_ENV !== 'production' && pedido.status !== 'pago') {
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
      cidade,
      uf,
      cnae_descricao,
      score,
      respostas_questionario,
      whatsapp,
      nome,
      email,
      metodo = 'pix',
      cartao,
      documento,
      cpf,
    } = body;

    // Valor Oficial Único: R$ 19,90 COMPLETO (Taxa única)
    const valorCobrar = 19.90;
    const produtoNome = 'diagnostico_completo';

    let targetLeadId: string = '';
    let targetFichaToken: string = '';
    let nomeCliente = nome || 'Responsável';
    const docInformado = (documento || cpf || cnpj || '').replace(/\D/g, '');
    let docCnpj = docInformado.length === 14 ? docInformado : (cnpj || '').replace(/\D/g, '');
    let docCpf = docInformado.length === 11 ? docInformado : (cartao?.cpfTitular || '').replace(/\D/g, '');
    let razaoSocial = empresa || 'Empresa Cliente';
    let telE164 = normalizarTelefoneE164(whatsapp || '11999999999');

    // Validação estrita do documento do pagador (obrigatório para registro no BACEN/Asaas)
    const docParaValidar = docInformado || (metodo === 'cartao' ? docCpf : docCnpj);
    if (!docParaValidar) {
      return NextResponse.json(
        { erro: 'Para gerar o pagamento oficial registrado no Banco Central e Asaas, informe o CPF ou CNPJ do pagador.' },
        { status: 400 }
      );
    }

    if (docParaValidar.length === 11) {
      if (!validarCpf(docParaValidar)) {
        return NextResponse.json(
          { erro: 'O CPF informado é inválido. Por favor, confira os números digitados.' },
          { status: 400 }
        );
      }
    } else if (docParaValidar.length === 14) {
      if (!validarCnpj(docParaValidar)) {
        return NextResponse.json(
          { erro: 'O CNPJ informado é inválido. Por favor, confira os números digitados.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { erro: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido do pagador.' },
        { status: 400 }
      );
    }

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

      // 1. Criar ou Obter Empresa no banco (Garantindo que a empresa nunca seja nula)
      let empresaDb = null;
      if (docCnpj && docCnpj.length === 14) {
        empresaDb = await prisma.empresa.upsert({
          where: { cnpj: docCnpj },
          update: {
            razao_social: razaoSocial,
            cidade: cidade || undefined,
            uf: uf || undefined,
            cnae_informado: cnae_descricao ? cnae_descricao.slice(0, 10) : undefined,
            atividade_real: cnae_descricao || undefined,
          },
          create: {
            cnpj: docCnpj,
            razao_social: razaoSocial,
            cidade: cidade || 'São Paulo',
            uf: uf || 'SP',
            cnae_informado: cnae_descricao ? cnae_descricao.slice(0, 10) : undefined,
            atividade_real: cnae_descricao || 'Comércio e Serviços Gerais',
            grau_risco: 2,
          },
        });
      } else {
        // Busca por razão social ou cria empresa genérica vinculada
        const existente = await prisma.empresa.findFirst({
          where: { razao_social: razaoSocial },
        });
        if (existente) {
          empresaDb = existente;
        } else {
          const cnpjUnico = `99${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 90 + 10)}`;
          empresaDb = await prisma.empresa.create({
            data: {
              cnpj: (docCnpj && docCnpj.length === 14) ? docCnpj : cnpjUnico,
              razao_social: razaoSocial,
              cidade: cidade || 'São Paulo',
              uf: uf || 'SP',
              cnae_informado: cnae_descricao ? cnae_descricao.slice(0, 10) : undefined,
              atividade_real: cnae_descricao || 'Comércio e Serviços Gerais',
              grau_risco: 2,
            },
          }).catch(async () => {
            const fallbackEmpresa = await prisma.empresa.findFirst();
            return fallbackEmpresa!;
          });
        }
      }

      // 2. Criar ou Obter Contato no banco
      const contatoDb = await prisma.contato.upsert({
        where: { telefone_e164: telE164 },
        update: {
          nome: nomeCliente,
          email: email || undefined,
          empresa_id: empresaDb.id,
        },
        create: {
          nome: nomeCliente,
          telefone_e164: telE164,
          email: email || undefined,
          empresa_id: empresaDb.id,
        },
      });

      // 3. Criar Lead
      const protocolo = `CET-${Date.now().toString().slice(-6)}`;
      const leadDb = await prisma.lead.create({
        data: {
          canal: 'landing_page',
          protocolo,
          contato_id: contatoDb.id,
          empresa_id: empresaDb.id,
          primeira_intencao: `Contratação de Diagnóstico Completo SST (R$ 19,90)`,
        },
      });
      targetLeadId = leadDb.id;

      // 4. Criar Ficha Inteligente com respostas preliminares e status concluída
      const fichaDb = await prisma.ficha.create({
        data: {
          lead_id: leadDb.id,
          status: 'concluida',
          bloco_atual: 2,
          respostas: {
            bloco_1: {
              cnpj: docCnpj.length === 14 ? docCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : docCnpj,
              razao_social: razaoSocial,
              nome_fantasia: razaoSocial,
              cidade: empresaDb.cidade || 'São Paulo',
              uf: empresaDb.uf || 'SP',
              atividade_real: cnae_descricao || 'Comércio e Serviços Gerais',
            },
            questionario_sst: respostas_questionario || {},
          },
        },
      });
      targetFichaToken = fichaDb.token_retomada;

      // 5. Gravar Score SST calculado
      const valorScoreSst = typeof score === 'number' ? Math.round(score) : 28;
      const classificacao = valorScoreSst >= 81 ? 'regular' : valorScoreSst >= 61 ? 'atencao' : valorScoreSst >= 41 ? 'alto_risco' : 'critico';
      await prisma.scoreSST.upsert({
        where: { ficha_id: fichaDb.id },
        update: {
          total: valorScoreSst,
          classificacao,
          por_eixo: (respostas_questionario || {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
          itens_nao_aplicaveis: [],
          versao_regras: 'v1.0.0',
        },
        create: {
          ficha_id: fichaDb.id,
          total: valorScoreSst,
          classificacao,
          por_eixo: (respostas_questionario || {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
          itens_nao_aplicaveis: [],
          versao_regras: 'v1.0.0',
        },
      }).catch((e: unknown) => console.warn('[ScoreSST Create]', e));

      // 6. Gravar Rota Lead (Porte)
      const qtdColab = respostas_questionario?.qtdColaboradores;
      const rotaCodigo = qtdColab === '50_plus' || respostas_questionario?.teveAcidenteOuFiscalizacao === 'sim' ? 'A' : (qtdColab === '21_50' ? 'B' : 'C');
      await prisma.rota.upsert({
        where: { ficha_id: fichaDb.id },
        update: {
          rota: rotaCodigo,
          rota_completa: rotaCodigo,
          gatilho_critico: rotaCodigo === 'A',
          motivos: ['Classificação automática apurada na triagem web'],
          sla_minutos: rotaCodigo === 'A' ? 10 : (rotaCodigo === 'B' ? 120 : 999),
        },
        create: {
          ficha_id: fichaDb.id,
          rota: rotaCodigo,
          rota_completa: rotaCodigo,
          gatilho_critico: rotaCodigo === 'A',
          motivos: ['Classificação automática apurada na triagem web'],
          sla_minutos: rotaCodigo === 'A' ? 10 : (rotaCodigo === 'B' ? 120 : 999),
        },
      }).catch((e: unknown) => console.warn('[Rota Create]', e));

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
      const respostasJson: any = ficha.respostas || {};
      const bloco1 = respostasJson.bloco_1 || {};
      nomeCliente = ficha.lead.contato?.nome || nomeCliente;
      razaoSocial = ficha.lead.empresa?.razao_social || bloco1.razao_social || razaoSocial;
      docCnpj = ficha.lead.empresa?.cnpj || (bloco1.cnpj || '').replace(/\D/g, '') || docCnpj;
      telE164 = ficha.lead.contato?.telefone_e164 || telE164;
    }

    // Chave de idempotência única por lead + valor + timestamp
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${targetLeadId}-${valorCobrar}-${produtoNome}-${metodo}-${Date.now().toString().slice(0, 8)}`)
      .digest('hex');

    let asaasCustomerId = 'simulado_cust_' + targetLeadId;
    let asaasPaymentId = 'simulado_pay_' + Date.now();
    // A URL padrão de checkout aponta para a tela de pagamento da ficha (NUNCA para o portal)
    let checkoutUrl = `https://cet-automacao.vercel.app/ficha/${targetFichaToken}/pagamento`;
    let pixPayload = '';
    let pixQrCodeImage = '';
    let pagamentoAprovadoNaHora = false;

    const { apiKey } = getAsaasConfig();
    const hasRealAsaasKey = !!apiKey && apiKey !== 'OBTER_NO_PAINEL_ASAAS';

    if (hasRealAsaasKey) {
      try {
        // 1. Criar ou Obter Customer no Asaas com documento oficial validado
        let docClienteFinal = docParaValidar;

        const customerPayload: any = {
          name: (razaoSocial || nomeCliente).slice(0, 70),
          mobilePhone: telE164,
          externalReference: targetLeadId,
          cpfCnpj: docClienteFinal,
        };
        if (email && email.includes('@')) {
          customerPayload.email = email;
        }

        asaasCustomerId = await asaasClient.getOrCreateCustomer(customerPayload);

        // 2. Data de vencimento (2 dias para pagamento)
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
              cpfCnpj: (cartao.cpfTitular || docClienteFinal).replace(/\D/g, ''),
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
          // 4. SE FOR PIX (REGISTRO OFICIAL NO BACEN VIA ASAAS)
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

          // Obter QR Code Oficial do Banco Central / Asaas
          const pixInfo = await asaasClient.getPixQrCode(asaasPaymentId);
          if (pixInfo?.payload) {
            pixPayload = pixInfo.payload;
          }
          if (pixInfo?.encodedImage) {
            pixQrCodeImage = `data:image/png;base64,${pixInfo.encodedImage}`;
          }
        }
      } catch (asaasErr: any) {
        console.error('[Asaas API] Falha na integração de pagamento oficial:', asaasErr?.message);
        return NextResponse.json(
          { erro: asaasErr?.message || 'Falha ao processar pagamento oficial junto ao Asaas. Verifique os dados informados.' },
          { status: 400 }
        );
      }
    } else {
      // Se não houver chave real do Asaas configurada
      return NextResponse.json(
        { erro: 'Integração oficial Asaas não configurada no servidor. Contate o suporte técnico.' },
        { status: 503 }
      );
    }

    if (metodo === 'pix' && !pixPayload) {
      return NextResponse.json(
        { erro: 'Não foi possível gerar a cobrança PIX oficial. Tente novamente em alguns segundos.' },
        { status: 502 }
      );
    }

    // Se não tiver imagem base64 do Asaas no PIX, gera QR Code visual via gerador público seguro
    if (!pixQrCodeImage && pixPayload) {
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
