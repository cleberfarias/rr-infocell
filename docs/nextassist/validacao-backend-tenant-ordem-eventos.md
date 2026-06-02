# Validacao Backend — Persistencia tenantId em Eventos da OS (Fase 8.7.1)

## 1. O que foi alterado

O modulo `ordem-eventos` passou a persistir `tenantId` no Firestore. Esta e a primeira entidade dentro do fluxo critico de OS, escolhida por ser a de menor risco: eventos/timeline nao disparam baixa de estoque nem afetam financeiro.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/ordem-eventos/ordem-eventos.types.ts` | Campo `tenantId?: string` adicionado ao tipo `OrdemEvento` |
| `backend/src/modules/ordem-eventos/ordem-eventos.service.ts` | Import de `DEFAULT_TENANT_ID`; campo `tenantId: DEFAULT_TENANT_ID` adicionado ao objeto passado a `repository.create()` |
| `backend/src/modules/ordem-eventos/ordem-eventos.repository.ts` | `fromDocument()` le `tenantId` do Firestore |

**O que NAO foi alterado:**
- `ordem-eventos.schemas.ts` — schema Zod intocado
- `ordens-servico.*` — OS principal intocada
- Listagem GET /ordem-eventos — sem filtro por tenant
- Baixa automatica de estoque — intocada
- Financeiro, vendas, WhatsApp — intocados

---

## 2. Por que injetar no service, nao no repository

O `service.create()` constroi explicitamente o objeto passado ao repository:

```typescript
// ordem-eventos.service.ts — antes
return this.repository.create({
  ordemServicoId: input.ordemServicoId,
  tipo: input.tipo ?? "comentario",
  titulo: input.titulo,
  descricao: input.descricao,
  criadoPor: input.criadoPor,
  createdAt: now(),
});

// ordem-eventos.service.ts — depois
return this.repository.create({
  ordemServicoId: input.ordemServicoId,
  tipo: input.tipo ?? "comentario",
  titulo: input.titulo,
  descricao: input.descricao,
  criadoPor: input.criadoPor,
  tenantId: DEFAULT_TENANT_ID,   // ← backend controla
  createdAt: now(),
});
```

O repository recebe `Omit<OrdemEvento, "id">` — como `OrdemEvento` agora tem `tenantId?: string`, o campo passa naturalmente para o Firestore via `document.set(withoutUndefined(evento))`.

Nao ha update de eventos — a entidade e append-only (somente criacao).

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| OS existente no staging para vincular o evento | | Usar ID de OS real |

---

### Obter ID de OS existente

```bash
curl -s "http://localhost:3333/api/ordens-servico?limit=1" | jq '.data[0].id'
```

---

### Criar evento em OS via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/ordem-eventos retorna 201 | | |
| Response contem `id`, `titulo`, `tipo` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
# Substitua <os-id> pelo id de uma OS existente
curl -s -X POST http://localhost:3333/api/ordem-eventos \
  -H "Content-Type: application/json" \
  -d '{
    "ordemServicoId": "<os-id>",
    "tipo": "comentario",
    "titulo": "Teste Tenant Evento",
    "descricao": "Evento criado para validar persistencia de tenantId"
  }' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "ordemServicoId": "<os-id>",
    "tipo": "comentario",
    "titulo": "Teste Tenant Evento",
    "tenantId": "rr-infocell",
    "createdAt": "..."
  }
}
```

---

### Verificar campo tenantId no Firestore

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `ordemEventos` | | |
| Localizar o documento pelo `id` retornado | | |
| Documento contem campo `tenantId: "rr-infocell"` | | |
| Documento contem `ordemServicoId`, `tipo`, `titulo`, `createdAt` corretos | | |

**Estrutura esperada no Firestore:**
```
ordemEventos/
  <id-gerado>/
    ordemServicoId: "<os-id>"
    tipo: "comentario"
    titulo: "Teste Tenant Evento"
    descricao: "Evento criado para validar persistencia de tenantId"
    tenantId: "rr-infocell"   ← novo campo
    createdAt: "2026-05-26T..."
```

---

### Verificar listagem de eventos da OS

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/ordem-eventos?ordemServicoId=<os-id> retorna 200 | | |
| Listagem inclui o evento recem-criado | | |
| Eventos anteriores (sem tenantId) continuam visiveis | | |
| Nenhum erro 500 | | |

```bash
curl -s "http://localhost:3333/api/ordem-eventos?ordemServicoId=<os-id>" | jq '.data | length'
```

---

### Verificar que OS principal NAO foi afetada

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/ordens-servico/:id retorna 200 | | |
| Dados da OS corretos (status, pecas, valores) | | |
| Nenhum campo de OS foi alterado | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| OS principal com tenantId | Nao — Fase 8.7.3 |
| Movimentacoes de estoque com tenantId | Nao — Fase 8.7.2 |
| Vendas com tenantId | Nao — Fase 8.7.4 |
| Listagem filtrada por tenantId | Nao — global sem filtro |
| Eventos existentes migrados | Nao — apenas novos registros |
| Isolamento real entre empresas | Nao — ainda e um unico tenant |

---

## 5. Proxima fase — 8.7.2

**Objetivo:** persistir `tenantId` em movimentacoes manuais de estoque.

Movimentacoes manuais sao menos acopladas que OS (nao disparam logica de pecas). As automaticas via OS serao tratadas na Fase 8.7.3.

**Criterio de entrada para Fase 8.7.2:**
- [ ] Validacao manual desta fase aprovada (tenantId visivel no Firestore em ordemEventos)
- [ ] GET /ordem-eventos continua funcionando
- [ ] OS principal sem alteracao de comportamento
