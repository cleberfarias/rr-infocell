# Validacao Backend — Filtro por tenantId em Despesas e Contas (Fase 8.8.5)

## 1. O que foi alterado

As listagens de despesas e contas passaram a filtrar por `tenantId` no Firestore, retornando apenas registros do tenant atual.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/despesas/despesas.repository.ts` | `FirestoreDespesasRepository.list()` agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes do `.get()` |
| `backend/src/modules/contas/contas.routes.ts` | GET /contas agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)`; `.orderBy("nome")` removido — ordenacao movida para o cliente (`.sort()`) para evitar indice composto |

**O que NAO foi alterado em despesas:**
- `create()` — intocado (ja injeta `DEFAULT_TENANT_ID`)
- `update()` — intocado (ja preserva `current.tenantId ?? DEFAULT_TENANT_ID`)
- `delete()` — intocado
- `findById()` — intocado (busca por ID direto, sem filtro de tenant)
- `filterDespesas()` — logica de filtro por categoria/pago/search intocada
- Logica de pagamento, vencimento, recorrencia, pagoEm — intocada

**O que NAO foi alterado em contas:**
- POST /contas — intocado (ja injeta `DEFAULT_TENANT_ID`)
- PUT /contas/:id — intocado
- DELETE /contas/:id — intocado
- Calculo de saldo — intocado
- Relacionamentos com OS e vendas — intocados

---

## 2. Comportamento apos o filtro

### Despesas

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Despesas criadas apos Fase 8.6 | Sim | Possuem `tenantId: "rr-infocell"` |
| Despesas editadas apos Fase 8.6 | Sim | `update()` injeta `current.tenantId ?? DEFAULT_TENANT_ID` |
| Despesas criadas antes da Fase 8.6 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

**Como recuperar despesas antigas sem migracao massiva:** editar qualquer campo da despesa (descricao, valor, vencimento, pago) aciona o `update()`, que aplica `current.tenantId ?? DEFAULT_TENANT_ID` automaticamente. A despesa volta a aparecer na listagem.

### Contas

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| Contas criadas apos Fase 8.6 | Sim | Possuem `tenantId: "rr-infocell"` |
| Contas criadas antes da Fase 8.6 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

**Nota sobre contas antigas:** o PUT /contas/:id usa `ref.update(updates)` com campos parciais e nao injeta `tenantId`. Contas antigas voltam a aparecer somente via migracao direta no Firestore (adicionar campo `tenantId: "rr-infocell"` manualmente) ou via script de migracao — a ser avaliado em fase separada, se necessario.

### Nota sobre indice composto em contas

A query anterior usava `.orderBy("nome")` junto com `.where("tenantId", "==", ...)`. Isso exigiria um indice composto no Firestore. A ordenacao foi movida para o cliente (`.sort()`) para manter o mesmo padrao das outras entidades (marcas, categorias, clientes, produtos) e evitar dependencia de indice.

---

## 3. Checklist de validacao em staging

### Criar despesa nova

```bash
curl -s -X POST http://localhost:3333/api/despesas \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Despesa Validacao Filtro Tenant",
    "categoria": "outros",
    "valor": 100,
    "vencimento": "01/07",
    "recorrente": false,
    "pago": false
  }' | jq '{id, tenantId, descricao}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| Firestore → colecao `despesas` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar despesas e confirmar filtro

```bash
curl -s "http://localhost:3333/api/despesas" | jq '{total: (.data | length), http: "200 OK"}'
```

```bash
# Despesa criada deve aparecer
curl -s "http://localhost:3333/api/despesas?q=Validacao" | jq '.data[0] | {descricao, tenantId, valor}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Despesa criada aparece | | |
| Despesas sem `tenantId` (antigas) NAO aparecem | | Esperado |
| Filtro por categoria continua funcionando | | `?categoria=outros` |
| Filtro por pago continua funcionando | | `?pago=false` |
| Busca por descricao continua funcionando | | `?q=termo` |

---

### Verificar que pagamento/vencimento estao corretos

```bash
curl -s "http://localhost:3333/api/despesas?q=Validacao" \
  | jq '.data[0] | {valor, vencimento, pago, pagoEm, recorrente, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `valor`, `vencimento`, `pago`, `recorrente` corretos | | Logica financeira intocada |

---

### Recuperar despesa antiga via edicao (sem migracao)

```bash
# Editar despesa antiga — update() aplica tenantId automaticamente
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
| PUT retorna 200 com `tenantId: "rr-infocell"` | | |
| Despesa aparece na listagem apos edicao | | |
| `valor`, `vencimento`, `pago`, `recorrente` preservados | | |

---

### Criar conta nova

```bash
curl -s -X POST http://localhost:3333/api/contas \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Conta Validacao Filtro Tenant",
    "tipo": "caixa",
    "saldo": 0
  }' | jq '{id: .data.id, tenantId: .data.tenantId, nome: .data.nome}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| Firestore → colecao `contas` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar contas e confirmar filtro

```bash
curl -s "http://localhost:3333/api/contas" | jq '{total: (.data | length), http: "200 OK"}'
```

```bash
# Conta criada deve aparecer
curl -s "http://localhost:3333/api/contas" | jq '.data[] | select(.nome == "Conta Validacao Filtro Tenant") | {nome, tenantId, saldo}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Conta criada aparece | | |
| Contas sem `tenantId` (antigas) NAO aparecem | | Esperado |
| Ordenacao por nome continua funcionando | | Ordenacao no cliente, sem `.orderBy()` Firestore |

---

### Confirmar ausencia de erros em outros endpoints

```bash
for endpoint in ordens-servico vendas movimentacoes-estoque produtos clientes; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET /ordens-servico retorna 200 | | |
| GET /vendas retorna 200 | | |
| GET /movimentacoes-estoque retorna 200 | | |
| GET /produtos retorna 200 | | |
| GET /clientes retorna 200 | | |
| Nenhum 400/422/500 | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em `findById()` de despesas | Nao — intocado por seguranca |
| Migracao de contas antigas | Nao — PUT de contas nao injeta tenantId; migracao manual ou script separado, se necessario |
| Filtro em OS, estoque, vendas, clientes, produtos | Nao — fases anteriores ja aplicaram em clientes e produtos; OS/estoque/vendas sao Fase 8.8.6+ |
| Alteracao de relatorios financeiros | Nao — intocados |
| Alteracao de totalizadores | Nao — intocados |
| Alteracao do fluxo de pagamento/vencimento | Nao — intocado |

---

## 5. Proxima fase — 8.8.6+

**Objetivo:** avaliar filtro por tenantId nas listagens de OS, movimentacoes de estoque e vendas.

**Nivel de risco:** alto — estas entidades possuem relacionamentos cruzados (produto → movimentacao, OS → venda) e logica de negocio sensivel (baixa de estoque, calculo de lucro). Avaliar criterios de entrada antes de avancar.

**Criterio de entrada para esta fase (8.8.5):**
- [ ] Despesa nova com tenantId aparece na listagem
- [ ] Filtros por categoria, pago e busca continuam funcionando
- [ ] GET /despesas retorna 200 sem erro
- [ ] Conta nova com tenantId aparece na listagem
- [ ] GET /contas retorna 200 sem erro
- [ ] GET /ordens-servico, /vendas e /movimentacoes-estoque continuam funcionando
- [ ] Impacto de contas antigas documentado
