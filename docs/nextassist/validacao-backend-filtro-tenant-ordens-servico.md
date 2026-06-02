# Validacao Backend — Filtro por tenantId em Ordens de Servico (Fase 8.8.7)

## 1. O que foi alterado

A listagem de ordens de servico passou a filtrar por `tenantId` no Firestore, retornando apenas OS do tenant atual.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/ordens-servico/ordens-servico.repository.ts` | `FirestoreOrdensServicoRepository.list()` agora inicializa a query com `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes dos filtros opcionais |

**O que NAO foi alterado:**
- `findById()` — intocado (vendas e movimentacoes dependem de busca por ID direto)
- `create()` — intocado (ja injeta `DEFAULT_TENANT_ID` na transacao)
- `update()` — intocado (ja preserva `current.tenantId ?? DEFAULT_TENANT_ID`)
- `delete()` — intocado
- `buildOrdem()` — intocado (logica de negocio da OS)
- `applyPecasDeltas()` — intocado (baixa automatica de estoque)
- `filterOrdensServico()` — filtros por status/prioridade/clienteId/aparelhoId intocados
- `fromDocument()` — intocado (ja lia `tenantId` do Firestore)
- Impressao, orcamento, vendas, estoque, produtos, clientes — intocados

---

## 2. Comportamento apos o filtro

| Tipo | Aparece na listagem? | Motivo |
| --- | --- | --- |
| OS criadas apos Fase 8.7.3 | Sim | Possuem `tenantId: "rr-infocell"` |
| OS editadas apos Fase 8.7.3 | Sim | `update()` injeta `current.tenantId ?? DEFAULT_TENANT_ID` |
| OS criadas antes da Fase 8.7.3 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

### Como recuperar OS antigas sem migracao massiva

OS antigas voltam a aparecer ao serem editadas: qualquer PUT em uma OS antiga aciona o `update()`, que aplica `current.tenantId ?? DEFAULT_TENANT_ID`. Editar status, tecnico, diagnostico, pecas ou qualquer campo ja aplica o `tenantId` automaticamente.

### Nota sobre o padrao de query acumulativa

O `list()` de OS usa um padrao de query acumulativa com filtros condicionais (`status`, `prioridade`, `clienteId`, `aparelhoId`). O filtro de `tenantId` foi adicionado na inicializacao da query, antes de qualquer filtro condicional. Como todos os filtros usam igualdade (`==`), nao ha risco de indice composto.

### Nota sobre findById

`findById()` continua buscando por ID diretamente sem filtro de tenant. Isso e intencional: vendas ja salvas referenciam `ordemServicoId`, e essas referencias precisam continuar funcionando mesmo que a OS ainda nao tenha `tenantId`.

---

## 3. Checklist de validacao em staging

### Criar OS nova

```bash
# Obter clienteId valido
CLIENTE_ID=$(curl -s "http://localhost:3333/api/clientes" | jq -r '.data[0].id')

curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"defeitoRelatado\": \"Validacao filtro tenant OS 8.8.7\",
    \"status\": \"recebido\",
    \"prioridade\": \"normal\",
    \"valorMaoObra\": 0
  }" | jq '{id, numero, tenantId, status}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `numero` sequencial correto | | Transacao de counter intocada |
| Firestore → colecao `ordensServico` → documento contem `tenantId` | | |

---

### Listar OS e confirmar filtro

```bash
curl -s "http://localhost:3333/api/ordens-servico" | jq '{total: (.data | length)}'
```

```bash
# OS criada aparece
curl -s "http://localhost:3333/api/ordens-servico" \
  | jq '.data[0] | {id, numero, tenantId, status}'
```

```bash
# Filtro por status
curl -s "http://localhost:3333/api/ordens-servico?status=recebido" | jq '{total: (.data | length)}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| OS criada aparece | | |
| Filtro por status funciona | | `?status=recebido` |
| Filtro por clienteId funciona | | `?clienteId=<id>` |
| OS antigas sem `tenantId` NAO aparecem | | Esperado |
| Ordenacao por numero decrescente correta | | Mais recente primeiro |

---

### Verificar que totais e pecas estao corretos

```bash
# OS com pecas — verificar calculo
curl -s "http://localhost:3333/api/ordens-servico" \
  | jq '.data[0] | {valorPecas, valorMaoObra, valorTotal, desconto}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `valorTotal = valorPecas + valorMaoObra - desconto` | | Calculo intocado |
| `pecasUsadas` correto | | buildOrdem() intocado |

---

### Recuperar OS antiga via edicao (sem migracao)

```bash
# Editar OS antiga — update() aplica tenantId automaticamente
curl -s -X PUT http://localhost:3333/api/ordens-servico/<id-os-antiga> \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "<clienteId-atual>",
    "defeitoRelatado": "<defeito-atual>",
    "status": "<status-atual>",
    "valorMaoObra": <valor-atual>
  }' | jq '{id, numero, tenantId, status}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| PUT retorna 200 com `tenantId: "rr-infocell"` | | |
| OS aparece na listagem apos edicao | | |
| `valorTotal`, `pecasUsadas` preservados | | |

---

### Confirmar findById e vendas nao foram afetados

```bash
# findById direto (sem filtro de tenant)
OS_ID=$(curl -s "http://localhost:3333/api/ordens-servico" | jq -r '.data[0].id')
curl -s "http://localhost:3333/api/ordens-servico/$OS_ID" | jq '{id, tenantId, status}'
```

```bash
# Endpoints criticos
for endpoint in vendas movimentacoes-estoque produtos clientes; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET /ordens-servico/:id retorna 200 | | findById intocado |
| GET /vendas retorna 200 | | |
| GET /movimentacoes-estoque retorna 200 | | |
| GET /produtos retorna 200 | | |
| GET /clientes retorna 200 | | |
| Nenhum 400/422/500 | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em `findById()` | Nao — busca por ID intocada por seguranca (vendas dependem) |
| Migracao de OS antigas | Nao — editar a OS aplica tenantId automaticamente |
| Filtro em vendas | Nao — Fase 8.8.8 |
| Alteracao de impressao, orcamento, estoque, financeiro | Nao — intocados |

---

## 5. Proxima fase — 8.8.8

**Objetivo:** aplicar filtro por tenantId na listagem de vendas.

**Nivel de risco:** alto — vendas tem relacionamento com OS (`ordemServicoId`), clientes e produtos. O `findById()` de venda precisa continuar sem filtro. `create()` ja injeta `tenantId` (Fase 8.7.4).

**Criterio de entrada para esta fase (8.8.7):**
- [ ] OS nova com tenantId aparece na listagem
- [ ] Filtros por status, clienteId continuam funcionando
- [ ] GET /ordens-servico retorna 200 sem erro
- [ ] OS antiga sem tenantId: comportamento documentado e aceito
- [ ] OS antiga volta ao editar (update aplica tenantId)
- [ ] GET /vendas, /movimentacoes-estoque, /produtos, /clientes continuam funcionando
