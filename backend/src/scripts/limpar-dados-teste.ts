/**
 * Script para remover dados criados durante testes de validação.
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/limpar-dados-teste.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa Firebase Admin se ainda não estiver inicializado
if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// ── Identificadores dos dados de teste ───────────────────────────────────────

const TELEFONE_TESTE = "11999999999";
const OS_ID_TESTE = "7nZ29J3g03Q9WIT85TEb";
const OS_NUMEROS_EXTRAS = [1, 2];

// ── Funções auxiliares ────────────────────────────────────────────────────────

async function deletarColecaoRelacionada(colecao: string, campo: string, valor: string) {
  const snap = await db.collection(colecao).where(campo, "==", valor).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.docs.length;
}

async function deletarDoc(colecao: string, id: string) {
  try {
    await db.collection(colecao).doc(id).delete();
    return true;
  } catch {
    return false;
  }
}

// ── Funções de limpeza ────────────────────────────────────────────────────────

async function limparOS(osId: string, label: string) {
  const osExiste = await db.collection("ordensServico").doc(osId).get();
  if (!osExiste.exists) {
    console.log(`\nℹ️  ${label} não encontrada — talvez já tenha sido removida.`);
    return;
  }

  console.log(`\n📋 OS de teste encontrada: ${label} (${osId})`);

  const checklists = await deletarColecaoRelacionada("checklists", "ordemServicoId", osId);
  console.log(`📝 Checklists removidos: ${checklists}`);

  const orcamentos = await deletarColecaoRelacionada("orcamentos", "ordemServicoId", osId);
  console.log(`💰 Orçamentos removidos: ${orcamentos}`);

  const eventos = await deletarColecaoRelacionada("ordemEventos", "ordemServicoId", osId);
  console.log(`📅 Eventos removidos: ${eventos}`);

  const movimentacoes = await deletarColecaoRelacionada(
    "movimentacoesEstoque",
    "ordemServicoId",
    osId,
  );
  console.log(`📦 Movimentações de estoque removidas: ${movimentacoes}`);

  const vendas = await deletarColecaoRelacionada("vendas", "ordemServicoId", osId);
  console.log(`💳 Vendas removidas: ${vendas}`);

  await deletarDoc("ordensServico", osId);
  console.log(`✅ OS removida.`);
}

async function limparOSPorNumero(numero: number) {
  const snap = await db.collection("ordensServico").where("numero", "==", numero).limit(1).get();
  if (snap.empty) {
    console.log(`\nℹ️  OS-${numero} não encontrada — talvez já tenha sido removida.`);
    return;
  }
  const doc = snap.docs[0];
  await limparOS(doc.id, `OS-${numero}`);
}

// ── Execução ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Iniciando limpeza dos dados de teste...\n");

  // 1. Busca o cliente pelo telefone de teste
  const clienteSnap = await db.collection("clientes").where("telefone", "==", TELEFONE_TESTE).get();

  if (clienteSnap.empty) {
    console.log("ℹ️  Cliente de teste não encontrado — talvez já tenha sido removido.");
  } else {
    const clienteId = clienteSnap.docs[0].id;
    const clienteNome = clienteSnap.docs[0].data().nome;
    console.log(`👤 Cliente encontrado: ${clienteNome} (${clienteId})`);

    // 2. Remove aparelhos vinculados ao cliente
    const aparelhos = await deletarColecaoRelacionada("aparelhos", "clienteId", clienteId);
    console.log(`📱 Aparelhos removidos: ${aparelhos}`);

    // 3. Remove o cliente
    await deletarDoc("clientes", clienteId);
    console.log(`✅ Cliente removido.`);
  }

  // 4. Remove OS-1 e OS-2 (buscadas pelo número)
  for (const numero of OS_NUMEROS_EXTRAS) {
    await limparOSPorNumero(numero);
  }

  // 5. Remove a OS-3 pelo ID direto
  await limparOS(OS_ID_TESTE, "OS-3");

  // 6. Restaura o estoque da tela de celular (1 unidade foi baixada no teste)
  const telaSnap = await db.collection("produtos").where("sku", "==", "12345").limit(1).get();

  if (!telaSnap.empty) {
    const tela = telaSnap.docs[0];
    const estoqueAtual = tela.data().estoqueAtual as number;
    await tela.ref.update({ estoqueAtual: estoqueAtual + 1 });
    console.log(`\n📦 Estoque "tela de celular" restaurado: ${estoqueAtual} → ${estoqueAtual + 1}`);
  }

  console.log("\n✅ Limpeza concluída!");
}

main().catch((err) => {
  console.error("❌ Erro durante a limpeza:", err);
  process.exit(1);
});
