import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { Timestamp } from "firebase-admin/firestore";

import { auth, db } from "../../firebase/admin.js";
import { env } from "../../config/env.js";

const TRIAL_DAYS = 7;
const DEMO_PLAN = "profissional";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix(): string {
  return crypto.randomBytes(3).toString("hex");
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

function trialWelcomeEmailHtml(params: {
  nome: string;
  email: string;
  empresa: string;
  trialEndsAt: Date;
  resetUrl: string;
}): string {
  const dataFim = params.trialEndsAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:Inter,sans-serif;color:#e2e8f0">
  <div style="max-width:520px;margin:40px auto;background:#1a1d27;border:1px solid #2d3148;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px">
      <h1 style="margin:0;font-size:24px;color:#fff;font-weight:700">NextAssist</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px">Sistema de gestão para assistências técnicas</p>
    </div>
    <div style="padding:32px 40px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#f1f5f9">Bem-vindo(a), ${params.nome}!</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">
        Seu teste gratuito de <strong style="color:#60a5fa">${TRIAL_DAYS} dias</strong> para
        <strong style="color:#f1f5f9">${params.empresa}</strong> está ativo.
        Acesse o sistema, configure sua empresa e experimente todos os recursos.
      </p>

      <div style="background:#0f1117;border:1px solid #2d3148;border-radius:8px;padding:16px;margin-bottom:16px">
        <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Login</p>
        <p style="margin:0;font-size:14px;color:#e2e8f0;font-family:monospace">${params.email}</p>
      </div>

      <div style="background:#0f1117;border:1px solid #f59e0b33;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em">Período de teste</p>
        <p style="margin:0;font-size:14px;color:#fbbf24">Válido até ${dataFim}</p>
      </div>

      <a href="${params.resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;margin-bottom:16px">
        Definir senha e começar →
      </a>
      <p style="margin:0 0 24px;font-size:12px;color:#64748b;text-align:center">
        Este link expira em 24 horas.
      </p>

      <hr style="border:none;border-top:1px solid #2d3148;margin:24px 0">
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6">
        Precisa de ajuda? Fale com a gente pelo
        <a href="https://wa.me/5548999019525" style="color:#60a5fa;text-decoration:none">WhatsApp</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function enviarEmailResetFirebase(email: string): Promise<void> {
  const apiKey = env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    console.warn("[Demo] FIREBASE_WEB_API_KEY não configurada — reset via Firebase ignorado.");
    return;
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    },
  );

  if (!res.ok) {
    const body = (await res.json()) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Falha ao enviar e-mail de reset");
  }

  console.info(`[Demo] E-mail de reset enviado para ${email} via Firebase Auth`);
}

export interface DemoRegistroInput {
  nome: string;
  email: string;
  empresa: string;
}

export class DemoService {
  async registrar(input: DemoRegistroInput): Promise<{ slug: string }> {
    if (!auth || !db) {
      throw new Error("Firebase Admin SDK não está configurado.");
    }

    const { nome, email, empresa } = input;

    // Impedir duplicatas pelo e-mail
    const existSnap = await db
      .collection("tenants")
      .where("ownerEmail", "==", email)
      .limit(1)
      .get();

    if (!existSnap.empty) {
      throw Object.assign(new Error("Já existe uma conta para este e-mail."), {
        code: "ALREADY_EXISTS",
      });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const slug = `${slugify(empresa || nome)}-${randomSuffix()}`;
    const agora = Timestamp.now();

    // Criar tenant trial no Firestore
    await db
      .collection("tenants")
      .doc(slug)
      .set({
        id: slug,
        slug,
        name: empresa,
        productName: "NextAssist",
        plan: DEMO_PLAN,
        whiteLabel: false,
        status: "trial",
        ownerEmail: email,
        ownerName: nome,
        trialEndsAt: Timestamp.fromDate(trialEndsAt),
        createdAt: agora,
        updatedAt: agora,
      });

    // Criar usuário no Firebase Auth
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const user = await auth.createUser({ email, displayName: nome, disabled: false });
      uid = user.uid;
    }

    await auth.setCustomUserClaims(uid, { role: "admin", tenantId: slug });

    await db.collection("usuarios").doc(uid).set({
      uid,
      email,
      nome,
      tenantId: slug,
      role: "admin",
      status: "ativo",
      createdAt: agora,
      updatedAt: agora,
    });

    // Enviar e-mail de redefinição de senha via Firebase Auth (não requer SMTP)
    try {
      await enviarEmailResetFirebase(email);
    } catch (err) {
      console.error("[Demo] Falha ao enviar e-mail de reset:", err);
    }

    // Enviar e-mail de boas-vindas adicional via SMTP (opcional)
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        const resetUrl = await auth.generatePasswordResetLink(email);
        const transporter = buildTransporter();
        await transporter.sendMail({
          from: `"NextAssist" <${env.SMTP_USER}>`,
          to: email,
          subject: `Seu teste gratuito do NextAssist está ativo — ${TRIAL_DAYS} dias`,
          html: trialWelcomeEmailHtml({ nome, email, empresa, trialEndsAt, resetUrl }),
        });
        console.info(`[Demo] E-mail de boas-vindas (SMTP) enviado para ${email}`);
      } catch (err) {
        console.error("[Demo] Falha ao enviar e-mail SMTP:", err);
      }
    }

    console.info(`[Demo] Trial criado: ${slug} | ${email}`);
    return { slug };
  }
}

export const demoService = new DemoService();
