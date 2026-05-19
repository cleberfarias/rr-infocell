/**
 * Zera TODOS os dados do Firestore de produção.
 * Mantém: usuários (para não perder acesso ao sistema).
 * Reseta: contador de OS para 0 (próxima OS será a OS-1).
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/zerar-banco-producao.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as readline from "readline";

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

const COLECOES = [
  "clientes",
  "aparelhos",
  "ordensServico",
  "checklists",
  "orcamentos",
  "ordemEventos",
  "movimentacoesEstoque",
  "vendas",
  "terceirizados",
  "produtos",
  "categorias",
  "marcas",
  "fornecedores",
  "contas",
  "despesas",
  "whatsapp_mensagens",
  "whatsapp_conversas",
  // counters será resetado, não deletado
];

async function contarDocs(colecao: string): Promise<number> {
  const snap = await db.collection(colecao).count().get();
  return snap.data().count;
}

async function deletarColecao(colecao: string): Promise<number> {
  const snap = await db.collection(colecao).limit(400).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  // Recursivo para coleções grandes
  if (snap.docs.length === 400) {
    return snap.docs.length + (await deletarColecao(colecao));
  }
  return snap.docs.length;
}

function pergunta(rl: readline.Interface, texto: string): Promise<string> {
  return new Promise((resolve) => rl.question(texto, resolve));
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║    LIMPEZA TOTAL — RR INFOCELL PRODUÇÃO          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // 1. Contagem atual
  console.log("📊 Contando documentos existentes...\n");
  const totais: Record<string, number> = {};
  let totalGeral = 0;

  for (const col of COLECOES) {
    const count = await contarDocs(col);
    totais[col] = count;
    totalGeral += count;
    if (count > 0) {
      console.log(`   ${col.padEnd(25)} ${count} doc${count !== 1 ? "s" : ""}`);
    }
  }

  const counterSnap = await db.collection("counters").doc("ordens-servico").get();
  const numeroAtual = counterSnap.exists ? (counterSnap.data()?.value ?? 0) : 0;
  console.log(`   ${"counters/ordens-servico".padEnd(25)} → OS-${numeroAtual} (será zerado)`);

  console.log(`\n   Total: ${totalGeral} documentos em ${COLECOES.length} coleções`);
  console.log("\n⚠️  ATENÇÃO: Os dados dos USUÁRIOS serão preservados.");
  console.log("   A próxima OS criada será a OS-1.\n");

  // 2. Confirmação
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await pergunta(rl, "Digite CONFIRMAR para prosseguir com a limpeza total: ");
  rl.close();

  if (resposta.trim() !== "CONFIRMAR") {
    console.log("\n❌ Operação cancelada.\n");
    return;
  }

  // 3. Limpeza
  console.log("\n🗑️  Iniciando limpeza...\n");

  for (const col of COLECOES) {
    if (totais[col] === 0) continue;
    process.stdout.write(`   Apagando ${col}... `);
    const deletados = await deletarColecao(col);
    console.log(`✅ ${deletados} removidos`);
  }

  // 4. Resetar contador de OS
  process.stdout.write("   Resetando contador de OS... ");
  await db.collection("counters").doc("ordens-servico").set({ value: 0 });
  console.log("✅ zerado (próxima OS será OS-1)");

  console.log("\n✅ Banco limpo e pronto para produção!\n");
}

main().catch((err) => {
  console.error("\n❌ Erro:", err);
  process.exit(1);
});
