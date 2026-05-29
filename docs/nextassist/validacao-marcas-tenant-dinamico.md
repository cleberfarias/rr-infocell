# Validação — Marcas com Tenant Dinâmico

**Fase:** 9.6 — Marcas usam `request.tenantId` resolvido
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivo alterado:** `backend/src/modules/marcas/marcas.routes.ts`

---

## 1. O que mudou

O handler de marcas passou a usar `getRequestTenantId(req)` em vez de importar `DEFAULT_TENANT_ID` diretamente.

```typescript
// Antes (Fase 9.5)
.where("tenantId", "==", DEFAULT_TENANT_ID)
// ...
{ tenantId: DEFAULT_TENANT_ID }

// Depois (Fase 9.6)
const tenantId = getRequestTenantId(req as TenantRequest);
.where("tenantId", "==", tenantId)
// ...
{ tenantId }
```

`getRequestTenantId` retorna `request.tenantId ?? DEFAULT_TENANT_ID` — o fallback continua garantido.

O módulo não importa mais `DEFAULT_TENANT_ID` — o tenantId vem inteiramente do middleware `resolveTenant`.

---

## 2. Fluxo completo ativo para `/api/marcas`

```
1. requireAuth verifica token Firebase → request.user.uid
2. requireRole verifica custom claim role
3. resolveTenant busca usuarios/{uid} → request.tenantId = "rr-infocell"
4. GET handler: usa request.tenantId para filtrar marcas no Firestore
4. POST handler: usa request.tenantId ao salvar nova marca no Firestore
```

Este é o primeiro módulo com o fluxo completo de tenant dinâmico ativo.

---

## 3. Checklist de validação

### Validação funcional

- [ ] `GET /api/marcas` retorna marcas com status 200
- [ ] Marcas padrão continuam aparecendo (Apple, Samsung, Motorola, etc.)
- [ ] Marcas customizadas do tenant `rr-infocell` continuam aparecendo
- [ ] `POST /api/marcas` cria nova marca com status 201
- [ ] Marca criada tem `tenantId: "rr-infocell"` no Firestore
- [ ] `DELETE /api/marcas/:id` continua funcionando (não usa tenantId)
- [ ] Nenhum erro 401 / 403 / 500

### Validação do tenant resolvido

- [ ] Nenhum warning `[resolveTenant]` no console do backend ao acessar marcas
- [ ] Marca criada pelo POST tem `tenantId` correto no Firebase Console
  - Abrir Firestore → coleção `marcas` → documento criado → campo `tenantId` = `"rr-infocell"`

### Validação de isolamento

- [ ] Outras rotas (OS, produtos, vendas, clientes, categorias) continuam funcionando normalmente
- [ ] Nenhum repository foi alterado
- [ ] `DEFAULT_TENANT_ID` ainda está presente nos demais módulos

---

## 4. Como verificar no Firestore

Após um `POST /api/marcas`, abrir o Firebase Console:

```
Firebase Console
└── Firestore
    └── marcas
        └── <novo-doc-id>
            ├── nome: "Nome da marca"
            ├── tenantId: "rr-infocell"   ← deve ser esse valor
            └── criadoEm: "..."
```

Se `tenantId` for `"rr-infocell"`, o fluxo está correto.

---

## 5. Critérios para avançar para a Fase 9.7

Antes de repetir o padrão para categorias (próxima entidade simples):

- [ ] `GET /api/marcas` validado com usuário autenticado — sem warnings
- [ ] `POST /api/marcas` validado — `tenantId` correto no Firestore
- [ ] Sem regressões nas demais rotas
- [ ] Build TypeScript passou sem erros
