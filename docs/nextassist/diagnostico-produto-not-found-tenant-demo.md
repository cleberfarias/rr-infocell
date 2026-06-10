# Diagnóstico — `produto_not_found` em OS/Venda no Tenant Demo

**Fase:** 9.16.2 — Diagnóstico de bug em fluxos complexos
**Data:** 2026-05-29 → atualizado 2026-06-02
**Branch:** nextassist-saas
**Status:** ✅ Causa raiz confirmada — pronto para correção

---

## 1. Contexto do bug

Durante a validação multi-tenant no staging (`rr-infocell-api-staging`), foi confirmado que o isolamento entre tenants funciona corretamente para listagens e vínculos cruzados. No entanto, dois fluxos de escrita falham com `produto_not_found` ao usar um produto do tenant `nextassist-demo`:

| Fluxo | Esperado | Obtido |
|-------|---------|--------|
| Movimentação manual com produto demo | 201 | ✅ 201 |
| OS sem peça | 201 | ✅ 201 |
| OS com peça (produto demo) | 201 | ❌ 404 `produto_not_found` |
| Venda direta (produto demo) | 201 | ❌ 404 `produto_not_found` |

O produto `NqiT2gKmpsXUK0D4ya4z` existe no Firestore com `tenantId: "nextassist-demo"` e é acessível via `GET /api/produtos/:id`.

---

## 2. Cenários que funcionam

- `GET /api/produtos/:id` com produto demo → 200 com `tenantId: nextassist-demo`
- `GET /api/produtos` como demo → 200, total = 2 (apenas produtos demo)
- `POST /api/movimentacoes-estoque` com `produtoId` demo → 201 ✅
- `POST /api/ordens-servico` sem `pecasUsadas` → 201 ✅

## 3. Cenários que falham

- `POST /api/ordens-servico` com `pecasUsadas[produtoId demo]` → 404 `produto_not_found`
- `PUT /api/ordens-servico/:id` com `pecasUsadas[produtoId demo]` → 404 `produto_not_found`
- `POST /api/vendas` com `itens[produtoId demo]` → 404 `produto_not_found`

---

## 4. Causa raiz confirmada (2026-06-02)

### Evidência nos logs (`DEBUG_TENANT_LOOKUP=true`)

```
# Movimentação manual — OK
[TENANT_LOOKUP] movimentacao.create produtoId=NqiT2gKmpsXUK0D4ya4z tenantId=nextassist-demo
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found

# OS com peça — lookup inicial OK, movimentação interna ERRADA
[TENANT_LOOKUP] enrichPecasInput tenantId=nextassist-demo pecas=NqiT2gKmpsXUK0D4ya4z
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found
[TENANT_LOOKUP] movimentacao.create produtoId=NqiT2gKmpsXUK0D4ya4z tenantId=rr-infocell  ← BUG
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=rr-infocell tenantId_doc=nextassist-demo result=tenant_mismatch

# Venda direta — lookup inicial OK, movimentação interna ERRADA
[TENANT_LOOKUP] createVendaDireta tenantId=nextassist-demo itens=NqiT2gKmpsXUK0D4ya4z
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found
[TENANT_LOOKUP] movimentacao.create produtoId=NqiT2gKmpsXUK0D4ya4z tenantId=rr-infocell  ← BUG
[TENANT_LOOKUP] findById id=NqiT2gKmpsXUK0D4ya4z tenantId_received=rr-infocell tenantId_doc=nextassist-demo result=tenant_mismatch
```

### O que os logs provam

- `enrichPecasInput` recebe `tenantId=nextassist-demo` ✅ — o request chega com tenant correto
- O produto é encontrado corretamente no lookup inicial ✅
- Quando `applyPecasDeltas` (OS) ou o equivalente em vendas dispara a movimentação de estoque como efeito colateral, **o `tenantId` passado para `movimentacoes-estoque.create` é `rr-infocell`** ❌
- `movimentacoes-estoque.create` valida o produto com `tenantId=rr-infocell`, encontra `tenant_mismatch`, retorna `produto_not_found`

### Causa raiz

O `tenantId` do usuário logado (`nextassist-demo`) **não está sendo propagado** para a chamada interna de `movimentacoesEstoqueService.create` dentro dos fluxos de OS e venda. Esses serviços provavelmente usam `DEFAULT_TENANT_ID = "rr-infocell"` ou uma instância hardcoded ao criar a movimentação interna.

O problema **não está** no lookup do produto — está na criação da movimentação de estoque como efeito colateral.

---

## 5. Como ativar o diagnóstico

### No staging (deploy com debug)

```bash
cd backend

gcloud run deploy rr-infocell-api-staging \
  --project rr-infocell \
  --region southamerica-east1 \
  --source . \
  --allow-unauthenticated \
  --service-account "91248386036-compute@developer.gserviceaccount.com" \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=rr-infocell,CORS_ORIGIN=*,DEBUG_TENANT_LOOKUP=true"
```

### No ambiente local

