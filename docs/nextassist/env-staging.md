# Variaveis de Ambiente Staging

## Objetivo

Este documento descreve as variaveis de exemplo para preparar o frontend do NextAssist em ambiente staging.

As variaveis ainda nao devem ser conectadas ao sistema como fonte de comportamento dinamico. Nesta fase, elas apenas documentam a configuracao esperada para uma futura execucao controlada em staging.

## Arquivo de exemplo

Arquivo criado:

- `frontend/.env.staging.example`

Esse arquivo nao contem secrets reais.

## Variaveis propostas

| Variavel | Exemplo | Finalidade |
| --- | --- | --- |
| `VITE_APP_ENV` | `staging` | Identificar ambiente de execucao. |
| `VITE_API_BASE_URL` | `https://staging-api.example.com/api` | URL futura da API staging. |
| `VITE_AUTH_DEV_MODE` | `false` | Evitar modo dev em staging validavel. |
| `VITE_TENANT_ID` | `rr-infocell` | Tenant padrao inicial para testes. |
| `VITE_PRODUCT_NAME` | `NextAssist` | Produto base. |
| `VITE_DEFAULT_PLAN` | `premium` | Plano atual do tenant piloto. |
| `VITE_ENABLE_TENANT_CONTEXT` | `true` | Sinalizar uso esperado da camada de tenant. |

Variaveis Firebase tambem permanecem como placeholders, seguindo o padrao de `frontend/.env.example`.

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

Por enquanto, elas nao alteram comportamento do sistema.
