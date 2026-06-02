# Validação — Categorias com Tenant Dinâmico

**Fase:** 9.7 — Categorias usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivo alterado:** `backend/src/modules/categorias/categorias.routes.ts`

---

## 1. O que mudou

O handler de categorias passou a usar `getRequestTenantId(req)` em vez de `DEFAULT_TENANT_ID` diretamente, seguindo o padrão validado em marcas (Fase 9.6).

```typescript
// Antes
.where("tenantId", "==", DEFAULT_TENANT_ID)
{ tenantId: DEFAULT_TENANT_ID }

// Depois
const tenantId = getRequestTenantId(req as TenantRequest);
.where("tenantId", "==", tenantId)
{ tenantId }
```

`resolveTenant` foi registrado no router de categorias via `categoriasRoutes.use(resolveTenant)`.

---

## 2. Fluxo completo ativo para `/api/categorias`

```
1. requireAuth verifica token Firebase → request.user.uid
2. requireRole verifica custom claim role
3. resolveTenant busca usuarios/{uid} → request.tenantId = "rr-infocell"
4. GET handler: usa request.tenantId para filtrar categorias no Firestore
5. POST handler: usa request.tenantId ao salvar nova categoria no Firestore
```

---

## 3. Módulos com fluxo completo ativo

| Módulo | resolveTenant | Handler usa tenantId resolvido |
|--------|:---:|:---:|
| `marcas` | ✅ Fase 9.5/9.6 | ✅ |
| `categorias` | ✅ Fase 9.7 | ✅ |
| Todos os demais | ❌ | ❌ |

---

## 4. Checklist de validação

### Validação funcional

- [ ] `GET /api/categorias` retorna categorias com status 200
- [ ] Categorias padrão continuam presentes (Peça, Produto, Acessório, Serviço, etc.)
- [ ] Categorias customizadas do tenant `rr-infocell` continuam aparecendo
- [ ] `POST /api/categorias` cria nova categoria com status 201
- [ ] Categoria criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] `DELETE /api/categorias/:id` continua funcionando
- [ ] Nenhum erro 401 / 403 / 500

### Validação do tenant resolvido

- [ ] Nenhum warning `[resolveTenant]` no console do backend ao acessar categorias
- [ ] Categoria criada pelo POST tem `tenantId` correto no Firebase Console:
  - Firestore → `categorias` → novo documento → campo `tenantId` = `"rr-infocell"`

### Validação de isolamento

- [ ] Marcas continuam funcionando normalmente (Fase 9.6 não foi afetada)
- [ ] Todas as demais rotas (OS, produtos, vendas, clientes) continuam inalteradas
- [ ] Nenhum repository foi alterado nesta fase

---

## 5. Critérios para avançar para a próxima fase

Com marcas e categorias validadas, o padrão está consolidado. A próxima etapa pode ser aplicar em um módulo com repository separado (ex: clientes ou fornecedores) ou em um módulo de baixo risco adicional.

Pré-requisitos para avançar:

- [ ] `GET /api/categorias` validado — sem warnings
- [ ] `POST /api/categorias` validado — `tenantId` correto no Firestore
- [ ] `GET /api/marcas` ainda funcionando sem regressões
- [ ] Sem erros nos demais módulos
- [ ] Build TypeScript passou sem erros
