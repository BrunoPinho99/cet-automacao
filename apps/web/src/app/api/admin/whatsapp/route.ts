import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://2.31.30.193:8080';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'cet_automacao';
const API_KEY = process.env.EVOLUTION_API_KEY || 'cet_api_key_secreta_2026';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // 1. Consulta estado da conexão
    const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      headers: { apikey: API_KEY },
      cache: 'no-store',
    });

    let state = 'disconnected';
    let instanceData: any = null;

    if (stateRes.ok) {
      const data = await stateRes.json();
      state = data.instance?.state || data.state || 'disconnected';
      instanceData = data;
    }

    // 2. Se não estiver aberto (conectado), busca o QR Code
    let qrcodeBase64 = null;
    let pairingCode = null;

    if (state !== 'open') {
      const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
        headers: { apikey: API_KEY },
        cache: 'no-store',
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        qrcodeBase64 = connectData.base64 || null;
        pairingCode = connectData.code || null;
        if (connectData.instance?.state) {
          state = connectData.instance.state;
        }
      } else {
        // Se a instância ainda não existir na Evolution, cria automaticamente
        try {
          const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: API_KEY,
            },
            body: JSON.stringify({
              instanceName: INSTANCE_NAME,
              integration: 'WHATSAPP-BAILEYS',
              qrcode: true,
            }),
          });

          if (createRes.ok) {
            const createData = await createRes.json();
            qrcodeBase64 = createData.qrcode?.base64 || null;
            pairingCode = createData.qrcode?.code || null;
            state = 'connecting';
          }
        } catch (err) {
          console.error('[WhatsApp Status API] Erro ao auto-criar instância:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      instanceName: INSTANCE_NAME,
      state, // 'open' | 'connecting' | 'close' | 'disconnected'
      qrcode: qrcodeBase64,
      pairingCode,
      details: instanceData,
    });
  } catch (error: any) {
    console.error('[WhatsApp Status API] Erro ao comunicar com Evolution:', error);
    return NextResponse.json({
      success: false,
      error: 'Não foi possível conectar à Evolution API',
      state: 'error',
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Requer privilégios de Administrador' }, { status: 403 });
  }

  try {
    const { action } = await req.json();

    if (action === 'restart') {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/restart/${INSTANCE_NAME}`, {
        method: 'PUT',
        headers: { apikey: API_KEY },
      });
      return NextResponse.json({ success: res.ok });
    }

    if (action === 'logout') {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/logout/${INSTANCE_NAME}`, {
        method: 'DELETE',
        headers: { apikey: API_KEY },
      });
      return NextResponse.json({ success: res.ok });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
