# Auditoria — Autenticação e Tenant Dinâmico

**Fase:** 9.0 — Auditoria (somente leitura)
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ✅ Auditoria concluída — nenhum código foi alterado

---

## 1. Objetivo

Esta auditoria prepara a evolução do sistema de **tenant fixo** (`DEFAULT_TENANT_ID = "rr-infocell"` hardcoded) para **tenant dinâmico**, resolvido a partir do usuário autenticado.

O objetivo da Fase 9 é eliminar gradualmente o `DEFAULT_TENANT_ID` estático e substituí-lo por um `tenantId` derivado da identidade do usuário autenticado — primeiro no backend (fonte confiável), depois validado no frontend.

Esta auditoria mapeia o estado atual para que a implementação seja segura, incremental e sem regressões.

---

## 2. Estado atual

### DEFAULT_TENANT_ID

| Campo | Valor |
|-------|-------|
| Constante | `DEFAULT_TENANT_ID` |
| Valor atual | `"rr-infocell"` |
| Definição | `backend/src/modules/tenants/tenant.config.ts` |
| Tenant único ativo | `rr-infocell` |

A constante é importada em todos os repositórios/serviços que precisam escrever ou filtrar dados por tenant.

### Onde o tenantId é usado no backend

**Escrita (criação de documentos):**

| Arquivo | Linha(s) |
|---------|---------|
| `backend/src/modules/clientes/clientes.repository.ts` | 163 |
| `backend/src/modules/produtos/produtos.repository.ts` | 188 |
| `backend/src/modules/ordens-servico/ordens-servico.repository.ts` | 232, 317, 320 |
| `backend/src/modules/vendas/vendas.service.ts` | 90, 195 |
| `backend/src/modules/movimentacoes-estoque/movimentacoes-estoque.service.ts` | 62 |
| `backend/src/modules/despesas/despesas.repository.ts` | 195 |
| `backend/src/modules/ordem-eventos/ordem-eventos.service.ts` | 30 |

**Leitura/Filtragem (queries):**

Todos os repositórios listados acima e também: `marcas`, `categorias`, `contas` — todos usam `.where("tenantId", "==", DEFAULT_TENANT_ID)` nas queries de listagem.

**Middleware de tenant:**

- `backend/src/middlewares/tenant.ts`
- Função `resolveTenant()` resolve o `tenantId` do request — mas **atualmente define `request.tenantId = DEFAULT_TENANT_ID` de forma estática** (hardcoded)
- Comentário no próprio arquivo indica que a Fase 8.1 planejou evoluir isso para leitura do token Firebase

### Onde o tenantId é usado no frontend

| Arquivo | Papel |
|---------|-------|
| `frontend/src/config/tenantConfig.ts` | Configuração estática com `tenantId: "rr-infocell"` (fallback para `VITE_TENANT_ID`) |
| `frontend/src/lib/tenant.ts` | `getCurrentTenantId()` retorna da config estática |
| `frontend/src/lib/tenantPayload.ts` | `withTenantId()` adiciona `tenantId` ao payload antes de enviar ao backend |
| `frontend/src/contexts/TenantContext.tsx` | Contexto React com tenant, plano, branding — alimentado pela config estática |

### O que ainda está fixo

- Backend: `DEFAULT_TENANT_ID` é usado diretamente em repositories e services, não via `request.tenantId`
- Backend: `resolveTenant()` middleware existe mas não é chamado nas rotas de dados (somente nos middlewares gerais)
- Frontend: `tenantConfig.ts` hardcoda `"rr-infocell"` como valor padrão
- Firebase: não há custom claim `tenantId` nos tokens de usuário

---

## 3. Autenticação atual

### Como o login funciona

O sistema usa **Firebase Authentication** (produção) com fallback de desenvolvimento.

**Fluxo de login (produção):**

1. Usuário acessa a tela de login e informa e-mail + senha
2. Frontend chama `signInWithEmailAndPassword(firebaseAuth, email, password)` do Firebase Web SDK
3. Após sucesso, obtém token: `getIdTokenResult(true)` (força refresh)
4. Valida `token.claims.role` — deve ser um dos papéis válidos (`admin`, `atendente`, `tecnico`)
5. Se não tiver claim de role: faz logout e lança erro
6. Persiste o role no localStorage via `persistRole()`
7. Redireciona para a home do role correspondente

**Arquivo principal:** `frontend/src/lib/auth.tsx`

