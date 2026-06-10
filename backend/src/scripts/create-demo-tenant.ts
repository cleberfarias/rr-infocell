/**
 * Cria o tenant fake nextassist-demo e vincula o usuario demo no Firestore.
 * REQUER: variavel de ambiente ALLOW_DEMO_TENANT_CREATION=true para executar escritas.
 *
 * Uso:
 *   cd backend
 *   ALLOW_DEMO_TENANT_CREATION=true npx tsx src/scripts/create-demo-tenant.ts
 *
 * Idempotente: documentos ja existentes sao marcados como skipped.
 * Nao altera tenants, usuarios ou custom claims existentes.
 * Nao cria dados operacionais (OS, produtos, clientes, etc.).
 *
 * O relatorio e gerado em:
 *   docs/nextassist/reports/create-demo-tenant-<timestamp>.md
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ── Guard de seguranca ────────────────────────────────────────────────────────

if (process.env.ALLOW_DEMO_TENANT_CREATION !== "true") {
  console.error("ERRO: variavel ALLOW_DEMO_TENANT_CREATION=true nao definida.");
  console.error("Para executar:");
  console.error("  ALLOW_DEMO_TENANT_CREATION=true npx tsx src/scripts/create-demo-tenant.ts");
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

// ── Configuracao do tenant demo ───────────────────────────────────────────────

const DEMO_TENANT = {
  id: "nextassist-demo",
  slug: "nextassist-demo",
  name: "NextAssist Demo",
  productName: "NextAssist",
  plan: "empresarial",
  whiteLabel: true,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

const DEMO_USER_EMAIL = "demo@nextassist-demo.internal";
const COLECAO_TENANTS = "tenants";
const COLECAO_USUARIOS = "usuarios";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EtapaStatus = "criado" | "ja-existia" | "pendente" | "erro";

interface Resultado {
  tenant: EtapaStatus;
  tenantMensagem: string;
  usuario: EtapaStatus;
  usuarioUid: string | undefined;
  usuarioEmail: string | undefined;
  usuarioDocumento: EtapaStatus;
  usuarioCustomClaim: EtapaStatus;
  customClaimMensagem: string;
}

// ── Etapa 1: Criar documento do tenant ───────────────────────────────────────

async function criarTenantDoc(): Promise<{ status: EtapaStatus; mensagem: string }> {
  const ref = db.collection(COLECAO_TENANTS).doc(DEMO_TENANT.id);
  const snap = await ref.get();

  if (snap.exists) {
    return { status: "ja-existia", mensagem: `tenants/${DEMO_TENANT.id} ja existe — skipped` };
  }

  await ref.set(DEMO_TENANT);
  return { status: "criado", mensagem: `tenants/${DEMO_TENANT.id} criado` };
}

// ── Etapa 2: Localizar usuario demo no Firebase Auth ─────────────────────────

async function localizarUsuarioDemo(): Promise<{
  status: EtapaStatus;
  uid?: string;
  email?: string;
  displayName?: string;
  hasRoleClaim?: boolean;
}> {
  try {
    const user = await auth.getUserByEmail(DEMO_USER_EMAIL);
    const claims = user.customClaims as Record<string, unknown> | undefined;
    return {
      status: "criado",
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      hasRoleClaim: typeof claims?.role === "string",
    };
  } catch {
    return { status: "pendente" };
  }
}

// ── Etapa 3: Criar documento usuarios/{uid} ───────────────────────────────────

async function criarDocumentoUsuario(
  uid: string,
  email: string,
  displayName: string | undefined,
): Promise<EtapaStatus> {
  const ref = db.collection(COLECAO_USUARIOS).doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() ?? {};
    if (data["tenantId"] === DEMO_TENANT.id) {
      return "ja-existia";
    }
    // Documento existe mas aponta para outro tenant — nao sobrescrever
    console.warn(
      `  AVISO: usuarios/${uid} ja existe com tenantId="${data["tenantId"]}" — nao sobrescrito`,
    );
    return "ja-existia";
  }

  const agora = Timestamp.now();
  await ref.set({
    uid,
    email,
    nome: displayName ?? "",
    tenantId: DEMO_TENANT.id,
    role: "admin",
    status: "ativo",
    createdAt: agora,
    updatedAt: agora,
  });

  return "criado";
}

// ── Etapa 4: Configurar custom claim role ─────────────────────────────────────

async function configurarCustomClaim(
  uid: string,
  hasRoleClaim: boolean,
): Promise<{ status: EtapaStatus; mensagem: string }> {
  if (hasRoleClaim) {
    return {
      status: "ja-existia",
      mensagem: "Custom claim role ja configurada — skipped",
    };
  }

  await auth.setCustomUserClaims(uid, { role: "admin" });
  return {
    status: "criado",
    mensagem: "Custom claim role: admin configurada",
  };
}

// ── Geracao do relatorio Markdown ─────────────────────────────────────────────

function gerarRelatorio(resultado: Resultado, timestamp: string): string {
  const L: string[] = [];

  const icon = (s: EtapaStatus) =>
    s === "criado" ? "✅" : s === "ja-existia" ? "⏭️ " : s === "pendente" ? "⏳" : "❌";

  L.push(`# Relatorio — Criacao do Tenant Demo`);
  L.push(``);
  L.push(`> **Escrita controlada — ALLOW_DEMO_TENANT_CREATION=true estava ativo.**`);
  L.push(`> Nenhum dado operacional foi criado.`);
  L.push(``);
  L.push(`| Campo | Valor |`);
  L.push(`| --- | --- |`);
  L.push(`| Data/hora | ${timestamp} |`);
  L.push(`| Projeto Firebase | ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"} |`);
  L.push(`| Tenant demo | \`${DEMO_TENANT.id}\` |`);
  L.push(`| Email demo | \`${DEMO_USER_EMAIL}\` |`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 1. Resultados`);
  L.push(``);
  L.push(`| Etapa | Status | Detalhe |`);
  L.push(`| --- | --- | --- |`);
  L.push(
    `| Documento \`tenants/${DEMO_TENANT.id}\` | ${icon(resultado.tenant)} ${resultado.tenant} | ${resultado.tenantMensagem} |`,
  );
  L.push(
    `| Usuario \`${DEMO_USER_EMAIL}\` no Firebase Auth | ${icon(resultado.usuario)} ${resultado.usuario} | ${resultado.usuarioUid ? `UID: \`${resultado.usuarioUid}\`` : "Nao encontrado — criar manualmente"} |`,
  );
  L.push(
    `| Documento \`usuarios/${resultado.usuarioUid ?? "pendente"}\` | ${icon(resultado.usuarioDocumento)} ${resultado.usuarioDocumento} | tenantId: \`${DEMO_TENANT.id}\` |`,
  );
  L.push(
    `| Custom claim \`role: admin\` | ${icon(resultado.usuarioCustomClaim)} ${resultado.usuarioCustomClaim} | ${resultado.customClaimMensagem} |`,
  );
  L.push(``);

  if (resultado.usuario === "pendente") {
    L.push(`---`);
    L.push(``);
    L.push(`## 2. Acao necessaria — criar usuario demo`);
    L.push(``);
    L.push(`O usuario \`${DEMO_USER_EMAIL}\` nao foi encontrado no Firebase Auth.`);
    L.push(`Crie-o antes de executar o script novamente:`);
    L.push(``);
    L.push(`**Opcao A — usando set-user-role.ts:**`);
    L.push(`\`\`\`bash`);
    L.push(`cd backend`);
    L.push(`npx tsx src/scripts/set-user-role.ts \\`);
    L.push(`  --email ${DEMO_USER_EMAIL} \\`);
    L.push(`  --password "SenhaDemo@2025" \\`);
    L.push(`  --display-name "Usuario Demo" \\`);
    L.push(`  --role admin`);
    L.push(`\`\`\``);
    L.push(``);
    L.push(`**Opcao B — Firebase Console:**`);
    L.push(`Authentication → Add user → email: \`${DEMO_USER_EMAIL}\``);
    L.push(`Depois use set-user-role.ts para atribuir role: admin`);
    L.push(``);
    L.push(`Apos criar o usuario, execute este script novamente.`);
  }

  L.push(`---`);
  L.push(``);
  L.push(`## 3. Proximos passos`);
  L.push(``);

  if (resultado.usuario !== "pendente") {
    L.push(
      `1. **Validar isolamento:** logar como usuario rr-infocell e confirmar que dados de ${DEMO_TENANT.id} nao aparecem`,
    );
    L.push(
      `2. **Criar dados minimos:** Fase 9.16 — criar 1 de cada entidade no tenant ${DEMO_TENANT.id} via API`,
    );
    L.push(
      `3. **Validar isolamento real:** logar como usuario demo e confirmar que dados de rr-infocell nao aparecem`,
    );
  } else {
    L.push(`1. **Criar usuario demo** conforme instrucoes acima`);
    L.push(`2. **Executar novamente** este script`);
    L.push(`3. **Validar isolamento** entre os tenants`);
  }

  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`## 4. Aviso`);
  L.push(``);
  L.push(`**Nenhum dado operacional foi criado (OS, produtos, clientes, vendas, etc.).**`);
  L.push(`Apenas documentos de infraestrutura (\`tenants\`, \`usuarios\`) foram escritos.`);
  L.push(`O fallback \`DEFAULT_TENANT_ID\` permanece ativo — nenhuma alteracao em producao.`);

  return L.join("\n");
}

// ── Execucao ──────────────────────────────────────────────────────────────────

async function main() {
  const SEP = "=".repeat(60);
  console.log(SEP);
  console.log("CRIACAO DO TENANT DEMO: nextassist-demo");
  console.log("Guard ativo: ALLOW_DEMO_TENANT_CREATION=true");
  console.log(SEP);
  console.log();

  const timestamp = new Date().toISOString();

  console.log(`Projeto:   ${process.env.FIREBASE_PROJECT_ID ?? "(nao definido)"}`);
  console.log(`Tenant:    ${DEMO_TENANT.id}`);
  console.log(`Email:     ${DEMO_USER_EMAIL}`);
  console.log();

  const resultado: Resultado = {
    tenant: "pendente",
    tenantMensagem: "",
    usuario: "pendente",
    usuarioUid: undefined,
    usuarioEmail: undefined,
    usuarioDocumento: "pendente",
    usuarioCustomClaim: "pendente",
    customClaimMensagem: "Aguardando usuario",
  };

  // Etapa 1: Tenant
  console.log(`[1/4] Criando/verificando tenant...`);
  const tenantResult = await criarTenantDoc();
  resultado.tenant = tenantResult.status;
  resultado.tenantMensagem = tenantResult.mensagem;
  console.log(`  ${tenantResult.status === "criado" ? "✅" : "⏭️ "} ${tenantResult.mensagem}`);

  // Etapa 2: Usuario
  console.log(`[2/4] Localizando usuario demo no Firebase Auth...`);
  const usuarioResult = await localizarUsuarioDemo();
  resultado.usuario = usuarioResult.status;
  resultado.usuarioUid = usuarioResult.uid;
  resultado.usuarioEmail = usuarioResult.email;

  if (usuarioResult.status === "pendente") {
    console.log(`  ⏳ Usuario ${DEMO_USER_EMAIL} nao encontrado no Firebase Auth`);
    console.log(`     → Crie o usuario e execute o script novamente.`);
    console.log(
      `     → Use: npx tsx src/scripts/set-user-role.ts --email ${DEMO_USER_EMAIL} --password "Senha" --role admin`,
    );
    resultado.usuarioDocumento = "pendente";
    resultado.usuarioCustomClaim = "pendente";
    resultado.customClaimMensagem = "Aguardando criacao do usuario";
  } else {
    console.log(`  ✅ Usuario encontrado: ${usuarioResult.uid}`);

    // Etapa 3: Documento usuarios/{uid}
    console.log(`[3/4] Criando/verificando usuarios/${usuarioResult.uid}...`);
    resultado.usuarioDocumento = await criarDocumentoUsuario(
      usuarioResult.uid!,
      usuarioResult.email!,
      usuarioResult.displayName,
    );
    const iconDoc = resultado.usuarioDocumento === "criado" ? "✅" : "⏭️ ";
    console.log(`  ${iconDoc} usuarios/${usuarioResult.uid}: ${resultado.usuarioDocumento}`);

    // Etapa 4: Custom claim
    console.log(`[4/4] Configurando custom claim role...`);
    const claimResult = await configurarCustomClaim(
      usuarioResult.uid!,
      usuarioResult.hasRoleClaim ?? false,
    );
    resultado.usuarioCustomClaim = claimResult.status;
    resultado.customClaimMensagem = claimResult.mensagem;
    const iconClaim = claimResult.status === "criado" ? "✅" : "⏭️ ";
    console.log(`  ${iconClaim} ${claimResult.mensagem}`);
  }

  // Relatorio
  console.log();
  console.log("Gerando relatorio Markdown...");
  const relatorioMd = gerarRelatorio(resultado, timestamp);

  const reportDir = join(process.cwd(), "..", "docs", "nextassist", "reports");
  const tsafe = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(reportDir, `create-demo-tenant-${tsafe}.md`);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, relatorioMd, "utf-8");

  console.log();
  console.log(SEP);
  console.log("RESUMO");
  console.log(SEP);
  console.log();
  console.log(`tenant ${DEMO_TENANT.id}:        ${resultado.tenant}`);
  console.log(`usuario ${DEMO_USER_EMAIL}: ${resultado.usuario}`);
  console.log(`usuarios/{uid}:             ${resultado.usuarioDocumento}`);
  console.log(`custom claim role:          ${resultado.usuarioCustomClaim}`);
  console.log();
  console.log(`Relatorio gerado em:`);
  console.log(`  ${reportPath}`);
  console.log();
  console.log("Nenhum dado operacional foi criado.");
  console.log(SEP);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
