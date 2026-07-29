import nodemailer from "nodemailer";
import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../firebase/admin.js";
import { env } from "../../config/env.js";

function buildTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function contatoNotificationEmailHtml(params: {
  nome: string;
  email: string;
  telefone: string;
  assunto: string;
  mensagem: string;
}): string {
  const nome = escapeHtml(params.nome);
  const email = escapeHtml(params.email);
  const telefone = escapeHtml(params.telefone);
  const assunto = escapeHtml(params.assunto);
  const mensagem = escapeHtml(params.mensagem);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#0f1117;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <div style="max-width:560px;margin:0 auto;background:#1a1d27;border:1px solid #2d3148;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#fff">Nova mensagem de contato — NextAssist</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#94a3b8">Nome</td><td style="padding:8px 0;color:#fff">${nome}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">E-mail</td><td style="padding:8px 0;color:#fff">${email}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Telefone</td><td style="padding:8px 0;color:#fff">${telefone}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Assunto</td><td style="padding:8px 0;color:#fff">${assunto}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">Mensagem</p>
    <p style="margin:4px 0 0;color:#fff;font-size:14px;white-space:pre-wrap">${mensagem}</p>
  </div>
</body>
</html>`;
}

export interface ContatoRegistroInput {
  nome: string;
  email: string;
  telefone: string;
  assunto: string;
  mensagem: string;
}

export class ContatoService {
  async registrar(input: ContatoRegistroInput): Promise<void> {
    if (!db) {
      throw new Error("Firebase Admin SDK não está configurado.");
    }

    const agora = Timestamp.now();

    await db.collection("leads_contato").add({
      ...input,
      status: "novo",
      createdAt: agora,
    });

    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      const notificationEmail =
        env.TRIAL_NOTIFICATION_EMAIL ??
        env.OBSERVABILIDADE_ALLOWED_EMAILS.split(",")[0]?.trim() ??
        env.SMTP_USER;

      if (notificationEmail) {
        try {
          const transporter = buildTransporter();
          await transporter.sendMail({
            from: `"NextAssist" <${env.SMTP_USER}>`,
            to: notificationEmail,
            replyTo: input.email,
            subject: `Novo contato NextAssist: ${input.assunto}`,
            html: contatoNotificationEmailHtml(input),
          });
        } catch (err) {
          console.error("[Contato] Falha ao enviar notificacao de contato:", err);
        }
      }
    }

    console.info(`[Contato] Nova mensagem registrada: ${input.email} — ${input.assunto}`);
  }
}

export const contatoService = new ContatoService();