**Fluxo de desenvolvimento (bypass):**

Ativo quando `VITE_AUTH_DEV_MODE=true` ou Firebase não está configurado. Permite login sem token real. O backend também faz bypass quando `NODE_ENV !== "production"` e o header de autorização está ausente.

### Onde o usuário autenticado é identificado

**Frontend:**
- `firebaseAuth.currentUser` (objeto `User` do Firebase Web SDK)
- `uid`, `email`, `displayName` disponíveis via hook `useAuth()`
- Role disponível via `useAuth().role` (lida do localStorage após login)

**Backend:**
- `request.user` do tipo `DecodedIdToken` (Firebase Admin SDK)
- Populado pelo middleware `requireAuth()` após verificação do ID Token
- Disponível em qualquer handler que rode após `requireAuth`
- Campos presentes no decoded token: `uid`, `email`, `name`, custom claims (`role`)

### Token / Firebase Auth / JWT

| Componente | Detalhe |
|-----------|---------|
| Tipo de token | Firebase ID Token (JWT padrão) |
| Geração | `firebaseAuth.currentUser.getIdToken()` no frontend |
| Envio | Header `Authorization: Bearer <token>` em toda chamada API |
| Verificação | `auth.verifyIdToken(token)` no middleware `requireAuth` (Firebase Admin SDK) |
| Arquivo de verificação | `backend/src/middlewares/auth.ts` |
| Arquivo de envio | `frontend/src/services/api.ts` — função `apiRequest()` |
| Firebase Admin init | `backend/src/firebase/admin.ts` |
| Firebase Client init | `frontend/src/lib/firebase.ts` |

### Onde fica o userId

| Contexto | Localização |
|----------|------------|
| Frontend (em memória) | `firebaseAuth.currentUser.uid` |
| Frontend (contexto React) | `useAuth().user.uid` |
| Backend (por request) | `request.user.uid` (após `requireAuth`) |
| Firestore (usuário) | UID é a chave do registro no Firebase Auth (não há coleção de usuários no Firestore) |

### Onde ficam os roles/permissões

| Localização | Como |
|------------|------|
| Firebase Auth custom claims | `{ role: "admin" \| "atendente" \| "tecnico" }` |
| Frontend localStorage | Persistido via `persistRole()` após login bem-sucedido |
| Backend request | `request.user.role` (custom claim decodificado do token) |
| Atribuição | Admin usa endpoint `POST /api/usuarios` → `auth.setCustomUserClaims(uid, { role })` |

**Não há** role ou permission armazenado no Firestore. A fonte de verdade das roles é o Firebase Auth custom claim.

### Quais rotas exigem autenticação

**Backend (`backend/src/routes.ts`):**

O middleware `requireAuth` é aplicado a todas as rotas, exceto `/health`:

```
GET /health  →  sem autenticação (pública)
/* demais  →  requireAuth obrigatório
```

Após `requireAuth`, cada módulo aplica `requireRole(...)`:

| Rota | Roles permitidas |
|------|-----------------|
| `/despesas` | admin |
| `/usuarios` | admin |
| `/vendas` | admin, atendente |
| `/terceirizados` | admin, atendente |
| `/contas` | admin, atendente |
| Todas as demais | admin, atendente, tecnico |

**Frontend:**

Não há route guards explícitos. A proteção é feita pela própria `AuthProvider` — se não autenticado, o Firebase redirect e o `useAuth()` controlam o fluxo. A proteção real é o backend via `requireAuth`.

### Quais rotas parecem públicas

- `GET /health` — sem autenticação, só sinaliza que o servidor está ativo
- Em modo desenvolvimento (`NODE_ENV !== "production"`): todas as rotas aceitam requests sem token se o header `Authorization` estiver ausente (bypass intencional)

---

## 4. Arquivos relevantes

### Autenticação (backend)

| Arquivo | Papel |
|---------|-------|
| `backend/src/middlewares/auth.ts` | `requireAuth()`, `requireRole()`, tipo `AuthenticatedRequest` |
| `backend/src/middlewares/tenant.ts` | `resolveTenant()`, `TenantRequest`, `getRequestTenantId()` |
| `backend/src/firebase/admin.ts` | Inicialização Firebase Admin SDK, exporta `auth` e `db` |
| `backend/src/routes.ts` | Aplica middlewares e define role por módulo |

### Autenticação (frontend)

