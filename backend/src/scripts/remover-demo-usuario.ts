/**
 * Remove o tenant de demo e limpa as associações de um usuário pelo e-mail,
 * permitindo que ele se cadastre novamente no fluxo de demo.
 *
 * Uso:
 *   cd backend
 *   EMAIL=cleber.fdelgado@gmail.com npx tsx src/scripts/remover-demo-usuario.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.env.EMAIL;
if (!email) {
  console.error("ERRO: variável EMAIL não definida.");
  console.error("  EMAIL=usuario@exemplo.com npx tsx src/scripts/remover-demo-usuario.ts");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();
const db = getFirestore();

async function main() {
  console.log(`\nProcessando: ${email}\n`);

  // 1. Buscar tenant pelo ownerEmail
  const tenantSnap = await db.collection("tenants").where("ownerEmail", "==", email).get();

  if (tenantSnap.empty) {
    console.log("Nenhum tenant encontrado para este e-mail.");
  } else {
    for (const doc of tenantSnap.docs) {
      console.log(`Removendo tenant: ${doc.id} (status: ${doc.data().status})`);
      await doc.ref.delete();
    }
  }

  // 2. Buscar usuário no Firebase Auth
  let uid: string | null = null;
  try {
    const user = await auth.getUserByEmail(email!);
    uid = user.uid;
    console.log(`Usuário Firebase Auth encontrado: ${uid}`);

    // Limpar custom claims
    await auth.setCustomUserClaims(uid, {});
    console.log("Custom claims removidas.");
  } catch {
    console.log("Usuário não encontrado no Firebase Auth.");
  }

  // 3. Remover documento usuarios/{uid}
  if (uid) {
    const usuarioRef = db.collection("usuarios").doc(uid);
    const usuarioSnap = await usuarioRef.get();
    if (usuarioSnap.exists) {
      await usuarioRef.delete();
      console.log(`Documento usuarios/${uid} removido.`);
    } else {
      console.log(`Documento usuarios/${uid} não existe.`);
    }
  }

  console.log("\nConcluído. O usuário pode se cadastrar novamente.\n");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
