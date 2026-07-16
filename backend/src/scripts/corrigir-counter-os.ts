/**
 * Diagnostica e corrige o counter de OS para o tenant rr-infocell.
 *
 * Problema: o counter counters/rr-infocell.nextNumero ficou desalinhado
 * com as OSes reais, causando numeros duplicados.
 *
 * O que este script faz:
 *  1. Exibe o valor atual do counter
 *  2. Exibe todas as OSes com numero duplicado
 *  3. Com --fix: corrige o counter para max(numero) + 1
 *
 * Uso (apenas diagnóstico):
 *   cd backend
 *   npx tsx src/scripts/corrigir-counter-os.ts
 *
 * Uso (corrigir):
 *   cd backend
 *   CORRIGIR_COUNTER=true npx tsx src/scripts/corrigir-counter-os.ts
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
const TENANT_ID = "rr-infocell";
const SEP = "=".repeat(60);

async function main() {
  console.log(SEP);
  console.log("DIAGNÓSTICO: Counter de OS — tenant rr-infocell");
  console.log(SEP);

  // 1. Lê o counter atual
  const counterRef = db.collection("counters").doc(TENANT_ID);
  const counterSnap = await counterRef.get();

  if (!counterSnap.exists) {
    console.error("\nERRO: counters/rr-infocell não existe!");
  } else {
    console.log(
      `\nCounter atual: counters/rr-infocell.nextNumero = ${counterSnap.data()?.nextNumero}`,
    );
  }

  // 2. Busca todas as OSes do tenant
  const snap = await db.collection("ordensServico").where("tenantId", "==", TENANT_ID).get();

  const todos = snap.docs.map((d) => ({
    id: d.id,
    numero: Number(d.data().numero ?? 0),
    status: String(d.data().status ?? ""),
    entradaEm: String(d.data().entradaEm ?? ""),
    clienteId: String(d.data().clienteId ?? ""),
  }));

  // 3. Detecta duplicatas
  const byNumero = new Map<number, typeof todos>();
  for (const os of todos) {
    if (!byNumero.has(os.numero)) byNumero.set(os.numero, []);
    byNumero.get(os.numero)!.push(os);
  }

  const duplicatas = [...byNumero.entries()]
    .filter(([, list]) => list.length > 1)
    .sort(([a], [b]) => a - b);

  if (duplicatas.length === 0) {
    console.log("\nNenhuma OS com numero duplicado encontrada.");
  } else {
    console.log(`\n${duplicatas.length} numero(s) de OS duplicado(s):\n`);
    for (const [numero, list] of duplicatas) {
      console.log(`  OS ${numero}:`);
      for (const os of list) {
        console.log(
          `    id=${os.id}  status=${os.status}  entrada=${os.entradaEm.substring(0, 10)}  cliente=${os.clienteId}`,
        );
      }
    }
  }

  // 4. Exibe estatísticas
  const numeros = todos.map((o) => o.numero).filter((n) => n > 0);
  const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
  const nextCorreto = maxNumero + 1;

  console.log(`\nTotal de OSes no tenant: ${todos.length}`);
  console.log(`Maior numero de OS: ${maxNumero}`);
  console.log(`Counter correto deveria ser: ${nextCorreto}`);

  if (counterSnap.exists) {
    const atual = Number(counterSnap.data()?.nextNumero ?? 0);
    if (atual < nextCorreto) {
      console.log(`\nPROBLEMA: counter atual (${atual}) está ABAIXO do esperado (${nextCorreto}).`);
      console.log("Novas OSes receberão números já existentes — causando duplicatas.");
    } else if (atual > nextCorreto) {
      console.log(`\nAVISO: counter atual (${atual}) está acima do esperado (${nextCorreto}).`);
      console.log("Haverá lacunas na sequência (numeros pulados), mas não duplicatas.");
    } else {
      console.log("\nCounter está correto.");
    }
  }

  // 5. Corrige se solicitado
  if (process.env.CORRIGIR_COUNTER === "true") {
    console.log(`\n${SEP}`);
    console.log(`CORRIGINDO counter para ${nextCorreto}...`);

    await counterRef.set({ nextNumero: nextCorreto }, { merge: true });

    const verificacao = await counterRef.get();
    console.log(`Counter após correção: ${verificacao.data()?.nextNumero}`);
    console.log("Correção concluída.");
  } else {
    console.log("\nPara corrigir, execute:");
    console.log(`  CORRIGIR_COUNTER=true npx tsx src/scripts/corrigir-counter-os.ts`);
  }

  console.log("\n" + SEP);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
