# Tenant Payload

## Objetivo

`tenantPayload` e uma camada utilitaria para preparar payloads com `tenantId` no frontend do NextAssist.

Arquivo principal:

- `frontend/src/lib/tenantPayload.ts`

## Funcoes disponiveis

O helper expoe:

- `withTenantId(data)`
- `getTenantScopedPayload(data)`
- `hasTenantId(payload)`
- `assertTenantId(payload)`

As funcoes usam o tenant atual vindo de `frontend/src/lib/tenant.ts`.

O tenant atual e:

- `tenantId`: `rr-infocell`
- tenant: RR Infocell
- produto base: NextAssist
- plano: `premium`

## Estado atual de aplicacao

### Entidades com tenantId aplicado no payload

#### Clientes (`frontend/src/services/clientes.ts`)

Fluxos alterados:

- `createCliente` — payload de criacao inclui `tenantId`
- `updateCliente` — payload de edicao inclui `tenantId`

Fluxos nao alterados:

- `listClientes` — listagem sem filtro por tenantId
- `getCliente` — busca individual sem filtro por tenantId
- `deleteCliente` — exclusao sem validacao de tenantId

#### Produtos (`frontend/src/services/produtos.ts`)

Fluxos alterados:

- `createProduto` — payload de criacao inclui `tenantId`
- `updateProduto` — payload de edicao inclui `tenantId`

Fluxos nao alterados:

- `listProdutos` — listagem sem filtro por tenantId
- `deleteProduto` — exclusao sem validacao de tenantId

#### Despesas (`frontend/src/services/despesas.ts`)

Identificada na Fase 7.5.1 como o ponto financeiro de entrada mais seguro: nao vincula OS, produto ou estoque diretamente.

Fluxos alterados:

- `createDespesa` — payload de criacao inclui `tenantId`
- `updateDespesa` — payload de edicao inclui `tenantId`

Fluxos nao alterados:

- `listDespesas` — listagem sem filtro por tenantId
- `deleteDespesa` — exclusao sem validacao de tenantId

### Entidades sem tenantId aplicado

Os demais services permanecem sem tenantId:

- `ordens-servico.ts` (OS) — sensivel; aciona baixa de estoque no backend
- `movimentacoes-estoque.ts` — sensivel; movimentacoes automaticas via OS
- `contas.ts` (contas financeiras) — pendente fase 7.5.4
- `orcamentos.ts` — vincula OS, cliente e produtos
- `vendas.ts` (PDV) — vincula OS, produto e cliente ao mesmo tempo
- `whatsapp.ts`
- `usuarios.ts`
- `checklists.ts`
- `aparelhos.ts`
- `categorias.ts`
- `marcas.ts`
- `fornecedores.ts`
- `ordem-eventos.ts`

## Observacao sobre despesas e financeiro

`Despesa` nao vincula OS, produto nem estoque. Adicionar `tenantId` ao payload de criacao/edicao e puramente aditivo: o backend vai ignorar o campo ate estar preparado para valida-lo. Nenhuma regra de calculo financeiro foi alterada.

OS, estoque, movimentacoes, vendas/PDV, orcamento, impressao e relatorios financeiros permanecem sem alteracao.

## Observacao sobre produtos e estoque

O tipo `ProdutoInput` inclui o campo `estoqueAtual`. Adicionar `tenantId` ao payload de criacao/edicao de produto nao altera o comportamento de estoque — e apenas metadado adicional. Movimentacoes reais de estoque ocorrem em `movimentacoes-estoque.ts`, que permanece sem alteracao.

O backend vai ignorar o `tenantId` ate que seja preparado para valida-lo.

## O que o backend ainda precisa fazer

O backend devera, em fase futura:

- resolver tenant do usuario autenticado;
- validar se o usuario pertence ao tenant;
- ignorar ou validar `tenantId` enviado pelo frontend;
- aplicar filtros obrigatorios por tenant nas queries;
- validar update/delete por tenant;
- impedir acesso a dados de outro tenant.

O frontend apenas prepara payloads. O backend e a unica barreira real de isolamento.

## Riscos restantes

| Risco | Status |
| --- | --- |
| Backend nao valida `tenantId` nos payloads | Pendente — campo e ignorado hoje |
| Listagens retornam dados sem filtro por tenant | Pendente — todos os `list*` sem filtro |
| Deletes sem validacao de tenant | Pendente |
| OS, estoque, financeiro, orcamento, PDV, WhatsApp sem tenant | Intencional nesta fase |
| Mistura de dados entre tenants em consultas | Risco real — depende de backend preparado |

## Proximos passos recomendados

1. Preparar backend para aceitar e armazenar `tenantId` em clientes e produtos.
2. Criar filtros de listagem por tenant no backend.
3. Validar em staging com dois tenants distintos.
4. Somente apos validacao em staging, expandir para OS e entidades criticas.
5. Nunca aplicar filtros reais por tenant em producao sem backup e rollback planejados.
