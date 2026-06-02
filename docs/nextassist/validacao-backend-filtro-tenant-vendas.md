# Validacao Backend — Filtro por tenantId em Vendas/PDV (Fase 8.8.8)

## 1. O que foi alterado

A listagem de vendas passou a filtrar por `tenantId` no Firestore, retornando apenas vendas do tenant atual.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/vendas/vendas.repository.ts` | Adicionado import de `DEFAULT_TENANT_ID`; `FirestoreVendasRepository.list()` agora inicializa a query com `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes dos filtros opcionais |

**O que NAO foi alterado:**
- `create()` — intocado (service ja injeta `DEFAULT_TENANT_ID` em `createVenda` e `createVendaDireta`, Fase 8.7.4)
- `findByOrdem()` no repositorio — intocado como metodo proprio, mas **herda o filtro de tenantId** porque chama `list()` internamente
- `filterVendas()` — filtros por `ordemServicoId` e `status` intocados
- `fromDocument()` — intocado (ja lia `tenantId` do Firestore)
- Service de vendas (`vendas.service.ts`) — intocado
- Calculo de total, desconto, troco, forma de pagamento — intocados
- Baixa de estoque via venda direta — intocada
- OS, clientes, produtos, movimentacoes, financeiro, relatorios, impressao — intocados

---

## 2. Comportamento apos o filtro

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Vendas criadas apos Fase 8.7.4 | Sim | Possuem `tenantId: "rr-infocell"` |
| Vendas criadas antes da Fase 8.7.4 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

### Nota sobre vendas antigas

Vendas sao append-only — nao existe `update()`. Vendas antigas sem `tenantId` ficam permanentemente fora da listagem filtrada. Para recupera-las e necessario um script de migracao (adicionar `tenantId: "rr-infocell"` nos documentos sem o campo no Firestore) — a ser executado em fase separada, se o impacto for relevante.

### Nota sobre findByOrdem e duplicidade de venda

`findByOrdem()` chama `list()` internamente e, portanto, tambem filtra por `tenantId`. Isso significa:

- **Cenario normal (pos-Fase 8.7.4):** OS e venda criadas apos 8.7.4 possuem `tenantId`. `findByOrdem` encontra a venda existente e impede duplicidade. Comportamento correto.
- **Cenario de OS antiga (sem tenantId):** OS antiga sem `tenantId` nao aparece mais na listagem de OS (Fase 8.8.7). `findByOrdem` para essa OS retornaria `null`. Se alguem chamar o endpoint de criacao de venda com o ID de uma OS antiga diretamente (via API), o sistema poderia criar uma segunda venda com `tenantId`. Na pratica, esse cenario e improvavel: a OS nao aparece mais na interface, e o fluxo padrao exige selecionar a OS na listagem filtrada.
- **Acao recomendada:** se houver OS antigas com vendas importantes, incluir na migracao de tenantId tanto a OS quanto a venda correspondente.

---

## 3. Checklist de validacao em staging

### Criar venda nova (direta)

```bash
# Obter produto com estoque
PRODUTO_ID=$(curl -s "http://localhost:3333/api/produtos" | jq -r '.data[] | select(.estoqueAtual > 0) | .id' | head -1)
ESTOQUE=$(curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" | jq '.data.estoqueAtual')
echo "Produto: $PRODUTO_ID | Estoque atual: $ESTOQUE"
```

```bash
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"direta\",
    \"itens\": [{\"produtoId\": \"$PRODUTO_ID\", \"quantidade\": 1}],
    \"formaPagamento\": \"pix\",
    \"valorRecebido\": 999
  }" | jq '{id, tenantId, tipo, valorTotal, status}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `tipo: "direta"` | | |
| `status: "finalizada"` | | |
| Firestore → colecao `vendas` → documento contem `tenantId` | | |

---

### Listar vendas e confirmar filtro

```bash
curl -s "http://localhost:3333/api/vendas" | jq '{total: (.data | length)}'
```

```bash
# Venda criada aparece
curl -s "http://localhost:3333/api/vendas" \
  | jq '.data[0] | {id, tenantId, tipo, valorTotal, status}'
