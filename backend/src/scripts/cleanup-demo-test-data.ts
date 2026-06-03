/**
 * Remove documentos criados durante o teste de isolamento da Fase 9.16
 * que foram salvos incorretamente com tenantId: rr-infocell (backend producao nao atualizado).
 *
 * Uso:
 *   cd backend
 *   ALLOW_CLEANUP_DEMO_DATA=true npx tsx src/scripts/cleanup-demo-test-data.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.ALLOW_CLEANUP_DEMO_DATA !== "true") {
  console.error("ERRO: ALLOW_CLEANUP_DEMO_DATA=true nao definido.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// Documentos criados durante teste de isolamento 9.16 (2026-05-29)
// Foram salvos com tenantId: rr-infocell por engano (backend producao sem codigo 9.4)
const toDelete: Record<string, string[]> = {
  marcas: ["FN9QtrQ6unswiNkoJ0VK"],
  categorias: ["TDtJwmk622ZpVV2fxeYH"],
  clientes: ["aKSEKDFEf0Bg0jnDozvw"],
  produtos: ["4H7teuyRu13dLNg5o78B"],
  contas: ["b3siPgEquI58O1wG7FTZ"],
  despesas: ["BgJvN1RsLzhbixf17jeW"],
  movimentacoesEstoque: ["RSitfWxBU1qoIvTOq2Me"],
  aparelhos: ["6A5bmypk75AkU6kOvQ1S"],
  ordensServico: ["TtbO3Qogq4PJxYDJzo1J", "Tk8saoSZLGVOvV6GjnP5"],
  vendas: ["JjkwR0okXEx490LRtpUy", "K89qeUrKN906YoFK8jxd"],
};

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("LIMPEZA — dados de teste fase 9.16 (producao nao atualizada)");
  console.log(SEP);
  console.log();

  let removidos = 0;
  let naoEncontrados = 0;

  for (const [col, ids] of Object.entries(toDelete)) {
    for (const id of ids) {
      const ref = db.collection(col).doc(id);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        console.log(`  ✅ removido: ${col}/${id}`);
        removidos++;
      } else {
        console.log(`  ⏭️  nao encontrado: ${col}/${id}`);
        naoEncontrados++;
      }
    }
  }

  console.log();
  console.log(SEP);
  console.log(`Removidos: ${removidos} | Nao encontrados: ${naoEncontrados}`);
  console.log(SEP);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