```bash
# backend/.env
DEBUG_TENANT_LOOKUP=true
```

```bash
cd backend
DEBUG_TENANT_LOOKUP=true npm run dev
```

---

## 6. Comandos para reproduzir o bug

Após deploy com `DEBUG_TENANT_LOOKUP=true`, execute na ordem:

```bash
STAGING="https://rr-infocell-api-staging-91248386036.southamerica-east1.run.app"
DEMO_TOKEN="<token do usuario demo>"
PROD_ID="<id do produto demo>"

# 1. Movimentação — deve funcionar (controle)
curl -s -X POST "$STAGING/api/movimentacoes-estoque" \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"produtoId\":\"$PROD_ID\",\"tipo\":\"entrada\",\"quantidade\":1,\"motivo\":\"debug\",\"origem\":\"manual\"}"

# 2. OS com peça — deve falhar (bug)
curl -s -X POST "$STAGING/api/ordens-servico" \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clienteId\":\"<cli_id>\",\"aparelhoId\":\"<apa_id>\",\"defeitoRelatado\":\"debug\",\"status\":\"recebido\",\"prioridade\":\"normal\",\"pecasUsadas\":[{\"produtoId\":\"$PROD_ID\",\"quantidade\":1,\"valorUnitario\":80}]}"

# 3. Venda direta — deve falhar (bug)
curl -s -X POST "$STAGING/api/vendas" \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"itens\":[{\"produtoId\":\"$PROD_ID\",\"quantidade\":1,\"valorUnitario\":80}],\"formaPagamento\":\"pix\",\"valorRecebido\":80}"
```

---

## 7. Como interpretar os logs

Após os requests, consulte os logs do Cloud Run:

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=rr-infocell-api-staging AND textPayload:TENANT_LOOKUP" \
  --project=rr-infocell --limit=20
```

### Logs esperados — cenário correto

```
[TENANT_LOOKUP] movimentacao.create produtoId=NqiT2... tenantId=nextassist-demo
[TENANT_LOOKUP] findById id=NqiT2... tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found

[TENANT_LOOKUP] enrichPecasInput tenantId=nextassist-demo pecas=NqiT2...
[TENANT_LOOKUP] findById id=NqiT2... tenantId_received=nextassist-demo tenantId_doc=nextassist-demo result=found
```

### Logs que confirmariam o bug — tenantId errado

```
[TENANT_LOOKUP] enrichPecasInput tenantId=rr-infocell pecas=NqiT2...
[TENANT_LOOKUP] findById id=NqiT2... tenantId_received=rr-infocell tenantId_doc=nextassist-demo result=tenant_mismatch
```

### Logs que revelariam produto inexistente no Firestore

```
[TENANT_LOOKUP] findById id=NqiT2... tenantId=nextassist-demo result=not_found_in_firestore
```

---

## 8. Critérios para corrigir

### ✅ Diagnóstico confirmado — causa raiz identificada

| Log observado | Interpretação |
|--------------|--------------|
| `movimentacao.create tenantId=rr-infocell` após `enrichPecasInput tenantId=nextassist-demo` | O `tenantId` do request não é propagado para a movimentação interna |

### Correção aplicada (2026-06-02 — fase 9.16.3)

**`ordens-servico.service.ts`** — `applyPecasDeltas`:
```typescript
// antes
await movimentacoesEstoqueService.create({ ... });
// depois
await movimentacoesEstoqueService.create({ ... }, ordem.tenantId);
```
`ordem.tenantId` já estava disponível no objeto — apenas não estava sendo propagado.

**`vendas.service.ts`** — `createVendaDireta`:
```typescript
// antes
await movimentacoesEstoqueService.create({ ... });
// depois
await movimentacoesEstoqueService.create({ ... }, tenantId);
```
`tenantId` já era parâmetro de `createVendaDireta` — apenas não estava sendo repassado.

**Mono-tenant `rr-infocell`:** sem impacto. `DEFAULT_TENANT_ID` continua como fallback quando `tenantId` é `undefined`.

### Cenários a revalidar

| Cenário | Esperado após fix |
|---------|------------------|
| Movimentação manual com produto demo | 201 ✅ (já funcionava) |
| OS com peça usando produto demo | 201 ✅ (corrigido) |
| Venda direta com produto demo | 201 ✅ (corrigido) |
| Movimentação automática tem `tenantId: nextassist-demo` | ✅ |
| Fluxos rr-infocell inalterados | ✅ |

---

## 9. Remover os logs após diagnóstico

Após identificar e corrigir o bug, remover os logs de diagnóstico:

```bash
# Buscar e remover os blocos DEBUG_TENANT_LOOKUP
grep -rn "DEBUG_TENANT_LOOKUP" backend/src/
```

Os arquivos instrumentados são:
- `backend/src/modules/produtos/produtos.repository.ts`
- `backend/src/modules/ordens-servico/ordens-servico.service.ts`
- `backend/src/modules/vendas/vendas.service.ts`
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts`
