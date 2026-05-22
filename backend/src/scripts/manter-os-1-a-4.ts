/**
 * Mantém apenas as OS 1–4 e redefine o contador para 5.
 * Apaga todas as OS com número > 4 e seus dados relacionados.
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/manter-os-1-a-4.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function deletarRelacionados(colecao: string, campo: string, valor: string) {
  const snap = await db.collection(colecao).where(campo, "==", valor).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.docs.length;
}

async function main() {
  console.log("🔍 Buscando OS com número > 4...\n");

  const snap = await db.collection("ordensServico").get();
  const paraApagar = snap.docs.filter((doc) => Number(doc.data().numero ?? 0) > 4);

  if (paraApagar.length === 0) {
    console.log("ℹ️  Nenhuma OS com número > 4 encontrada.");
  } else {
    for (const doc of paraApagar) {
      const numero = doc.data().numero;
      const osId = doc.id;
      console.log(`\n🗑️  Apagando OS-${numero} (${osId})...`);

      const checklists = await deletarRelacionados("checklists", "ordemServicoId", osId);
      const eventos = await deletarRelacionados("ordemEventos", "ordemServicoId", osId);
      const orcamentos = await deletarRelacionados("orcamentos", "ordemServicoId", osId);
      const vendas = await deletarRelacionados("vendas", "ordemServicoId", osId);
      const movs = await deletarRelacionados("movimentacoesEstoque", "ordemServicoId", osId);

      await db.collection("ordensServico").doc(osId).delete();

      console.log(
        `   checklists: ${checklists} | eventos: ${eventos} | orçamentos: ${orcamentos} | vendas: ${vendas} | movimentações: ${movs}`,
      );
      console.log(`   ✅ OS-${numero} removida.`);
    }
  }

  // Redefine o contador para 5 (próxima OS será a #5)
  await db.collection("counters").doc("ordensServico").set({ nextNumero: 5 }, { merge: true });
  console.log("\n🔢 Contador redefinido: próxima OS será a #5.");
  console.log("\n✅ Concluído!");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
