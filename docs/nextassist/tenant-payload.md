# Tenant Payload

## Objetivo

`tenantPayload` e uma camada utilitaria inicial para preparar payloads com `tenantId` no frontend do NextAssist.

Arquivo criado:

- `frontend/src/lib/tenantPayload.ts`

O objetivo e deixar uma base tipada para uso futuro em staging, sem aplicar ainda em services reais e sem alterar comportamento atual da RR Infocell.

## Funcoes disponiveis

O helper expoe:

- `withTenantId(data)`
- `getTenantScopedPayload(data)`
- `hasTenantId(payload)`
- `assertTenantId(payload)`

As funcoes usam o tenant atual vindo de `frontend/src/lib/tenant.ts`.

Hoje o tenant atual continua sendo:

- `tenantId`: `rr-infocell`
- tenant: RR Infocell
- produto base: NextAssist
- plano: `premium`

## Limites atuais

Este helper ainda nao:

- altera dados reais;
- salva dados;
- chama API;
- usa `localStorage`;
- busca tenant no backend;
- aplica tenant em services criticos;
- substitui validacao no backend;
- representa multiempresa real.

Ele apenas prepara payloads em memoria quando for usado futuramente.

## Validacao no backend

Mesmo quando esse helper for usado, o backend devera continuar sendo a fonte de seguranca.

O backend devera:

- resolver tenant do usuario autenticado;
- validar se o usuario pertence ao tenant;
- ignorar ou validar `tenantId` enviado pelo frontend;
- aplicar filtros obrigatorios por tenant nas queries;
- validar update/delete por tenant;
- impedir acesso a dados de outro tenant.

O frontend pode ajudar a montar payloads, mas nao deve ser a unica barreira de isolamento.

## Exemplos conceituais de uso futuro

Os exemplos abaixo sao apenas conceituais. Nao aplicar em services criticos sem fase especifica.

### Create com tenant

```ts
const payload = withTenantId({
  nome: "Cliente teste",
  telefone: "(00) 00000-0000",
});
```

### Validar payload recebido em camada intermediaria

```ts
assertTenantId(payload);
```

### Checar se objeto possui tenant

```ts
if (hasTenantId(payload)) {
  // payload.tenantId esta disponivel de forma tipada
}
```

## Cuidados antes de aplicar em services

Antes de usar em services reais:

- validar ambiente staging;
- confirmar backup e rollback;
- definir se `tenantId` sera enviado pelo frontend ou resolvido apenas no backend;
- mapear services criticos;
- criar testes de isolamento;
- revisar OS, estoque, financeiro, orcamento, impressao e WhatsApp;
- garantir que backend valida tenant independentemente do frontend.

## Uso recomendado

Usar primeiro em areas nao criticas ou prototipos de staging. Nao aplicar em producao sem validacao completa de isolamento.