| Arquivo | Papel |
|---------|-------|
| `frontend/src/lib/auth.tsx` | `AuthProvider`, `useAuth()`, `login()`, `logout()` |
| `frontend/src/lib/firebase.ts` | Inicialização Firebase Web SDK, exporta `firebaseAuth` |
| `frontend/src/services/api.ts` | `apiRequest()` — adiciona Bearer token em toda chamada |

### Tenant (backend)

| Arquivo | Papel |
|---------|-------|
| `backend/src/modules/tenants/tenant.config.ts` | `DEFAULT_TENANT_ID`, `DEFAULT_TENANT_CONFIG` |
| `backend/src/middlewares/tenant.ts` | Resolve tenant (hoje: hardcoded) |

### Tenant (frontend)

| Arquivo | Papel |
|---------|-------|
| `frontend/src/config/tenantConfig.ts` | Config estática do tenant atual |
| `frontend/src/lib/tenant.ts` | `getCurrentTenantId()`, `getCurrentTenant()` |
| `frontend/src/lib/tenantPayload.ts` | `withTenantId()` — adiciona tenantId ao payload |
| `frontend/src/contexts/TenantContext.tsx` | Contexto React com tenant, plano, branding |

### Usuários/Roles

| Arquivo | Papel |
|---------|-------|
| `backend/src/modules/usuarios/usuarios.types.ts` | Tipos `Usuario`, `UsuarioRole`, `UsuarioInput` |
| `backend/src/modules/usuarios/usuarios.service.ts` | Mapeia `UserRecord` Firebase → `Usuario` |
| `backend/src/modules/usuarios/usuarios.routes.ts` | Endpoints de gestão de usuários (admin only) |
| `backend/src/scripts/set-user-role.ts` | Script para atribuir role a usuário via CLI |

---

## 5. Modelo atual de usuários

### Estrutura do usuário

O sistema **não armazena usuários no Firestore**. A fonte de verdade é o **Firebase Authentication**.

Tipo `Usuario` (mapeado de `UserRecord` do Firebase):

```typescript
type Usuario = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  role?: UsuarioRole;          // vem de customClaims.role
  createdAt?: string;
  lastSignInAt?: string;
};

type UsuarioRole = "admin" | "atendente" | "tecnico";
```

### Campos disponíveis por contexto

| Campo | Firebase Auth | Custom Claims | Firestore |
|-------|:---:|:---:|:---:|
| uid | ✅ | ✅ (sub) | ❌ |
| email | ✅ | ❌ | ❌ |
| displayName | ✅ | ❌ | ❌ |
| role | ❌ | ✅ | ❌ |
| tenantId | ❌ | ❌ (ausente hoje) | ❌ |
| empresaId | ❌ | ❌ | ❌ |
| accountId | ❌ | ❌ | ❌ |

### O que não existe ainda

- **Não há `tenantId` no usuário** — nem no Firebase Auth, nem em Firestore, nem em custom claims
- **Não há `empresaId` ou `accountId`** — o sistema ainda é mono-tenant
- **Não há vínculo explícito usuário x empresa** — o único vínculo implícito é que todos os usuários pertencem ao único tenant `rr-infocell`

---

## 6. Riscos atuais

### Riscos de segurança / isolamento

| Risco | Descrição | Severidade |
|-------|-----------|-----------|
| **Backend usa DEFAULT_TENANT_ID fixo** | Não importa qual usuário faz a chamada, os dados sempre são do tenant `rr-infocell`. Um segundo tenant não seria seguro. | Alta |
| **Frontend não pode ser fonte única de tenantId** | Se o frontend enviar `tenantId` no payload e o backend confiar cegamente, um cliente malicioso pode trocar o tenant no request | Alta |
| **Usuário não resolve tenant dinamicamente** | Não há mapeamento `userId → tenantId`. Impossível saber o tenant de um usuário sem configuração adicional. | Alta |
| **`resolveTenant` não é chamado nos handlers** | O middleware existe mas os repositories leem `DEFAULT_TENANT_ID` diretamente — bypassam o middleware | Média |
| **Rota `/health` é pública** | Não expõe dados, mas confirma que o servidor está ativo | Baixa |
| **Dev mode bypass total** | Em não-produção, qualquer request sem token é aceito. Deve-se garantir que staging não seja non-production | Média |

### Riscos de consistência

