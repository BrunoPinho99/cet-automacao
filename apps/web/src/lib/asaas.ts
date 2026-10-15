export interface AsaasCreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  phone: string;
  mobilePhone?: string;
}

export interface AsaasCustomerPayload {
  name: string;
  cpfCnpj?: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
}

export interface AsaasPaymentPayload {
  customer: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCard?: AsaasCreditCard;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  remoteIp?: string;
}

export function getAsaasConfig() {
  const apiKey = (process.env.ASAAS_API_KEY || '').trim();
  let apiUrl = (process.env.ASAAS_API_URL || '').trim();

  // Verifica se é explicitamente sandbox pela chave ou env var
  const isExplicitSandbox =
    process.env.ASAAS_ENV === 'sandbox' ||
    apiKey.toLowerCase().includes('sandbox');

  if (isExplicitSandbox) {
    apiUrl = 'https://sandbox.asaas.com/api/v3';
  } else if (!apiUrl || apiUrl.includes('sandbox.asaas.com')) {
    // Chave real de produção (ex.: conta Paulo Eduardo): sempre usar API oficial de produção
    apiUrl = 'https://api.asaas.com/v3';
  }

  return { apiKey, apiUrl };
}

/**
 * Cliente para a API do Asaas (Produção e Sandbox)
 */
export const asaasClient = {
  async getOrCreateCustomer(data: AsaasCustomerPayload): Promise<string> {
    const { apiKey, apiUrl } = getAsaasConfig();
    if (!apiKey || apiKey === 'OBTER_NO_PAINEL_ASAAS') {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    if (data.cpfCnpj) {
      const cleanDoc = data.cpfCnpj.replace(/\D/g, '');
      if (cleanDoc.length === 11 || cleanDoc.length === 14) {
        try {
          const searchRes = await fetch(`${apiUrl}/customers?cpfCnpj=${cleanDoc}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              access_token: apiKey,
            },
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.data && searchData.data.length > 0) {
              return searchData.data[0].id as string;
            }
          }
        } catch (err) {
          console.warn('[Asaas] Busca de customer falhou:', err);
        }
      }
    }

    return this.createCustomer(data);
  },

  async createCustomer(data: AsaasCustomerPayload): Promise<string> {
    const { apiKey, apiUrl } = getAsaasConfig();
    if (!apiKey || apiKey === 'OBTER_NO_PAINEL_ASAAS') {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const res = await fetch(`${apiUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorDesc = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorDesc = errorJson.errors.map((e: any) => e.description).join('; ');
        }
      } catch {}
      throw new Error(`Falha ao cadastrar cliente no Asaas: ${errorDesc}`);
    }

    const result = await res.json();
    return result.id as string;
  },

  async createPayment(data: AsaasPaymentPayload) {
    const { apiKey, apiUrl } = getAsaasConfig();
    if (!apiKey || apiKey === 'OBTER_NO_PAINEL_ASAAS') {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const res = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorDesc = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorDesc = errorJson.errors.map((e: any) => e.description).join('; ');
        }
      } catch {}
      throw new Error(`Falha ao processar pagamento no Asaas: ${errorDesc}`);
    }

    const result = await res.json();
    return {
      id: result.id as string,
      status: (result.status as string) || 'PENDING',
      invoiceUrl: (result.invoiceUrl as string) || '',
      bankSlipUrl: (result.bankSlipUrl as string) || '',
    };
  },

  async getPixQrCode(paymentId: string) {
    const { apiKey, apiUrl } = getAsaasConfig();
    if (!apiKey || apiKey === 'OBTER_NO_PAINEL_ASAAS') {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const res = await fetch(`${apiUrl}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Falha ao buscar QR Code PIX: ${errorText}`);
    }

    const result = await res.json();
    return {
      encodedImage: result.encodedImage as string,
      payload: result.payload as string,
      expirationDate: result.expirationDate as string,
    };
  },

  async getPayment(paymentId: string) {
    const { apiKey, apiUrl } = getAsaasConfig();
    if (!apiKey || apiKey === 'OBTER_NO_PAINEL_ASAAS') {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const res = await fetch(`${apiUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Falha ao consultar cobrança no Asaas: ${errorText}`);
    }

    return await res.json();
  },
};
