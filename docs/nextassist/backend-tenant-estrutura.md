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
| `defaultTenant` nao esta no banco | Campo `tenantId` resolvido e "rr-infocell" mas colecao `tenants` nao existe | Fase 8.x |
| Middleware nao esta ativo nas rotas | `request.tenantId` nunca e populado enquanto `resolveTenant` nao for registrado globalmente | Fase 8.x |
| Queries sem filtro por tenant | Dados de todos os tenants retornados em qualquer listagem | Fase 8.3+ |
| Registros sem tenantId no banco | Migracao futura necessaria para dados existentes criados antes da Fase 8.2 | Fase 8.x — migracao controlada |
| Backend ainda confia no tenantId do frontend | O tenant deve ser resolvido do token, nao do payload | Resolvido quando `resolveTenant` for ativado nas rotas |

---

## 10. Atualizacao — Fase 8.2 (26/05/2026)

**Entidade escolhida: `marcas`**

Motivo da escolha: menor acoplamento entre todos os modulos — `marca` nos outros modulos e apenas um campo `string`, nao um lookup na colecao `marcas` do Firestore.

Alteracao realizada em `backend/src/modules/marcas/marcas.routes.ts`:
- POST /marcas agora persiste `tenantId: "rr-infocell"` no Firestore via `DEFAULT_TENANT_ID`
- GET /marcas nao foi alterado — listagem permanece global
- DELETE /marcas nao foi alterado

O tenant e resolvido diretamente de `DEFAULT_TENANT_ID` (constante) — sem depender do middleware ou do payload do frontend.

**Listagem ainda nao filtra por tenantId.** Marcas existentes sem o campo continuam funcionando normalmente.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-marcas.md`

**Proxima fase sugerida:** Fase 8.3 — apos confirmar `tenantId` visivel no Firestore, aplicar o mesmo padrao em categorias ou clientes.

---

## 11. Atualizacao — Fase 8.3 (26/05/2026)

**Entidade escolhida: `categorias`**

Mesmo padrao da Fase 8.2 (marcas). Alteracao em `backend/src/modules/categorias/categorias.routes.ts`:
- POST /categorias agora persiste `tenantId: "rr-infocell"` no Firestore via `DEFAULT_TENANT_ID`
- GET /categorias nao foi alterado — retorna CATEGORIAS_PADRAO hardcoded + registros Firestore sem filtro
- DELETE /categorias nao foi alterado

**Observacao:** categorias padrao hardcoded (`peca`, `produto`, `acessorio`...) nao possuem `tenantId` — sao constantes TypeScript, nao documentos Firestore.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-categorias.md`

**Proxima fase sugerida:** Fase 8.4 — `clientes`, primeira entidade com schema Zod + repository separado.

---

## 12. Atualizacao — Fase 8.4 (26/05/2026)

**Entidade: `clientes`** — primeira entidade operacional com repository completo.

Estrategia adotada: injetar `DEFAULT_TENANT_ID` diretamente no repository, sem alterar o schema Zod. O Zod continua descartando o `tenantId` do frontend (strip mode), garantindo que o backend controla o valor.

Arquivos alterados:
- `backend/src/modules/clientes/clientes.types.ts` — campo `tenantId?: string` adicionado ao tipo `Cliente`
- `backend/src/modules/clientes/clientes.repository.ts` — import de `DEFAULT_TENANT_ID`; `create()` persiste tenantId; `update()` preserva `current.tenantId ?? DEFAULT_TENANT_ID`; `fromDocument()` le tenantId do Firestore

Schema Zod (`clientes.schemas.ts`) e service (`clientes.service.ts`) nao foram alterados.

O `update()` faz migracao gradual: clientes editados apos esta fase recebem `tenantId` automaticamente se ainda nao tiverem.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-clientes.md`

**Proxima fase sugerida:** Fase 8.5 — `despesas` ou `contas`, seguindo o mesmo padrao.

---

## 13. Atualizacao — Fase 8.5 (26/05/2026)

**Entidade: `produtos`** — mesma estrategia de clientes (injetar no repository, sem alterar schema Zod).

Arquivos alterados:
- `backend/src/modules/produtos/produtos.types.ts` — campo `tenantId?: string` adicionado ao tipo `Produto`
- `backend/src/modules/produtos/produtos.repository.ts` — import de `DEFAULT_TENANT_ID`; `create()` persiste tenantId; `update()` preserva `current.tenantId ?? DEFAULT_TENANT_ID`; `fromDocument()` le tenantId do Firestore

Logica de estoque (`estoqueAtual`, baixa automatica, movimentacoes) intocada. Schema Zod intocado.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-produtos.md`

