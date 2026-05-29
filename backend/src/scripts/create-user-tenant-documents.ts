/**
 * Cria documentos usuarios/{uid} no Firestore para vincular usuarios ao tenant rr-infocell.
 * REQUER: variavel de ambiente ALLOW_USER_TENANT_CREATION=true para executar escritas.
 *
 * Uso:
 *   cd backend
 *   ALLOW_USER_TENANT_CREATION=true npx tsx src/scripts/create-user-tenant-documents.ts
 *
 * Idempotente: nao sobrescreve documentos que ja existem.
 * Usuarios desativados sao ignorados.
 * Nenhuma custom claim e alterada.
 *
 * O relatorio e gerado em:
 *   docs/nextassist/reports/create-user-tenant-documents-<timestamp>.md
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ── Guard de seguranca ────────────────────────────────────────────────────────
// Esta variavel deve ser definida explicitamente para permitir escritas.
// Nenhuma escrita ocorre sem ela.

if (process.env.ALLOW_USER_TENANT_CREATION !== "true") {
  console.error("ERRO: variavel ALLOW_USER_TENANT_CREATION=true nao definida.");
  console.error("Para executar com escritas no Firestore:");
  console.error(
    "  ALLOW_USER_TENANT_CREATION=true npx tsx src/scripts/create-user-tenant-documents.ts",
  );
  console.error("");
  console.error("Execute o dry-run antes para revisar o estado atual:");
  console.error("  npx tsx src/scripts/audit-users-tenant-dry-run.ts");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();
const db = getFirestore();

const TENANT_PADRAO = "rr-infocell";
const COLECAO_USUARIOS = "usuarios";

// Role usada quando o usuario nao tem custom claim role.
// "atendente" e o fallback seguro: menos privilegios que "admin".
const ROLE_FALLBACK = "atendente" as const;

// ── Tipos ─────────────────────────────────────────────────────────────────────

type UsuarioRole = "admin" | "atendente" | "tecnico";

const ROLES_VALIDAS: UsuarioRole[] = ["admin", "atendente", "tecnico"];

interface UsuarioProcessado {
  uid: string;
  email: string | undefined;
  nome: string | undefined;
  roleAplicada: UsuarioRole;
  roleFonteClaim: boolean;
  resultado: "criado" | "pulado-existe" | "ignorado-desativado";
}

interface DocumentoUsuario {
  uid: string;
  email: string;
  nome: string;
  tenantId: string;
  role: UsuarioRole;
  status: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Listagem de usuarios do Firebase Auth ─────────────────────────────────────

async function listarTodosUsuariosAuth() {
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

// ── Verificacao de existencia em lote ─────────────────────────────────────────

async function verificarDocumentosExistentes(uids: string[]): Promise<Set<string>> {
  const existentes = new Set<string>();
  const LOTE = 30;

  for (let i = 0; i < uids.length; i += LOTE) {
    const lote = uids.slice(i, i + LOTE);
    const refs = lote.map((uid) => db.collection(COLECAO_USUARIOS).doc(uid));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) existentes.add(snap.id);
    }
  }

  return existentes;
}

// ── Resolucao de role ─────────────────────────────────────────────────────────

function resolverRole(
  customClaims: Record<string, unknown> | undefined,
): { role: UsuarioRole; viaClaim: boolean } {
  const claimRole = customClaims?.["role"];
  if (typeof claimRole === "string" && ROLES_VALIDAS.includes(claimRole as UsuarioRole)) {
    return { role: claimRole as UsuarioRole, viaClaim: true };
  }
  return { role: ROLE_FALLBACK, viaClaim: false };
}

// ── Geracao do relatorio Markdown ─────────────────────────────────────────────

function gerarRelatorioMd(
  processados: UsuarioProcessado[],
  ambiente: string,
  timestamp: string,
): string {
  const L: string[] = [];

  const criados = processados.filter((u) => u.resultado === "criado");
  const pulados = processados.filter((u) => u.resultado === "pulado-existe");
  const ignorados = processados.filter((u) => u.resultado === "ignorado-desativado");
  const fallbacks = processados.filter((u) => u.resultado === "criado" && !u.roleFonteClaim);

  const rolesCriadas: Record<string, number> = {};
  for (const u of criados) {
    rolesCriadas[u.roleAplicada] = (rolesCriadas[u.roleAplicada] ?? 0) + 1;
  }

  L.push(`# Relatorio — Criacao de Documentos usuarios/{uid}`);
  L.push(``);
  L.push(`> **Escrita controlada — ALLOW_USER_TENANT_CREATION=true estava ativo.**`);
  L.push(`> Nenhuma custom claim foi alterada.`);
  L.push(``);
  L.push(`| Campo | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Data/hora | ${timestamp} |`);
  L.push(`| Ambiente | ${ambiente} |`);
  L.push(`| Projeto Firebase | ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"} |`);
  L.push(`| Colecao | \`${COLECAO_USUARIOS}\` |`);
  L.push(`| Tenant aplicado | \`${TENANT_PADRAO}\` |`);
  L.push(`| Role fallback | \`${ROLE_FALLBACK}\` (quando sem custom claim) |`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 1. Resumo`);
  L.push(``);
  L.push(`| Metrica | Quantidade |`);
  L.push(`| --- | --- |`);
  L.push(`| Total de usuarios no Firebase Auth | ${processados.length} |`);
  L.push(`| Documentos criados | ${criados.length} |`);
  L.push(`| Documentos pulados (ja existiam) | ${pulados.length} |`);
  L.push(`| Usuarios desativados ignorados | ${ignorados.length} |`);
  L.push(`| Roles via custom claim | ${criados.length - fallbacks.length} |`);
  L.push(`| Roles via fallback "${ROLE_FALLBACK}" | ${fallbacks.length} |`);
  L.push(``);

  if (Object.keys(rolesCriadas).length > 0) {
    L.push(`### Roles aplicadas nos documentos criados`);
    L.push(``);
    L.push(`| Role | Quantidade |`);
    L.push(`| --- | --- |`);
    for (const [role, count] of Object.entries(rolesCriadas).sort()) {
      L.push(`| ${role} | ${count} |`);
    }
    L.push(``);
  }

  L.push(`---`);
  L.push(``);

  if (criados.length > 0) {
    L.push(`## 2. Documentos criados`);
    L.push(``);
    L.push(`| UID | Email | Role | Fonte da role |`);
    L.push(`| --- | --- | --- | --- |`);
    for (const u of criados) {
      const email = u.email ?? "(sem email)";
      const fonte = u.roleFonteClaim ? "custom claim" : `fallback (sem claim)`;
      L.push(`| \`${u.uid}\` | ${email} | ${u.roleAplicada} | ${fonte} |`);
    }
    L.push(``);
  }

  if (pulados.length > 0) {
    L.push(`## 3. Documentos pulados (ja existiam)`);
    L.push(``);
    L.push(`| UID | Email |`);
    L.push(`| --- | --- |`);
    for (const u of pulados) {
      L.push(`| \`${u.uid}\` | ${u.email ?? "(sem email)"} |`);
    }
    L.push(``);
  }

  if (ignorados.length > 0) {
    L.push(`## 4. Usuarios desativados ignorados`);
    L.push(``);
    L.push(`| UID | Email |`);
    L.push(`| --- | --- |`);
    for (const u of ignorados) {
      L.push(`| \`${u.uid}\` | ${u.email ?? "(sem email)"} |`);
    }
    L.push(``);
  }

  if (fallbacks.length > 0) {
    L.push(`## 5. Usuarios com role por fallback`);
    L.push(``);
    L.push(
      `> Estes usuarios nao tinham custom claim \`role\` no Firebase Auth. Role \`${ROLE_FALLBACK}\` foi aplicada como fallback seguro.`,
    );
    L.push(`> Revise se a role esta correta e, se necessario, use o script \`set-user-role.ts\` para corrigir.`);
    L.push(``);
    L.push(`| UID | Email |`);
    L.push(`| --- | --- |`);
    for (const u of fallbacks) {
      L.push(`| \`${u.uid}\` | ${u.email ?? "(sem email)"} |`);
    }
    L.push(``);
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 6. Validacao pos-execucao`);
  L.push(``);
  L.push(`Para confirmar que os documentos foram criados corretamente:`);
  L.push(``);
  L.push(`1. Acesse o **Firebase Console → Firestore → colecao \`usuarios\`**`);
  L.push(`2. Verifique que cada UID listado acima tem um documento`);
  L.push(`3. Confirme que cada documento tem \`tenantId: "rr-infocell"\` e \`status: "ativo"\``);
  L.push(`4. Se houver usuarios com role por fallback, corrija via:`);
  L.push(`   \`\`\``);
  L.push(`   npm run auth:set-role -- --uid <uid> --role <role-correta>`);
  L.push(`   \`\`\``);
  L.push(`   Depois atualize o campo \`role\` no documento Firestore correspondente.`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 7. Aviso`);
  L.push(``);
  L.push(`**Nenhuma custom claim foi alterada.**`);
  L.push(`O middleware \`resolveTenant\` ainda usa \`DEFAULT_TENANT_ID\` fixo — nao foi ativado.`);
  L.push(`Os documentos criados serao usados na Fase 9.4, quando \`resolveTenant\` for atualizado.`);

  return L.join("\n");
}

// ── Execucao ──────────────────────────────────────────────────────────────────

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("CRIACAO DE DOCUMENTOS usuarios/{uid}");
  console.log("Guard ativo: ALLOW_USER_TENANT_CREATION=true");
  console.log(SEP);
  console.log();

  const ambiente = process.env.NODE_ENV ?? "development";
  const timestamp = new Date().toISOString();
  const agora = Timestamp.now();

  console.log(`Ambiente:  ${ambiente}`);
  console.log(`Projeto:   ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log();

  // ── 1. Listar usuarios do Firebase Auth ───────────────────────────────────

  console.log("Listando usuarios do Firebase Auth...");
  const authUsers = await listarTodosUsuariosAuth();
  console.log(`  ${authUsers.length} usuario(s) encontrado(s)`);
  console.log();

  // ── 2. Verificar quais ja tem documento no Firestore ──────────────────────

  console.log(`Verificando documentos existentes em "${COLECAO_USUARIOS}"...`);
  const uids = authUsers.map((u) => u.uid);
  const existentes = await verificarDocumentosExistentes(uids);
  console.log(`  ${existentes.size} documento(s) existente(s)`);
  console.log();

  // ── 3. Processar usuarios ─────────────────────────────────────────────────

  console.log("Processando usuarios...");
  const processados: UsuarioProcessado[] = [];
  const escritas: Array<{ uid: string; doc: DocumentoUsuario }> = [];

  for (const user of authUsers) {
    if (user.disabled) {
      processados.push({
        uid: user.uid,
        email: user.email,
        nome: user.displayName,
        roleAplicada: ROLE_FALLBACK,
        roleFonteClaim: false,
        resultado: "ignorado-desativado",
      });
      console.log(`  🔕 ${user.uid} — ignorado (desativado)`);
      continue;
    }

    if (existentes.has(user.uid)) {
      processados.push({
        uid: user.uid,
        email: user.email,
        nome: user.displayName,
        roleAplicada: ROLE_FALLBACK,
        roleFonteClaim: false,
        resultado: "pulado-existe",
      });
      console.log(`  ⏭️  ${user.uid} — pulado (documento ja existe)`);
      continue;
    }

    const { role, viaClaim } = resolverRole(user.customClaims);

    escritas.push({
      uid: user.uid,
      doc: {
        uid: user.uid,
        email: user.email ?? "",
        nome: user.displayName ?? "",
        tenantId: TENANT_PADRAO,
        role,
        status: "ativo",
        createdAt: agora,
        updatedAt: agora,
      },
    });

    processados.push({
      uid: user.uid,
      email: user.email,
      nome: user.displayName,
      roleAplicada: role,
      roleFonteClaim: viaClaim,
      resultado: "criado",
    });

    const fonteRole = viaClaim ? `claim: ${role}` : `fallback: ${role}`;
    console.log(`  ⬜ ${user.uid} — preparado para criar (${fonteRole})`);
  }

  console.log();

  // ── 4. Escrever no Firestore ──────────────────────────────────────────────

  if (escritas.length === 0) {
    console.log("Nenhum documento a criar — tudo ja existe ou nenhum usuario elegivel.");
  } else {
    console.log(`Criando ${escritas.length} documento(s) no Firestore...`);

    // Batch: Firestore suporta 500 operacoes; usamos 400 por margem de seguranca
    const BATCH_SIZE = 400;
    let batchCount = 0;

    for (let i = 0; i < escritas.length; i += BATCH_SIZE) {
      const chunk = escritas.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const { uid, doc } of chunk) {
        batch.set(db.collection(COLECAO_USUARIOS).doc(uid), doc);
      }
      await batch.commit();
      batchCount++;
      console.log(`  batch ${batchCount} commitado (${chunk.length} docs)`);
    }

    console.log(`  ✅ ${escritas.length} documento(s) criado(s) em ${batchCount} batch(es)`);
  }

  // ── 5. Gerar relatorio ────────────────────────────────────────────────────

  console.log();
  console.log("Gerando relatorio Markdown...");
  const relatorioMd = gerarRelatorioMd(processados, ambiente, timestamp);

  const reportDir = join(process.cwd(), "..", "docs", "nextassist", "reports");
  const tsafe = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(reportDir, `create-user-tenant-documents-${tsafe}.md`);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, relatorioMd, "utf-8");

  // ── 6. Resumo no console ──────────────────────────────────────────────────

  const criados = processados.filter((u) => u.resultado === "criado").length;
  const pulados = processados.filter((u) => u.resultado === "pulado-existe").length;
  const ignorados = processados.filter((u) => u.resultado === "ignorado-desativado").length;
  const fallbacks = processados.filter(
    (u) => u.resultado === "criado" && !u.roleFonteClaim,
  ).length;

  console.log();
  console.log(SEP);
  console.log("RESUMO");
  console.log(SEP);
  console.log();
  console.log(`Total no Firebase Auth:   ${authUsers.length}`);
  console.log(`Documentos criados:       ${criados}`);
  console.log(`Documentos pulados:       ${pulados}`);
  console.log(`Desativados ignorados:    ${ignorados}`);
  console.log(`Roles por fallback:       ${fallbacks}`);
  console.log();
  console.log(`Relatorio gerado em:`);
  console.log(`  ${reportPath}`);
  console.log();

  if (fallbacks > 0) {
    console.log(
      `⚠️  ${fallbacks} usuario(s) receberam role "${ROLE_FALLBACK}" por fallback.`,
    );
    console.log(`   Revise o relatorio e corrija via set-user-role.ts se necessario.`);
    console.log();
  }

  console.log("Nenhuma custom claim foi alterada.");
  console.log("resolveTenant ainda usa DEFAULT_TENANT_ID — nao foi ativado.");
  console.log(SEP);
}

main().catch((err) => {
  console.error("Erro durante criacao de documentos:", err);
  process.exit(1);
});
