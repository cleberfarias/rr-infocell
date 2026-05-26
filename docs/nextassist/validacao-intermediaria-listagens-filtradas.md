# Validacao Intermediaria — Listagens Filtradas por tenantId (Fase 8.8.5.1)

## Objetivo

Confirmar que todas as entidades com filtro por tenantId ativo estao funcionando corretamente em staging antes de avancar para OS, movimentacoes e vendas.

## Entidades com filtro ativo

| Entidade | Fase que aplicou o filtro | Status |
| --- | --- | --- |
| marcas | 8.8.1 | Filtro ativo |
| categorias | 8.8.2 | Filtro ativo |
| clientes | 8.8.3 | Filtro ativo |
| produtos | 8.8.4 | Filtro ativo |
| despesas | 8.8.5 | Filtro ativo |
| contas | 8.8.5 | Filtro ativo |

## Entidades ainda sem filtro (proximas fases)

| Entidade | Proxima fase |
| --- | --- |
| movimentacoes-estoque | 8.8.6 |
| ordens-servico | 8.8.7 |
| vendas | 8.8.8 |

---

## Checklist de validacao

### Marcas

```bash
# Criar marca nova
curl -s -X POST http://localhost:3333/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Marca Validacao 8851"}' | jq '{id, tenantId, nome}'
```

```bash
# Listar marcas
curl -s "http://localhost:3333/api/marcas" | jq '{total: (.data | length)}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Marca aparece na listagem GET /marcas | | |
| Marcas PADRAO continuam sempre presentes | | Samsung, Apple, Motorola etc. |
| Marcas antigas sem `tenantId` NAO aparecem entre as customizadas | | Esperado |

---

### Categorias

```bash
# Criar categoria nova
curl -s -X POST http://localhost:3333/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome": "Categoria Validacao 8851"}' | jq '{id, tenantId, nome}'
```

```bash
# Listar categorias
curl -s "http://localhost:3333/api/categorias" | jq '{total: (.data | length)}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Categoria aparece na listagem GET /categorias | | |
| Categorias PADRAO continuam sempre presentes | | peca, servico, acessorio etc. |

---

### Clientes

```bash
# Criar cliente novo
curl -s -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Validacao 8851", "telefone": "11999990851"}' | jq '{id, tenantId}'
```

```bash
# Listar clientes
curl -s "http://localhost:3333/api/clientes" | jq '{total: (.data | length)}'
```

```bash
# Busca por nome
curl -s "http://localhost:3333/api/clientes?q=Validacao" | jq '.data[0] | {nome, tenantId}'
```

```bash
# Editar cliente antigo para aplicar tenantId (se houver cliente importante sem tenantId)
curl -s -X PUT http://localhost:3333/api/clientes/<id-cliente-antigo> \
  -H "Content-Type: application/json" \
  -d '{"nome": "<nome-atual>", "telefone": "<telefone-atual>"}' | jq '{id, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Cliente aparece na listagem | | |
| Busca por nome funciona | | |
| Clientes antigos sem `tenantId` NAO aparecem | | Esperado |
| Apos editar cliente antigo, ele volta para listagem | | update() aplica tenantId |

---

### Produtos

```bash
# Criar produto novo
curl -s -X POST http://localhost:3333/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "VAL-8851",
    "nome": "Produto Validacao 8851",
    "categoria": "peca",
    "estoqueAtual": 1,
    "estoqueMinimo": 0,
    "custo": 10,
    "precoVenda": 20
  }' | jq '{id, tenantId, estoqueAtual}'
```

```bash
# Listar produtos
curl -s "http://localhost:3333/api/produtos" | jq '{total: (.data | length)}'
```

```bash
# Filtro por categoria
curl -s "http://localhost:3333/api/produtos?categoria=peca" | jq '{total: (.data | length)}'
```

```bash
# Busca por nome/SKU
curl -s "http://localhost:3333/api/produtos?q=Validacao" | jq '.data[0] | {nome, tenantId, estoqueAtual}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Produto aparece na listagem | | |
| Filtro por categoria funciona | | `?categoria=peca` |
| Busca por nome/SKU funciona | | `?q=termo` |
| Produtos antigos sem `tenantId` NAO aparecem | | Esperado |
| `estoqueAtual`, `custo`, `precoVenda` corretos | | Logica de preco intocada |

---

### Despesas

```bash
# Criar despesa nova
curl -s -X POST http://localhost:3333/api/despesas \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Despesa Validacao 8851",
    "categoria": "outros",
    "valor": 99,
    "vencimento": "01/07",
    "recorrente": false,
    "pago": false
  }' | jq '{id, tenantId, descricao}'
```

