import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../src/app/api/whatsapp/route';
import crypto from 'crypto';

const VERIFY_TOKEN = 'cet_seguranca_2026';
const APP_SECRET = 'my_test_secret';

// Mock do orquestrador — não testa lógica de banco aqui
vi.mock('../src/lib/orquestrador-whatsapp', () => ({
  processarMensagem: vi.fn().mockResolvedValue(undefined),
}));

describe('WhatsApp Webhook (refatorado)', () => {
  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  });

  describe('GET (Validação)', () => {
    it('deve retornar o challenge quando o token for válido', async () => {
      const challenge = '9876543210';
      const url = `http://localhost/api/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toBe(challenge);
    });

    it('deve retornar 403 se o token for inválido', async () => {
      const url = `http://localhost/api/whatsapp?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123`;
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST (Recebimento)', () => {
    it('deve retornar 200 para payload de mensagem de texto', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              messages: [{
                from: '5563999998888',
                id: 'wamid.test123',
                type: 'text',
                text: { body: 'Olá' },
              }],
            },
          }],
        }],
      };

      const bodyStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      hmac.update(bodyStr);
      const signature = `sha256=${hmac.digest('hex')}`;

      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        headers: new Headers({ 'x-hub-signature-256': signature }),
        body: bodyStr,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('deve retornar 200 para mensagem interativa (button_reply)', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              messages: [{
                from: '5563999997777',
                id: 'wamid.interactive1',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: { id: 'diagnostico_sst', title: 'Diagnóstico SST' },
                },
              }],
            },
          }],
        }],
      };

      const bodyStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      hmac.update(bodyStr);
      const signature = `sha256=${hmac.digest('hex')}`;

      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        headers: new Headers({ 'x-hub-signature-256': signature }),
        body: bodyStr,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('deve retornar 200 para mensagem interativa (list_reply)', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              messages: [{
                from: '5563999996666',
                id: 'wamid.list1',
                type: 'interactive',
                interactive: {
                  type: 'list_reply',
                  list_reply: { id: 'int_regularizar', title: 'Regularizar SST' },
                },
              }],
            },
          }],
        }],
      };

      const bodyStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      hmac.update(bodyStr);
      const signature = `sha256=${hmac.digest('hex')}`;

      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        headers: new Headers({ 'x-hub-signature-256': signature }),
        body: bodyStr,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('deve retornar 200 para atualizações de status', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              statuses: [{
                id: 'wamid.status1',
                status: 'delivered',
                recipient_id: '5563999998888',
              }],
            },
          }],
        }],
      };

      const bodyStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      hmac.update(bodyStr);
      const signature = `sha256=${hmac.digest('hex')}`;

      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        headers: new Headers({ 'x-hub-signature-256': signature }),
        body: bodyStr,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('deve retornar 200 mesmo com assinatura inválida (regra absoluta)', async () => {
      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        headers: new Headers({ 'x-hub-signature-256': 'sha256=invalida' }),
        body: '{"test":true}',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('deve retornar 200 mesmo com JSON quebrado (regra absoluta)', async () => {
      const request = new Request('http://localhost/api/whatsapp', {
        method: 'POST',
        body: 'nao_e_json',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