| Risco | Descrição |
|-------|-----------|
| **Claims do Firebase como fonte de role** | Se um custom claim for removido ou corrompido, o usuário perde acesso sem aviso claro |
| **Role no localStorage pode desincronizar** | O role é persistido no localStorage no login; se o custom claim for alterado, o localStorage fica stale até próximo login |
| **Ausência de coleção de usuários no Firestore** | Dificulta enriquecer o usuário com dados adicionais (como tenantId) sem usar custom claims |

---

## 7. Estratégia recomendada

### Ordem segura de implementação

**Fase 9.1 — Criar vínculo usuário x tenant**
- Definir onde o vínculo viverá (custom claim `tenantId` no Firebase Auth OU coleção `usuarios` no Firestore)
- Manter `rr-infocell` como tenant padrão para todos os usuários existentes
- Não alterar nenhum fluxo de dados ainda

**Fase 9.2 — Resolver tenantId no middleware (backend)**
- Atualizar `resolveTenant()` para ler o `tenantId` do usuário autenticado
- Usar o `uid` do `request.user` para buscar ou derivar o tenantId
- Manter `DEFAULT_TENANT_ID` como fallback explícito (não silencioso)

**Fase 9.3 — Migrar repositories para usar `request.tenantId`**
- Substituir `DEFAULT_TENANT_ID` nos repositories por `tenantId` vindo do request/service
- Começar por módulos de menor risco (categorias, marcas)
- Rotas críticas por último (ordens-servico, vendas)

**Fase 9.4 — Ativar com tenant fake em staging**
- Criar um segundo tenant de teste (`rr-test`) no ambiente de staging
- Garantir que dados do tenant `rr-infocell` não sejam visíveis para usuário do `rr-test`
- Validar isolamento completo

**Fase 9.5 — Aplicar em produção**
- Só após validação em staging
- Rollout cuidadoso, com capacidade de fallback para DEFAULT_TENANT_ID

### Princípios para a Fase 9

1. **Backend é a fonte de verdade do tenantId** — frontend nunca define o tenant, apenas recebe e exibe
2. **Fallback explícito é melhor que fallback silencioso** — se não encontrar tenantId, logar e retornar erro 403, não usar default escondido
3. **Migração incremental** — módulo a módulo, nunca big bang
4. **Testes de isolamento são obrigatórios antes de cada fase** — não avançar sem validar separação de dados

---

## 8. Critérios para avançar para 9.1

A Fase 9.1 só deve começar quando todos os itens abaixo estiverem confirmados:

- [x] Autenticação atual mapeada (Firebase Auth, ID Token, custom claims)
- [x] Origem confiável do `userId` está clara (`request.user.uid` no backend após `requireAuth`)
- [x] Fluxo de roles está mapeado (custom claim `role`, persistido no localStorage)
- [x] Middleware `resolveTenant` identificado e seu estado atual documentado
- [x] Riscos de rotas públicas conhecidos (apenas `/health` sem auth)
- [ ] **Modelo usuário x tenant definido** — custom claim vs Firestore `usuarios/{uid}` (decisão a tomar em 9.1)
- [ ] **Estratégia de fallback documentada** — o que fazer quando tenantId não for encontrado

---

## 9. Próxima fase

**Fase 9.1 — Modelo usuário x tenant**

Objetivo: definir e implementar o vínculo entre um usuário autenticado e seu tenant.

Decisão central a tomar:

| Opção | Vantagem | Desvantagem |
|-------|----------|-------------|
| **Custom claim `tenantId` no Firebase Auth** | Disponível no token, sem query extra | Requer Admin SDK para atualizar, tem delay de propagação |
| **Coleção Firestore `usuarios/{uid}`** | Fácil de atualizar, extensível | Requer uma query extra por request (pode cachear) |

A Fase 9.1 deve escolher uma opção, implementar o vínculo para usuários existentes e documentar o processo de atribuição para novos usuários.

---

## Apêndice — Arquivos de suporte já existentes

Documentos de fases anteriores relevantes para contexto:

| Arquivo | Conteúdo |
|---------|---------|
| `docs/nextassist/tenant-context.md` | TenantContext no frontend |
| `docs/nextassist/tenant-payload.md` | withTenantId() e payloads |
| `docs/nextassist/isolamento-tenant.md` | Estratégia de isolamento |
| `docs/nextassist/backend-tenant-estrutura.md` | Estrutura do backend multi-tenant |
| `docs/nextassist/revisao-final-multiempresa-pos-migracao.md` | Estado pós-Fase 8 |
