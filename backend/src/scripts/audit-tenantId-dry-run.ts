/**
 * Auditoria dry-run: mapeia documentos sem tenantId no Firestore.
 * MODO SOMENTE LEITURA — nenhuma escrita e feita no banco.
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/audit-tenantId-dry-run.ts
 *
 * O relatorio e gerado em:
 *   docs/nextassist/reports/audit-tenantId-dry-run-<timestamp>.md
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Constante de seguranca: DRY_RUN nunca pode ser false neste script.
// Para escrever no Firestore, crie um script separado com revisao obrigatoria.
const DRY_RUN = true as const;

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

const TENANT_ID_ESPERADO = "rr-infocell";
const MAX_IDS_NO_RELATORIO = 50;
const MAX_OS_PARA_MAPEAR_RELACOES = 200;

const COLLECTIONS = [
  "marcas",
  "categorias",
  "clientes",
  "produtos",
  "despesas",
  "contas",
  "ordensServico",
  "movimentacoesEstoque",
  "vendas",
] as const;

type CollectionName = (typeof COLLECTIONS)[number];

interface CollectionStats {
  collection: CollectionName;
  total: number;
  comTenantId: number;
  semTenantId: number;
  percentualSem: string;
  idsSemTenantId: string[];
  truncated: boolean;
}

interface OsRelacoes {
  osId: string;
  osNumero: number;
  vendasVinculadas: Array<{ id: string; comTenantId: boolean }>;
  movimentacoesVinculadas: Array<{ id: string; comTenantId: boolean }>;
  alertaInconsistencia: boolean;
}

// ── Auditoria por collection ──────────────────────────────────────────────────

async function auditarCollection(name: CollectionName): Promise<CollectionStats> {
  const snap = await db.collection(name).get();
  const total = snap.docs.length;
  const docsSemTenant = snap.docs.filter((doc) => !doc.data().tenantId);
  const ids = docsSemTenant.map((doc) => doc.id);
  const truncated = ids.length > MAX_IDS_NO_RELATORIO;

  return {
    collection: name,
    total,
    comTenantId: total - docsSemTenant.length,
    semTenantId: docsSemTenant.length,
    percentualSem: total > 0 ? `${((docsSemTenant.length / total) * 100).toFixed(1)}%` : "0%",
    idsSemTenantId: ids.slice(0, MAX_IDS_NO_RELATORIO),
    truncated,
  };
}

// ── Mapeamento de relacoes criticas OS → vendas → movimentacoes ───────────────

async function mapearRelacoesOs(osStats: CollectionStats): Promise<{
  relacoes: OsRelacoes[];
  truncatedRelacoes: boolean;
}> {
  const snap = await db.collection("ordensServico").get();
  const osSemTenant = snap.docs.filter((doc) => !doc.data().tenantId);

  const truncatedRelacoes = osSemTenant.length > MAX_OS_PARA_MAPEAR_RELACOES;
  const osParaMapear = osSemTenant.slice(0, MAX_OS_PARA_MAPEAR_RELACOES);

  const relacoes: OsRelacoes[] = [];

  for (const osDoc of osParaMapear) {
    const osId = osDoc.id;
    const osNumero = Number(osDoc.data().numero ?? 0);

    // Somente leitura — .get() apenas
    const vendasSnap = await db.collection("vendas").where("ordemServicoId", "==", osId).get();
    const vendasVinculadas = vendasSnap.docs.map((doc) => ({
      id: doc.id,
      comTenantId: !!doc.data().tenantId,
    }));

    const movSnap = await db
      .collection("movimentacoesEstoque")
      .where("ordemServicoId", "==", osId)
      .get();
    const movimentacoesVinculadas = movSnap.docs.map((doc) => ({
      id: doc.id,
      comTenantId: !!doc.data().tenantId,
    }));

    // Alerta: OS sem tenantId mas com venda ou movimentacao que ja tem tenantId
    const alertaInconsistencia =
      vendasVinculadas.some((v) => v.comTenantId) ||
      movimentacoesVinculadas.some((m) => m.comTenantId);

    relacoes.push({
      osId,
      osNumero,
      vendasVinculadas,
      movimentacoesVinculadas,
      alertaInconsistencia,
    });
  }

  // Ordenar OS com inconsistencia primeiro
  relacoes.sort((a, b) => Number(b.alertaInconsistencia) - Number(a.alertaInconsistencia));

  void osStats; // referencia para satisfazer o compilador — osStats e usado apenas para log externo

  return { relacoes, truncatedRelacoes };
}

// ── Geracao do relatorio Markdown ─────────────────────────────────────────────

function gerarRelatorioMd(
  stats: CollectionStats[],
  relacoes: OsRelacoes[],
  truncatedRelacoes: boolean,
  ambiente: string,
  timestamp: string,
): string {
  const L: string[] = [];

  L.push(`# Relatorio Dry-Run — Auditoria de tenantId`);
  L.push(``);
  L.push(`> **SOMENTE LEITURA — nenhuma escrita foi feita no Firestore.**`);
  L.push(``);
  L.push(`| Campo | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Data/hora | ${timestamp} |`);
  L.push(`| Ambiente | ${ambiente} |`);
  L.push(`| Projeto Firebase | ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"} |`);
  L.push(`| tenantId esperado | \`${TENANT_ID_ESPERADO}\` |`);
  L.push(`| DRY_RUN | ${String(DRY_RUN)} |`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 1. Volumes por collection`);
  L.push(``);
  L.push(`| Collection | Total | Com tenantId | Sem tenantId | % sem |`);
  L.push(`| --- | --- | --- | --- | --- |`);

  let totalGeral = 0;
  let totalSem = 0;
  for (const s of stats) {
    totalGeral += s.total;
    totalSem += s.semTenantId;
    L.push(
      `| ${s.collection} | ${s.total} | ${s.comTenantId} | ${s.semTenantId} | ${s.percentualSem} |`,
    );
  }

  L.push(``);
  L.push(`**Total geral:** ${totalGeral} documentos | **Sem tenantId:** ${totalSem}`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 2. IDs sem tenantId por collection`);
  L.push(``);

  for (const s of stats) {
    L.push(`### ${s.collection}`);
    L.push(``);
    if (s.semTenantId === 0) {
      L.push(`Todos os ${s.total} documentos possuem \`tenantId\`. Nenhuma acao necessaria.`);
    } else {
      if (s.truncated) {
        L.push(`> Listagem limitada a ${MAX_IDS_NO_RELATORIO} de ${s.semTenantId} IDs.`);
        L.push(``);
      }
      for (const id of s.idsSemTenantId) {
        L.push(`- \`${id}\``);
      }
    }
    L.push(``);
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 3. Relacoes criticas: OS → Vendas → Movimentacoes`);
  L.push(``);

  const osSemTenantCount = stats.find((s) => s.collection === "ordensServico")?.semTenantId ?? 0;

  if (osSemTenantCount === 0) {
    L.push(`Nenhuma OS sem tenantId encontrada. Sem relacoes criticas a mapear.`);
  } else {
    if (truncatedRelacoes) {
      L.push(
        `> Mapeamento limitado a ${MAX_OS_PARA_MAPEAR_RELACOES} de ${osSemTenantCount} OS. OS com inconsistencia aparecem primeiro.`,
      );
      L.push(``);
    }

    const inconsistentes = relacoes.filter((r) => r.alertaInconsistencia);
    if (inconsistentes.length > 0) {
      L.push(
        `> **ATENCAO: ${inconsistentes.length} OS possuem venda ou movimentacao ja com tenantId — revisar antes de migrar.**`,
      );
      L.push(``);
    }

    L.push(`Total de OS sem tenantId mapeadas: **${relacoes.length}**`);
    L.push(``);

    for (const rel of relacoes) {
      const alerta = rel.alertaInconsistencia ? " ⚠️ INCONSISTENCIA" : "";
      L.push(`#### OS-${rel.osNumero} \`${rel.osId}\`${alerta}`);
      L.push(``);

      if (rel.vendasVinculadas.length === 0) {
        L.push(`- Vendas vinculadas: **nenhuma**`);
      } else {
        for (const v of rel.vendasVinculadas) {
          const estado = v.comTenantId ? "**ja tem tenantId** ⚠️" : "sem tenantId";
          L.push(`- Venda \`${v.id}\`: ${estado}`);
        }
      }

      if (rel.movimentacoesVinculadas.length === 0) {
        L.push(`- Movimentacoes vinculadas: **nenhuma**`);
      } else {
        for (const m of rel.movimentacoesVinculadas) {
          const estado = m.comTenantId ? "**ja tem tenantId** ⚠️" : "sem tenantId";
          L.push(`- Movimentacao \`${m.id}\`: ${estado}`);
        }
      }
      L.push(``);
    }
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 4. Recomendacoes`);
  L.push(``);

  const byCol: Record<string, number> = {};
  for (const s of stats) byCol[s.collection] = s.semTenantId;

  L.push(`### Grupo A — migracao por edicao manual (sem script)`);
  L.push(``);
  for (const col of ["clientes", "produtos", "despesas", "ordensServico"]) {
    const n = byCol[col] ?? 0;
    const obs =
      n === 0 ? "nenhuma acao necessaria" : "editar qualquer campo aplica tenantId automaticamente";
    L.push(`- **${col}:** ${n} sem tenantId — ${obs}`);
  }
  L.push(``);
  L.push(`### Grupo B — script obrigatorio`);
  L.push(``);
  for (const col of ["contas", "movimentacoesEstoque", "vendas"]) {
    const n = byCol[col] ?? 0;
    const obs =
      n === 0
        ? "nenhuma acao necessaria"
        : "script obrigatorio (imutavel ou PUT parcial nao injeta tenantId)";
    L.push(`- **${col}:** ${n} sem tenantId — ${obs}`);
  }
  L.push(``);
  L.push(`### Regra critica de migracao conjunta`);
  L.push(``);
  L.push(`Se houver OS a migrar via script:`);
  L.push(
    `**OS + vendas vinculadas + movimentacoes vinculadas devem receber tenantId no mesmo batch.**`,
  );
  L.push(`Migrar OS sem venda abre risco de venda duplicada (findByOrdem retorna null).`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 5. Aviso`);
  L.push(``);
  L.push(`**Nenhuma escrita foi feita no Firestore durante esta auditoria.**`);
  L.push(`Nenhum documento foi alterado, criado ou removido.`);
  L.push(``);
  L.push(`Para prosseguir com a migracao real, consulte:`);
  L.push(`- \`docs/nextassist/plano-migracao-tenantId-dados-antigos.md\``);
  L.push(`- \`docs/nextassist/dry-run-tenantId-auditoria.md\``);

  return L.join("\n");
}

// ── Execucao ──────────────────────────────────────────────────────────────────

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("AUDIT DRY-RUN — Documentos sem tenantId no Firestore");
  console.log("MODO SOMENTE LEITURA — Nenhuma escrita sera feita");
  console.log(SEP);
  console.log();

  const ambiente = process.env.NODE_ENV ?? "development";
  const timestamp = new Date().toISOString();

  console.log(`Ambiente:  ${ambiente}`);
  console.log(`Projeto:   ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log();

  // ── Auditoria das collections ──────────────────────────────────────────────

  console.log("Analisando collections...");
  const stats: CollectionStats[] = [];
  for (const col of COLLECTIONS) {
    process.stdout.write(`  ${col}... `);
    const s = await auditarCollection(col);
    stats.push(s);
    const icon = s.semTenantId === 0 ? "ok" : `${s.semTenantId} sem tenantId`;
    console.log(icon);
  }

  // ── Mapeamento de relacoes ─────────────────────────────────────────────────

  console.log();
  const osStats = stats.find((s) => s.collection === "ordensServico")!;
  console.log(
    `Mapeando relacoes OS → vendas → movimentacoes (${osStats.semTenantId} OS sem tenantId)...`,
  );
  const { relacoes, truncatedRelacoes } = await mapearRelacoesOs(osStats);
  console.log(
    `  ${relacoes.length} OS mapeadas${truncatedRelacoes ? ` (limitado a ${MAX_OS_PARA_MAPEAR_RELACOES})` : ""}`,
  );

  const inconsistentes = relacoes.filter((r) => r.alertaInconsistencia);
  if (inconsistentes.length > 0) {
    console.log(`  ATENCAO: ${inconsistentes.length} OS com inconsistencia detectada`);
  }

  // ── Gerar relatorio ────────────────────────────────────────────────────────

  console.log();
  console.log("Gerando relatorio Markdown...");

  const relatorioMd = gerarRelatorioMd(stats, relacoes, truncatedRelacoes, ambiente, timestamp);

  const reportDir = join(process.cwd(), "..", "docs", "nextassist", "reports");
  const tsafe = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(reportDir, `audit-tenantId-dry-run-${tsafe}.md`);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, relatorioMd, "utf-8");

  // ── Resumo no console ──────────────────────────────────────────────────────

  console.log();
  console.log(SEP);
  console.log("RESUMO");
  console.log(SEP);
  console.log();

  let totalGeral = 0;
  let totalSem = 0;
  for (const s of stats) {
    totalGeral += s.total;
    totalSem += s.semTenantId;
    const icon = s.semTenantId === 0 ? "✅" : "⚠️ ";
    console.log(`${icon} ${s.collection.padEnd(22)} ${s.semTenantId}/${s.total} sem tenantId`);
  }

  console.log();
  console.log(`Total: ${totalGeral} documentos | Sem tenantId: ${totalSem}`);
  console.log(`OS mapeadas: ${relacoes.length} | Inconsistencias: ${inconsistentes.length}`);
  console.log();
  console.log(`Relatorio gerado em:`);
  console.log(`  ${reportPath}`);
  console.log();
  console.log("Nenhuma escrita foi feita no Firestore.");
  console.log(SEP);
}

main().catch((err) => {
  console.error("Erro durante auditoria:", err);
  process.exit(1);
});
