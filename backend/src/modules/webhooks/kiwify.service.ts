import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { Timestamp } from "firebase-admin/firestore";

import { auth, db } from "../../firebase/admin.js";
import { env } from "../../config/env.js";
import { KIWIFY_PRODUCT_PLAN, PLAN_LABELS } from "./kiwify.plans.js";
import type { KiwifyWebhookPayload } from "./kiwify.types.js";

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

function welcomeEmailHtml(params: {
  name: string;
  email: string;
  plan: string;
  loginUrl: string;
  resetUrl: string;
}): string {
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
      <h2 style="margin:0 0 8px;font-size:20px;color:#f1f5f9">Bem-vindo(a), ${params.name}!</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">
        Sua assinatura do plano <strong style="color:#60a5fa">${params.plan}</strong> foi ativada com sucesso.
        Acesse o sistema e configure sua empresa.
      </p>

      <div style="background:#0f1117;border:1px solid #2d3148;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Login</p>
        <p style="margin:0;font-size:14px;color:#e2e8f0;font-family:monospace">${params.email}</p>
      </div>

      <a href="${params.resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;margin-bottom:16px">
        Definir senha e acessar →
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

export class KiwifyService {
  async handleOrderApproved(payload: KiwifyWebhookPayload): Promise<void> {
    if (!auth || !db) {
      throw new Error("Firebase Admin SDK não está configurado.");
    }

    const productId = payload.Product.id;
    const plan = KIWIFY_PRODUCT_PLAN[productId];
    if (!plan) {
      console.warn(`[Kiwify] Product ID desconhecido: ${productId}`);
      return;
    }

    const { email, full_name: name } = payload.Customer;
    const subscriptionId = payload.Subscription?.id;

    // Verificar se já existe tenant para esse e-mail
    const existingSnap = await db
      .collection("tenants")
      .where("ownerEmail", "==", email)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      console.info(`[Kiwify] Tenant já existe para ${email}, ignorando.`);
      return;
    }

    const slug = `${slugify(name)}-${randomSuffix()}`;
    const agora = Timestamp.now();

    // Criar tenant no Firestore
    await db.collection("tenants").doc(slug).set({
      id: slug,
      slug,
      name,
      productName: "NextAssist",
      plan,
      whiteLabel: false,
      status: "active",
      ownerEmail: email,
      kiwifySubscriptionId: subscriptionId ?? null,
      createdAt: agora,
      updatedAt: agora,
    });

    // Criar usuário admin no Firebase Auth
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const user = await auth.createUser({
        email,
        displayName: name,
        disabled: false,
      });
      uid = user.uid;
    }

    await auth.setCustomUserClaims(uid, { role: "admin", tenantId: slug });

    await db.collection("usuarios").doc(uid).set({
      uid,
      email,
      nome: name,
      tenantId: slug,
      role: "admin",
      status: "ativo",
      createdAt: agora,
      updatedAt: agora,
    });

    // Enviar e-mail de boas-vindas
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      const resetUrl = await auth.generatePasswordResetLink(email);
      const transporter = buildTransporter();
      await transporter.sendMail({
        from: `"NextAssist" <${env.SMTP_USER}>`,
        to: email,
        subject: "Bem-vindo ao NextAssist — defina sua senha",
        html: welcomeEmailHtml({
          name,
          email,
          plan: PLAN_LABELS[plan],
          loginUrl: env.APP_URL,
          resetUrl,
        }),
      });
      console.info(`[Kiwify] E-mail de boas-vindas enviado para ${email}`);
    } else {
      console.warn("[Kiwify] SMTP não configurado — e-mail não enviado.");
    }

    console.info(`[Kiwify] Tenant criado: ${slug} | plano: ${plan} | ${email}`);
  }

  async handleSubscriptionCanceled(payload: KiwifyWebhookPayload): Promise<void> {
    if (!db) return;

    const email = payload.Customer.email;
    const snap = await db
      .collection("tenants")
      .where("ownerEmail", "==", email)
      .limit(1)
      .get();

    if (snap.empty) return;

    await snap.docs[0].ref.update({ status: "suspended", updatedAt: Timestamp.now() });
    console.info(`[Kiwify] Tenant suspenso: ${email}`);
  }

  async handleSubscriptionRenewed(payload: KiwifyWebhookPayload): Promise<void> {
    if (!db) return;

    const email = payload.Customer.email;
    const snap = await db
      .collection("tenants")
      .where("ownerEmail", "==", email)
      .limit(1)
      .get();

    if (snap.empty) return;

    await snap.docs[0].ref.update({ status: "active", updatedAt: Timestamp.now() });
    console.info(`[Kiwify] Assinatura renovada: ${email}`);
  }
}

export const kiwifyService = new KiwifyService();
