# Validação — Guard de Vínculos na Ordem de Serviço

**Fase:** 9.14.5
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivos alterados:**
- `backend/src/modules/ordens-servico/ordens-servico.service.ts`
- `backend/src/modules/ordens-servico/ordens-servico.routes.ts`

---

## 1. O que mudou

### Campos com guard de tenant ativo

| Campo | Método | Antes | Depois |
|-------|--------|-------|--------|
| `clienteId` | `ensureClienteAndAparelho` | `clientesService.getById(clienteId)` | `clientesService.getById(clienteId, tenantId)` |
| `pecasUsadas[].produtoId` | `enrichPecasInput` | `produtosService.getById(produtoId)` | `produtosService.getById(produtoId, tenantId)` |
| `pecasUsadas[].produtoId` | `ensurePositiveDeltasStock` | `produtosService.getById(produtoId)` | `produtosService.getById(produtoId, tenantId)` |
| OS sendo editada | `update → getById` | `this.getById(id)` | `this.getById(id, tenantId)` |

### Campo sem guard (limitação documentada)

| Campo | Motivo | Status |
|-------|--------|--------|
| `aparelhoId` | `aparelhos` não possui campo `tenantId` no schema Firestore | ➖ Sem guard — limitação documentada |

### Por que `aparelhoId` não tem guard

A coleção `aparelhos` no Firestore não tem campo `tenantId`. Adicionar guard sem esse campo não é efetivo. O isolamento é indireto: um aparelho pertence a um `clienteId`, e o `clienteId` **já é validado** com `tenantId`. Se o cliente pertencer ao mesmo tenant, o aparelho pertencente a esse cliente também será "do mesmo contexto".

Para guard completo em `aparelhoId`, a coleção `aparelhos` precisaria receber `tenantId` (migração de dados — escopo futuro).

---

## 2. Cadeia de propagação

```
Route: POST /api/ordens-servico
  → tenantId = getRequestTenantId(request)
  → ordensServicoService.create(input, tenantId)
    → ensureClienteAndAparelho(input, tenantId)
      → clientesService.getById(clienteId, tenantId)  ← guard ativo ✅
      → aparelhosService.getById(aparelhoId)           ← sem guard (sem tenantId)
    → enrichPecasInput(input, tenantId)
      → produtosService.getById(produtoId, tenantId)   ← guard ativo ✅
    → ensurePositiveDeltasStock(input, current, tenantId)
      → produtosService.getById(produtoId, tenantId)   ← guard ativo ✅

Route: PUT /api/ordens-servico/:id
  → tenantId = getRequestTenantId(request)
  → ordensServicoService.update(id, input, tenantId)
    → getById(id, tenantId)          ← guard: OS deve ser do mesmo tenant ✅
    → ensureClienteAndAparelho(...)  ← guard clienteId ✅
    → enrichPecasInput(...)          ← guard produtoId ✅
    → ensurePositiveDeltasStock(...) ← guard produtoId ✅
```

### Chamadas internas (sem tenantId — sem guard)

| Chamada interna | De onde | Tenantid passado | Comportamento |
|----------------|---------|:---:|--------------|
| `ordensServicoService.update(id, input)` | Vendas service | ❌ (undefined) | Sem guard — aceitável para chamada interna |
| `applyPecasDeltas` → `movimentacoesEstoqueService.create` | OS service | ❌ (usa DEFAULT) | Guard de produto em movimentações usa DEFAULT_TENANT_ID |

---

## 3. Checklist de validação

### Criação com vínculos legítimos

- [ ] `POST /api/ordens-servico` com `clienteId` do tenant rr-infocell → 201
- [ ] `POST /api/ordens-servico` com peça (`produtoId`) do tenant rr-infocell → 201
- [ ] Aparelho do cliente correto → aparelho pertence ao cliente (validação preservada)
- [ ] `estoqueAtual` do produto reduz após criação com peça
- [ ] Movimentação automática criada com `tenantId: "rr-infocell"`
- [ ] Eventos da OS criados normalmente

### Criação com vínculos cruzados

> Testar criando documento temporário com `tenantId: "tenant-teste"` no Firestore.

- [ ] `POST /api/ordens-servico` com `clienteId` de outro tenant → **404 `cliente_not_found`**
- [ ] `POST /api/ordens-servico` com `produtoId` de outro tenant em peças → **404 `produto_not_found`**
- [ ] Resposta genérica — não revela existência em outro tenant
- [ ] Nenhum erro 500

### Edição com vínculos cruzados

- [ ] `PUT /api/ordens-servico/:id-outro-tenant` → **404 `ordem_servico_not_found`** (OS de outro tenant)
- [ ] `PUT /api/ordens-servico/:id-proprio` com `clienteId` de outro tenant → **404 `cliente_not_found`**
- [ ] `PUT /api/ordens-servico/:id-proprio` com `produtoId` de outro tenant → **404 `produto_not_found`**

### Fluxos internos (regressão)

- [ ] Finalizar venda via OS → `ordensServicoService.update` chamado internamente sem tenantId → funciona normalmente
- [ ] `buildOrdem()` intocado — status, peças, garantia, senha, cálculos preservados
- [ ] `applyPecasDeltas()` intocado — baixa automática funcionando
- [ ] Impressão/orçamento retorna dados completos da OS

---

## 4. Limitação documentada — aparelhoId

**Estado atual:** sem guard de tenant em `aparelhoId`.

**Risco residual:** usuário de tenant B pode criar OS usando um `aparelhoId` de tenant A, desde que o `clienteId` usado seja válido no tenant B.

**Mitigação parcial:** o `clienteId` já é validado com tenant. Um atacante precisaria:
1. Saber o `aparelhoId` de outro tenant (ID UUID opaco)
2. Ter um `clienteId` válido no próprio tenant
3. O aparelho não pertenceria ao cliente (validação `aparelho.clienteId !== cliente.id` ainda ativa)

**Resolução completa:** migrar coleção `aparelhos` para incluir `tenantId` — escopo de fase futura.

---

## 5. Critérios de aprovação

| Critério | Status |
|----------|--------|
| OS com clienteId do mesmo tenant → 201 | 🔲 |
| OS com produtoId do mesmo tenant → 201 | 🔲 |
| OS com clienteId de outro tenant → 404 | 🔲 |
| OS com produtoId de outro tenant → 404 | 🔲 |
| Editar OS de outro tenant → 404 | 🔲 |
| Fluxos internos (venda, baixa, eventos) funcionando | 🔲 |
| Build TypeScript passou | ✅ |

---

## 6. Próxima fase

**Fase 9.14.6 — Guard ordemServicoId e produto em Vendas**

- `ordemServicoId` → `ordensServicoService.getById(ordemId, tenantId)`
- `itens[].produtoId` → `produtosService.getById(produtoId, tenantId)`
