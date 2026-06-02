# Validação — Vendas/PDV com Tenant Dinâmico

**Fase:** 9.12 — Vendas usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivos alterados:**
- `backend/src/modules/vendas/vendas.routes.ts`
- `backend/src/modules/vendas/vendas.service.ts`
- `backend/src/modules/vendas/vendas.repository.ts`

---

## 1. O que mudou

### Listagem

```
Route (resolveTenant → getRequestTenantId)
  → vendasService.list(filters, tenantId)
  → repository.list(filters, tenantId = DEFAULT_TENANT_ID)
  → Firestore .where("tenantId", "==", tenantId)
```

### Criação — venda vinculada à OS

```
Route → vendasService.create(input, tenantId)
  → this.repository.create({ ..., tenantId })
```

### Criação — venda direta (PDV)

```
Route → vendasService.create(input, tenantId)
  → createVendaDireta(input, tenantId)
  → this.repository.create({ ..., tenantId })
```

### O que NÃO foi alterado

| Componente | Status |
|-----------|--------|
| `toOrdemInput()` | ✅ Intocado |
| `ordensServicoService.update()` (marcação como entregue) | ✅ Intocado |
| `movimentacoesEstoqueService.create()` (baixa direta) | ✅ Intocado — usa DEFAULT_TENANT_ID como default |
| `ordemEventosService.create()` (evento de venda) | ✅ Intocado |
| `findByOrdem()` no repository | ✅ Intocado — chama `list` internamente com DEFAULT_TENANT_ID |
| Cálculos de total, desconto, troco, saldo | ✅ Intocados |
| Validações de pagamento, celular individual, estoque | ✅ Intocadas |
| Impressão do cupom térmico | ✅ Intocada |

---

## 2. Módulos com fluxo completo ativo — estado final da Fase 9

| Módulo | resolveTenant | Handler usa tenantId resolvido |
|--------|:---:|:---:|
| `/api/marcas` | ✅ | ✅ |
| `/api/categorias` | ✅ | ✅ |
| `/api/clientes` | ✅ | ✅ |
| `/api/produtos` | ✅ | ✅ |
| `/api/despesas` | ✅ | ✅ |
| `/api/contas` | ✅ | ✅ |
| `/api/movimentacoes-estoque` | ✅ | ✅ |
| `/api/ordens-servico` | ✅ | ✅ |
| `/api/vendas` | ✅ Fase 9.12 | ✅ Fase 9.12 |

**Todos os módulos de dados estão com tenant dinâmico completo.**

---

## 3. Checklist de validação

### Venda vinculada à OS

- [ ] `GET /api/vendas` retorna lista com status 200
- [ ] Filtros por `ordemServicoId` e `status` continuam funcionando
- [ ] `POST /api/vendas` com `ordemServicoId` finaliza venda com status 201
- [ ] Venda criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] OS marcada como `entregue` após a venda
- [ ] Evento de venda registrado na OS
- [ ] Nenhum warning `[resolveTenant]` no console

### Venda direta (PDV)

- [ ] `POST /api/vendas` sem `ordemServicoId` cria venda direta com status 201
- [ ] Venda direta tem `tenantId: "rr-infocell"` no Firestore
- [ ] Baixa automática de estoque para produtos não-serviço
- [ ] Validação de celular individual (quantidade = 1) funcionando
- [ ] Validação de estoque insuficiente funcionando
- [ ] Cálculo de total, desconto e troco corretos

### Validação de isolamento

- [ ] OS, produtos, movimentações e clientes sem regressões
- [ ] Impressão do cupom térmico continua funcionando
- [ ] Build TypeScript passou sem erros

---

## 4. Critérios para avançar para Fase 9.13 (validação final)

- [ ] `GET /api/vendas` validado sem warnings
- [ ] Venda vinculada à OS criada com `tenantId` correto
- [ ] Venda direta criada com `tenantId` correto
- [ ] OS marcada como entregue corretamente após venda
- [ ] Baixa de estoque na venda direta funcionando
- [ ] Todos os demais módulos sem regressões