**Proxima fase sugerida:** Fase 8.6 — `despesas` ou `contas`.

---

## 14. Atualizacao — Fase 8.6 (26/05/2026)

**Entidades: `despesas` e `contas`**

**Despesas** — padrao com repository separado (igual a clientes/produtos), mas com `buildDespesa()` helper de negocio intocado:
- `despesas.types.ts`: campo `tenantId?: string` adicionado ao tipo `Despesa`
- `despesas.repository.ts`: `create()` injeta `tenantId` apos `buildDespesa()`; `update()` preserva `current.tenantId ?? DEFAULT_TENANT_ID`; `fromDocument()` le tenantId

**Contas** — padrao inline (igual a marcas/categorias):
- `contas.routes.ts`: POST persiste `tenantId: DEFAULT_TENANT_ID` no `.add()`
- PUT usa `ref.update()` parcial — tenantId criado no POST nao e sobrescrito

`buildDespesa()`, schemas Zod, services e calculos financeiros intocados.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-despesas-contas.md`

**Proxima fase sugerida:** Fase 8.7 — `ordens-servico`, entidade critica com baixa de estoque.

---

## 15. Atualizacao — Fase 8.7.1 (26/05/2026)

**Entidade: `ordem-eventos`** — primeira entidade do fluxo critico de OS, escolhida por ser a de menor risco (timeline/eventos nao disparam baixa de estoque nem afetam financeiro).

Estrategia adotada: injetar `DEFAULT_TENANT_ID` no service, nao no repository. Motivo: `service.create()` constroi explicitamente o objeto passado ao repository, sendo o ponto mais claro e seguro de injecao.

Arquivos alterados:
- `backend/src/modules/ordem-eventos/ordem-eventos.types.ts` — campo `tenantId?: string` adicionado ao tipo `OrdemEvento`
- `backend/src/modules/ordem-eventos/ordem-eventos.service.ts` — import de `DEFAULT_TENANT_ID`; campo `tenantId: DEFAULT_TENANT_ID` adicionado ao objeto passado a `repository.create()`
- `backend/src/modules/ordem-eventos/ordem-eventos.repository.ts` — `fromDocument()` le `tenantId` do Firestore

Schema Zod, `ordensServicoService`, listagem GET /ordem-eventos (sem filtro), baixa de estoque e financeiro intocados.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-ordem-eventos.md`

**Proxima fase sugerida:** Fase 8.7.2 — movimentacoes manuais de estoque.

---

## 16. Atualizacao — Fase 8.7.2 (26/05/2026)

**Entidade: `movimentacoes-estoque`** — todas as movimentacoes criadas via `service.create()` agora persistem `tenantId`.

Estrategia adotada: injetar `DEFAULT_TENANT_ID` no `service.create()`. Este metodo e o unico ponto de criacao, usado tanto por movimentacoes manuais (POST /api/movimentacoes-estoque) quanto pela baixa automatica de OS (`applyPecasDeltas`). O campo `origem` distingue a fonte (`"manual"` vs `"ordem_servico"`), mas o `tenantId` e o mesmo `DEFAULT_TENANT_ID` para ambos.

Arquivos alterados:
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.types.ts` — campo `tenantId?: string` adicionado ao tipo `MovimentacaoEstoque`
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts` — import de `DEFAULT_TENANT_ID`; campo `tenantId: DEFAULT_TENANT_ID` adicionado ao objeto passado a `repository.create()`
- `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.repository.ts` — `fromDocument()` le `tenantId` do Firestore

Schema Zod, logica de saldo/estoque, `ordens-servico`, produtos, vendas e financeiro intocados.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-movimentacoes-estoque.md`

**Proxima fase sugerida:** Fase 8.7.3 — ordens de servico (entidade critica, acoplada com baixa de estoque, eventos e financeiro).

---

## 17. Atualizacao — Fase 8.7.3 (26/05/2026)

**Entidade: `ordens-servico`** — entidade critica. `tenantId` injetado no repository, apos `buildOrdem()`, sem alterar a funcao de negocio.

Estrategia: injetar `DEFAULT_TENANT_ID` apos a chamada a `buildOrdem()` no repository. A funcao `buildOrdem()` contem toda a logica de negocio (status, calculos, garantia, senha, pecas) e nao foi modificada. O `update()` usa `current.tenantId ?? DEFAULT_TENANT_ID` para preservar o tenant em OS ja existentes e migrar OS antigas ao serem editadas.

Arquivos alterados:
- `backend/src/modules/ordens-servico/ordens-servico.types.ts` — campo `tenantId?: string` adicionado ao tipo `OrdemServico`
- `backend/src/modules/ordens-servico/ordens-servico.repository.ts` — import de `DEFAULT_TENANT_ID`; `create()` injeta `tenantId` nos dois pontos (transaction.set e return); `update()` preserva `current.tenantId ?? DEFAULT_TENANT_ID`; `fromDocument()` le `tenantId` do Firestore

`buildOrdem()`, `applyPecasDeltas()`, schema Zod, service, listagem e financeiro intocados.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-ordens-servico.md`

