/**
 * Migra o counter global de OS (counters/ordensServico) para counters por tenant.
 *
 * Antes: counters/ordensServico  → { nextNumero: N }  (global, todos os tenants)
 * Depois: counters/rr-infocell   → { nextNumero: N }  (herda o valor atual)
 *         counters/nextassist-demo → { nextNumero: 1 } (começa do zero)
 *
 * Idempotente: se o counter do tenant já existir, não sobrescreve.
 *
 * Uso:
 *   cd backend
 *   ALLOW_OS_COUNTER_MIGRATION=true npx tsx src/scripts/migrate-os-counter-per-tenant.ts
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.ALLOW_OS_COUNTER_MIGRATION !== "true") {
  console.error("ERRO: variavel ALLOW_OS_COUNTER_MIGRATION=true nao definida.");
  console.error(
    "Para executar: ALLOW_OS_COUNTER_MIGRATION=true npx tsx src/scripts/migrate-os-counter-per-tenant.ts",
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

const COUNTERS = "counters";
const GLOBAL_COUNTER_DOC = "ordensServico";

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("MIGRACAO: counter OS global → por tenant");
  console.log(SEP);

  // 1. Lê o counter global atual
  const globalRef = db.collection(COUNTERS).doc(GLOBAL_COUNTER_DOC);
  const globalSnap = await globalRef.get();

  if (!globalSnap.exists) {
    console.error(`counters/${GLOBAL_COUNTER_DOC} nao encontrado. Nada a migrar.`);
    process.exit(1);
  }

  const globalNextNumero = Number(globalSnap.data()?.nextNumero ?? 1);
  console.log(`\nCounter global atual: counters/${GLOBAL_COUNTER_DOC}.nextNumero = ${globalNextNumero}`);

  // 2. Descobre qual o maior numero de OS real do tenant rr-infocell
  console.log("\nVerificando maior numero de OS do tenant rr-infocell...");
  const snapshot = await db
    .collection("ordensServico")
    .where("tenantId", "==", "rr-infocell")
    .get();

  const numeros = snapshot.docs
    .map((d) => Number(d.data().numero ?? 0))
    .filter((n) => n > 0);

  const maxNumeroRR = numeros.length > 0 ? Math.max(...numeros) : 0;
  // Usa o maior entre o counter global e o maior numero real (segurança extra)
  const nextNumeroRR = Math.max(globalNextNumero, maxNumeroRR + 1);

  console.log(`  Maior OS rr-infocell: ${maxNumeroRR}`);
  console.log(`  Valor a usar para counters/rr-infocell: ${nextNumeroRR}`);

  // 3. Cria counters/rr-infocell (se não existir)
  const rrRef = db.collection(COUNTERS).doc("rr-infocell");
  const rrSnap = await rrRef.get();

  if (rrSnap.exists) {
    console.log(`\n  counters/rr-infocell ja existe (nextNumero=${rrSnap.data()?.nextNumero}) — skipped`);
  } else {
    await rrRef.set({ nextNumero: nextNumeroRR });
    console.log(`\n  counters/rr-infocell criado com nextNumero=${nextNumeroRR}`);
  }

  // 4. Cria counters/nextassist-demo (se não existir)
  const demoRef = db.collection(COUNTERS).doc("nextassist-demo");
  const demoSnap = await demoRef.get();

  if (demoSnap.exists) {
    console.log(`  counters/nextassist-demo ja existe (nextNumero=${demoSnap.data()?.nextNumero}) — skipped`);
  } else {
    await demoRef.set({ nextNumero: 1 });
    console.log(`  counters/nextassist-demo criado com nextNumero=1`);
  }

  console.log("\n" + SEP);
  console.log("CONCLUIDO");
  console.log(SEP);
  console.log("\nProximos passos:");
  console.log("  1. Deploy do backend com a correcao do counter por tenant");
  console.log("  2. Verificar que novas OS do rr-infocell continuam a sequencia correta");
  console.log(
    "  3. O documento counters/ordensServico pode ser mantido por precaucao — nao e mais usado",
  );
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
