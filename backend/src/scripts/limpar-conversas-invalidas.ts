import { initializeFirebaseAdmin } from "../firebase/admin.js";
import { getFirestore } from "firebase-admin/firestore";

// Telefone brasileiro válido: 10 dígitos (fixo) ou 11 dígitos (celular com 9)
function ehTelefoneValido(telefone: string): boolean {
  return /^\d{10,11}$/.test(telefone);
}

async function main() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    console.error("Firebase nao inicializado.");
    process.exit(1);
  }

  const db = getFirestore(app);

  // 1. Buscar todas as conversas
  const conversasSnap = await db.collection("whatsapp_conversas").get();
  const invalidas = conversasSnap.docs.filter((d) => !ehTelefoneValido(d.id));

  console.log(`Total de conversas: ${conversasSnap.size}`);
  console.log(`Invalidas encontradas: ${invalidas.length}`);

  if (invalidas.length === 0) {
    console.log("Nenhuma limpeza necessaria.");
    return;
  }

  // 2. Deletar conversas inválidas
  for (const doc of invalidas) {
    console.log(`  Deletando conversa: "${doc.id}"`);
    await doc.ref.delete();
  }

  // 3. Deletar mensagens associadas aos telefones inválidos
  const telefonesInvalidos = invalidas.map((d) => d.id);
  const mensagensSnap = await db.collection("whatsapp_mensagens").get();
  let mensagensDeletadas = 0;

  for (const doc of mensagensSnap.docs) {
    if (telefonesInvalidos.includes(doc.data().telefone)) {
      await doc.ref.delete();
      mensagensDeletadas++;
    }
  }

  console.log(`\nConcluido:`);
  console.log(`  ${invalidas.length} conversas removidas`);
  console.log(`  ${mensagensDeletadas} mensagens removidas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
