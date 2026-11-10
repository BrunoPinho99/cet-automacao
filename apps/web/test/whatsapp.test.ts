import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../src/app/api/whatsapp/route';
import { processarMensagem } from '../src/lib/orquestrador-whatsapp';
import { prisma } from '@cet/db';
import crypto from 'crypto';

const VERIFY_TOKEN = 'cet_seguranca_2026';
const APP_SECRET = 'my_test_secret';

// Mock do prisma
vi.mock('@cet/db', () => ({
  prisma: {
    mensagem: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'msg-mock' }),
    },
  },
}));

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

    describe('Evolution API', () => {
      it('deve processar mensagem de texto (messages.upsert) com sender limpo e pushName', async () => {
        const payload = {
          event: 'messages.upsert',
          instance: 'cet_automacao',
          data: {
            key: {
              remoteJid: '5563999998888:1@s.whatsapp.net',
              fromMe: false,
              id: 'evo.wamid.123',
            },
            pushName: 'Carlos Silva',
            message: {
              conversation: 'Olá, preciso de PGR',
            },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(processarMensagem).toHaveBeenCalledWith(
          '5563999998888',
          'evo.wamid.123',
          'text',
          'Olá, preciso de PGR',
          undefined,
          'Carlos Silva',
        );
      });

      it('deve aceitar evento em MAIÚSCULAS (MESSAGES_UPSERT)', async () => {
        const payload = {
          event: 'MESSAGES_UPSERT',
          instance: 'cet_automacao',
          data: {
            key: {
              remoteJid: '5563999997777@s.whatsapp.net',
              fromMe: false,
              id: 'evo.wamid.upper',
            },
            message: {
              extendedTextMessage: { text: 'Quero um diagnóstico' },
            },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(processarMensagem).toHaveBeenCalledWith(
          '5563999997777',
          'evo.wamid.upper',
          'text',
          'Quero um diagnóstico',
          undefined,
          undefined,
        );
      });

      it('deve processar resposta de botões interativos da Evolution API', async () => {
        const payload = {
          event: 'messages.upsert',
          instance: 'cet_automacao',
          data: {
            key: {
              remoteJid: '5563999996666@s.whatsapp.net',
              fromMe: false,
              id: 'evo.button.1',
            },
            message: {
              buttonsResponseMessage: {
                selectedButtonId: '1',
                selectedDisplayText: '1 - Regularidade',
              },
            },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(processarMensagem).toHaveBeenCalledWith(
          '5563999996666',
          'evo.button.1',
          'button',
          '1 - Regularidade',
          '1',
          undefined,
        );
      });

      it('deve ignorar mensagens do próprio bot (fromMe = true)', async () => {
        const payload = {
          event: 'messages.upsert',
          instance: 'cet_automacao',
          data: {
            key: {
              remoteJid: '5563999995555@s.whatsapp.net',
              fromMe: true,
              id: 'evo.bot.1',
            },
            message: { conversation: 'Mensagem do bot' },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });

      it('deve ignorar mensagens de grupos (@g.us)', async () => {
        const payload = {
          event: 'messages.upsert',
          instance: 'cet_automacao',
          data: {
            key: {
              remoteJid: '120363023456789@g.us',
              fromMe: false,
              id: 'evo.group.1',
            },
            message: { conversation: 'Mensagem no grupo' },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });

      it('deve extrair o número real do remetente em modo LID (remoteJidAlt)', async () => {
        const payload = {
          event: 'MESSAGES_UPSERT',
          instance: 'cet_automacao',
          data: {
            key: {
              id: '3AC2C54DEE865041AC56',
              fromMe: false,
              remoteJid: '97070807564411@lid',
              remoteJidAlt: '556191126429@s.whatsapp.net',
              addressingMode: 'lid',
            },
            pushName: 'Fabyana Camargos',
            message: {
              conversation: 'Oi piranha',
            },
          },
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(processarMensagem).toHaveBeenCalledWith(
          '556191126429',
          '3AC2C54DEE865041AC56',
          'text',
          'Oi piranha',
          undefined,
          'Fabyana Camargos',
        );
      });

      it('deve atualizar status de mensagens com messages.update / MESSAGES_UPDATE', async () => {
        const payload = {
          event: 'MESSAGES_UPDATE',
          instance: 'cet_automacao',
          data: [
            {
              key: { id: 'wamid.update1', remoteJid: '5563999998888@s.whatsapp.net' },
              update: { status: 'READ' },
            },
          ],
        };

        const request = new Request('http://localhost/api/whatsapp', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(prisma.mensagem.updateMany).toHaveBeenCalledWith({
          where: { wamid: 'wamid.update1' },
          data: { status: 'lida' },
        });
      });
    });
  });
});
