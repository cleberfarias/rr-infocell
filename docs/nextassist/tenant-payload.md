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

#### Contas (`frontend/src/services/contas.ts`)

Contas financeiras nao vinculam OS, produto ou estoque diretamente. O saldo e alterado pelo backend ao registrar vendas, mas adicionar `tenantId` ao payload de criacao/edicao e puramente aditivo.

Fluxos alterados:

- `createConta` — payload de criacao inclui `tenantId`
- `updateConta` — payload de edicao inclui `tenantId`

Fluxos nao alterados:

- `listContas` — listagem sem filtro por tenantId
- `deleteConta` — exclusao sem validacao de tenantId

#### Ordens de Servico (`frontend/src/services/ordens-servico.ts`)

Entidade sensivel: ao criar ou editar uma OS com pecas, o backend aciona baixa de estoque internamente. Adicionar `tenantId` ao payload e puramente aditivo — o backend vai ignorar o campo ate ser preparado para valida-lo. A logica de baixa de estoque, calculo de valores e regras de status nao foram alteradas.

Fluxos alterados:

- `createOrdemServico` — payload de criacao inclui `tenantId`
- `updateOrdemServico` — payload de edicao inclui `tenantId`

Fluxos nao alterados:

- `listOrdensServico` — listagem sem filtro por tenantId
- `getOrdemServico` — busca individual sem filtro
- `deleteOrdemServico` — exclusao sem validacao de tenantId

### Entidades sem tenantId aplicado

Os demais services permanecem sem tenantId:

- `movimentacoes-estoque.ts` — movimentacoes automaticas via OS controladas pelo backend
- `orcamentos.ts` — vincula OS, cliente e produtos
- `vendas.ts` (PDV) — vincula OS, produto e cliente ao mesmo tempo
- `ordem-eventos.ts` — timeline da OS
- `whatsapp.ts`
- `usuarios.ts`
- `checklists.ts`
- `aparelhos.ts`
- `categorias.ts`
- `marcas.ts`
- `fornecedores.ts`

## Observacao sobre OS e baixa de estoque

Ao criar uma OS com `pecasUsadas`, o backend reduz o estoque dos produtos referenciados internamente. Essa logica e controlada exclusivamente pelo backend e nao passa pelo service `movimentacoes-estoque.ts` do frontend. Adicionar `tenantId` ao payload de OS nao altera esse fluxo.

## Validacao manual recomendada para OS

Antes de considerar esta fase valida em staging, executar:

- [ ] Criar OS simples sem pecas — verificar se nao retorna 400/422
- [ ] Criar OS com uma ou mais pecas — verificar se nao retorna 400/422
- [ ] Editar OS existente — verificar se nao retorna 400/422
- [ ] Verificar se baixa de estoque continua funcionando igual ao comportamento anterior
- [ ] Verificar se historico de movimentacoes de estoque nao foi alterado

## Observacao sobre despesas e financeiro

`Despesa` nao vincula OS, produto nem estoque. Adicionar `tenantId` ao payload de criacao/edicao e puramente aditivo: o backend vai ignorar o campo ate estar preparado para valida-lo. Nenhuma regra de calculo financeiro foi alterada.

Vendas/PDV, orcamento, impressao e relatorios financeiros permanecem sem alteracao.

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
| Baixa de estoque via OS nao distingue tenant | Pendente — depende de backend |
| Vendas/PDV, orcamento, impressao e WhatsApp sem tenant | Intencional nesta fase |
| Mistura de dados entre tenants em consultas | Risco real — depende de backend preparado |

## Proximos passos recomendados

1. Validar manualmente OS com e sem pecas em staging (ver checklist acima).
2. Preparar backend para aceitar e armazenar `tenantId` nas entidades ja marcadas.
3. Criar filtros de listagem por tenant no backend.
4. Aplicar tenantId em `ordem-eventos.ts` e `movimentacoes-estoque.ts` (manual).
5. Aplicar tenantId em `vendas.ts` somente apos OS e estoque alinhados.
6. Nunca aplicar filtros reais por tenant em producao sem backup e rollback planejados.
