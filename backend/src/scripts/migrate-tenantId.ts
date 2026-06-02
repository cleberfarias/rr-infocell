/**
 * Script de migracao real: aplica tenantId em documentos sem tenantId.
 * REQUER: variavel de ambiente ALLOW_MIGRATION=true para executar escritas.
 *
 * Uso (backup previo obrigatorio):
 *   cd backend
 *   ALLOW_MIGRATION=true npx tsx src/scripts/migrate-tenantId.ts
 *
 * O relatorio e gerado em:
 *   docs/nextassist/reports/migrate-tenantId-<timestamp>.md
 *
 * Idempotente: pode ser executado duas vezes com o mesmo resultado.
 * Nao sobrescreve tenantId existente.
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_TENANT_ID } from "../modules/tenants/tenant.config.js";

// ── Guard de seguranca ────────────────────────────────────────────────────────
// Esta variavel deve ser definida explicitamente para permitir escritas.
// Nenhuma escrita ocorre sem ela.

if (process.env.ALLOW_MIGRATION !== "true") {
  console.error("ERRO: variavel ALLOW_MIGRATION=true nao definida.");
  console.error("Para executar com escritas no Firestore:");
  console.error("  ALLOW_MIGRATION=true npx tsx src/scripts/migrate-tenantId.ts");
  console.error("");
  console.error("BACKUP OBRIGATORIO antes de executar.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// Firestore batch limit: 500 operacoes. Usamos 400 por margem de seguranca.
const BATCH_SIZE = 400;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DocMigrado {
  id: string;
  collection: string;
  ts: string;
}

interface ResultadoLote {
  lote: number;
  collections: string[];
  migrados: DocMigrado[];
  pulados: number;
  batches: number;
}

type EscritaPendente = {
  ref: FirebaseFirestore.DocumentReference;
  data: Record<string, unknown>;
};

// ── Utilitario: commit em lotes ───────────────────────────────────────────────

async function commitarEmLotes(escritas: EscritaPendente[]): Promise<number> {
  if (escritas.length === 0) return 0;
  let batchCount = 0;
  for (let i = 0; i < escritas.length; i += BATCH_SIZE) {
    const chunk = escritas.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, data } of chunk) {
      batch.update(ref, data);
    }
    await batch.commit();
    batchCount++;
    console.log(`    batch ${batchCount} commitado (${chunk.length} docs)`);
  }
  return batchCount;
}

// ── Lote 1: clientes + produtos (sem dependencias cruzadas) ───────────────────

async function executarLote1(timestamp: string): Promise<ResultadoLote> {
  const resultado: ResultadoLote = {
    lote: 1,
    collections: ["clientes", "produtos"],
    migrados: [],
    pulados: 0,
    batches: 0,
  };

  const escritas: EscritaPendente[] = [];

  for (const colName of resultado.collections) {
    process.stdout.write(`  ${colName}... `);
    const snap = await db.collection(colName).get();
    let count = 0;
    for (const doc of snap.docs) {
      if (doc.data().tenantId) {
        resultado.pulados++;
        continue;
      }
      escritas.push({ ref: doc.ref, data: { tenantId: DEFAULT_TENANT_ID } });
      resultado.migrados.push({ id: doc.id, collection: colName, ts: timestamp });
      count++;
    }
    console.log(`${count} a migrar`);
  }

  console.log(`  commitando ${escritas.length} escritas...`);
  resultado.batches = await commitarEmLotes(escritas);
  return resultado;
}

// ── Lote 2: OS + vendas vinculadas + movimentacoes (bloco critico) ────────────
//
// Regra obrigatoria: OS sem tenantId deve ser migrada no mesmo batch que suas
// vendas e movimentacoes vinculadas. Migrar a OS sem a venda abre risco de
// venda duplicada (findByOrdem retorna null com filtro de tenantId ativo).
//
// Apos processar o bloco OS/venda/mov, o script cobre tambem:
// - movimentacoes manuais (sem ordemServicoId) sem tenantId
// - vendas diretas (sem ordemServicoId) sem tenantId

async function executarLote2(timestamp: string): Promise<ResultadoLote> {
  const resultado: ResultadoLote = {
    lote: 2,
    collections: ["ordensServico", "vendas", "movimentacoesEstoque"],
    migrados: [],
    pulados: 0,
    batches: 0,
  };

  const escritas: EscritaPendente[] = [];

  // IDs ja adicionados — previne duplicatas se uma venda/mov aparecer duas vezes
  const adicionados = new Set<string>();

  const adicionarSeNecessario = (
    ref: FirebaseFirestore.DocumentReference,
    colName: string,
  ) => {
    const key = `${colName}/${ref.id}`;
    if (adicionados.has(key)) return false;
    adicionados.add(key);
    escritas.push({ ref, data: { tenantId: DEFAULT_TENANT_ID } });
    resultado.migrados.push({ id: ref.id, collection: colName, ts: timestamp });
    return true;
  };

  // Bloco OS/venda/movimentacao
  process.stdout.write("  ordensServico (bloco critico)... ");
  const osSnap = await db.collection("ordensServico").get();
  const osSemTenant = osSnap.docs.filter((doc) => !doc.data().tenantId);
  console.log(`${osSemTenant.length} OS sem tenantId`);

  for (const osDoc of osSemTenant) {
    adicionarSeNecessario(osDoc.ref, "ordensServico");

    // Vendas vinculadas
    const vendasSnap = await db.collection("vendas").where("ordemServicoId", "==", osDoc.id).get();
    for (const vDoc of vendasSnap.docs) {
      if (vDoc.data().tenantId) { resultado.pulados++; continue; }
      adicionarSeNecessario(vDoc.ref, "vendas");
    }

    // Movimentacoes vinculadas
    const movSnap = await db
      .collection("movimentacoesEstoque")
      .where("ordemServicoId", "==", osDoc.id)
      .get();
    for (const mDoc of movSnap.docs) {
      if (mDoc.data().tenantId) { resultado.pulados++; continue; }
      adicionarSeNecessario(mDoc.ref, "movimentacoesEstoque");
    }
  }

  // Movimentacoes manuais (sem ordemServicoId) sem tenantId
  process.stdout.write("  movimentacoesEstoque (manuais)... ");
  const todasMov = await db.collection("movimentacoesEstoque").get();
  let movManuais = 0;
  for (const mDoc of todasMov.docs) {
    if (mDoc.data().tenantId) { resultado.pulados++; continue; }
    if (mDoc.data().ordemServicoId) continue; // ja processada no bloco OS acima
    if (adicionarSeNecessario(mDoc.ref, "movimentacoesEstoque")) movManuais++;
  }
  console.log(`${movManuais} manuais sem tenantId`);

  // Vendas diretas (sem ordemServicoId) sem tenantId
  process.stdout.write("  vendas (diretas)... ");
  const todasVendas = await db.collection("vendas").get();
  let vendasDiretas = 0;
  for (const vDoc of todasVendas.docs) {
    if (vDoc.data().tenantId) { resultado.pulados++; continue; }
    if (vDoc.data().ordemServicoId) continue; // ja processada no bloco OS acima
    if (adicionarSeNecessario(vDoc.ref, "vendas")) vendasDiretas++;
  }
  console.log(`${vendasDiretas} diretas sem tenantId`);

  console.log(`  commitando ${escritas.length} escritas...`);
  resultado.batches = await commitarEmLotes(escritas);
  return resultado;
}

// ── Geracao do relatorio Markdown ─────────────────────────────────────────────

function gerarRelatorio(
  lotes: ResultadoLote[],
  ambiente: string,
  timestamp: string,
): string {
  const L: string[] = [];

  L.push(`# Relatorio de Migracao — tenantId`);
  L.push(``);
  L.push(`> **Escrita real no Firestore. Backup previo obrigatorio antes de re-executar.**`);
  L.push(``);
  L.push(`| Campo | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Data/hora | ${timestamp} |`);
  L.push(`| Ambiente | ${ambiente} |`);
  L.push(`| Projeto Firebase | ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"} |`);
  L.push(`| tenantId aplicado | \`${DEFAULT_TENANT_ID}\` |`);
  L.push(``);
  L.push(`---`);
  L.push(``);

  let totalMigrado = 0;
  let totalPulado = 0;

  for (const lote of lotes) {
    totalMigrado += lote.migrados.length;
    totalPulado += lote.pulados;

    L.push(`## Lote ${lote.lote} — ${lote.collections.join(", ")}`);
    L.push(``);
    L.push(`| Metrica | Valor |`);
    L.push(`| --- | --- |`);
    L.push(`| Documentos migrados | ${lote.migrados.length} |`);
    L.push(`| Pulados (ja tinham tenantId) | ${lote.pulados} |`);
    L.push(`| Batches commitados | ${lote.batches} |`);
    L.push(``);

    if (lote.migrados.length > 0) {
      L.push(`### Documentos migrados`);
      L.push(``);
      L.push(`| Collection | ID | Timestamp |`);
      L.push(`| --- | --- | --- |`);
      for (const doc of lote.migrados) {
        L.push(`| ${doc.collection} | \`${doc.id}\` | ${doc.ts} |`);
      }
      L.push(``);
    } else {
      L.push(`Nenhum documento a migrar neste lote.`);
      L.push(``);
    }

    L.push(`---`);
    L.push(``);
  }

  L.push(`## Resumo final`);
  L.push(``);
  L.push(`| Metrica | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Total migrado | **${totalMigrado}** |`);
  L.push(`| Total pulado (idempotencia) | ${totalPulado} |`);
  L.push(``);
  L.push(`Script idempotente — re-executar nao altera documentos ja migrados.`);
  L.push(``);

  return L.join("\n");
}

// ── Execucao ──────────────────────────────────────────────────────────────────

async function main() {
  const SEP = "=".repeat(60);
  const ambiente = process.env.NODE_ENV ?? "development";
  const timestamp = new Date().toISOString();

  console.log(SEP);
  console.log("MIGRACAO tenantId — Escrita real no Firestore");
  console.log(`Ambiente:  ${ambiente}`);
  console.log(`Projeto:   ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`tenantId:  ${DEFAULT_TENANT_ID}`);
  console.log(SEP);
  console.log();

  const lotes: ResultadoLote[] = [];

  console.log("Lote 1: clientes + produtos (sem dependencias cruzadas)");
  const lote1 = await executarLote1(timestamp);
  lotes.push(lote1);
  console.log(`  -> ${lote1.migrados.length} migrados | ${lote1.pulados} pulados | ${lote1.batches} batches`);
  console.log();

  console.log("Lote 2: OS + vendas + movimentacoes (bloco critico)");
  const lote2 = await executarLote2(timestamp);
  lotes.push(lote2);
  console.log(`  -> ${lote2.migrados.length} migrados | ${lote2.pulados} pulados | ${lote2.batches} batches`);
  console.log();

  const relatorio = gerarRelatorio(lotes, ambiente, timestamp);

  const reportDir = join(process.cwd(), "..", "docs", "nextassist", "reports");
  const tsafe = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(reportDir, `migrate-tenantId-${tsafe}.md`);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, relatorio, "utf-8");

  const totalMigrado = lotes.reduce((s, l) => s + l.migrados.length, 0);

  console.log(SEP);
  console.log("CONCLUIDO");
  console.log(`Total migrado: ${totalMigrado}`);
  console.log(`Relatorio:     ${reportPath}`);
  console.log(SEP);
}

main().catch((err) => {
  console.error("ERRO durante migracao — script interrompido:", err);
  process.exit(1);
});
