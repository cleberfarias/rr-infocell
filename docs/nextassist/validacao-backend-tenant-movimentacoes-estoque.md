# Validacao Backend — Persistencia tenantId em Movimentacoes de Estoque (Fase 8.7.2)

## 1. O que foi alterado

O modulo `movimentacoes-estoque` passou a persistir `tenantId` no Firestore em todas as movimentacoes criadas a partir desta fase.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.types.ts` | Campo `tenantId?: string` adicionado ao tipo `MovimentacaoEstoque` |
| `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts` | Import de `DEFAULT_TENANT_ID`; campo `tenantId: DEFAULT_TENANT_ID` adicionado ao objeto passado a `repository.create()` |
| `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.repository.ts` | `fromDocument()` le `tenantId` do Firestore |

**O que NAO foi alterado:**
- `movimentacoes-estoque.schemas.ts` — schema Zod intocado
- `ordens-servico.*` — OS principal intocada
- `produtos.*` — logica de estoque/saldo intocada
- Listagem GET /movimentacoes-estoque — sem filtro por tenant
- Baixa automatica via OS — continua funcionando pelo mesmo fluxo (service.create() com origem: "ordem_servico")
- Vendas, financeiro, WhatsApp — intocados

---

## 2. Ponto de injecao: service, nao repository

A injecao foi feita no `service.create()` porque ele constroi explicitamente o objeto passado ao repository. Ambos os fluxos (manual e automatico via OS) passam pelo mesmo `service.create()` — o campo `origem` distingue a fonte:

```typescript
// movimentacoes-estoque.service.ts — depois
return this.repository.create({
  produtoId: produto.id,
  produtoNome: produto.nome,
  produtoSku: produto.sku,
  tipo: input.tipo,
  quantidade,
  estoqueAnterior,
  estoquePosterior,
  motivo: input.motivo,
  origem: input.origem ?? "manual",   // "manual" | "ordem_servico" | "venda"
  ordemServicoId: input.ordemServicoId,
  criadoPor: input.criadoPor,
  tenantId: DEFAULT_TENANT_ID,        // ← injetado aqui
  createdAt: now(),
});
```

O OS continua chamando `movimentacoesEstoqueService.create()` com `origem: "ordem_servico"` — a baixa automatica passa a ter `tenantId` tambem, sem qualquer alteracao no modulo `ordens-servico`.

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Produto existente no staging com estoque > 0 | | Usar ID de produto real |

---

### Obter produto existente com estoque

```bash
curl -s "http://localhost:3333/api/produtos?limit=5" | jq '.data[] | {id, nome, estoqueAtual}'
```

---

### Criar movimentacao manual de entrada

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/movimentacoes-estoque retorna 201 | | |
| Response contem `id`, `produtoId`, `tipo: "entrada"` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| `estoquePosterior` = `estoqueAnterior` + `quantidade` | | |
| Nenhum erro 400/422/500 | | |

```bash
# Substitua <produto-id> por um ID de produto existente
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d '{
    "produtoId": "<produto-id>",
    "tipo": "entrada",
    "quantidade": 5,
    "motivo": "Teste validacao tenantId entrada"
  }' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "produtoId": "<produto-id>",
    "tipo": "entrada",
    "quantidade": 5,
    "estoqueAnterior": <N>,
    "estoquePosterior": <N+5>,
    "origem": "manual",
    "tenantId": "rr-infocell",
    "createdAt": "..."
  }
}
```

---

### Verificar campo tenantId no Firestore (entrada)

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `movimentacoesEstoque` | | |
| Localizar o documento pelo `id` retornado | | |
| Documento contem campo `tenantId: "rr-infocell"` | | |
| Documento contem `origem: "manual"`, `tipo: "entrada"`, `quantidade: 5` | | |
| Documento contem `estoqueAnterior` e `estoquePosterior` corretos | | |

**Estrutura esperada no Firestore:**
```
movimentacoesEstoque/
  <id-gerado>/
    produtoId: "<produto-id>"
    produtoNome: "<nome-produto>"
    produtoSku: "<sku>"
    tipo: "entrada"
    quantidade: 5
    estoqueAnterior: <N>
    estoquePosterior: <N+5>
    motivo: "Teste validacao tenantId entrada"
    origem: "manual"
    tenantId: "rr-infocell"   ← novo campo
    createdAt: "2026-05-26T..."
```

---

### Verificar estoque do produto apos entrada

```bash
curl -s http://localhost:3333/api/produtos/<produto-id> | jq '.data | {estoqueAtual, tenantId}'
```

`estoqueAtual` deve ter aumentado em 5.

---

### Criar movimentacao manual de saida

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/movimentacoes-estoque retorna 201 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| `estoquePosterior` = `estoqueAnterior` - `quantidade` | | |
| Nenhum erro 400/422/500 | | |

```bash
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d '{
    "produtoId": "<produto-id>",
    "tipo": "saida",
    "quantidade": 2,
    "motivo": "Teste validacao tenantId saida"
  }' | jq .
```

---

### Verificar estoque do produto apos saida

```bash
curl -s http://localhost:3333/api/produtos/<produto-id> | jq '.data.estoqueAtual'
```

Deve ser `estoqueAnterior + 5 - 2`.

---

### Verificar listagem de movimentacoes

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/movimentacoes-estoque retorna 200 | | |
| Listagem inclui as movimentacoes criadas | | |
| Movimentacoes anteriores (sem tenantId) continuam visiveis | | |
| Nenhum erro 500 | | |

```bash
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=<produto-id>" | jq '.data | length'
```

---

### Verificar baixa automatica via OS com pecas

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar OS com uma peca no staging | | |
| Salvar OS — baixa de estoque disparada automaticamente | | |
| Movimentacao criada tem `origem: "ordem_servico"` | | |
| Movimentacao criada tem `tenantId: "rr-infocell"` | | |
| Estoque do produto reduzido corretamente | | |

```bash
# Verificar movimentacoes do produto apos salvar OS com peca
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=<produto-id>" \
  | jq '.data[0] | {origem, tenantId, tipo, quantidade}'
```

Resultado esperado: `origem: "ordem_servico"`, `tenantId: "rr-infocell"`.

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| OS principal com tenantId | Nao — Fase 8.7.3 |
| Vendas com tenantId | Nao — Fase 8.7.4 |
| Listagem filtrada por tenantId | Nao — global sem filtro |
| Movimentacoes existentes migradas | Nao — apenas novos registros |
| Isolamento real entre empresas | Nao — ainda e um unico tenant |

---

## 5. Proxima fase — 8.7.3

**Objetivo:** persistir `tenantId` em ordens de servico (entidade critica, acoplada com baixa de estoque, eventos e financeiro).

**Criterio de entrada para Fase 8.7.3:**
- [ ] Validacao manual desta fase aprovada (tenantId visivel no Firestore em movimentacoesEstoque)
- [ ] Baixa automatica de estoque via OS continua funcionando
- [ ] GET /movimentacoes-estoque continua funcionando
- [ ] Estoque de produtos correto apos entrada e saida manuais
