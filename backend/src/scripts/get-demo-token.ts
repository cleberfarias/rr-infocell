/**
 * Gera um ID token Firebase para o usuario demo nextassist-demo.
 * Uso: npx tsx src/scripts/get-demo-token.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEMO_USER_EMAIL = "demo@nextassist-demo.internal";
const FIREBASE_API_KEY = "AIzaSyB8BHL-HpHnNZYIyjasnTdP--Cl_yzAMVw";

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const adminAuth = getAuth();

async function main() {
  // 1. Busca UID do usuario demo
  let uid: string;
  try {
    const user = await adminAuth.getUserByEmail(DEMO_USER_EMAIL);
    uid = user.uid;
    console.log(`Usuario encontrado: ${uid} (${user.email})`);
  } catch {
    console.error(`Erro: usuario ${DEMO_USER_EMAIL} nao encontrado no Firebase Auth.`);
    console.error("Execute create-demo-tenant.ts primeiro.");
    process.exit(1);
  }

  // 2. Gera custom token via Admin SDK
  const customToken = await adminAuth.createCustomToken(uid, { role: "admin" });

  // 3. Troca custom token por ID token via REST API
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Erro ao trocar custom token:", err);
    process.exit(1);
  }

  const data = (await res.json()) as { idToken: string; expiresIn: string };

  console.log("\n=== Bearer token (valido por 1 hora) ===\n");
  console.log(`Authorization: Bearer ${data.idToken}`);
  console.log(`\nExpira em: ${data.expiresIn}s`);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
