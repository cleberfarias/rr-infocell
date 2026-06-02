# Validação — resolveTenant em Marcas

**Fase:** 9.5 — Conectar resolveTenant em rota simples
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Rota piloto:** `GET|POST|DELETE /api/marcas`

---

## 1. O que foi ativado

O middleware `resolveTenant` foi registrado no router de marcas via:

```typescript
// backend/src/modules/marcas/marcas.routes.ts
marcasRoutes.use(resolveTenant);
```

Isso faz com que **toda requisição às rotas de marcas** passe pelo `resolveTenant` antes do handler, populando `request.tenantId` com o `tenantId` resolvido de `usuarios/{uid}`.

A cadeia para `/api/marcas` agora é:

```
requireAuth → requireRole → resolveTenant → [handler marcas]
```

A query do handler ainda usa `DEFAULT_TENANT_ID` diretamente — a migração para `request.tenantId` é a Fase 9.6.

---

## 2. Checklist de validação

### Validação funcional básica

- [ ] `GET /api/marcas` retorna marcas normalmente (status 200)
- [ ] `POST /api/marcas` cria nova marca normalmente (status 201)
- [ ] `DELETE /api/marcas/:id` deleta marca normalmente (status 204)
- [ ] Nenhum erro 401 / 403 / 500 nas rotas de marcas
- [ ] Login continua funcionando normalmente

### Validação do tenant resolvido

- [ ] Console do backend **não exibe warnings** `[resolveTenant]` ao acessar marcas com usuário autenticado
  - Se warnings aparecerem, o documento `usuarios/{uid}` está ausente ou inconsistente
- [ ] `request.tenantId` é `"rr-infocell"` para todos os usuários atuais

### Validação de isolamento

- [ ] Rotas de outras entidades (OS, produtos, vendas, clientes) **não foram alteradas**
- [ ] Nenhum repository foi alterado
- [ ] `requireAuth` permanece inalterado

---

## 3. Como verificar o tenantId resolvido

Para confirmar que `request.tenantId` está sendo populado corretamente, adicionar temporariamente um log no handler de marcas e remover após validação:

```typescript
marcasRoutes.get("/", async (req, res, next) => {
  console.log("[debug marcas] tenantId resolvido:", (req as TenantRequest).tenantId);
  // ... resto do handler
});
```

O log esperado:
```
[debug marcas] tenantId resolvido: rr-infocell
```

**Remover o log antes de fazer commit de produção.**

---

## 4. Cenários de teste

| Cenário | Ação | Resultado esperado |
|---------|------|--------------------|
| Usuário admin autenticado | `GET /api/marcas` | 200 + lista de marcas, sem warning |
| Usuário tecnico autenticado | `GET /api/marcas` | 200 + lista de marcas, sem warning |
| Usuário atendente autenticado | `GET /api/marcas` | 200 + lista de marcas, sem warning |
| Token inválido | `GET /api/marcas` | 401 (rejeitado pelo `requireAuth` antes do `resolveTenant`) |
| Sem token (dev mode) | `GET /api/marcas` | 200 + fallback silencioso (uid ausente → DEFAULT_TENANT_ID) |

---

## 5. Critérios para avançar para a Fase 9.6

A Fase 9.6 (migrar a query de marcas para usar `request.tenantId` em vez de `DEFAULT_TENANT_ID`) só deve começar quando:

- [ ] `GET /api/marcas` validado em dev com usuário autenticado — sem warnings de fallback
- [ ] Nenhum erro novo introduzido nas rotas de marcas
- [ ] Rotas de outras entidades confirmadas inalteradas
- [ ] Build passou sem erros (TypeScript)
- [ ] Comportamento idêntico ao de antes da Fase 9.5 (mesmos dados retornados)

---

## 6. Por que marcas foi escolhida

- Baixo acoplamento: sem vínculo com OS, vendas ou estoque
- Lógica simples: GET (lista), POST (cria), DELETE (remove)
- Não tem repository separado: mudança contida em um único arquivo
- Foi a primeira entidade usada nas fases de tenant — histórico limpo
- Falha em marcas não afeta fluxos críticos de negócio
