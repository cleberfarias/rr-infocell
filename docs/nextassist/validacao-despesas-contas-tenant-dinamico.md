# Validação — Despesas e Contas com Tenant Dinâmico

**Fase:** 9.9 — Despesas e contas usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivos alterados:**
- `backend/src/modules/despesas/despesas.routes.ts`
- `backend/src/modules/despesas/despesas.service.ts`
- `backend/src/modules/despesas/despesas.repository.ts`
- `backend/src/modules/contas/contas.routes.ts`

---

## 1. O que mudou

### Contas (inline, como marcas/categorias)

```typescript
// GET e POST agora usam tenantId resolvido
const tenantId = getRequestTenantId(req as TenantRequest);
.where("tenantId", "==", tenantId)
{ tenantId }
```

PUT não altera `tenantId` — atualiza apenas nome, tipo, saldo e ativa.

### Despesas (camadas, como clientes/produtos)

```
Route (resolveTenant → getRequestTenantId)
  → despesasService.list(filters, tenantId)
  → despesasRepository.list(filters, tenantId = DEFAULT_TENANT_ID)
  → Firestore .where("tenantId", "==", tenantId)

Route → despesasService.create(input, tenantId)
  → despesasRepository.create(input, tenantId = DEFAULT_TENANT_ID)
  → Firestore doc.set({ ...buildDespesa(input), tenantId })
```

`update` preserva `current.tenantId ?? DEFAULT_TENANT_ID` — nenhuma alteração necessária.

Regras financeiras (`pago`, `pagoEm`, `vencimento`, `recorrente`, `valor`) não foram tocadas — toda lógica permanece em `buildDespesa()`.

---

## 2. Módulos com fluxo completo ativo

| Módulo | resolveTenant | Handler usa tenantId resolvido |
|--------|:---:|:---:|
| `/api/marcas` | ✅ Fase 9.6 | ✅ |
| `/api/categorias` | ✅ Fase 9.7 | ✅ |
| `/api/clientes` | ✅ Fase 9.8 | ✅ |
| `/api/produtos` | ✅ Fase 9.8 | ✅ |
| `/api/despesas` | ✅ Fase 9.9 | ✅ |
| `/api/contas` | ✅ Fase 9.9 | ✅ |
| Demais (OS, estoque, vendas...) | ❌ | ❌ |

---

## 3. Checklist de validação

### Despesas

- [ ] `GET /api/despesas` retorna lista com status 200
- [ ] Despesas do tenant `rr-infocell` continuam aparecendo
- [ ] Filtros (categoria, pago) continuam funcionando
- [ ] `POST /api/despesas` cria despesa com status 201
- [ ] Despesa criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] Campos financeiros corretos: `pago`, `pagoEm`, `vencimento`, `recorrente`, `valor`
- [ ] `PUT /api/despesas/:id` atualiza normalmente — `tenantId` preservado
- [ ] Regra de `pagoEm` (só preenche quando `pago` muda de false → true) continua correta
- [ ] Nenhum erro 401 / 403 / 500

### Contas

- [ ] `GET /api/contas` retorna lista com status 200
- [ ] Contas do tenant `rr-infocell` continuam aparecendo
- [ ] `POST /api/contas` cria conta com status 201
- [ ] Conta criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] `PUT /api/contas/:id` atualiza nome/tipo/saldo/ativa sem afetar `tenantId`
- [ ] Nenhum erro 401 / 403 / 500

### Validação do tenant resolvido

- [ ] Nenhum warning `[resolveTenant]` no console ao acessar despesas ou contas
- [ ] `tenantId` correto no Firebase Console para registros criados

### Validação de isolamento

- [ ] OS, vendas e estoque continuam funcionando sem alteração
- [ ] Marcas, categorias, clientes e produtos sem regressões
- [ ] Relatórios financeiros (se existirem) continuam funcionando

---

## 4. Critérios para avançar para o pacote crítico (OS/estoque/vendas)

Com 6 módulos validados (marcas, categorias, clientes, produtos, despesas, contas), o padrão está consolidado. O próximo pacote (OS, movimentações, vendas) é mais crítico porque afeta fluxos de negócio interdependentes.

Pré-requisitos para avançar:

- [ ] `GET /api/despesas` e `GET /api/contas` validados sem warnings
- [ ] Registros criados com `tenantId` correto no Firestore
- [ ] Regras financeiras sem regressão (pago, pagoEm, recorrência)
- [ ] OS, vendas e estoque confirmados sem regressões
- [ ] Build TypeScript passou sem erros