**Proxima fase sugerida:** Fase 8.7.4 — vendas/PDV.

---

## 18. Atualizacao — Fase 8.7.4 (26/05/2026)

**Entidade: `vendas`** — append-only, sem `update()`. Dois fluxos de criacao: venda vinculada a OS e venda direta.

Estrategia: injetar `DEFAULT_TENANT_ID` nos dois `repository.create()` no service. Nao ha `update()` para preservar, pois vendas nao sao editadas.

Arquivos alterados:
- `backend/src/modules/vendas/vendas.types.ts` — campo `tenantId?: string` adicionado ao tipo `Venda`
- `backend/src/modules/vendas/vendas.service.ts` — import de `DEFAULT_TENANT_ID`; `tenantId: DEFAULT_TENANT_ID` nos dois `repository.create()` (venda via OS e venda direta)
- `backend/src/modules/vendas/vendas.repository.ts` — `fromDocument()` le `tenantId` do Firestore

Logica de calculo, baixa de estoque, vinculo com OS, evento de venda, schema Zod e financeiro intocados.

**Referencia de validacao:** `docs/nextassist/validacao-backend-tenant-vendas.md`

**Proxima fase sugerida:** Fase 8.7.5 — validacao critica consolidada (OS + estoque + vendas).

---

## 19. Atualizacao — Fase 8.8.1 (26/05/2026)

**Primeira listagem com filtro real por tenantId: `marcas`.**

Alteracao em `backend/src/modules/marcas/marcas.routes.ts`:
- GET /marcas agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` para retornar apenas marcas do tenant atual
- Ordenacao movida para o cliente (`.sort()`) para evitar dependencia de indice composto no Firestore
- `MARCAS_PADRAO` (hardcoded) continuam sempre incluidas
- Marcas customizadas criadas antes da Fase 8.2 (sem `tenantId`) ficam ocultas — comportamento esperado

**Impacto em dados existentes:** marcas antigas sem `tenantId` deixam de aparecer na listagem. Migracao de dados antigos deve ser avaliada em fase separada.

**Referencia de validacao:** `docs/nextassist/validacao-backend-filtro-tenant-marcas.md`

**Proxima fase sugerida:** Fase 8.8.2 — filtro por tenantId em categorias.

---

## 20. Atualizacao — Fase 8.8.2 (26/05/2026)

**Filtro por tenantId em `categorias`.**

Mesmo padrao da Fase 8.8.1 (marcas). Alteracao em `backend/src/modules/categorias/categorias.routes.ts`:
- GET /categorias agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` para categorias customizadas do Firestore
- `CATEGORIAS_PADRAO` (7 constantes TypeScript) continuam sempre incluidas
- Ordenacao movida para o cliente para evitar indice composto no Firestore
- Categorias customizadas criadas antes da Fase 8.3 (sem `tenantId`) ficam ocultas

**Referencia de validacao:** `docs/nextassist/validacao-backend-filtro-tenant-categorias.md`

**Proxima fase sugerida:** Fase 8.8.3 — filtro por tenantId em clientes.

---

## 21. Atualizacao — Fase 8.8.3 (26/05/2026)

**Filtro por tenantId em `clientes`.**

Alteracao em `FirestoreClientesRepository.list()`:
- Query Firestore agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes do `.get()`
- Ordenacao por nome e busca textual continuam no cliente (sem mudanca)
- Sem indice composto necessario (nao ha `.orderBy()` na query Firestore)
- Clientes antigos sem `tenantId` ficam ocultos; voltam ao editar (update ja aplica `current.tenantId ?? DEFAULT_TENANT_ID`)
- `findById()`, `update()`, `delete()`, `findByTelefone()` intocados

**Referencia de validacao:** `docs/nextassist/validacao-backend-filtro-tenant-clientes.md`

**Proxima fase sugerida:** Fase 8.8.4 — filtro por tenantId em produtos.
