# Criação de Documentos `usuarios/{uid}`

**Fase:** 9.3 — Criação dos vínculos usuário x tenant
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ✅ Script criado — aguardando execução após revisão do dry-run

---

## 1. Objetivo

Criar os documentos `usuarios/{uid}` no Firestore para todos os usuários ativos do Firebase Auth, vinculando cada um ao tenant `rr-infocell`.

Este é o passo que materializa o modelo definido na Fase 9.1 no banco de dados real. Após essa fase, o middleware `resolveTenant` poderá ser atualizado (Fase 9.4) para ler o `tenantId` a partir desses documentos.

---

## 2. Pré-requisitos

### 2.1 Dry-run executado e revisado

Antes de criar documentos, o dry-run deve ter sido executado e o relatório revisado:

```bash
cd backend
npx tsx src/scripts/audit-users-tenant-dry-run.ts
```

Critério obrigatório: **zero usuários com ação `revisar-manualmente`** no relatório.

### 2.2 Credenciais Firebase

As mesmas credenciais usadas pelo dry-run:

**Opção A — arquivo de conta de serviço:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service-account.json
export FIREBASE_PROJECT_ID=rr-infocell
```

**Opção B — variáveis individuais (via `.env`):**

```env
FIREBASE_PROJECT_ID=rr-infocell
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@rr-infocell.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2.3 Guard de segurança

O script exige a variável `ALLOW_USER_TENANT_CREATION=true`. Sem ela, o script aborta antes de qualquer escrita.

---

## 3. Comando de execução

**Linux / macOS / Git Bash:**

```bash
cd backend
ALLOW_USER_TENANT_CREATION=true npx tsx src/scripts/create-user-tenant-documents.ts
```

**PowerShell (Windows):**

```powershell
cd backend
$env:ALLOW_USER_TENANT_CREATION="true"
npx tsx src/scripts/create-user-tenant-documents.ts
```

---

## 4. O que o script faz

### Fluxo de execução

1. Verifica que `ALLOW_USER_TENANT_CREATION=true` está definido — aborta se não estiver
2. Lista todos os usuários do Firebase Auth (paginando até 1000 por vez)
3. Busca documentos `usuarios/{uid}` existentes no Firestore
4. Para cada usuário:
   - Se `disabled = true` → marca como ignorado, não cria documento
   - Se documento já existe → marca como pulado, **não sobrescreve**
   - Se documento não existe → prepara para criar
5. Escreve os documentos novos em batches de até 400 operações
6. Gera relatório em `docs/nextassist/reports/create-user-tenant-documents-<timestamp>.md`

### Estrutura do documento criado

```json
{
  "uid": "firebase-uid",
  "email": "usuario@exemplo.com",
  "nome": "Nome do Usuário",
  "tenantId": "rr-infocell",
  "role": "admin",
  "status": "ativo",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

### Resolução da role

| Situação | Role aplicada | Fonte |
|----------|--------------|-------|
| `customClaims.role = "admin"` | `admin` | custom claim |
| `customClaims.role = "atendente"` | `atendente` | custom claim |
| `customClaims.role = "tecnico"` | `tecnico` | custom claim |
| Sem custom claim ou valor inválido | `atendente` | **fallback** |

O fallback `atendente` é o mais seguro: menos privilégios que `admin`. Usuários que receberam role por fallback são listados separadamente no relatório.

### O que o script NÃO faz

- Não altera custom claims no Firebase Auth
- Não sobrescreve documentos `usuarios/{uid}` que já existem
- Não altera nenhum middleware, rota ou permissão
- Não ativa o `resolveTenant` dinâmico — isso é a Fase 9.4

---

## 5. Relatório gerado

```
docs/nextassist/reports/create-user-tenant-documents-<timestamp>.md
```

O relatório contém:
- Resumo com totais (criados, pulados, ignorados, fallbacks)
- Tabela de roles aplicadas
- Lista de UIDs criados com email e fonte da role
- Lista de usuários que receberam role por fallback (para revisão)
- Instruções de validação pós-execução
- Aviso sobre custom claims e `resolveTenant`

---

## 6. Validação pós-execução

Após rodar o script:

1. **Firebase Console → Firestore → coleção `usuarios`**
   - Verificar que cada UID do relatório tem um documento
   - Confirmar `tenantId: "rr-infocell"` e `status: "ativo"` em cada um

2. **Usuários com role por fallback**
   - Se houver, verificar se a role `atendente` está correta
   - Se precisar corrigir a role no Firebase Auth:
     ```bash
     cd backend
     npx tsx src/scripts/set-user-role.ts --uid <uid> --role <role-correta>
     ```
   - Depois atualizar o campo `role` no documento Firestore correspondente

3. **Rodar o dry-run novamente** para confirmar que não há mais usuários sem documento:
   ```bash
   npx tsx src/scripts/audit-users-tenant-dry-run.ts
   ```
   O resultado esperado: todos os usuários ativos na categoria `✅ manter-documento`.

---

## 7. Critérios para avançar para a Fase 9.4

A Fase 9.4 (atualização do `resolveTenant` para usar `usuarios/{uid}`) só deve começar quando:

- [ ] Script executado com sucesso (sem erros)
- [ ] Relatório revisado — zero usuários inesperados
- [ ] Todos os usuários com role por fallback revisados e corrigidos se necessário
- [ ] Dry-run re-executado: todos os usuários ativos em `manter-documento`
- [ ] Documentos confirmados no Firebase Console
- [ ] Nenhuma alteração em código funcional foi feita nesta fase

---

## 8. Aviso de segurança

O script usa a constante:

```typescript
if (process.env.ALLOW_USER_TENANT_CREATION !== "true") {
  process.exit(1);
}
```

Sem a variável de ambiente, o script encerra imediatamente. Isso evita execuções acidentais.

Para limpar a variável após o uso no PowerShell:

```powershell
Remove-Item Env:\ALLOW_USER_TENANT_CREATION
```
