import { env } from 'node:process';

const ASAAS_API_URL = env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = env.ASAAS_API_KEY || '';

interface AsaasCustomerPayload {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
}

interface AsaasPaymentPayload {
  customer: string; // ID do customer no Asaas
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference?: string;
}

/**
 * Cliente básico para a API do Asaas
 */
export const asaasClient = {
  async createCustomer(data: AsaasCustomerPayload) {
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');

    const res = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Falha ao criar cliente no Asaas: ${error}`);
    }

    const result = await res.json();
    return result.id as string; // Retorna o asaas_customer_id
  },

  async createPayment(data: AsaasPaymentPayload) {
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');

    const res = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Falha ao criar cobrança no Asaas: ${error}`);
    }

    const result = await res.json();
    
    return {
      id: result.id as string,
      invoiceUrl: result.invoiceUrl as string,
    };
  },

  async getPixQrCode(paymentId: string) {
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');

    const res = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Falha ao buscar QR Code PIX: ${error}`);
    }

    const result = await res.json();
    return {
      encodedImage: result.encodedImage as string,
      payload: result.payload as string,
      expirationDate: result.expirationDate as string,
    };
  }
};
