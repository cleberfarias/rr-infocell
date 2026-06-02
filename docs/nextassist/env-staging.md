# Variaveis de Ambiente Staging

## Objetivo

Este documento descreve as variaveis de exemplo para preparar o frontend do NextAssist em ambiente staging.

As variaveis abaixo podem ser lidas pelo frontend para configurar valores estaticos e seguros de tenant/staging. Todas possuem fallback para a configuracao atual da RR Infocell, entao o sistema continua funcionando sem `.env.staging`.

Isso ainda nao representa multiempresa real. Backend, banco, services e queries ainda nao usam `tenantId`.

## Arquivo de exemplo

Arquivo criado:

- `frontend/.env.staging.example`

Esse arquivo nao contem secrets reais.

## Variaveis suportadas

| Variavel | Exemplo | Finalidade |
| --- | --- | --- |
| `VITE_APP_ENV` | `staging` | Identificar ambiente de execucao no frontend. |
| `VITE_API_BASE_URL` | `https://staging-api.example.com/api` | URL futura da API staging. |
| `VITE_AUTH_DEV_MODE` | `false` | Evitar modo dev em staging validavel. |
| `VITE_TENANT_ID` | `rr-infocell` | Tenant padrao inicial para testes. |
| `VITE_PRODUCT_NAME` | `NextAssist` | Produto base. |
| `VITE_DEFAULT_PLAN` | `premium` | Plano atual do tenant piloto. |
| `VITE_ENABLE_TENANT_CONTEXT` | `true` | Sinalizar uso esperado da camada de tenant. |

Variaveis Firebase tambem permanecem como placeholders, seguindo o padrao de `frontend/.env.example`.

## Fallbacks atuais

Se as variaveis nao existirem, o frontend usa valores seguros:

| Campo | Fallback |
| --- | --- |
| `appEnv` | `production` |
| `tenantId` | `rr-infocell` |
| `productName` | `NextAssist` |
| `systemName` | `RR Infocell` |
| `tenantName` | `RR Infocell` |
| `plan` | `premium` |
| `whiteLabel` | `true` |
| `showPoweredBy` | `true` |
| `enableTenantContext` | `true` |

Se `VITE_DEFAULT_PLAN` receber um valor invalido, o fallback continua sendo `premium`.

## Regras de seguranca

- Nao commitar secrets reais.
- Nao reutilizar credenciais de producao sem decisao formal.
- Nao apontar staging para banco de producao.
- Nao conectar WhatsApp real sem validacao.
- Nao ativar tenant dinamico sem testes de isolamento.

## Producao protegida

O ambiente staging deve ser separado da producao da RR Infocell. Qualquer valor real de Firebase, API ou integracao deve ser definido fora do repositorio, por variaveis protegidas no provedor de deploy.

## Uso futuro

Em fases futuras, essas variaveis poderao orientar:

- deploy staging separado;
- tenant padrao `rr-infocell`;
- testes de plano premium;
- validacao de TenantContext;
- isolamento de dados em banco staging.

Por enquanto, elas nao alteram regras de negocio, nao salvam dados, nao buscam tenant por API e nao aplicam isolamento real.

## Limites atuais

- Backend ainda nao resolve tenant.
- Banco ainda nao possui `tenantId` persistido.
- Services ainda nao filtram por tenant.
- Queries e relatorios ainda nao usam tenant dinamico.
- A RR Infocell continua sendo o tenant piloto com plano `premium`.
