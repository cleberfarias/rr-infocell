import { initializeFirebaseAdmin } from "../firebase/admin.js";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    console.error("Firebase nao inicializado.");
    process.exit(1);
  }

  const db = getFirestore(app);

  const snap = await db.collection("whatsapp_conversas").get();
  let migradas = 0;

  for (const doc of snap.docs) {
    const tel = doc.id;
    // apenas números brasileiros de 10 dígitos (formato antigo)
    if (!/^\d{10}$/.test(tel)) continue;

    const novoTel = tel.slice(0, 2) + "9" + tel.slice(2);
    console.log(`Migrando conversa: ${tel} → ${novoTel}`);

    // copiar documento da conversa para a nova chave
    await db.collection("whatsapp_conversas").doc(novoTel).set(doc.data(), { merge: true });
    await doc.ref.delete();

    // atualizar campo telefone nas mensagens associadas
    const msgsSnap = await db.collection("whatsapp_mensagens").where("telefone", "==", tel).get();

    for (const msg of msgsSnap.docs) {
      await msg.ref.update({ telefone: novoTel });
    }
    console.log(`  ${msgsSnap.size} mensagens atualizadas`);
    migradas++;
  }

  console.log(`\nConcluido: ${migradas} conversa(s) migrada(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
