# Validacao Backend — Persistencia tenantId em Vendas/PDV (Fase 8.7.4)

## 1. O que foi alterado

O modulo `vendas` passou a persistir `tenantId` no Firestore para todas as vendas criadas a partir desta fase.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/vendas/vendas.types.ts` | Campo `tenantId?: string` adicionado ao tipo `Venda` (apos `status`) |
| `backend/src/modules/vendas/vendas.service.ts` | Import de `DEFAULT_TENANT_ID`; `tenantId: DEFAULT_TENANT_ID` adicionado nos dois `repository.create()`: venda vinculada a OS e venda direta |
| `backend/src/modules/vendas/vendas.repository.ts` | `fromDocument()` le `tenantId` do Firestore |

**O que NAO foi alterado:**
- `vendas.schemas.ts` — schema Zod intocado
- Logica de calculo (subtotal, desconto, troco, saldo devedor) intocada
- Logica de baixa de estoque (`movimentacoesEstoqueService.create()`) intocada
- Vínculo com OS (`ordensServicoService.update()`) intocado
- Evento de venda (`ordemEventosService.create()`) intocado
- Listagem GET /vendas — sem filtro por tenant
- Produtos, clientes, OS, financeiro, relatorios, impressao, WhatsApp — intocados

---

## 2. Estrategia de injecao

Vendas sao append-only — nao ha `update()`. O `tenantId` e injetado nos dois fluxos de criacao no service:

```typescript
// Venda vinculada a OS (service.create())
const venda = await this.repository.create({
  tipo: "ordem_servico",
  ...
  tenantId: DEFAULT_TENANT_ID,   // ← injetado aqui
  createdAt: delivered.pagoEm ?? now(),
});

// Venda direta (service.createVendaDireta())
return this.repository.create({
  tipo: "direta",
  ...
  tenantId: DEFAULT_TENANT_ID,   // ← injetado aqui
  createdAt: now(),
});
```

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Produto com estoque > 0 disponivel | | Para venda direta |
| OS em status `pronto_para_retirada` disponivel | | Para venda via OS |

---

### Obter produto com estoque para venda direta

```bash
curl -s "http://localhost:3333/api/produtos" \
  | jq '[.data[] | select(.estoqueAtual > 0)] | .[0] | {id, nome, estoqueAtual, precoVenda}'
```

---

### Criar venda direta

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/vendas retorna 201 | | |
| Response contem `id`, `tipo: "direta"`, `status: "finalizada"` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Estoque do produto reduzido | | |
| Nenhum erro 400/422/500 | | |

```bash
# Substitua <produto-id> por produto com estoque > 0
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "itens": [{
      "produtoId": "<produto-id>",
      "quantidade": 1
    }],
    "formaPagamento": "pix",
    "valorRecebido": 999
  }' | jq '{id, tipo, status, valorTotal, tenantId}'
```

**Response esperada:**
```json
{
  "id": "<id-gerado>",
  "tipo": "direta",
  "status": "finalizada",
  "valorTotal": <preco-do-produto>,
  "tenantId": "rr-infocell"
}
```

---

### Verificar campo tenantId no Firestore (venda direta)

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `vendas` | | |
| Localizar o documento pelo `id` retornado | | |
| Documento contem campo `tenantId: "rr-infocell"` | | |
| Documento contem `tipo: "direta"`, `status: "finalizada"` | | |
| Documento contem `itens`, `valorTotal`, `formaPagamento` corretos | | |

---

### Verificar estoque apos venda direta

```bash
curl -s http://localhost:3333/api/produtos/<produto-id> | jq '.data.estoqueAtual'
```

Deve ter reduzido em 1.

---

### Criar venda via OS (opcional — requer OS em pronto_para_retirada)

Se existir OS em status `pronto_para_retirada`:

```bash
# Obter OS pronta para retirada
curl -s "http://localhost:3333/api/ordens-servico?status=pronto_para_retirada&limit=1" \
  | jq '.data[0] | {id, numero, valorTotal}'

# Criar venda vinculada a OS
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "ordemServicoId": "<os-id>",
    "formaPagamento": "pix",
    "valorRecebido": <valor-total-da-os>
  }' | jq '{id, tipo, ordemServicoId, status, tenantId}'
```

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/vendas retorna 201 | | |
| Response contem `tipo: "ordem_servico"` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| OS atualizada para `status: "entregue"` | | |

---

### Verificar listagem de vendas

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/vendas retorna 200 | | |
| Listagem inclui venda criada | | |
| Vendas anteriores (sem tenantId) continuam visiveis | | |
| Nenhum erro 500 | | |

```bash
curl -s http://localhost:3333/api/vendas | jq '.data | length'
```

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagem filtrada por tenantId | Nao — global sem filtro |
| Vendas existentes migradas | Nao — apenas novas vendas |
| Isolamento real entre empresas | Nao — ainda e um unico tenant |
| Update de venda | Nao existe — vendas sao append-only |

---

## 5. Proxima fase — 8.7.5

**Objetivo:** validacao critica consolidada — OS + estoque + vendas juntos.

**Criterio de entrada para Fase 8.7.5:**
- [ ] Validacao manual desta fase aprovada (tenantId visivel no Firestore em vendas)
- [ ] Venda direta: estoque reduzido corretamente
- [ ] Venda via OS: OS atualizada para entregue
- [ ] GET /vendas continua funcionando
- [ ] Financeiro/caixa sem alteracao de comportamento
