# Validacao Backend — Persistencia tenantId em Ordens de Servico (Fase 8.7.3)

## 1. O que foi alterado

O modulo `ordens-servico` passou a persistir `tenantId` no Firestore para todas as OS criadas e editadas a partir desta fase.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/ordens-servico/ordens-servico.types.ts` | Campo `tenantId?: string` adicionado ao tipo `OrdemServico` (apos `automacoes`) |
| `backend/src/modules/ordens-servico/ordens-servico.repository.ts` | Import de `DEFAULT_TENANT_ID`; `create()` e `update()` injetam `tenantId` apos `buildOrdem()`; `fromDocument()` le `tenantId` do Firestore |

**O que NAO foi alterado:**
- `ordens-servico.schemas.ts` — schema Zod intocado
- `ordens-servico.service.ts` — service intocado
- `buildOrdem()` — funcao de negocio intocada (status, calculos, garantia, pecas)
- `applyPecasDeltas()` — baixa automatica de estoque intocada
- Listagem GET /ordens-servico — sem filtro por tenant
- Produtos, movimentacoes, vendas, financeiro, WhatsApp — intocados

---

## 2. Estrategia de injecao

A funcao `buildOrdem()` contem toda a logica de negocio (status, valores, garantia, senha do aparelho). Ela nao conhece `tenantId` e nao foi modificada. O `tenantId` e injetado apos a chamada a `buildOrdem()`, no repository:

```typescript
// FirestoreOrdensServicoRepository.create() — depois
const ordem = buildOrdem(input, current);
transaction.set(ordemRef, withoutUndefined({ ...ordem, id: ordemRef.id, tenantId: DEFAULT_TENANT_ID }));
return { ...ordem, id: ordemRef.id, tenantId: DEFAULT_TENANT_ID };

// FirestoreOrdensServicoRepository.update() — depois
const tenantId = current.tenantId ?? DEFAULT_TENANT_ID;  // preserva ou migra
const ordem = { ...buildOrdem(input, current.numero, current), tenantId };
await ...set(withoutUndefined(ordem));
return ordem;
```

O `update()` usa `current.tenantId ?? DEFAULT_TENANT_ID` para:
1. Preservar o `tenantId` de OS ja existentes que foram criadas apos esta fase
2. Migrar gradualmente OS antigas (sem tenantId) ao serem editadas

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Cliente e aparelho existentes no staging | | Usar IDs reais |
| Produto com estoque > 0 para o cenario com peca | | |

---

### Obter IDs de cliente e aparelho

```bash
CLIENTE_ID=$(curl -s "http://localhost:3333/api/clientes?limit=1" | jq -r '.data[0].id')
echo "clienteId: $CLIENTE_ID"

APARELHO_ID=$(curl -s "http://localhost:3333/api/aparelhos?clienteId=$CLIENTE_ID&limit=1" | jq -r '.data[0].id')
echo "aparelhoId: $APARELHO_ID"
```

---

### Criar OS sem peca

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/ordens-servico retorna 201 | | |
| Response contem `id`, `numero`, `status: "recebido"` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Nenhum erro 400/422/500 | | |

```bash
curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Teste validacao tenantId OS sem peca\",
    \"tipoSenha\": \"sem_senha\"
  }" | jq '{id, numero, status, tenantId}'
```

**Response esperada:**
```json
{
  "id": "<id-gerado>",
  "numero": <N>,
  "status": "recebido",
  "tenantId": "rr-infocell"
}
```

---

### Verificar campo tenantId no Firestore (OS sem peca)

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `ordensServico` | | |
| Localizar o documento pelo `id` retornado | | |
| Documento contem campo `tenantId: "rr-infocell"` | | |
| Documento contem `clienteId`, `aparelhoId`, `status`, `numero` corretos | | |

---

### Editar OS e confirmar tenantId preservado

| Item | Resultado | Observacao |
| --- | --- | --- |
| PUT /api/ordens-servico/:id retorna 200 | | |
| Response contem `tenantId: "rr-infocell"` apos o update | | |
| Status atualizado corretamente | | |

```bash
# Substitua <os-id> pelo id da OS criada acima
curl -s -X PUT http://localhost:3333/api/ordens-servico/<os-id> \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Teste validacao tenantId OS editada\",
    \"tipoSenha\": \"sem_senha\",
    \"status\": \"em_analise\"
  }" | jq '{id, status, tenantId}'