```

```bash
# Filtro por status
curl -s "http://localhost:3333/api/vendas?status=finalizada" | jq '{total: (.data | length)}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Venda criada aparece na listagem | | |
| Vendas antigas sem `tenantId` NAO aparecem | | Esperado |
| Filtro por status funciona | | `?status=finalizada` |
| Ordenacao por data decrescente correta | | Mais recente primeiro |

---

### Confirmar baixa de estoque na venda direta

```bash
# Estoque do produto apos venda direta com quantidade 1
curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" \
  | jq '.data | {id, nome, estoqueAtual}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `estoqueAtual` diminuiu em 1 | | Baixa intocada |
| Movimentacao de saida `origem: "venda"` aparece em /movimentacoes-estoque | | |

---

### Criar venda vinculada a OS

```bash
# Listar OS prontas para retirada
OS=$(curl -s "http://localhost:3333/api/ordens-servico?status=pronto_para_retirada" \
  | jq '.data[0] | {id, valorTotal, clienteId}')
echo $OS
```

```bash
OS_ID=$(echo $OS | jq -r '.id')
VALOR_TOTAL=$(echo $OS | jq '.valorTotal')

# Criar venda via OS
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d "{
    \"ordemServicoId\": \"$OS_ID\",
    \"formaPagamento\": \"pix\",
    \"valorRecebido\": $VALOR_TOTAL
  }" | jq '{id, tenantId, tipo, ordemServicoId, status}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId: "rr-infocell"` | | |
| `tipo: "ordem_servico"` | | |
| `ordemServicoId` correto | | |
| OS passou para status `entregue` | | |
| Evento de venda criado na OS | | |

---

### Confirmar financeiro/caixa intocados

```bash
# Totais da listagem
curl -s "http://localhost:3333/api/vendas" \
  | jq '{total: (.data | length), soma_total: [.data[].valorTotal] | add}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `valorTotal`, `formaPagamento`, `troco`, `desconto` corretos | | Calculo intocado |
| Sem erro 400/422/500 | | |

---

### Confirmar endpoints criticos

```bash
for endpoint in ordens-servico movimentacoes-estoque produtos clientes despesas contas; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Endpoint | Resultado esperado | Resultado |
| --- | --- | --- |
| GET /ordens-servico | 200 | |
| GET /movimentacoes-estoque | 200 | |
| GET /produtos | 200 | |
| GET /clientes | 200 | |
| GET /despesas | 200 | |
| GET /contas | 200 | |
| Nenhum 400/422/500 | — | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Migracao de vendas antigas | Nao — append-only; migracao via script separado, se necessario |
| Update de vendas | Nao — vendas nao possuem update e nao foi criado |
| Alteracao de regras financeiras | Nao — calculo de total, desconto, troco, forma de pagamento intocados |
| Alteracao de OS, produtos, estoque, clientes | Nao — intocados |
| Alteracao de relatorios ou impressao | Nao — intocados |

---

## 5. Proxima fase — 8.8.9

**Objetivo:** validacao final consolidada de todas as listagens filtradas por tenantId.

**Estado completo apos esta fase:**

| Entidade | Filtro ativo |
| --- | --- |
| marcas | Sim (8.8.1) |
| categorias | Sim (8.8.2) |
| clientes | Sim (8.8.3) |
| produtos | Sim (8.8.4) |
| despesas | Sim (8.8.5) |
| contas | Sim (8.8.5) |
| movimentacoes-estoque | Sim (8.8.6) |
| ordens-servico | Sim (8.8.7) |
| vendas | Sim (8.8.8) |

**A Fase 8.8.9 e a ultima trava antes de qualquer decisao de producao ou script de migracao.**

**Criterio de entrada para esta fase (8.8.8):**
- [ ] Venda direta com tenantId aparece na listagem
- [ ] Filtro por status continua funcionando
- [ ] GET /vendas retorna 200 sem erro
- [ ] Venda via OS criada corretamente com tenantId
- [ ] Baixa de estoque na venda direta continua funcionando
- [ ] OS passou para entregue apos venda via PDV
- [ ] Vendas antigas sem tenantId: comportamento documentado e aceito
- [ ] GET /ordens-servico, /movimentacoes-estoque, /produtos, /clientes retornam 200
