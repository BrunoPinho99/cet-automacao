import nodemailer from 'nodemailer';

export interface OpcoesEmail {
  para: string | string[];
  assunto: string;
  texto?: string;
  html?: string;
  anexos?: { filename: string; content: string | Buffer }[];
}

export async function enviarEmail(opcoes: OpcoesEmail) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn('[E-mail] SMTP_HOST não configurado. Simulando envio:', opcoes.assunto);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });

  const from = process.env.EMAIL_FROM || 'noreply@cet.com.br';

  await transporter.sendMail({
    from,
    to: Array.isArray(opcoes.para) ? opcoes.para.join(', ') : opcoes.para,
    subject: opcoes.assunto,
    text: opcoes.texto,
    html: opcoes.html,
    attachments: opcoes.anexos,
  });

  console.log(`[E-mail] Enviado com sucesso para ${opcoes.para}: "${opcoes.assunto}"`);
}