```

---

### Criar OS com peca (cenario critico)

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/ordens-servico com `pecasUsadas` retorna 201 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Estoque do produto reduzido automaticamente | | |
| Movimentacao automatica gerada tem `tenantId: "rr-infocell"` | | |
| `origem: "ordem_servico"` na movimentacao | | |
| Nenhum erro 400/422/500 | | |

```bash
# Substitua <produto-id> por produto com estoque > 0
PRODUTO_ID="<produto-id>"

curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Teste validacao tenantId OS com peca\",
    \"tipoSenha\": \"sem_senha\",
    \"pecasUsadas\": [{
      \"produtoId\": \"$PRODUTO_ID\",
      \"quantidade\": 1,
      \"valorUnitario\": 50
    }]
  }" | jq '{id, numero, tenantId, valorPecas, valorTotal}'
```

---

### Verificar movimentacao automatica da OS com peca

```bash
OS_ID="<os-id-criada-acima>"
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=$PRODUTO_ID" \
  | jq '[.data[] | select(.ordemServicoId == "'$OS_ID'")] | .[0] | {tipo, origem, ordemServicoId, tenantId}'
```

Resultado esperado: `origem: "ordem_servico"`, `tenantId: "rr-infocell"`.

---

### Verificar listagem de OS

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/ordens-servico retorna 200 | | |
| Listagem inclui OS recentes criadas | | |
| OS anteriores (sem tenantId) continuam visiveis | | |
| Nenhum erro 500 | | |

```bash
curl -s "http://localhost:3333/api/ordens-servico?limit=5" | jq '.data | length'
```

---

### Confirmar que impressao/orcamento nao foi alterado

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/ordens-servico/:id retorna 200 | | |
| Campos de valores (`valorPecas`, `valorMaoObra`, `valorTotal`) corretos | | |
| Campos de status, prioridade e datas corretos | | |
| Campos de senha do aparelho corretos | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Vendas com tenantId | Nao — Fase 8.7.4 |
| Listagem filtrada por tenantId | Nao — global sem filtro |
| OS existentes migradas | Nao — apenas novas OS e OS editadas apos esta fase |
| Isolamento real entre empresas | Nao — ainda e um unico tenant |

---

## 5. Proxima fase — 8.7.4

**Objetivo:** persistir `tenantId` em vendas/PDV.

**Criterio de entrada para Fase 8.7.4:**
- [x] Validacao manual desta fase aprovada (tenantId visivel no Firestore em ordensServico)
- [x] OS com peca continua gerando baixa automatica de estoque
- [x] Movimentacao automatica tambem tem tenantId
- [x] GET /ordens-servico continua funcionando
- [x] Impressao e orcamento sem alteracao de comportamento

---

## 6. Resultado da validacao — 26/05/2026

| Cenario | Status | Observacao |
| --- | --- | --- |
| OS sem peca — POST 201 | OK | |
| OS sem peca — `tenantId: "rr-infocell"` na response | OK | OS numero 66 |
| OS editada — PUT 200 | OK | |
| OS editada — `tenantId` preservado | OK | status em_analise, diagnostico atualizado |
| OS com peca — POST 201 | OK | |
| OS com peca — `tenantId: "rr-infocell"` | OK | OS numero 67 |
| OS com peca — estoque reduzido (1 → 0) | OK | FRONTAL IPHONE 16 |
| Movimentacao automatica — `tenantId: "rr-infocell"` | OK | `origem: "ordem_servico"` |
| Listagem GET /ordens-servico — HTTP 200 | OK | 5 OS, 2 novas com tenantId, 3 antigas sem |
| Registros antigos sem tenantId continuam visiveis | OK | |
| Nenhum 400/422/500 | OK | |

**Aprovada em:** 26/05/2026
**Ambiente:** staging local (node dist/server.js porta 3335, Firestore staging)
