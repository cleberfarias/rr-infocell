# Backend — Estrutura Inicial de Tenant (Fase 8.1)

## 1. O que foi criado

Esta fase criou a estrutura conceitual de tenant no backend sem alterar nenhum modulo de entidade existente, sem mexer em queries, sem alterar o banco e sem quebrar nenhum fluxo operacional.

### Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `backend/src/modules/tenants/tenant.types.ts` | Tipos TypeScript: `Tenant`, `TenantInput`, `TenantPlan`, `TenantStatus` |
| `backend/src/modules/tenants/tenant.schemas.ts` | Schemas Zod: `tenantInputSchema`, `tenantSchema`, `tenantPlanSchema`, `tenantStatusSchema` |
| `backend/src/modules/tenants/tenant.config.ts` | Constante `DEFAULT_TENANT_ID` e objeto `defaultTenant` com dados do RR Infocell |
| `backend/src/middlewares/tenant.ts` | Middleware `resolveTenant` e helpers `getRequestTenantId`, `getDefaultTenantId` |

### Arquivos NAO alterados

- Nenhum modulo existente foi modificado
- Nenhum repository foi alterado
- Nenhuma rota foi alterada
- Nenhum schema Zod existente foi alterado
- Nenhuma query de listagem foi alterada
- `routes.ts` nao foi alterado — o middleware `resolveTenant` nao esta registrado globalmente ainda

---

## 2. Tipos definidos

```typescript
// tenant.types.ts

type TenantPlan = "free" | "starter" | "premium" | "enterprise";
type TenantStatus = "active" | "inactive" | "suspended";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  productName: string;
  plan: TenantPlan;
  whiteLabel: boolean;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
};
```

---

## 3. Schemas Zod definidos

```typescript
// tenant.schemas.ts

tenantInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  productName: z.string().min(2),
  plan: z.enum(["free", "starter", "premium", "enterprise"]),
  whiteLabel: z.boolean().optional().default(false),
  status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
});

tenantSchema = tenantInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

---

## 4. Tenant padrao definido

```typescript
// tenant.config.ts

export const DEFAULT_TENANT_ID = "rr-infocell";

export const defaultTenant: Tenant = {
  id: "rr-infocell",
  slug: "rr-infocell",
  name: "RR Infocell",
  productName: "NextAssist",
  plan: "premium",
  whiteLabel: true,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
```

Este objeto e apenas uma constante TypeScript. Nao esta persistido no Firestore ainda. A colecao `tenants` no banco sera criada na proxima fase.

---

## 5. Middleware de resolucao de tenant

```typescript
// middlewares/tenant.ts

export const resolveTenant = (request, _response, next) => {
  // Fase 8.1: tenant fixo "rr-infocell".
  // Fase futura: resolver do custom claim do token Firebase ou lookup no banco.
  request.tenantId = DEFAULT_TENANT_ID;
  next();
};

export const getRequestTenantId = (request): string => {
  return request.tenantId ?? DEFAULT_TENANT_ID;
};

export const getDefaultTenantId = (): string => DEFAULT_TENANT_ID;
```

O middleware `resolveTenant` esta disponivel mas **nao esta registrado em `routes.ts`** ainda. Nao afeta nenhuma requisicao existente. A proxima fase que precisar do `tenantId` na request podera importa-lo diretamente.

O tipo `TenantRequest` estende `AuthenticatedRequest` (do middleware de auth) e adiciona o campo opcional `tenantId?: string`. Isso garante compatibilidade futura com os routes que ja usam `AuthenticatedRequest`.

---

## 6. O que esta fase NAO faz (limites deliberados)

| O que nao foi feito | Motivo |
| --- | --- |
| Criar colecao `tenants` no Firestore | Requer backup, rollback e validacao separada |
| Persistir `defaultTenant` no banco | Proxima fase — apos validacao da estrutura |
| Registrar `resolveTenant` globalmente em `routes.ts` | Mudanca de comportamento global — requer teste dedicado |
| Adicionar `tenantId` em qualquer schema de entidade existente | Cada entidade deve ser tratada em fase propria |
| Filtrar queries por tenantId | Bloqueante para SaaS, mas requer persistencia primeiro |
| Alterar OS, estoque, vendas ou financeiro | Entidades criticas — fora do escopo desta fase |

---

## 7. O sistema ainda nao e multiempresa real

Esta fase e **infraestrutura conceitual**, nao isolamento real. O que continua igual:

- Todas as listagens retornam dados de todos os tenants (nao ha filtro)
- Nenhum registro existente tem `tenantId` persistido no Firestore
- O frontend envia `tenantId` nos payloads, mas o Zod continua descartando o campo (strip mode)
- Um usuario com token valido ainda pode acessar dados de qualquer tenant via API
- Relatorios, dashboard e impressao continuam sem distinguir tenant

---

## 8. Proxima fase — Fase 8.2

**Objetivo:** persistir `tenantId` em uma entidade simples no backend, de menor risco.

Candidatos para Fase 8.2 (por ordem de risco crescente):

1. `categorias` — entidade de referencia, sem acoplamento financeiro
2. `marcas` — idem
3. `clientes` — ja com tenantId no payload frontend, risco baixo

Etapas para cada entidade:

1. Adicionar `tenantId` no schema Zod da entidade (`z.string().optional()`)
2. Adicionar `tenantId` no type TypeScript da entidade
3. Persistir `tenantId` no `create()` do repository (Firestore)
4. Persistir `tenantId` no `update()` do repository (Firestore)
5. Validar em staging que novo registro tem `tenantId` no Firestore
6. Nao alterar a listagem ainda (queries globais permanecem)

Criterios de entrada para Fase 8.2:

- [ ] Backup do banco de staging realizado
- [ ] Ambiente de staging separado da producao confirmado
- [ ] `resolveTenant` middleware testado isoladamente
- [ ] Responsavel tecnico definido para revisar

---

## 9. Riscos restantes

| Risco | Impacto | Quando resolve |
| --- | --- | --- |
| `defaultTenant` nao esta no banco | Campo `tenantId` resolvido e "rr-infocell" mas colecao `tenants` nao existe | Fase 8.2 — criar colecao tenants |
| Middleware nao esta ativo nas rotas | `request.tenantId` nunca e populado enquanto `resolveTenant` nao for registrado | Fase 8.2 — ao adicionar tenantId em entidade simples |
| Queries sem filtro por tenant | Dados de todos os tenants retornados em qualquer listagem | Fase 8.3+ |
| Registros sem tenantId no banco | Migracao futura necessaria para dados existentes | Fase 8.x — migracao controlada |
| Backend ainda confia no tenantId do frontend | O tenant deve ser resolvido do token, nao do payload | Resolvido quando `resolveTenant` for ativado nas rotas |
