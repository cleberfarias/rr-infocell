# Validacao Backend — Filtro por tenantId em Movimentacoes de Estoque (Fase 8.8.6)

## 1. O que foi alterado

A listagem de movimentacoes de estoque passou a filtrar por `tenantId` no Firestore, retornando apenas movimentacoes do tenant atual.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.repository.ts` | Adicionado import de `DEFAULT_TENANT_ID`; `FirestoreMovimentacoesEstoqueRepository.list()` agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes do `.get()` |

**O que NAO foi alterado:**
- `create()` — intocado (recebe `tenantId` via service, que ja injeta `DEFAULT_TENANT_ID` desde a Fase 8.7.2)
- `fromDocument()` — intocado (ja lia `tenantId` do Firestore)
- `filterMovimentacoes()` — filtros por `produtoId` e `tipo` intocados
- Service de movimentacoes — intocado
- Baixa automatica de estoque via OS — intocada
- `MemoryMovimentacoesEstoqueRepository` — intocado
- OS, produtos, vendas, clientes, financeiro — intocados

---

## 2. Comportamento apos o filtro

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Movimentacoes manuais criadas apos Fase 8.7.2 | Sim | Possuem `tenantId: "rr-infocell"` |
| Movimentacoes automaticas (OS com peca) apos Fase 8.7.2 | Sim | Passam pelo mesmo `service.create()` que injeta `tenantId` |
| Movimentacoes criadas antes da Fase 8.7.2 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

### Nota sobre movimentacoes antigas

Movimentacoes de estoque nao possuem `update()` — sao registros imutaveis de historico. Movimentacoes antigas sem `tenantId` permanecem ocultas na listagem. Para recupera-las seria necessario um script de migracao — a ser avaliado em fase separada, se o impacto for relevante.

### Cobertura dual da baixa automatica

A injecao de `tenantId` no `service.create()` (Fase 8.7.2) cobre tanto movimentacoes manuais quanto automaticas. A baixa via OS chama `movimentacoesEstoqueService.create()` e, portanto, ja persistia `tenantId` antes desta fase. Apos esta fase, essas movimentacoes automaticas tambem aparecem na listagem filtrada.

---

## 3. Checklist de validacao em staging

### Criar movimentacao manual de entrada

```bash
# Primeiro, obter um produtoId valido
curl -s "http://localhost:3333/api/produtos" | jq '.data[0] | {id, nome, estoqueAtual}'
```

```bash
# Criar movimentacao manual de entrada
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d '{
    "produtoId": "<id-produto>",
    "tipo": "entrada",
    "quantidade": 3,
    "motivo": "Validacao filtro tenant 8.8.6"
  }' | jq '{id, tenantId, tipo, quantidade, estoquePosterior}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `origem: "manual"` na response | | |
| `estoquePosterior` = estoqueAnterior + 3 | | Logica de estoque intocada |
| Firestore → colecao `movimentacoesEstoque` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar movimentacoes e confirmar filtro

```bash
curl -s "http://localhost:3333/api/movimentacoes-estoque" | jq '{total: (.data | length)}'
```

```bash
# Movimentacao criada deve aparecer
curl -s "http://localhost:3333/api/movimentacoes-estoque" \
  | jq '.data[0] | {id, tipo, tenantId, origem, quantidade}'
```

```bash
# Filtro por produtoId
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=<id-produto>" \
  | jq '{total: (.data | length)}'
```

```bash
# Filtro por tipo
curl -s "http://localhost:3333/api/movimentacoes-estoque?tipo=entrada" \
  | jq '{total: (.data | length)}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Movimentacao manual criada aparece | | |
| Movimentacoes antigas sem `tenantId` NAO aparecem | | Esperado |
| Filtro por `produtoId` continua funcionando | | |
| Filtro por `tipo` continua funcionando | | |
| Ordenacao por data decrescente correta | | Mais recente primeiro |

---

### Validar baixa automatica via OS com peca

```bash
# Criar OS com peca (substitua os IDs conforme disponivel)
curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "<id-cliente>",
    "aparelho": "iPhone Validacao",
    "problema": "Teste filtro tenant movimentacao automatica",
    "pecas": [{"produtoId": "<id-produto>", "quantidade": 1, "precoUnitario": 20}]
  }' | jq '{id, tenantId, status}'
```

```bash
# Confirmar movimentacao automatica gerada
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=<id-produto>" \
  | jq '.data[] | select(.origem == "ordem_servico") | {id, tenantId, origem, quantidade, ordemServicoId}'
```

```bash
# Confirmar saldo do produto
curl -s "http://localhost:3333/api/produtos/<id-produto>" \
  | jq '{id, nome, estoqueAtual}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| OS criada com `tenantId: "rr-infocell"` | | |
| Movimentacao automatica `origem: "ordem_servico"` aparece na listagem | | |
| Movimentacao automatica tem `tenantId: "rr-infocell"` | | |
| `estoqueAtual` do produto diminuiu corretamente | | Baixa automatica intocada |
| `ordemServicoId` presente na movimentacao automatica | | |

---

### Confirmar que endpoints criticos nao foram afetados

```bash
for endpoint in ordens-servico vendas produtos clientes; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET /ordens-servico retorna 200 | | |
| GET /vendas retorna 200 | | |
| GET /produtos retorna 200 | | |
| GET /clientes retorna 200 | | |
| Nenhum 400/422/500 | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em `create()` | Nao — `create()` intocado; tenantId ja vem do service |
| Migracao de movimentacoes antigas | Nao — movimentacoes sao imutaveis; migracao manual via script, se necessario |
| Filtro em OS | Nao — Fase 8.8.7 |
| Filtro em vendas | Nao — Fase 8.8.8 |
| Alteracao de regras de estoque | Nao — logica de saldo/baixa intocada |
| Alteracao de OS, produtos, vendas, financeiro | Nao — intocados |

---

## 5. Proxima fase — 8.8.7

**Objetivo:** aplicar filtro por tenantId na listagem de ordens de servico.

**Nivel de risco:** alto — OS tem relacionamentos com produtos, movimentacoes, vendas e clientes. A listagem usa `buildOrdem()` e logica de calculo de totais. Avaliar criterios de entrada com cuidado antes de avancar.

**Criterio de entrada para esta fase (8.8.6):**
- [ ] Movimentacao manual com `tenantId` aparece na listagem
- [ ] Filtros por `produtoId` e `tipo` continuam funcionando
- [ ] GET /movimentacoes-estoque retorna 200 sem erro
- [ ] Movimentacao automatica (baixa via OS) aparece na listagem com `tenantId`
- [ ] Saldo do produto correto apos baixa automatica
- [ ] GET /ordens-servico, /vendas, /produtos, /clientes continuam funcionando
- [ ] Impacto de movimentacoes antigas documentado
