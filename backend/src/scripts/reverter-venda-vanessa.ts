/**
 * Reverte a venda finalizada da Vanessa — apaga o documento de venda
 * e coloca a OS de volta em "pronto_para_retirada".
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/reverter-venda-vanessa.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function main() {
  console.log("🔍 Buscando venda da Vanessa...\n");

  // 1. Busca clientes com nome contendo "Vanessa"
  const clientesSnap = await db.collection("clientes").get();
  const clientesVanessa = clientesSnap.docs.filter((d) =>
    (d.data().nome as string ?? "").toLowerCase().includes("vanessa"),
  );

  if (clientesVanessa.length === 0) {
    console.log("⚠️  Nenhum cliente com nome 'Vanessa' encontrado.");
    console.log("   Tentando buscar a venda diretamente pelo clienteNome...\n");
  } else {
    console.log(`👤 Clientes encontrados com nome 'Vanessa':`);
    clientesVanessa.forEach((c) => console.log(`   - ${c.data().nome} (id: ${c.id})`));
  }

  // 2. Busca vendas por clienteId da Vanessa
  const clienteIds = clientesVanessa.map((c) => c.id);
  let vendasVanessa: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  for (const clienteId of clienteIds) {
    const snap = await db.collection("vendas").where("clienteId", "==", clienteId).get();
    vendasVanessa = [...vendasVanessa, ...snap.docs];
  }

  // Fallback: busca por clienteNome
  if (vendasVanessa.length === 0) {
    const allVendas = await db.collection("vendas").limit(100).get();
    vendasVanessa = allVendas.docs.filter((v) =>
      (v.data().clienteNome as string ?? "").toLowerCase().includes("vanessa")
    );
  }

  if (vendasVanessa.length === 0) {
    console.log("\n❌ Nenhuma venda finalizada da Vanessa encontrada.");
    return;
  }

  console.log(`\n💳 Vendas encontradas:`);
  vendasVanessa.forEach((v, i) => {
    const d = v.data();
    console.log(`   [${i + 1}] ID: ${v.id}`);
    console.log(`       Cliente: ${d.clienteNome ?? d.clienteId}`);
    console.log(`       OS: ${d.numeroOs ? `OS-${d.numeroOs}` : "Venda direta"}`);
    console.log(`       Total: R$ ${d.valorTotal}`);
    console.log(`       Data: ${d.createdAt}`);
    console.log(`       ordemServicoId: ${d.ordemServicoId ?? "—"}`);
  });

  if (vendasVanessa.length > 1) {
    console.log("\n⚠️  Mais de uma venda encontrada. Editando o script para especificar o ID correto.");
    console.log("   Defina VENDA_ID no script e reexecute.");
    return;
  }

  const vendaDoc = vendasVanessa[0];
  const vendaData = vendaDoc.data();
  const ordemId = vendaData.ordemServicoId as string | undefined;

  console.log(`\n🔄 Revertendo venda: ${vendaDoc.id}`);

  // 3. Deleta a venda
  await db.collection("vendas").doc(vendaDoc.id).delete();
  console.log("   ✅ Venda deletada.");

  // 4. Reverte a OS para pronto_para_retirada
  if (ordemId) {
    await db.collection("ordensServico").doc(ordemId).update({
      status: "pronto_para_retirada",
      formaPagamento: FieldValue.delete(),
      valorRecebido: FieldValue.delete(),
      pagoEm: FieldValue.delete(),
      troco: FieldValue.delete(),
      entregueEm: FieldValue.delete(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`   ✅ OS ${ordemId} revertida para "pronto_para_retirada".`);

    // 5. Deleta o evento de venda associado à OS
    const eventosSnap = await db.collection("ordemEventos")
      .where("ordemServicoId", "==", ordemId)
      .where("tipo", "==", "venda")
      .get();
    if (!eventosSnap.empty) {
      const batch = db.batch();
      eventosSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`   ✅ ${eventosSnap.docs.length} evento(s) de venda removido(s).`);
    }
  } else {
    console.log("   ℹ️  Venda direta — nenhuma OS para reverter.");
  }

  console.log("\n✅ Reversão concluída! A OS voltou para o PDV.");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
