# Types e Helpers de Tenant

## Objetivo

Esta fase cria uma base inicial de tipos e helpers de tenant para o NextAssist sem alterar comportamento, banco de dados, backend ou services existentes.

Arquivos criados:

- `frontend/src/types/tenant.ts`
- `frontend/src/lib/tenant.ts`

## Por que esses types foram criados

O sistema ainda opera como RR Infocell, mas esta evoluindo para uma arquitetura SaaS + White Label. Antes de adicionar `tenantId` aos dados ou mudar queries, e importante padronizar os nomes e contratos que serao usados nas proximas fases.

Os tipos criados ajudam a documentar:

- identificador de tenant;
- plano do tenant;
- status do tenant;
- branding;
- configuracao consolidada;
- acesso a modulos por plano.

## Estado atual

Ainda nao existe tenant persistido no banco.

O tenant atual continua vindo de `frontend/src/config/tenantConfig.ts`, com:

- tenant: RR Infocell;
- produto base: NextAssist;
- plano: `premium`;
- White Label ativo.

O helper `frontend/src/lib/tenant.ts` apenas encapsula a leitura estatica atual. Ele nao busca API, nao usa `localStorage` e nao salva dados.

## Helpers disponiveis

O helper inicial expoe:

- `getCurrentTenant()`
- `getCurrentTenantId()`
- `getCurrentTenantPlan()`
- `isWhiteLabelEnabled()`
- `getTenantBranding()`
- `getCurrentTenantModuleAccess()`

Essas funcoes existem para reduzir acoplamento direto com `tenantConfig.ts` em novas areas do produto.

## Futuro

Em uma fase futura, essas informacoes poderao vir do backend ou do banco de dados. A origem pode mudar sem que todas as telas precisem conhecer os detalhes de armazenamento.

Possiveis evolucoes:

- carregar tenant apos login;
- associar usuario a um ou mais tenants;
- resolver plano e modulos pelo backend;
- persistir branding por empresa;
- validar status de assinatura;
- aplicar isolamento por `tenantId`.

## Cuidados antes de aplicar tenantId nos dados

Antes de adicionar `tenantId` em registros reais:

- criar ambiente staging;
- fazer backup completo do banco;
- definir o nome oficial do identificador;
- criar tenant padrao `rr-infocell`;
- mapear colecoes e relacionamentos;
- planejar scripts de migracao;
- testar isolamento entre tenants;
- validar relatorios, financeiro, estoque, OS, impressao e WhatsApp;
- executar primeiro em ambiente de teste.

Nenhuma migracao deve ser aplicada diretamente na producao da RR Infocell.
