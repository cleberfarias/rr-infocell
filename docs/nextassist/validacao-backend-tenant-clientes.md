# Validacao Backend — Persistencia tenantId em Clientes (Fase 8.4)

## 1. O que foi alterado

O modulo `clientes` passou a persistir `tenantId` no Firestore. Esta e a primeira entidade operacional
com o padrao completo de modulos separados (types + schema + repository + service + routes).

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/clientes/clientes.types.ts` | Campo `tenantId?: string` adicionado ao tipo `Cliente` |
| `backend/src/modules/clientes/clientes.repository.ts` | Import de `DEFAULT_TENANT_ID`; `create()` e `update()` persistem tenantId; `fromDocument()` le tenantId do Firestore |

**O que NAO foi alterado:**
- `clientes.schemas.ts` — schema Zod intocado; tenantId do frontend continua sendo descartado (strip mode)
- `clientes.service.ts` — sem alteracao
- `clientes.routes.ts` — sem alteracao
- Listagem GET /clientes — continua global, sem filtro por tenant
- DELETE /clientes/:id — sem alteracao

---

## 2. Estrategia adotada

### Por que nao alterar o schema Zod?

O schema Zod (`clienteInputSchema`) nao tem `tenantId`. Isso e intencional:
- O Zod descarta o campo ao fazer parse do request body (strip mode)
- O `input` passado ao repository **nao contem tenantId**
- O repository injeta `DEFAULT_TENANT_ID` diretamente, sem depender do que o frontend enviar

Isso garante que o backend controla o tenant — mesmo que um cliente malicioso envie `tenantId: "outro-tenant"`, o valor sera ignorado e substituido por `DEFAULT_TENANT_ID`.

### Comportamento no create

```typescript
// clientes.repository.ts — FirestoreClientesRepository.create()

const cliente: Cliente = {
  id: document.id,
  ...input,              // tenantId NAO vem aqui (Zod removeu)
  tenantId: DEFAULT_TENANT_ID,  // ← injetado pelo backend
  createdAt: timestamp,
  updatedAt: timestamp,
};
```

### Comportamento no update

```typescript
// clientes.repository.ts — FirestoreClientesRepository.update()

const cliente: Cliente = {
  ...current,                                    // preserva tenantId do registro existente
  ...input,                                      // tenantId NAO vem aqui (Zod removeu)
  tenantId: current.tenantId ?? DEFAULT_TENANT_ID,  // ← preserva ou define padrao
  updatedAt: now(),
};
```

O update preserva o `tenantId` do registro existente. Se o registro foi criado antes desta fase (sem `tenantId`), o update define `DEFAULT_TENANT_ID` automaticamente — migracao gradual e segura para registros que passarem por edicao.

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Colecao `clientes` acessivel no Firestore | | |

---

### Criar cliente novo via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/clientes com nome e telefone retorna 201 | | |
| Response contem `id` e `nome` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste Tenant Cliente", "telefone": "11999990000"}' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "nome": "Teste Tenant Cliente",
    "telefone": "(11) 99999-0000",
    "tenantId": "rr-infocell",
    ...
  }
}
```

---

### Verificar campo tenantId no Firestore

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `clientes` | | |
| Localizar o documento pelo `id` retornado na API | | |
| Documento contem campo `tenantId` | | |
| Valor do campo e `"rr-infocell"` | | |
| Documento contem `nome`, `telefone`, `createdAt`, `updatedAt` e `tenantId` | | |

**Estrutura esperada no Firestore:**
```
clientes/
  <id-gerado>/
    nome: "Teste Tenant Cliente"
    telefone: "(11) 99999-0000"
    createdAt: "2026-05-26T..."
    updatedAt: "2026-05-26T..."
    tenantId: "rr-infocell"   ← novo campo
```

---

### Editar cliente via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| PUT /api/clientes/:id retorna 200 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| tenantId nao foi alterado para outro valor | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
# Substitua <id> pelo id retornado no POST anterior
curl -s -X PUT http://localhost:3333/api/clientes/<id> \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste Tenant Cliente Editado", "telefone": "11999990000"}' | jq .
```

---

### Verificar listagem continua funcionando

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/clientes retorna 200 | | |
| Listagem inclui o cliente recem-criado | | |
| Listagem inclui clientes antigos (sem tenantId) | | |
| Nenhum erro 500 | | |

```bash
curl -s "http://localhost:3333/api/clientes?q=Teste" | jq '.data | length'
```

---

### Verificar clientes existentes nao foram afetados

| Item | Resultado | Observacao |
| --- | --- | --- |
| Clientes criados antes desta fase NAO possuem `tenantId` no Firestore | | Esperado — sem migracao |
| Sistema continua funcionando para esses clientes (OS, WhatsApp, etc.) | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagem filtrada por tenantId | Nao — GET /clientes retorna todos os clientes |
| Clientes existentes migrados | Nao — apenas novos registros tem tenantId persistido |
| Clientes editados recebem tenantId automaticamente | Sim — update preserva ou define DEFAULT_TENANT_ID (migracao gradual) |
| Filtro por tenant em OS, WhatsApp, etc. | Nao — fora do escopo |
| Isolamento real entre empresas | Nao — ainda e um unico tenant "rr-infocell" |

---

## 5. Resultado esperado

| Item | Status |
| --- | --- |
| Build do backend passa | OK — `npm run build` sem erros |
| POST /clientes persiste tenantId no Firestore | A validar em staging |
| PUT /clientes/:id preserva tenantId | A validar em staging |
| GET /clientes continua funcionando | A validar em staging |
| Nenhum modulo critico alterado | OK — apenas clientes.types.ts e clientes.repository.ts |
| Dados existentes preservados | OK — sem migracao forcada |

---

## 6. Proxima fase sugerida — Fase 8.5

**Objetivo:** apos confirmar persistencia em clientes, avancar para a proxima entidade operacional de risco medio:
- `despesas` — modulo com repository padrao, sem acoplamento com OS ou estoque
- ou `contas` — igualmente simples

**Entidades a deixar para depois (maior risco):**
- `ordens-servico` — acoplamento com estoque, pecas e baixa automatica
- `produtos` — acoplamento com movimentacoes e OS
- `vendas` — acoplamento com financeiro e estoque

**Criterio de entrada para Fase 8.5:**
- [ ] Validacao manual da Fase 8.4 aprovada (tenantId visivel no Firestore para novo cliente)
- [ ] GET /clientes continua funcionando
- [ ] OS, WhatsApp e outros fluxos vinculados a clientes sem erro
