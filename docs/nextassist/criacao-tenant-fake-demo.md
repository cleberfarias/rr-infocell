# Criação do Tenant Fake — nextassist-demo

**Fase:** 9.15 — Criar segundo tenant fake + usuário demo
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 📋 Script criado — aguardando execução

---

## 1. Objetivo

Preparar o primeiro teste real de isolamento entre dois tenants:

- **Tenant atual:** `rr-infocell`
- **Tenant de teste:** `nextassist-demo`

O script cria apenas documentos de infraestrutura (`tenants/nextassist-demo` e `usuarios/{uid}`). Nenhum dado operacional (OS, produto, cliente, venda) é criado nesta fase.

---

## 2. Pré-requisitos

### 2.1 Credenciais Firebase

```env
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service-account.json
FIREBASE_PROJECT_ID=rr-infocell
```

Ou via variáveis individuais no `backend/.env`.

### 2.2 Usuário demo no Firebase Auth

O script tentará localizar `demo@nextassist-demo.internal` no Firebase Auth.

**Se o usuário não existir:** o script abortará as etapas 3 e 4, gerará instruções no relatório e finalizará sem erro. Crie o usuário antes de executar novamente:

```bash
cd backend
npx tsx src/scripts/set-user-role.ts \
  --email demo@nextassist-demo.internal \
  --password "SenhaDemo@2025" \
  --display-name "Usuario Demo" \
  --role admin
```

Ou crie via Firebase Console (Authentication → Add user) e atribua a role depois com `set-user-role.ts`.

---

## 3. Comando de execução

**Linux / macOS / Git Bash:**

```bash
cd backend
ALLOW_DEMO_TENANT_CREATION=true npx tsx src/scripts/create-demo-tenant.ts
```

**PowerShell (Windows):**

```powershell
cd backend
$env:ALLOW_DEMO_TENANT_CREATION="true"
npx tsx src/scripts/create-demo-tenant.ts
```

---

## 4. O que o script cria

### Etapa 1 — `tenants/nextassist-demo`

```json
{
  "id": "nextassist-demo",
  "slug": "nextassist-demo",
  "name": "NextAssist Demo",
  "productName": "NextAssist",
  "plan": "premium",
  "whiteLabel": true,
  "status": "active",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Etapa 2 — Localiza usuário no Firebase Auth

Busca por `demo@nextassist-demo.internal`. Se não encontrado, gera instruções e pula as etapas 3 e 4.

### Etapa 3 — `usuarios/{uid}`

```json
{
  "uid": "<firebase-uid>",
  "email": "demo@nextassist-demo.internal",
  "nome": "Usuario Demo",
  "tenantId": "nextassist-demo",
  "role": "admin",
  "status": "ativo",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

### Etapa 4 — Custom claim `role: admin`

Atribui o custom claim ao usuário via Firebase Admin SDK, para que `requireRole` aceite o usuário. Skipped se o claim já estiver configurado.

### O que o script NÃO faz

- Não cria produtos, clientes, OS, vendas ou movimentações
- Não altera o tenant `rr-infocell`
- Não altera usuários existentes
- Não altera o fallback `DEFAULT_TENANT_ID`
- Não ativa o segundo tenant no código — apenas cria os documentos de infraestrutura

---

## 5. Relatório gerado

```
docs/nextassist/reports/create-demo-tenant-<timestamp>.md
```

Contém: status de cada etapa, UID do usuário, instruções de criação manual se necessário, próximos passos.

---

## 6. Idempotência

O script é idempotente:

| Situação | Comportamento |
|----------|--------------|
| `tenants/nextassist-demo` já existe | Marca como `skipped`, não sobrescreve |
| `usuarios/{uid}` já existe com `tenantId: "nextassist-demo"` | Marca como `skipped` |
| `usuarios/{uid}` já existe com `tenantId` diferente | Marca como `skipped` com aviso — não sobrescreve |
| Custom claim já configurada | Marca como `skipped` |

---

## 7. Como validar após execução

### 7.1 Firebase Console — Firestore

```
tenants/
└── nextassist-demo        ← deve existir
    ├── id: "nextassist-demo"
    ├── status: "active"
    └── ...

usuarios/
└── {uid-do-demo}          ← deve existir
    ├── tenantId: "nextassist-demo"
    ├── role: "admin"
    └── status: "ativo"
```

### 7.2 Dry-run para confirmar usuário demo

```bash
cd backend
npx tsx src/scripts/audit-users-tenant-dry-run.ts
```

O usuário demo deve aparecer como `✅ manter-documento` com `tenantId: "nextassist-demo"`.

### 7.3 Dry-run confirma que rr-infocell não foi afetado

Os 4 usuários rr-infocell devem continuar como `✅ manter-documento` com `tenantId: "rr-infocell"`.

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Usuário demo sem `usuarios/{uid}` | Script verifica e cria antes de usar |
| Custom claim ausente — usuário não acessa o sistema | Etapa 4 do script configura automaticamente |
| Script executado sem guard | Aborta imediatamente se `ALLOW_DEMO_TENANT_CREATION !== "true"` |
| Dados do tenant rr-infocell afetados | Script não toca em documentos de rr-infocell |
| `tenants/nextassist-demo` sobrescreve dados existentes | Verifica existência antes de criar — skipped se existir |

---

## 9. Critérios para avançar para a Fase 9.16

A Fase 9.16 (criar dados mínimos do tenant demo via API) só começa quando:

- [ ] Script executado com sucesso
- [ ] `tenants/nextassist-demo` existe no Firestore
- [ ] `usuarios/{uid}` com `tenantId: "nextassist-demo"` existe
- [ ] Custom claim `role: admin` configurada para o usuário demo
- [ ] Dry-run confirma usuário demo em `manter-documento`
- [ ] Usuários rr-infocell continuam inalterados (4 `manter-documento`)
- [ ] Relatório revisado — sem erros ou avisos inesperados
