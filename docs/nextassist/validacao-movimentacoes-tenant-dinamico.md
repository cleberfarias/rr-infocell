# Validação — Movimentações de Estoque com Tenant Dinâmico

**Fase:** 9.10 — Movimentações de estoque usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivos alterados:**
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.routes.ts`
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts`
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.repository.ts`

---

## 1. O que mudou

### Fluxo manual (via rota `/api/movimentacoes-estoque`)

```
Route (resolveTenant → getRequestTenantId)
  → movimentacoesEstoqueService.list(filters, tenantId)
  → repository.list(filters, tenantId = DEFAULT_TENANT_ID)
  → Firestore .where("tenantId", "==", tenantId)

Route → movimentacoesEstoqueService.create(input, tenantId)
  → repository.create({ ..., tenantId })
  → Firestore doc.set({ ..., tenantId })
```

### Fluxo automático (via OS — sem alteração)

Quando a OS chama `movimentacoesEstoqueService.create(input)` diretamente (sem passar pelo rota), o parâmetro `tenantId` tem `DEFAULT_TENANT_ID` como valor default:

```typescript
async create(input: MovimentacaoEstoqueInput, tenantId = DEFAULT_TENANT_ID)
```

Isso garante que movimentações automáticas continuam funcionando com `"rr-infocell"` sem nenhuma alteração no código de OS.

### Regras de estoque preservadas

Toda a lógica de `calculateEstoquePosterior` (`ajuste`, `entrada`, `saida`, validação de estoque negativo) permanece exatamente igual. O `tenantId` não interfere nesses cálculos.

---

## 2. Módulos com fluxo completo ativo

| Módulo | resolveTenant | Handler usa tenantId resolvido |
|--------|:---:|:---:|
| `/api/marcas` | ✅ | ✅ |
| `/api/categorias` | ✅ | ✅ |
| `/api/clientes` | ✅ | ✅ |
| `/api/produtos` | ✅ | ✅ |
| `/api/despesas` | ✅ | ✅ |
| `/api/contas` | ✅ | ✅ |
| `/api/movimentacoes-estoque` | ✅ Fase 9.10 | ✅ Fase 9.10 |
| `/api/ordens-servico` | ❌ | ❌ |
| `/api/vendas` | ❌ | ❌ |

---

## 3. Checklist de validação

### Movimentações manuais

- [ ] `GET /api/movimentacoes-estoque` retorna lista com status 200
- [ ] Histórico de movimentações continua aparecendo
- [ ] Filtros por `produtoId` e `tipo` continuam funcionando
- [ ] `POST /api/movimentacoes-estoque` (entrada manual) — status 201
- [ ] Movimentação criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] `estoqueAnterior` e `estoquePosterior` corretos
- [ ] `POST` com saída que excede estoque retorna erro 400 com mensagem correta
- [ ] Nenhum erro 401 / 403 / 500

### Fluxo automático via OS

- [ ] Criar OS com peça continua gerando movimentação automática
- [ ] Movimentação automática tem `tenantId: "rr-infocell"` no Firestore
- [ ] `origem: "ordem_servico"` preservado nas movimentações automáticas
- [ ] Estoque do produto atualiza corretamente após criação de OS com peça

### Validação do tenant resolvido

- [ ] Nenhum warning `[resolveTenant]` no console ao acessar movimentações
- [ ] `tenantId` correto no Firebase Console para movimentações criadas manualmente

### Validação de isolamento

- [ ] OS continua funcionando sem alteração
- [ ] Produtos, clientes e demais módulos sem regressões

---

## 4. Critérios para avançar para OS (Fase 9.11)

- [ ] `GET /api/movimentacoes-estoque` validado sem warnings
- [ ] Movimentação manual criada com `tenantId` correto
- [ ] Fluxo automático via OS validado
- [ ] Saldo e estoque corretos
- [ ] Build TypeScript passou sem erros
