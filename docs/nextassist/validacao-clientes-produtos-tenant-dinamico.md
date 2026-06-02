# Validação — Clientes e Produtos com Tenant Dinâmico

**Fase:** 9.8 — Clientes e produtos usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivos alterados:**
- `backend/src/modules/clientes/clientes.routes.ts`
- `backend/src/modules/clientes/clientes.service.ts`
- `backend/src/modules/clientes/clientes.repository.ts`
- `backend/src/modules/produtos/produtos.routes.ts`
- `backend/src/modules/produtos/produtos.service.ts`
- `backend/src/modules/produtos/produtos.repository.ts`

---

## 1. O que mudou

### Clientes

O `tenantId` agora flui da rota até o repository de forma explícita:

```
Route (resolveTenant → getRequestTenantId)
  → clientesService.list(q, tenantId)
  → clientesRepository.list(search, tenantId)
  → Firestore .where("tenantId", "==", tenantId)

Route (resolveTenant → getRequestTenantId)
  → clientesService.create(input, tenantId)
  → clientesRepository.create(input, tenantId)
  → Firestore doc.set({ ...input, tenantId })
```

`update` não recebe `tenantId` — preserva o valor existente no documento (`current.tenantId ?? DEFAULT_TENANT_ID`).

### Produtos

Mesmo padrão de clientes:

```
Route → produtosService.list(filters, tenantId) → repository.list(filters, tenantId)
Route → produtosService.create(input, tenantId) → repository.create(input, tenantId)
```

`update` preserva `current.tenantId ?? DEFAULT_TENANT_ID`.

### Fallback nos repositories

Os repositories mantêm `DEFAULT_TENANT_ID` como valor default dos parâmetros:

```typescript
async list(search = "", tenantId = DEFAULT_TENANT_ID)
async create(input: ClienteInput, tenantId = DEFAULT_TENANT_ID)
```

Isso garante compatibilidade se o `tenantId` não for passado explicitamente.

---

## 2. Módulos com fluxo completo ativo

| Módulo | resolveTenant | Handler usa tenantId resolvido |
|--------|:---:|:---:|
| `/api/marcas` | ✅ Fase 9.6 | ✅ |
| `/api/categorias` | ✅ Fase 9.7 | ✅ |
| `/api/clientes` | ✅ Fase 9.8 | ✅ |
| `/api/produtos` | ✅ Fase 9.8 | ✅ |
| Demais módulos | ❌ | ❌ |

---

## 3. Checklist de validação

### Clientes

- [ ] `GET /api/clientes` retorna lista com status 200
- [ ] Clientes do tenant `rr-infocell` continuam aparecendo
- [ ] `POST /api/clientes` cria cliente com status 201
- [ ] Cliente criado tem `tenantId: "rr-infocell"` no Firestore
- [ ] `PUT /api/clientes/:id` atualiza cliente normalmente
- [ ] `DELETE /api/clientes/:id` deleta cliente normalmente
- [ ] Nenhum erro 401 / 403 / 500

### Produtos

- [ ] `GET /api/produtos` retorna lista com status 200
- [ ] Produtos do tenant `rr-infocell` continuam aparecendo
- [ ] `POST /api/produtos` cria produto com status 201
- [ ] Produto criado tem `tenantId: "rr-infocell"` no Firestore
- [ ] `PUT /api/produtos/:id` atualiza produto normalmente
- [ ] Regra de celular individual (estoqueAtual ≤ 1) continua funcionando
- [ ] Nenhum erro 401 / 403 / 500

### Validação do tenant resolvido

- [ ] Nenhum warning `[resolveTenant]` no console ao acessar clientes ou produtos
- [ ] `tenantId` correto no Firebase Console para registros criados

### Validação de isolamento

- [ ] OS, vendas, estoque, financeiro continuam funcionando sem alteração
- [ ] Marcas e categorias (Fases 9.6/9.7) sem regressões
- [ ] Nenhum outro module foi alterado

---

## 4. Como verificar no Firestore

Após `POST /api/clientes` ou `POST /api/produtos`:

```
Firebase Console → Firestore
├── clientes → <novo-doc> → tenantId: "rr-infocell" ✅
└── produtos  → <novo-doc> → tenantId: "rr-infocell" ✅
```

---

## 5. Critérios para avançar

Com marcas, categorias, clientes e produtos validados, o próximo passo é:

- **Fase 9.9** — despesas e contas (módulos financeiros de menor risco que OS/vendas)
- Ou uma fase de validação consolidada antes de ir para OS/estoque/vendas

Pré-requisitos para avançar:

- [ ] `GET /api/clientes` e `GET /api/produtos` validados sem warnings
- [ ] Registros criados com `tenantId` correto no Firestore
- [ ] OS, vendas e estoque sem regressões confirmadas
- [ ] Build TypeScript passou sem erros
