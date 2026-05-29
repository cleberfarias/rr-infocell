# Validação — Guard de Vínculo produto x Movimentação de Estoque

**Fase:** 9.14.4
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivo alterado:** `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts`

---

## 1. O que mudou

Uma única linha no service de movimentações:

```typescript
// Antes (Fase 9.10)
const produto = await this.produtos.getById(input.produtoId);

// Depois (Fase 9.14.4)
const produto = await this.produtos.getById(input.produtoId, tenantId);
```

O `tenantId` já estava disponível como parâmetro do `create` desde a Fase 9.10 (`tenantId = DEFAULT_TENANT_ID`). A mudança é apenas começar a passá-lo para `getById`, que agora valida que o produto pertence ao mesmo tenant.

---

## 2. Comportamento do guard

| Situação | Resultado |
|----------|-----------|
| Movimentação manual com produto do mesmo tenant | ✅ Sucesso — produto encontrado, estoque atualizado |
| Movimentação manual com `produtoId` de outro tenant | ❌ 404 `produto_not_found` — sem revelar que existe em outro tenant |
| Movimentação automática via OS (sem tenantId explícito) | ✅ Usa `DEFAULT_TENANT_ID` como default — mono-tenant seguro |
| Movimentação com produto inexistente | ❌ 404 `produto_not_found` — comportamento idêntico ao anterior |

---

## 3. Por que chamadas internas via OS continuam funcionando

A OS chama `movimentacoesEstoqueService.create(input)` **sem passar tenantId**:

```typescript
// OS service — applyPecasDeltas — não alterado
await movimentacoesEstoqueService.create({
    produtoId: delta.produtoId,
    tipo: "saida",
    ...
});
```

O `create` usa `tenantId = DEFAULT_TENANT_ID` como default. Então:

```
getById(produtoId, DEFAULT_TENANT_ID)
```

No mono-tenant atual, todos os produtos têm `tenantId: "rr-infocell"` = `DEFAULT_TENANT_ID`. A validação passa normalmente. Nenhuma regressão.

---

## 4. Checklist de validação

### Acesso legítimo

- [ ] `POST /api/movimentacoes-estoque` com `produtoId` do tenant `rr-infocell` → 201
- [ ] `estoqueAnterior` e `estoquePosterior` corretos
- [ ] Movimentação salva com `tenantId: "rr-infocell"` no Firestore
- [ ] Produto atualizado com novo `estoqueAtual`
- [ ] Nenhum warning `[resolveTenant]` no console

### Acesso cruzado

- [ ] Criar produto temporário no Firestore com `tenantId: "tenant-teste"`
- [ ] `POST /api/movimentacoes-estoque` com `produtoId` do produto temporário → **404 Not Found**
- [ ] Resposta genérica: "Produto nao encontrado." — não revela existência em outro tenant
- [ ] Nenhum erro 500
- [ ] Produto de outro tenant **não é atualizado** (estoqueAtual intocado)

### Baixa automática via OS (regressão)

- [ ] Criar OS com peça → movimentação automática criada com sucesso
- [ ] Produto da peça tem `estoqueAtual` reduzido corretamente
- [ ] `GET /api/movimentacoes-estoque` lista a movimentação automática
- [ ] `origem: "ordem_servico"` na movimentação automática

### Regressão geral

- [ ] `GET /api/movimentacoes-estoque` retorna 200
- [ ] Filtro por `produtoId` funciona
- [ ] `GET /api/produtos` retorna 200 (produtos intocados)
- [ ] Vendas com produto continuam funcionando (baixa de estoque interna)

---

## 5. Critérios de aprovação

| Critério | Status |
|----------|--------|
| Movimentação legítima com produto do mesmo tenant → 201 | 🔲 |
| Movimentação com produto de outro tenant → 404 | 🔲 |
| Estoque calculado corretamente | 🔲 |
| Baixa automática via OS funcionando | 🔲 |
| Nenhum erro 500 | 🔲 |
| Build TypeScript passou | ✅ |

---

## 6. Próximas fases

**Fase 9.14.5 — Guard cliente/aparelho/produto em Ordens de Serviço**

Aplicar o mesmo padrão nos vínculos críticos da OS:
- `clienteId` → `clientesService.getById(clienteId, tenantId)`
- `aparelhoId` → validar que aparelho existe e pertence ao mesmo cliente/tenant
- `pecasUsadas[].produtoId` → `produtosService.getById(produtoId, tenantId)`

**Fase 9.14.6 — Guard ordemServicoId/produto em Vendas**

- `ordemServicoId` → `ordensServicoService.getById(ordemId, tenantId)`
- `itens[].produtoId` → `produtosService.getById(produtoId, tenantId)`
