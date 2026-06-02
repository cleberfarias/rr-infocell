# Validação — Guard de Vínculos em Vendas/PDV

**Fase:** 9.14.6
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivo alterado:** `backend/src/modules/vendas/vendas.service.ts`

---

## 1. O que mudou

Duas linhas no service de vendas:

```typescript
// Venda via OS — linha 27
// Antes
const ordem = await ordensServicoService.getById(input.ordemServicoId);
// Depois
const ordem = await ordensServicoService.getById(input.ordemServicoId, tenantId);

// Venda direta — linha 112
// Antes
const produto = await produtosService.getById(item.produtoId);
// Depois
const produto = await produtosService.getById(item.produtoId, tenantId);
```

O `tenantId` já estava disponível como parâmetro de `create` e de `createVendaDireta` desde a Fase 9.12. Só faltava repassá-lo para as buscas de entidades relacionadas.

---

## 2. Cadeia de propagação

### Venda via OS

```
Route: POST /api/vendas
  → tenantId = getRequestTenantId(request)
  → vendasService.create(input, tenantId)
    → ordensServicoService.getById(ordemServicoId, tenantId)  ← guard ativo ✅
    → [validações de pagamento e status — intocadas]
    → ordensServicoService.update(ordem.id, { status: "entregue", ... })
       (sem tenantId — chamada interna segura)
    → repository.create({ ..., tenantId })
```

### Venda direta (PDV)

```
Route: POST /api/vendas
  → tenantId = getRequestTenantId(request)
  → vendasService.create(input, tenantId)
    → createVendaDireta(input, tenantId)
      → produtosService.getById(produtoId, tenantId)  ← guard ativo ✅
      → [validações de estoque, celular individual — intocadas]
      → movimentacoesEstoqueService.create({ ... })   ← usa DEFAULT_TENANT_ID interno
      → repository.create({ ..., tenantId })
```

---

## 3. Comportamento do guard

| Situação | Resultado |
|----------|-----------|
| Venda via OS do mesmo tenant | ✅ Sucesso — OS encontrada, venda criada |
| Venda com `ordemServicoId` de outro tenant | ❌ 404 `ordem_servico_not_found` |
| Venda direta com produto do mesmo tenant | ✅ Sucesso — produto encontrado |
| Venda direta com `produtoId` de outro tenant | ❌ 404 `produto_not_found` |
| `findByOrdem` interno | ✅ Usa `DEFAULT_TENANT_ID` — sem impacto |

---

## 4. Checklist de validação

### Venda via OS — acesso legítimo

- [ ] `POST /api/vendas` com OS do tenant rr-infocell no status `pronto_para_retirada` → 201
- [ ] OS marcada como `entregue` no Firestore
- [ ] Venda criada com `tenantId: "rr-infocell"` no Firestore
- [ ] Evento de venda registrado na OS
- [ ] Cálculo de troco, saldo e desconto corretos

### Venda via OS — acesso cruzado

- [ ] Criar OS temporária no Firestore com `tenantId: "tenant-teste"` e `status: "pronto_para_retirada"`
- [ ] `POST /api/vendas` com esse `ordemServicoId` como usuário rr-infocell → **404 `ordem_servico_not_found`**
- [ ] OS de outro tenant não é marcada como entregue
- [ ] Nenhum erro 500

### Venda direta — acesso legítimo

- [ ] `POST /api/vendas` com produto do tenant rr-infocell → 201
- [ ] Baixa de estoque criada automaticamente
- [ ] Venda criada com `tenantId: "rr-infocell"` no Firestore
- [ ] Validação de celular individual funcionando
- [ ] Erro 400 em estoque insuficiente

### Venda direta — acesso cruzado

- [ ] Criar produto temporário no Firestore com `tenantId: "tenant-teste"`
- [ ] `POST /api/vendas` com esse `produtoId` como usuário rr-infocell → **404 `produto_not_found`**
- [ ] Produto de outro tenant não é baixado do estoque
- [ ] Nenhum erro 500

### Regressão geral

- [ ] `GET /api/vendas` retorna 200
- [ ] `findByOrdem` continua funcionando (venda duplicada retorna 400)
- [ ] OS, produtos e movimentações sem regressão
- [ ] Nenhum warning `[resolveTenant]` no console

---

## 5. Critérios de aprovação

| Critério | Status |
|----------|--------|
| Venda via OS legítima → 201 | 🔲 |
| Venda via OS de outro tenant → 404 | 🔲 |
| Venda direta com produto legítimo → 201 | 🔲 |
| Venda direta com produto de outro tenant → 404 | 🔲 |
| Baixa de estoque funcionando | 🔲 |
| Cálculo de venda intocado | 🔲 |
| Build TypeScript passou | ✅ |

---

## 6. Próxima fase

**Fase 9.14.7 — Validação final de vínculos cruzados**

Consolidar os checklists das fases 9.14.4 a 9.14.6 e confirmar que todos os guards de vínculo estão funcionando antes de criar o segundo tenant fake na Fase 9.15.
