# TenantContext

## O que e

`TenantContext` e uma camada inicial para expor o tenant atual do NextAssist de forma centralizada no frontend.

Arquivo principal:

- `frontend/src/contexts/TenantContext.tsx`

Ele expõe o hook:

- `useTenant()`

## Dados expostos

O contexto disponibiliza:

- `tenant`
- `tenantId`
- `plan`
- `branding`
- `isWhiteLabel`
- `canUseModule(moduleKey)`

Esses dados permitem que novas telas consultem o tenant atual sem importar diretamente `tenantConfig.ts`.

## Estado atual

Nesta fase, o contexto ainda usa os helpers de `frontend/src/lib/tenant.ts`.

Esses helpers ainda leem a configuracao estatica de:

- `frontend/src/config/tenantConfig.ts`

Nao existe tenant vindo do backend, banco de dados, API ou `localStorage`.

O tenant atual continua sendo:

- tenant: RR Infocell
- produto base: NextAssist
- plano: `premium`
- White Label: ativo

## Por que isso prepara multiempresa

O contexto cria um ponto de acesso gradual para o tenant atual. No futuro, a origem dos dados podera mudar de `tenantConfig.ts` para backend/banco sem exigir que cada tela conheca essa troca.

Possiveis evolucoes:

- carregar tenant apos login;
- resolver tenant por usuario autenticado;
- suportar usuario com acesso a mais de uma empresa;
- receber plano e modulos do backend;
- exibir branding vindo do banco;
- validar status de assinatura.

## Limites desta fase

Esta fase nao faz:

- persistencia;
- chamada de API;
- leitura de `localStorage`;
- edicao de tenant;
- salvamento de configuracoes;
- alteracao de banco;
- alteracao de services;
- bloqueio de rotas.

## Cuidados antes de usar em services e queries

Antes de aplicar tenant em services ou queries:

- definir se o identificador oficial sera `tenantId`, `empresaId` ou outro;
- criar ambiente staging;
- fazer backup do banco;
- definir como o backend valida tenant do usuario;
- evitar depender apenas do frontend para isolamento;
- garantir filtros obrigatorios nos repositories backend;
- criar testes de isolamento entre tenants;
- revisar relatorios, financeiro, estoque, OS, impressao e WhatsApp.

O frontend pode ajudar a selecionar e exibir tenant, mas o isolamento real precisa ser garantido no backend e nas regras de seguranca.
