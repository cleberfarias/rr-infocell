/**
 * Auditoria dry-run: mapeia usuarios do Firebase Auth e seus documentos usuarios/{uid}.
 * MODO SOMENTE LEITURA — nenhuma escrita e feita no Firestore, nenhuma claim e alterada.
 *
 * Uso:
 *   cd backend
 *   npx tsx src/scripts/audit-users-tenant-dry-run.ts
 *
 * O relatorio e gerado em:
 *   docs/nextassist/reports/audit-users-tenant-dry-run-<timestamp>.md
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Constante de seguranca: DRY_RUN nunca pode ser false neste script.
// Para escrever no Firestore, crie um script separado com revisao obrigatoria.
const DRY_RUN = true as const;

const TENANT_PADRAO = "rr-infocell";
const COLECAO_USUARIOS = "usuarios";

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();
const db = getFirestore();

// ── Tipos ────────────────────────────────────────────────────────────────────

type AcaoRecomendada =
  | "criar-documento"
  | "manter-documento"
  | "revisar-manualmente"
  | "ignorar-desativado";

interface AuditoriaUsuario {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  disabled: boolean;
  roleNoClaim: string | undefined;
  temDocumentoFirestore: boolean;
  tenantIdNoDocumento: string | undefined;
  statusNoDocumento: string | undefined;
  acao: AcaoRecomendada;
  motivoRevisao: string | undefined;
}

// ── Listagem de usuarios do Firebase Auth ─────────────────────────────────────

async function listarTodosUsuariosAuth(): Promise<
  Array<{
    uid: string;
    email: string | undefined;
    displayName: string | undefined;
    disabled: boolean;
    customClaims: Record<string, unknown> | undefined;
  }>
> {
  const usuarios = [];
  let pageToken: string | undefined = undefined;

  do {
    const resultado = await auth.listUsers(1000, pageToken);
    for (const user of resultado.users) {
      usuarios.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        customClaims: user.customClaims as Record<string, unknown> | undefined,
      });
    }
    pageToken = resultado.pageToken;
  } while (pageToken);

  return usuarios;
}

// ── Leitura dos documentos usuarios/{uid} no Firestore ────────────────────────

async function buscarDocumentosUsuarios(
  uids: string[],
): Promise<Map<string, { tenantId?: string; status?: string }>> {
  const mapa = new Map<string, { tenantId?: string; status?: string }>();

  // Firestore suporta ate 30 itens por getAll; processar em lotes
  const LOTE = 30;
  for (let i = 0; i < uids.length; i += LOTE) {
    const lote = uids.slice(i, i + LOTE);
    const refs = lote.map((uid) => db.collection(COLECAO_USUARIOS).doc(uid));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) {
        const data = snap.data() ?? {};
        mapa.set(snap.id, {
          tenantId: data["tenantId"] as string | undefined,
          status: data["status"] as string | undefined,
        });
      }
    }
  }

  return mapa;
}

// ── Logica de recomendacao ────────────────────────────────────────────────────

function determinarAcao(
  user: { uid: string; disabled: boolean },
  doc: { tenantId?: string; status?: string } | undefined,
): { acao: AcaoRecomendada; motivoRevisao: string | undefined } {
  if (user.disabled && !doc) {
    return { acao: "ignorar-desativado", motivoRevisao: undefined };
  }

  if (!doc) {
    return { acao: "criar-documento", motivoRevisao: undefined };
  }

  if (!doc.tenantId) {
    return {
      acao: "revisar-manualmente",
      motivoRevisao: "documento existe mas nao tem tenantId",
    };
  }

  if (doc.tenantId !== TENANT_PADRAO) {
    return {
      acao: "revisar-manualmente",
      motivoRevisao: `tenantId inesperado: "${doc.tenantId}" (esperado "${TENANT_PADRAO}")`,
    };
  }

  if (!doc.status) {
    return {
      acao: "revisar-manualmente",
      motivoRevisao: "documento existe mas campo status ausente",
    };
  }

  return { acao: "manter-documento", motivoRevisao: undefined };
}

// ── Geracao do relatorio Markdown ─────────────────────────────────────────────

function gerarRelatorioMd(
  auditoria: AuditoriaUsuario[],
  ambiente: string,
  timestamp: string,
): string {
  const L: string[] = [];

  const totalAuth = auditoria.length;
  const comDocumento = auditoria.filter((u) => u.temDocumentoFirestore).length;
  const semDocumento = auditoria.filter(
    (u) => !u.temDocumentoFirestore && u.acao === "criar-documento",
  ).length;
  const desativados = auditoria.filter((u) => u.disabled).length;
  const aRevisar = auditoria.filter((u) => u.acao === "revisar-manualmente").length;
  const ignorados = auditoria.filter((u) => u.acao === "ignorar-desativado").length;

  const rolesCounts: Record<string, number> = {};
  for (const u of auditoria) {
    const role = u.roleNoClaim ?? "(sem role)";
    rolesCounts[role] = (rolesCounts[role] ?? 0) + 1;
  }

  L.push(`# Relatorio Dry-Run — Auditoria Usuarios x Tenant`);
  L.push(``);
  L.push(`> **SOMENTE LEITURA — nenhuma escrita foi feita no Firestore. Nenhuma custom claim foi alterada.**`);
  L.push(``);
  L.push(`| Campo | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Data/hora | ${timestamp} |`);
  L.push(`| Ambiente | ${ambiente} |`);
  L.push(`| Projeto Firebase | ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"} |`);
  L.push(`| Colecao auditada | \`${COLECAO_USUARIOS}\` |`);
  L.push(`| Tenant padrao esperado | \`${TENANT_PADRAO}\` |`);
  L.push(`| DRY_RUN | ${String(DRY_RUN)} |`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 1. Resumo`);
  L.push(``);
  L.push(`| Metrica | Quantidade |`);
  L.push(`| --- | --- |`);
  L.push(`| Total de usuarios no Firebase Auth | ${totalAuth} |`);
  L.push(`| Com documento \`usuarios/{uid}\` | ${comDocumento} |`);
  L.push(`| Sem documento (acao: criar) | ${semDocumento} |`);
  L.push(`| Usuarios desativados (ignorados) | ${ignorados} |`);
  L.push(`| Usuarios desativados (total) | ${desativados} |`);
  L.push(`| Requerem revisao manual | ${aRevisar} |`);
  L.push(``);
  L.push(`### Roles encontradas (custom claims)`);
  L.push(``);
  L.push(`| Role | Quantidade |`);
  L.push(`| --- | --- |`);
  for (const [role, count] of Object.entries(rolesCounts).sort()) {
    L.push(`| ${role} | ${count} |`);
  }
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 2. Detalhe por usuario`);
  L.push(``);

  const acaoLabel: Record<AcaoRecomendada, string> = {
    "criar-documento": "⬜ criar documento",
    "manter-documento": "✅ manter documento",
    "revisar-manualmente": "⚠️  revisar manualmente",
    "ignorar-desativado": "🔕 ignorar (desativado)",
  };

  const ordem: AcaoRecomendada[] = [
    "revisar-manualmente",
    "criar-documento",
    "manter-documento",
    "ignorar-desativado",
  ];

  for (const acao of ordem) {
    const grupo = auditoria.filter((u) => u.acao === acao);
    if (grupo.length === 0) continue;

    L.push(`### ${acaoLabel[acao]} (${grupo.length})`);
    L.push(``);
    L.push(`| UID | Email | Role | Status doc | tenantId doc | Motivo |`);
    L.push(`| --- | --- | --- | --- | --- | --- |`);

    for (const u of grupo) {
      const email = u.email ?? "(sem email)";
      const role = u.roleNoClaim ?? "(sem role)";
      const statusDoc = u.statusNoDocumento ?? "—";
      const tenantDoc = u.tenantIdNoDocumento ?? "—";
      const motivo = u.motivoRevisao ?? "—";
      L.push(`| \`${u.uid}\` | ${email} | ${role} | ${statusDoc} | ${tenantDoc} | ${motivo} |`);
    }

    L.push(``);
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 3. Proximos passos`);
  L.push(``);

  if (aRevisar > 0) {
    L.push(`> ⚠️  **${aRevisar} usuario(s) requerem revisao manual antes de prosseguir para a Fase 9.3.**`);
    L.push(`> Verifique cada caso na secao "revisar manualmente" acima.`);
    L.push(``);
  }

  if (semDocumento > 0) {
    L.push(
      `- **${semDocumento} usuario(s)** precisam de documento \`usuarios/{uid}\` com \`tenantId: "${TENANT_PADRAO}"\`.`,
    );
    L.push(
      `  → Serao criados na **Fase 9.3** via script separado, somente apos revisao deste relatorio.`,
    );
    L.push(``);
  } else {
    L.push(`- ✅ Todos os usuarios ativos ja possuem documento \`usuarios/{uid}\` valido.`);
    L.push(``);
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 4. Aviso`);
  L.push(``);
  L.push(`**Nenhuma escrita foi feita no Firestore durante esta auditoria.**`);
  L.push(`Nenhum documento foi criado, alterado ou removido.`);
  L.push(`Nenhuma custom claim foi alterada.`);
  L.push(``);
  L.push(`Para prosseguir com a criacao dos documentos, consulte:`);
  L.push(`- \`docs/nextassist/dry-run-usuarios-tenant.md\``);
  L.push(`- \`docs/nextassist/modelo-usuario-tenant.md\``);

  return L.join("\n");
}

// ── Execucao ──────────────────────────────────────────────────────────────────

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("AUDIT DRY-RUN — Usuarios x Tenant");
  console.log("MODO SOMENTE LEITURA — Nenhuma escrita sera feita");
  console.log(SEP);
  console.log();

  const ambiente = process.env.NODE_ENV ?? "development";
  const timestamp = new Date().toISOString();

  console.log(`Ambiente:  ${ambiente}`);
  console.log(`Projeto:   ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log();

  // ── 1. Listar usuarios do Firebase Auth ───────────────────────────────────

  console.log("Listando usuarios do Firebase Auth...");
  const authUsers = await listarTodosUsuariosAuth();
  console.log(`  ${authUsers.length} usuario(s) encontrado(s)`);
  console.log();

  // ── 2. Buscar documentos no Firestore ─────────────────────────────────────

  console.log(`Buscando documentos na colecao "${COLECAO_USUARIOS}"...`);
  const uids = authUsers.map((u) => u.uid);
  const documentos = await buscarDocumentosUsuarios(uids);
  console.log(`  ${documentos.size} documento(s) encontrado(s)`);
  console.log();

  // ── 3. Cruzar dados e determinar acao ─────────────────────────────────────

  console.log("Cruzando dados e determinando recomendacoes...");
  const auditoria: AuditoriaUsuario[] = [];

  for (const user of authUsers) {
    const doc = documentos.get(user.uid);
    const roleNoClaim = user.customClaims?.["role"] as string | undefined;
    const { acao, motivoRevisao } = determinarAcao(user, doc);

    auditoria.push({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      disabled: user.disabled,
      roleNoClaim,
      temDocumentoFirestore: !!doc,
      tenantIdNoDocumento: doc?.tenantId,
      statusNoDocumento: doc?.status,
      acao,
      motivoRevisao,
    });
  }

  // ── 4. Gerar relatorio ────────────────────────────────────────────────────

  console.log("Gerando relatorio Markdown...");
  const relatorioMd = gerarRelatorioMd(auditoria, ambiente, timestamp);

  const reportDir = join(process.cwd(), "..", "docs", "nextassist", "reports");
  const tsafe = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(reportDir, `audit-users-tenant-dry-run-${tsafe}.md`);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, relatorioMd, "utf-8");

  // ── 5. Resumo no console ──────────────────────────────────────────────────

  const porAcao = (a: AcaoRecomendada) => auditoria.filter((u) => u.acao === a).length;

  console.log();
  console.log(SEP);
  console.log("RESUMO");
  console.log(SEP);
  console.log();
  console.log(`Total no Firebase Auth:  ${authUsers.length}`);
  console.log(`Com documento Firestore: ${documentos.size}`);
  console.log();
  console.log(`✅  Manter documento:     ${porAcao("manter-documento")}`);
  console.log(`⬜  Criar documento:      ${porAcao("criar-documento")}`);
  console.log(`⚠️   Revisar manualmente:  ${porAcao("revisar-manualmente")}`);
  console.log(`🔕  Ignorar (desativado): ${porAcao("ignorar-desativado")}`);
  console.log();
  console.log(`Relatorio gerado em:`);
  console.log(`  ${reportPath}`);
  console.log();
  console.log("Nenhuma escrita foi feita no Firestore.");
  console.log("Nenhuma custom claim foi alterada.");
  console.log(SEP);
}

main().catch((err) => {
  console.error("Erro durante auditoria:", err);
  process.exit(1);
});
