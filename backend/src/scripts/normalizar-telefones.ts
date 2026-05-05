import { initializeFirebaseAdmin } from "../firebase/admin.js";
import { normalizarTelefone } from "../shared/normalizar-telefone.js";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    console.error("Firebase nao inicializado. Configure as variaveis de ambiente.");
    process.exit(1);
  }

  const db = getFirestore(app);
  const snapshot = await db.collection("clientes").get();

  let atualizados = 0;
  let sem_mudanca = 0;

  for (const doc of snapshot.docs) {
    const telefoneAtual = String(doc.data().telefone ?? "");
    const telefoneNormalizado = normalizarTelefone(telefoneAtual);

    if (telefoneAtual === telefoneNormalizado) {
      sem_mudanca++;
      continue;
    }

    await doc.ref.update({ telefone: telefoneNormalizado });
    console.log(`${doc.id}: "${telefoneAtual}" -> "${telefoneNormalizado}"`);
    atualizados++;
  }

  console.log(`\nConcluido: ${atualizados} atualizados, ${sem_mudanca} ja normalizados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
