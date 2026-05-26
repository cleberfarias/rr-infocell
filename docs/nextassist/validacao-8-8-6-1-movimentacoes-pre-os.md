# Validacao 8.8.6.1 — Movimentacoes de Estoque antes de avancar para OS

## Objetivo

Confirmar que o filtro por tenantId em movimentacoes de estoque esta funcionando corretamente — tanto para movimentacoes manuais quanto para as automaticas geradas por OS — antes de avancar para a Fase 8.8.7 (filtro em OS).

Esta e a ultima trava de seguranca antes de tocar em OS, que e a entidade de maior risco.

---

## Checklist

### 1. Movimentacao manual de entrada

```bash
# Obter um produto com tenantId
PRODUTO=$(curl -s "http://localhost:3333/api/produtos" | jq -r '.data[0] | {id, nome, estoqueAtual}')
echo $PRODUTO
```

```bash
PRODUTO_ID=$(curl -s "http://localhost:3333/api/produtos" | jq -r '.data[0].id')

curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d "{
    \"produtoId\": \"$PRODUTO_ID\",
    \"tipo\": \"entrada\",
    \"quantidade\": 5,
    \"motivo\": \"Validacao 8.8.6.1 entrada\"
  }" | jq '{id, tenantId, tipo, quantidade, estoqueAnterior, estoquePosterior, origem}'
```

| Resultado esperado | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` presente | | |
| `origem: "manual"` | | |
| `estoquePosterior = estoqueAnterior + 5` | | |

```bash
# Confirmar que aparece na listagem
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=$PRODUTO_ID&tipo=entrada" \
  | jq '.data[0] | {id, tenantId, tipo, quantidade, origem}'
```

| Resultado esperado | Resultado |
| --- | --- |
| GET retorna 200 | |
| Movimentacao de entrada aparece | |
| `tenantId: "rr-infocell"` presente | |

---

### 2. Movimentacao manual de saida

```bash
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d "{
    \"produtoId\": \"$PRODUTO_ID\",
    \"tipo\": \"saida\",
    \"quantidade\": 2,
    \"motivo\": \"Validacao 8.8.6.1 saida\"
  }" | jq '{id, tenantId, tipo, quantidade, estoqueAnterior, estoquePosterior, origem}'
```

| Resultado esperado | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` presente | | |
| `origem: "manual"` | | |
| `estoquePosterior = estoqueAnterior - 2` | | |

```bash
# Confirmar que aparece na listagem
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=$PRODUTO_ID&tipo=saida" \
  | jq '.data[0] | {id, tenantId, tipo, quantidade, origem}'
```

| Resultado esperado | Resultado |
| --- | --- |
| GET retorna 200 | |
| Movimentacao de saida aparece | |
| `tenantId: "rr-infocell"` presente | |

---

### 3. Baixa automatica via OS com peca

```bash
# Obter clienteId e estoqueAtual atual do produto
CLIENTE_ID=$(curl -s "http://localhost:3333/api/clientes" | jq -r '.data[0].id')
ESTOQUE_ATUAL=$(curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" | jq '.data.estoqueAtual')
echo "clienteId: $CLIENTE_ID | estoqueAtual antes da OS: $ESTOQUE_ATUAL"
```

```bash
# Criar OS com peca
OS_ID=$(curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelho\": \"Aparelho Validacao 8861\",
    \"problema\": \"Teste baixa automatica filtro tenant\",
    \"pecas\": [{\"produtoId\": \"$PRODUTO_ID\", \"quantidade\": 1, \"precoUnitario\": 20}]
  }" | jq -r '.data.id')
echo "OS criada: $OS_ID"
```

```bash
# Confirmar movimentacao automatica na listagem
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=$PRODUTO_ID&tipo=saida" \
  | jq '.data[] | select(.origem == "ordem_servico") | {id, tenantId, origem, quantidade, ordemServicoId}' \
  | head -20
```

```bash
# Confirmar que o saldo do produto diminuiu
curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" \
  | jq '.data | {id, nome, estoqueAtual}'
```

| Resultado esperado | Resultado | Observacao |
| --- | --- | --- |
| OS criada com sucesso | | |
| Movimentacao automatica `origem: "ordem_servico"` aparece na listagem | | Filtro por tenantId cobre automaticas tambem |
| Movimentacao automatica tem `tenantId: "rr-infocell"` | | |
| `ordemServicoId` correto na movimentacao | | |
| `estoqueAtual` do produto diminuiu em 1 | | Baixa automatica intocada |

---

### 4. Verificar movimentacoes antigas sem tenantId

```bash
# Total atual na listagem (filtrado por tenantId)
TOTAL_FILTRADO=$(curl -s "http://localhost:3333/api/movimentacoes-estoque" | jq '.data | length')
echo "Total na listagem filtrada: $TOTAL_FILTRADO"
```

Comparar com o total que havia antes do filtro (estimativa via Firestore Console ou backup).

| Avaliacao | Resultado | Acao |
| --- | --- | --- |
| Ha movimentacoes antigas relevantes que precisam voltar? | | Se sim: avaliar script de migracao em fase separada |
| O impacto de movimentacoes antigas ocultas e aceitavel? | | Movimentacoes sao historico — OS ja tem o registro das pecas |
| Novos registros (manuais e automaticos) aparecem normalmente? | | Criterio principal |

---

### 5. Confirmar endpoints criticos

```bash
for endpoint in ordens-servico vendas produtos clientes despesas contas; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Endpoint | Resultado esperado | Resultado |
| --- | --- | --- |
| GET /ordens-servico | 200 | |
| GET /vendas | 200 | |
| GET /produtos | 200 | |
| GET /clientes | 200 | |
| GET /despesas | 200 | |
| GET /contas | 200 | |
| Nenhum 400/422/500 | — | |

---

## Criterio de aceite — trava para a Fase 8.8.7

Todos os itens abaixo devem estar confirmados antes de avancar:

- [ ] Movimentacao manual de entrada: POST 201, `tenantId: "rr-infocell"`, aparece na listagem
- [ ] Movimentacao manual de saida: POST 201, `tenantId: "rr-infocell"`, aparece na listagem
- [ ] Baixa automatica via OS: movimentacao com `origem: "ordem_servico"` aparece na listagem com `tenantId`
- [ ] `estoqueAtual` do produto correto apos baixa
- [ ] Impacto de movimentacoes antigas sem `tenantId` avaliado e aceito
- [ ] GET /ordens-servico, /vendas, /produtos, /clientes retornam 200

**Aprovado em staging:** ________ / ________ / ________

---

## Proxima fase — 8.8.7 (aguardando aprovacao desta validacao)

**Objetivo:** aplicar filtro por tenantId na listagem de ordens de servico.

**Nivel de risco:** alto.
- OS usa `buildOrdem()` para montar o objeto de resposta
- Relacionamentos com cliente, produto, movimentacoes, venda
- Calculo de totais (mao de obra + pecas + desconto)
- `findById()` continua sem filtro — OS ja salvas com `ordemId` em vendas precisam ser acessiveis por ID

**Regras que serao mantidas:**
- `findById()` intocado
- `create()` intocado
- `update()` intocado
- `buildOrdem()` intocado
- `applyPecasDeltas()` intocado
- Apenas `list()` recebe o filtro `.where("tenantId", "==", DEFAULT_TENANT_ID)`
