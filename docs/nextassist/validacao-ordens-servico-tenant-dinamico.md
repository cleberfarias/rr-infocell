# Validação — Ordens de Serviço com Tenant Dinâmico

**Fase:** 9.11 — Ordens de Serviço usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Validação:** ✅ Aprovada em 2026-05-29 — critérios confirmados
**Arquivos alterados:**
- `backend/src/modules/ordens-servico/ordens-servico.routes.ts`
- `backend/src/modules/ordens-servico/ordens-servico.service.ts`
- `backend/src/modules/ordens-servico/ordens-servico.repository.ts`

---

## 1. O que mudou

### Listagem

```
Route (resolveTenant → getRequestTenantId)
  → ordensServicoService.list(filters, tenantId)
  → repository.list(filters, tenantId = DEFAULT_TENANT_ID)
  → Firestore .where("tenantId", "==", tenantId)
```

### Criação

```
Route → ordensServicoService.create(input, tenantId)
  → repository.create(enrichedInput, tenantId = DEFAULT_TENANT_ID)
  → Firestore transaction.set({ ...buildOrdem(input, numero), tenantId })
```

### O que NÃO foi alterado

| Componente | Status |
|-----------|--------|
| `buildOrdem()` | ✅ Intocado — toda lógica de status, peças, cálculos, garantia, senha |
| `update()` no repository | ✅ Intocado — preserva `current.tenantId ?? DEFAULT_TENANT_ID` |
| `applyPecasDeltas()` | ✅ Intocado — movimentacoesEstoqueService.create usa DEFAULT_TENANT_ID como default |
| `enrichPecasInput()` | ✅ Intocado |
| `ensurePositiveDeltasStock()` | ✅ Intocado |
| `registrarEvento()` | ✅ Intocado |
| `automacoesAtendimentoService` | ✅ Intocado |
| Impressão / orçamento | ✅ Intocado |
| Vendas vinculadas | ✅ Intocado |

### Movimentações automáticas (baixa de estoque via OS)

Quando a OS cria uma movimentação automática via `applyPecasDeltas`, ela chama:

```typescript
movimentacoesEstoqueService.create({ ... })
```

Sem passar `tenantId`. O service de movimentações tem `tenantId = DEFAULT_TENANT_ID` como default (Fase 9.10). Comportamento idêntico ao de antes — movimentações automáticas continuam com `"rr-infocell"`.

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
| `/api/movimentacoes-estoque` | ✅ | ✅ |
| `/api/ordens-servico` | ✅ Fase 9.11 | ✅ Fase 9.11 |
| `/api/vendas` | ❌ | ❌ |

---

## 3. Checklist de validação — OS sem peças

- [ ] `GET /api/ordens-servico` retorna lista com status 200
- [ ] Filtros (status, prioridade, clienteId, aparelhoId) continuam funcionando
- [ ] `POST /api/ordens-servico` cria OS sem peças com status 201
- [ ] OS criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] `numero` incrementado corretamente (transação do counter)
- [ ] `PUT /api/ordens-servico/:id` atualiza OS normalmente
- [ ] OS em status terminal (`entregue`, `sem_conserto`, `cancelado`) bloqueia edição com 400
- [ ] Nenhum erro 401 / 403 / 500
- [ ] Nenhum warning `[resolveTenant]` no console

## 4. Checklist de validação — OS com peças

- [ ] `POST /api/ordens-servico` com peças cria OS e baixa automática de estoque
- [ ] Movimentação automática criada com `origem: "ordem_servico"`
- [ ] `estoqueAtual` do produto reduz corretamente
- [ ] Erro 400 se estoque insuficiente para a peça

## 5. Checklist de validação — fluxos relacionados

- [ ] Impressão da OS continua funcionando (via `/api/ordens-servico/:id`)
- [ ] Eventos da OS registrados corretamente (criação, mudança de status, garantia)
- [ ] Vendas vinculadas à OS (`/api/vendas`) continuam funcionando
- [ ] Produtos e clientes sem regressões

---

## 6. Critérios para avançar para Fase 9.12 (Vendas)

- [x] `GET /api/ordens-servico` validado sem warnings
- [x] OS criada com `tenantId` correto no Firestore
- [x] OS com peça + baixa automática + movimentação correta
- [x] Fluxo de atualização de status validado
- [x] Impressão e eventos funcionando
- [x] Vendas e produtos sem regressões
- [x] Build TypeScript passou sem erros
