# Diagnóstico — `produto_not_found` em OS/Venda no Tenant Demo

**Fase:** 9.16.2 — Diagnóstico de bug em fluxos complexos
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 🔍 Em investigação

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

## 4. Hipótese principal

`produtosService.getById(produtoId, tenantId)` é chamado com `tenantId` diferente nos fluxos de OS/venda vs movimentação.

No `FirestoreProdutosRepository.findById`, o guard bloqueia quando:
```typescript
if (tenantId && produto.tenantId && produto.tenantId !== tenantId) {
    return null;
}
```

Se `tenantId = "rr-infocell"` e `produto.tenantId = "nextassist-demo"` → bloqueado → `produto_not_found`.
Se `tenantId = "nextassist-demo"` e `produto.tenantId = "nextassist-demo"` → passa → produto encontrado.

**Por que tenantId poderia ser "rr-infocell" em OS/venda mas "nextassist-demo" em movimentação?**

Hipóteses secundárias:
1. `resolveTenant` define `request.tenantId = "nextassist-demo"` mas algum middleware posterior reseta para `DEFAULT_TENANT_ID`
2. Diferença na ordem de execução dos middlewares entre as rotas
3. `DEFAULT_TENANT_ID` sendo usado como valor default em vez do tenantId resolvido
4. Circular import fazendo o `produtosService` em OS/venda ter uma instância diferente
5. `getRequestTenantId` retornando diferente para OS/venda vs movimentação

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

Só implementar correção após confirmar via logs:

| Diagnóstico | Correção |
|------------|---------|
| `tenantId = rr-infocell` em enrichPecasInput | Verificar por que `getRequestTenantId` retorna DEFAULT para OS |
| `tenantId = undefined` | Verificar se `resolveTenant` está sendo executado para OS |
| `not_found_in_firestore` | Problema diferente — verificar se o produto foi salvo na coleção correta |
| `found` mas ainda falha | Bug em outro ponto — verificar `ensurePositiveDeltasStock` |

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
