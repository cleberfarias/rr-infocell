# Validacao Backend — Persistencia tenantId em Despesas e Contas (Fase 8.6)

## 1. O que foi alterado

### Despesas

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/despesas/despesas.types.ts` | Campo `tenantId?: string` adicionado ao tipo `Despesa` |
| `backend/src/modules/despesas/despesas.repository.ts` | Import de `DEFAULT_TENANT_ID`; `create()` injeta tenantId apos `buildDespesa()`; `update()` preserva `current.tenantId ?? DEFAULT_TENANT_ID`; `fromDocument()` le tenantId do Firestore |

**O que NAO foi alterado em despesas:**
- `buildDespesa()` — funcao de negocio que gerencia `pago`, `pagoEm` e `recorrente` intocada
- `despesas.schemas.ts` — schema Zod sem alteracao
- `despesas.service.ts` — sem alteracao
- `despesas.routes.ts` — sem alteracao
- Listagem GET /despesas — continua global

### Contas

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/contas/contas.routes.ts` | Import de `DEFAULT_TENANT_ID`; POST /contas persiste `tenantId` no `.add()` |

**O que NAO foi alterado em contas:**
- PUT /contas/:id — usa `ref.update(updates)` com atualizacao parcial; `tenantId` criado no POST persiste naturalmente sem ser sobrescrito
- GET /contas — sem alteracao
- DELETE /contas/:id — sem alteracao

---

## 2. Detalhe tecnico — despesas

Despesas usa uma funcao auxiliar `buildDespesa()` que gerencia logica financeira (`pago`, `pagoEm`). Para nao alterar essa logica, `tenantId` e injetado APOS a chamada:

```typescript
// create() — inject tenantId after buildDespesa()
const despesa = {
  ...buildDespesa(input),    // logica de negocio intocada
  id: document.id,
  tenantId: DEFAULT_TENANT_ID,   // ← injetado pelo backend
};

// update() — preserve tenantId
const despesa = {
  ...buildDespesa(input, current),   // logica de negocio intocada
  tenantId: current.tenantId ?? DEFAULT_TENANT_ID,   // ← preserva ou define padrao
};
```

---

## 3. Detalhe tecnico — contas

Contas usa `ref.update(updates)` no PUT, que e uma atualizacao parcial do Firestore (merge). Isso significa que apenas os campos presentes em `updates` sao modificados — `tenantId` criado no POST NAO e sobrescrito em edicoes.

Para registros criados antes desta fase (sem `tenantId`), o campo nao sera adicionado automaticamente em edicoes. Isso e aceito para esta fase.

---

## 4. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |

---

### Despesas — criar e verificar

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/despesas retorna 201 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/despesas \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Teste Tenant Despesa",
    "categoria": "outros",
    "valor": 100,
    "vencimento": "31/12/2026"
  }' | jq .data.tenantId
```

**Verificar no Firestore:**
```
despesas/<id-gerado>/
  descricao: "Teste Tenant Despesa"
  categoria: "outros"
  valor: 100
  vencimento: "31/12/2026"
  pago: false
  recorrente: false
  tenantId: "rr-infocell"   ← novo campo
  createdAt: "..."
  updatedAt: "..."
```

---

### Despesas — editar e verificar tenantId preservado

| Item | Resultado | Observacao |
| --- | --- | --- |
| PUT /api/despesas/:id retorna 200 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Campo `pago`, `pagoEm` e `recorrente` continuam corretos | | |
| Nenhum erro 400/422/500 | | |

---

### Contas — criar e verificar

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/contas retorna 201 | | |
| Response contem `id` e `nome` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/contas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Conta Teste Tenant", "tipo": "pix"}' | jq .
```

**Verificar no Firestore:**
```
contas/<id-gerado>/
  nome: "Conta Teste Tenant"
  tipo: "pix"
  saldo: 0
  ativa: true
  tenantId: "rr-infocell"   ← novo campo
  criadoEm: "..."
```

---

### Contas — editar e verificar tenantId preservado

| Item | Resultado | Observacao |
| --- | --- | --- |
| PUT /api/contas/:id retorna 200 | | |
| Firestore: `tenantId` permanece `"rr-infocell"` apos edicao | | PUT usa update parcial — nao sobrescreve |
| Nenhum erro 400/422/500 | | |

---

### Listagens continuam funcionando

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/despesas retorna 200 | | |
| GET /api/contas retorna 200 | | |
| Despesas antigas (sem tenantId) aparecem normalmente | | |
| Contas antigas (sem tenantId) aparecem normalmente | | |

---

### Calculos financeiros NAO foram afetados

| Item | Resultado | Observacao |
| --- | --- | --- |
| Despesa marcada como paga: campo `pagoEm` preenchido corretamente | | |
| Despesa recorrente: campo `recorrente` correto | | |
| Conta com saldo: valor exibido corretamente | | |

---

## 5. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagens filtradas por tenantId | Nao — GET global sem filtro |
| Dados existentes migrados | Nao — apenas novos registros tem tenantId |
| Calculos de DRE/relatorios alterados | Nao — intocados |
| `buildDespesa()` alterado | Nao — logica de negocio preservada |
| Contas: update grava tenantId em registros antigos | Nao — `ref.update()` e parcial |

---

## 6. Proxima fase sugerida — Fase 8.7

**Objetivo:** apos validar despesas e contas, avancar para entidades de maior acoplamento:
- `ordens-servico` — entidade critica com baixa de estoque; requer cuidado especial
- Ou documentar por que OS sera tratada separadamente com validacao propria

**Criterio de entrada para Fase 8.7:**
- [ ] Validacao manual desta fase aprovada (tenantId visivel no Firestore para despesas e contas)
- [ ] Listagens de despesas e contas sem erro
- [ ] Calculos financeiros sem alteracao de comportamento
