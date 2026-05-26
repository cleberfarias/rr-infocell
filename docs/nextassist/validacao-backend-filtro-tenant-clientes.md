# Validacao Backend — Filtro por tenantId em Clientes (Fase 8.8.3)

## 1. O que foi alterado

A listagem de clientes passou a filtrar por `tenantId` no Firestore, retornando apenas clientes que pertencem ao tenant atual.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/clientes/clientes.repository.ts` | `FirestoreClientesRepository.list()` agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes do `.get()` |

**O que NAO foi alterado:**
- `create()` — intocado
- `update()` — intocado (ja preserva `current.tenantId ?? DEFAULT_TENANT_ID`)
- `delete()` — intocado
- `findById()` — intocado (busca por ID direto, sem filtro de tenant)
- `findByTelefone()` — intocado
- Relacionamentos com OS e vendas — intocados
- `MemoryClientesRepository` — intocado (repositorio de testes, nao usado em producao)

---

## 2. Comportamento apos o filtro

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Clientes criados apos Fase 8.4 | Sim | Possuem `tenantId: "rr-infocell"` |
| Clientes editados apos Fase 8.4 | Sim | `update()` injeta `current.tenantId ?? DEFAULT_TENANT_ID` |
| Clientes criados antes da Fase 8.4 | **Nao** | Nao possuem `tenantId` — ficam ocultos |

### Como recuperar clientes antigos sem migracao massiva

Clientes antigos sem `tenantId` voltam a aparecer automaticamente ao serem editados, pois o `update()` ja aplica `current.tenantId ?? DEFAULT_TENANT_ID`. Basta editar qualquer campo do cliente (nome, telefone, observacoes) para que ele receba `tenantId` e passe a aparecer na listagem.

### Nota sobre a query

A query anterior fazia `.collection(...).get()` (todos os documentos). A nova query usa `.collection(...).where("tenantId", "==", DEFAULT_TENANT_ID).get()`. Nao ha `.orderBy()` na query Firestore — a ordenacao por nome continua sendo feita no cliente (`.sort()`). Isso evita dependencia de indice composto.

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | |
| Acesso ao Firestore do projeto staging | | |

---

### Criar cliente novo e confirmar tenantId

```bash
curl -s -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Validacao Filtro Tenant", "telefone": "11999990099"}' | jq '{id, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| Firestore → colecao `clientes` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar clientes e confirmar filtro

```bash
curl -s "http://localhost:3333/api/clientes" | jq '{total: (.data | length), http: "200 OK"}'
```

```bash
# Confirmar que cliente recém-criado aparece
curl -s "http://localhost:3333/api/clientes?q=Validacao" | jq '.data[0] | {nome, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Cliente criado aparece na listagem | | |
| Clientes sem `tenantId` (antigos) NAO aparecem | | Esperado |
| Busca por nome continua funcionando | | |

---

### Recuperar cliente antigo via edicao (sem migracao)

Se houver cliente antigo relevante que precisar voltar a aparecer:

```bash
# Editar o cliente antigo — update() aplica tenantId automaticamente
curl -s -X PUT http://localhost:3333/api/clientes/<id-cliente-antigo> \
  -H "Content-Type: application/json" \
  -d '{"nome": "<nome-atual>", "telefone": "<telefone-atual>"}' | jq '{id, tenantId}'
```

Apos a edicao, `tenantId: "rr-infocell"` e aplicado e o cliente volta a aparecer na listagem.

| Teste | Resultado | Observacao |
| --- | --- | --- |
| PUT retorna 200 com `tenantId: "rr-infocell"` | | |
| Cliente editado aparece na proxima chamada GET /clientes | | |

---

### Confirmar que OS e vendas nao foram afetadas

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/ordens-servico
# Esperado: 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/vendas
# Esperado: 200
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET /ordens-servico retorna 200 | | |
| GET /vendas retorna 200 | | |
| Nenhum 400/422/500 em nenhum endpoint | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em `findById()` | Nao — busca por ID direto continua sem filtro |
| Filtro em produtos | Nao — Fase 8.8.4 |
| Filtre em despesas/contas | Nao — Fase 8.8.5 |
| Filtro em OS, estoque, vendas | Nao — Fase 8.8.6+ |
| Migracao de clientes antigos | Nao — editar o cliente aplica tenantId automaticamente |

---

## 5. Proxima fase — 8.8.4

**Objetivo:** aplicar filtro por tenantId em produtos.

**Criterio de entrada:**
- [ ] Cliente novo com tenantId aparece na listagem
- [ ] Busca por nome continua funcionando
- [ ] GET /clientes retorna 200 sem erro
- [ ] GET /ordens-servico e GET /vendas continuam funcionando
- [ ] Impacto de clientes antigos documentado
