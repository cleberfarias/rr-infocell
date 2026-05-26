# Validacao Backend — Filtro por tenantId em Produtos (Fase 8.8.4)

## 1. O que foi alterado

A listagem de produtos passou a filtrar por `tenantId` no Firestore, retornando apenas produtos do tenant atual.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/produtos/produtos.repository.ts` | `FirestoreProdutosRepository.list()` agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes do `.get()` |

**O que NAO foi alterado:**
- `create()` — intocado (ja injeta `DEFAULT_TENANT_ID`)
- `update()` — intocado (ja preserva `current.tenantId ?? DEFAULT_TENANT_ID`)
- `delete()` — intocado
- `findById()` — intocado (busca por ID direto, sem filtro de tenant)
- `filterProdutos()` — logica de filtro por categoria/ativo/search intocada
- Logica de estoque, custo, preco, baixa automatica — intocados
- Relacionamentos com OS, vendas e movimentacoes — intocados

---

## 2. Comportamento apos o filtro

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Produtos criados apos Fase 8.5 | Sim | Possuem `tenantId: "rr-infocell"` |
| Produtos editados apos Fase 8.5 | Sim | `update()` injeta `current.tenantId ?? DEFAULT_TENANT_ID` |
| Produtos criados antes da Fase 8.5 | **Nao** | Nao possuem `tenantId` — ficam ocultos |

### Como recuperar produtos antigos sem migracao massiva

Produtos antigos sem `tenantId` voltam a aparecer ao serem editados, pois o `update()` ja aplica `current.tenantId ?? DEFAULT_TENANT_ID`. Editar qualquer campo (nome, preco, estoque minimo, observacoes) ja aplica o `tenantId` automaticamente.

### Nota sobre findById

O `findById()` continua buscando por ID diretamente no Firestore sem filtro de tenant. Isso e intencional: quando uma OS ou venda ja tem o `produtoId` salvo, ela precisa conseguir buscar o produto pelo ID mesmo que ele ainda nao tenha `tenantId`. Alterar `findById()` seria mais arriscado e sera avaliado em fase separada.

---

## 3. Checklist de validacao em staging

### Criar produto novo

```bash
curl -s -X POST http://localhost:3333/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "VAL-TENANT-FILTRO",
    "nome": "Produto Validacao Filtro Tenant",
    "categoria": "peca",
    "estoqueAtual": 5,
    "estoqueMinimo": 1,
    "custo": 10,
    "precoVenda": 30
  }' | jq '{id, tenantId, estoqueAtual}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| Firestore → colecao `produtos` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar produtos e confirmar filtro

```bash
curl -s "http://localhost:3333/api/produtos" | jq '{total: (.data | length), http: "200 OK"}'
```

```bash
# Produto criado deve aparecer
curl -s "http://localhost:3333/api/produtos?q=Validacao" | jq '.data[0] | {nome, tenantId, estoqueAtual}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Produto criado aparece | | |
| Produtos sem `tenantId` (antigos) NAO aparecem | | Esperado |
| Filtro por categoria continua funcionando | | `?categoria=peca` |
| Busca por nome/SKU continua funcionando | | `?q=termo` |

---

### Verificar que estoque/preco estao corretos

```bash
curl -s "http://localhost:3333/api/produtos?q=Validacao" \
  | jq '.data[0] | {estoqueAtual, custo, precoVenda, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `estoqueAtual`, `custo`, `precoVenda` corretos | | Logica de calculo intocada |

---

### Recuperar produto antigo via edicao (sem migracao)

```bash
# Editar produto antigo — update() aplica tenantId automaticamente
curl -s -X PUT http://localhost:3333/api/produtos/<id-produto-antigo> \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "<sku-atual>",
    "nome": "<nome-atual>",
    "categoria": "<categoria-atual>",
    "estoqueAtual": <estoque-atual>,
    "estoqueMinimo": <estoque-minimo-atual>,
    "custo": <custo-atual>,
    "precoVenda": <preco-atual>
  }' | jq '{id, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| PUT retorna 200 com `tenantId: "rr-infocell"` | | |
| Produto aparece na listagem apos edicao | | |
| `estoqueAtual`, `custo`, `precoVenda` preservados | | |

---

### Confirmar que OS, vendas e movimentacoes nao foram afetadas

```bash
for endpoint in ordens-servico vendas movimentacoes-estoque; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET /ordens-servico retorna 200 | | |
| GET /vendas retorna 200 | | |
| GET /movimentacoes-estoque retorna 200 | | |
| Nenhum 400/422/500 | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em `findById()` | Nao — intocado por seguranca (OS e vendas dependem de findById) |
| Filtro em despesas/contas | Nao — Fase 8.8.5 |
| Filtro em OS, estoque, vendas | Nao — Fase 8.8.6+ |
| Migracao de produtos antigos | Nao — editar o produto aplica tenantId automaticamente |

---

## 5. Proxima fase — 8.8.5

**Objetivo:** aplicar filtro por tenantId em despesas e contas.

**Criterio de entrada:**
- [ ] Produto novo com tenantId aparece na listagem
- [ ] Filtros por categoria e busca continuam funcionando
- [ ] GET /produtos retorna 200 sem erro
- [ ] GET /ordens-servico, /vendas e /movimentacoes-estoque continuam funcionando
- [ ] Impacto de produtos antigos documentado
