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

#### Eventos da OS (`frontend/src/services/ordem-eventos.ts`)

Eventos sao registros de timeline/historico da OS (comentarios, status, diagnostico, orcamento, pecas, garantia, entrega). Nao alteram OS principal, estoque, financeiro ou regras de calculo.

Fluxos alterados:

- `createOrdemEvento` — payload de criacao inclui `tenantId`

Fluxos nao alterados:

- `listOrdemEventos` — listagem sem filtro por tenantId

### Checklist de validacao manual para eventos da OS

- [ ] Criar comentario/evento em uma OS existente — verificar se nao retorna 400/422
- [ ] Verificar se o evento aparece normalmente na timeline da OS
- [ ] Verificar se OS principal continua funcionando sem alteracoes

#### Movimentacoes de Estoque (`frontend/src/services/movimentacoes-estoque.ts`)

Apenas movimentacoes manuais criadas pelo frontend (entrada, saida, ajuste). As movimentacoes automaticas geradas internamente pelo backend ao salvar OS com pecas (`origem: "ordem_servico"`) nao passam por este service e nao foram alteradas.

Fluxos alterados:

- `createMovimentacaoEstoque` — payload de criacao manual inclui `tenantId`

Fluxos nao alterados:

- `listMovimentacoesEstoque` — listagem sem filtro por tenantId

### Checklist de validacao manual para movimentacoes de estoque

- [ ] Criar movimentacao manual de entrada — verificar se nao retorna 400/422
- [ ] Criar movimentacao manual de saida — verificar se nao retorna 400/422
- [ ] Verificar se o saldo do produto continua com o mesmo comportamento anterior
- [ ] Criar OS com pecas — verificar se baixa automatica de estoque continua funcionando

#### Vendas / PDV (`frontend/src/services/vendas.ts`)

Entidade de maior acoplamento: uma venda pode vincular OS (`ordemServicoId`), produto (`itens[].produtoId`) e cliente (`clienteId`) ao mesmo tempo. Adicionar `tenantId` ao payload de criacao e puramente aditivo — o backend vai ignorar o campo ate ser preparado para valida-lo. Nenhuma regra de calculo, baixa de estoque, financeiro ou impressao de cupom foi alterada.

Fluxos alterados:

- `createVenda` — payload de criacao inclui `tenantId`

Fluxos nao alterados:

- `listVendas` — listagem sem filtro por tenantId

### Checklist de validacao manual para vendas/PDV

- [ ] Criar venda com produto — verificar se nao retorna 400/422
- [ ] Criar venda vinculada a cliente — verificar se nao retorna 400/422
- [ ] Criar venda vinculada a OS — verificar se nao retorna 400/422
- [ ] Verificar se estoque continua com o mesmo comportamento anterior
- [ ] Verificar se financeiro/caixa nao foi alterado
- [ ] Verificar se cupom/impressao de PDV nao foi afetado

### Entidades sem tenantId aplicado

Os demais services permanecem sem tenantId:

- `orcamentos.ts` — vincula OS, cliente e produtos
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

## Resumo do estado atual de cobertura de payloads

Todos os services de criacao/edicao de entidades operacionais ja enviam `tenantId` no payload:

| Service | createX | updateX |
| --- | --- | --- |
| clientes.ts | tenantId | tenantId |
| produtos.ts | tenantId | tenantId |
| despesas.ts | tenantId | tenantId |
| contas.ts | tenantId | tenantId |
| ordens-servico.ts | tenantId | tenantId |
| ordem-eventos.ts | tenantId | n/a |
| movimentacoes-estoque.ts | tenantId | n/a |
| vendas.ts | tenantId | n/a |

Services ainda sem tenantId (menor prioridade operacional):

- `orcamentos.ts` — vincula OS, cliente e produtos
- `usuarios.ts`, `checklists.ts`, `aparelhos.ts`, `categorias.ts`, `marcas.ts`, `fornecedores.ts`, `whatsapp.ts`

## Riscos restantes

| Risco | Status |
| --- | --- |
| Backend nao valida `tenantId` nos payloads | Pendente — campo e ignorado hoje |
| Listagens retornam dados sem filtro por tenant | Pendente — todos os `list*` sem filtro |
| Deletes sem validacao de tenant | Pendente |
| Baixa de estoque via OS nao distingue tenant | Pendente — depende de backend |
| Orcamento, impressao e WhatsApp sem tenant | Pendente |
| Mistura de dados entre tenants em consultas | Risco real — depende de backend preparado |

## Proximos passos recomendados

1. Validar manualmente OS, movimentacoes e vendas em staging (ver checklists acima).
2. Preparar backend para aceitar e armazenar `tenantId` nas entidades ja marcadas.
3. Criar filtros de listagem por tenant no backend.
4. Aplicar tenantId em `orcamentos.ts`.
5. Nunca aplicar filtros reais por tenant em producao sem backup e rollback planejados.