```bash
# Listar despesas
curl -s "http://localhost:3333/api/despesas" | jq '{total: (.data | length)}'
```

```bash
# Busca e filtros
curl -s "http://localhost:3333/api/despesas?q=Validacao" | jq '.data[0] | {descricao, tenantId, valor, vencimento}'
curl -s "http://localhost:3333/api/despesas?categoria=outros" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/despesas?pago=false" | jq '{total: (.data | length)}'
```

```bash
# Editar despesa antiga para aplicar tenantId (se houver despesa importante sem tenantId)
curl -s -X PUT http://localhost:3333/api/despesas/<id-despesa-antiga> \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "<descricao-atual>",
    "categoria": "<categoria-atual>",
    "valor": <valor-atual>,
    "vencimento": "<vencimento-atual>",
    "recorrente": <recorrente-atual>,
    "pago": <pago-atual>
  }' | jq '{id, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Despesa aparece na listagem | | |
| Filtro por categoria funciona | | `?categoria=outros` |
| Filtro por pago funciona | | `?pago=false` |
| Busca por descricao funciona | | `?q=termo` |
| Despesas antigas sem `tenantId` NAO aparecem | | Esperado |
| `valor`, `vencimento`, `pago`, `recorrente` corretos | | Logica financeira intocada |
| Apos editar despesa antiga, ela volta para listagem | | update() aplica tenantId |

---

### Contas

```bash
# Criar conta nova
curl -s -X POST http://localhost:3333/api/contas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Conta Validacao 8851", "tipo": "caixa", "saldo": 0}' \
  | jq '{id: .data.id, tenantId: .data.tenantId, nome: .data.nome}'
```

```bash
# Listar contas
curl -s "http://localhost:3333/api/contas" | jq '{total: (.data | length)}'
```

```bash
# Conta criada aparece
curl -s "http://localhost:3333/api/contas" \
  | jq '.data[] | select(.nome == "Conta Validacao 8851") | {nome, tenantId, saldo}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| Conta aparece na listagem | | |
| Ordenacao por nome funciona | | Ordenacao no cliente, sem `.orderBy()` Firestore |
| Contas antigas sem `tenantId` NAO aparecem | | Esperado |
| **Contas antigas NAO voltam ao editar via PUT** | | PUT usa `ref.update()` parcial — nao injeta tenantId. Migracao manual necessaria se impacto for relevante |

---

## Validacao de endpoints criticos (nao devem quebrar)

```bash
for endpoint in ordens-servico movimentacoes-estoque vendas produtos clientes; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Endpoint | Resultado esperado | Resultado |
| --- | --- | --- |
| GET /ordens-servico | 200 | |
| GET /movimentacoes-estoque | 200 | |
| GET /vendas | 200 | |
| GET /produtos | 200 | |
| GET /clientes | 200 | |
| Nenhum 400/422/500 | — | |

---

## Criterio de aceite desta fase

Todos os itens abaixo devem estar marcados antes de avancar para a Fase 8.8.6:

- [ ] Marca nova com tenantId aparece na listagem
- [ ] Categoria nova com tenantId aparece na listagem
- [ ] Cliente novo com tenantId aparece na listagem; busca por nome funciona
- [ ] Produto novo com tenantId aparece na listagem; filtros e busca funcionam
- [ ] Despesa nova com tenantId aparece na listagem; filtros por categoria/pago funcionam
- [ ] Conta nova com tenantId aparece na listagem; ordenacao por nome funciona
- [ ] Comportamento de contas antigas (sem volta automatica via PUT) documentado e aceito
- [ ] GET /ordens-servico retorna 200
- [ ] GET /movimentacoes-estoque retorna 200
- [ ] GET /vendas retorna 200
- [ ] Nenhum endpoint retornou 400/422/500

---

## Proxima fase — 8.8.6

**Objetivo:** aplicar filtro por tenantId na listagem de movimentacoes de estoque.

**Por que movimentacoes antes de OS e vendas:** o tenantId ja e persistido em movimentacoes manuais (POST /movimentacoes-estoque) e automaticas (via OS, pelo `movimentacoesEstoqueService.create()`). A query de listagem ainda nao filtra. Risco menor que OS porque nao ha transacao de estoque envolvida na listagem — apenas leitura.

**Risco:** medio. Movimentacoes tem relacionamentos com OS e produtos, mas a listagem e somente leitura. `findById()` continua sem filtro. `create()` e `update()` nao sao alterados.
