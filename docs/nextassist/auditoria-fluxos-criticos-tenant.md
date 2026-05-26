# Auditoria de Fluxos Criticos para Tenant

## 1. Objetivo

Este documento audita os fluxos criticos de OS, estoque e financeiro antes de qualquer aplicacao de `tenantId` nesses modulos.

Ja aplicamos `tenantId` em payloads de menor risco: `clientes` e `produtos` (createCliente, updateCliente, createProduto, updateProduto). Agora precisamos mapear OS, estoque e financeiro com cuidado redobrado antes de avancar, pois esses fluxos sao interdependentes e afetam dados operacionais, financeiros e historicos da empresa.

Esta fase nao altera codigo. Apenas documenta riscos e orienta a fase seguinte com seguranca.

---

## 2. Fluxo de Ordens de Servico

### 2.1 Arquivos envolvidos

| Arquivo | Tipo de dado | Risco ao aplicar tenantId | Prioridade | Recomendacao |
| --- | --- | --- | --- | --- |
| `frontend/src/services/ordens-servico.ts` | Criacao, edicao, listagem e exclusao de OS | Alto — OS vincula cliente, aparelho, pecas e dados financeiros | Alta | Aplicar tenantId em `createOrdemServico` e `updateOrdemServico` como primeiro passo da fase 7.5.2 |
| `frontend/src/services/ordem-eventos.ts` | Timeline e historico de eventos da OS | Medio — eventos orfaos de um tenant podem aparecer em OS de outro | Media | Aplicar tenantId em `createOrdemEvento` na fase 7.5.2, apos OS |
| `frontend/src/services/orcamentos.ts` | Orcamentos vinculados a OS | Alto — orcamento carrega clienteId, aparelhoId, pecas e valores | Alta | Aplicar tenantId em `createOrcamento` somente apos OS e estoque estarem mapeados |
| `frontend/src/pages/NovaOS.tsx` | Formulario de criacao de OS | Alto — concentra vinculo com cliente, aparelho, checklist e pecas | Alta | Nao alterar tela; apenas o service deve receber tenantId |
| `frontend/src/pages/OrdemDetalhe.tsx` | Detalhe, edicao, impressao e orcamento da OS | Muito alto — impressao usa dados do tenant; vinculos criticos | Alta | Nao alterar nesta fase; depende de OS e orcamento ja com tenant |
| `frontend/src/pages/Ordens.tsx` | Listagem de OS | Alto — sem filtro por tenant exibe OS de outra empresa | Alta | Nao alterar nesta fase; filtro depende de backend preparado |
| `frontend/src/pages/Manutencao.tsx` | OS em manutencao e eventos | Alto — tecnicos poderiam acessar OS de outro tenant | Media | Nao alterar nesta fase |

### 2.2 Vinculos criticos da OS

O tipo `OrdemServicoInput` (em `ordens-servico.ts`) possui:

- `clienteId` — deve pertencer ao mesmo tenant da OS
- `aparelhoId` — deve pertencer ao mesmo tenant da OS
- `pecasUsadas / pecasUsadas[].produtoId` — produtos devem pertencer ao tenant
- `checklistId` — checklist deve pertencer ao tenant
- Dados financeiros: `valorPecas`, `valorMaoObra`, `desconto`, `valorTotal`, `valorAdiantado`, `formaPagamento`, `valorRecebido`

Risco critico: se tenantId for aplicado na OS mas nao no cliente, aparelho ou produto, a consistencia de isolamento fica incompleta. O backend deve validar que todos os vinculos pertencem ao mesmo tenant.

### 2.3 Fluxo acionado ao criar OS com pecas

```
createOrdemServico (com pecasUsadas)
  → backend cria OS
  → backend reduz estoque dos produtos (movimentacao automatica origem "ordem_servico")
  → backend cria MovimentacaoEstoque
```

Este fluxo nao passa pelo frontend de movimentacoes-estoque. O backend aciona a baixa de estoque internamente ao salvar a OS. Adicionar tenantId na OS nao altera esse comportamento enquanto o backend nao validar o campo.

---

## 3. Fluxo de Estoque

### 3.1 Arquivos envolvidos

| Arquivo | Tipo de dado | Risco ao aplicar tenantId | Prioridade | Recomendacao |
| --- | --- | --- | --- | --- |
| `frontend/src/services/movimentacoes-estoque.ts` | Entradas, saidas e ajustes manuais | Alto — movimentacao incorreta mistura saldos de tenants | Alta | Aplicar tenantId em `createMovimentacaoEstoque` na fase 7.5.3, apos OS |
| `frontend/src/services/produtos.ts` | Catalogo, preco, estoque atual | Medio — ja recebe tenantId; risco residual em listagem | Media | Listagem ainda sem filtro; aguardar backend |
| `frontend/src/pages/Estoque.tsx` | Produtos e saldos | Alto — saldos de outro tenant poderiam aparecer | Alta | Nao alterar nesta fase |
| `frontend/src/pages/Movimentacoes.tsx` | Historico de movimentacoes | Alto — auditoria de estoque incorreta entre tenants | Alta | Nao alterar nesta fase |

### 3.2 Vinculos criticos do estoque

O tipo `MovimentacaoEstoque` (em `movimentacoes-estoque.ts`) possui:

- `produtoId` — deve pertencer ao mesmo tenant
- `origem: "ordem_servico"` — movimentacoes geradas automaticamente por OS
- `ordemServicoId` — vinculo direto com a OS que gerou a baixa

Risco critico: movimentacoes com `origem = "ordem_servico"` sao criadas pelo backend ao salvar OS com pecas. Elas nao passam pelo `createMovimentacaoEstoque` do frontend. O frontend so usa `createMovimentacaoEstoque` para movimentacoes manuais (entrada, saida, ajuste).

### 3.3 Dependencia entre OS e estoque

A baixa de estoque via OS e controlada pelo backend. Adicionar tenantId no payload de `createMovimentacaoEstoque` afeta apenas movimentacoes manuais. As automaticas (OS → pecas → baixa) so serao isoladas por tenant quando o backend for preparado para isso.

### 3.4 Produto e estoqueAtual

O campo `estoqueAtual` em `ProdutoInput` define o saldo inicial ao criar um produto. Esse campo nao gera uma `MovimentacaoEstoque` separada — o backend controla isso internamente. Adicionar tenantId ao produto (ja feito) nao altera esse comportamento.

---

## 4. Fluxo Financeiro

### 4.1 Arquivos envolvidos

| Arquivo | Tipo de dado | Risco ao aplicar tenantId | Prioridade | Recomendacao |
| --- | --- | --- | --- | --- |
| `frontend/src/services/despesas.ts` | Despesas e categorias | Medio — despesa e relativamente isolada de OS e estoque | Media | Aplicar tenantId em `createDespesa` e `updateDespesa` na fase 7.5.4 como primeiro passo financeiro |
| `frontend/src/services/contas.ts` | Contas financeiras e saldos | Alto — saldo de conta pertence ao tenant; mistura compromete caixa | Alta | Aplicar tenantId em `createConta` e `updateConta` na fase 7.5.4 |
| `frontend/src/services/vendas.ts` | Vendas, itens e pagamentos | Muito alto — venda vincula OS, produto, cliente e forma de pagamento | Alta | Aplicar tenantId em `createVenda` somente apos OS e estoque estarem preparados |
| `frontend/src/pages/Financeiro.tsx` | DRE, indicadores e relatorios | Muito alto — relatorio consolida receitas e despesas; mistura causa decisoes incorretas | Alta | Nao alterar nesta fase; depende de todos os modulos filtrados |
| `frontend/src/pages/Despesas.tsx` | Despesas e categorias | Medio | Media | Nao alterar tela nesta fase |
| `frontend/src/pages/PDV.tsx` | Caixa, vendas e cupom | Muito alto — cupom e venda devem refletir empresa correta | Alta | Nao alterar nesta fase |
| `frontend/src/pages/Dashboard.tsx` | Indicadores agregados | Muito alto — consolida OS, vendas, estoque e financeiro | Alta | Nao alterar nesta fase |

### 4.2 Vinculos criticos das vendas

O tipo `VendaInput` (em `vendas.ts`) possui:

- `ordemServicoId` — vinculo direto com OS
- `itens[].produtoId` — vinculo com produtos
- `clienteId` — vinculo com cliente
- `formaPagamento` e `valorRecebido` — dados financeiros

Risco critico: uma venda referencia OS, produto e cliente ao mesmo tempo. Se qualquer um desses estiver em tenant diferente da venda, o historico financeiro fica inconsistente. `createVenda` deve ser um dos ultimos pontos a receber tenantId, apos OS, estoque e clientes ja estarem alinhados.

### 4.3 Contas e saldos

O tipo `Conta` (em `contas.ts`) tem `saldo`. O saldo de uma conta e alterado quando uma venda e registrada (no backend). Adicionar tenantId em `createConta` e `updateConta` e seguro enquanto o backend ignorar o campo, pois nao altera o calculo de saldo.

### 4.4 Despesas como ponto de entrada seguro

`Despesa` (em `despesas.ts`) e uma entidade relativamente isolada: nao vincula OS, produto ou estoque diretamente. E um bom candidato para ser o primeiro passo financeiro a receber tenantId, antes de contas e vendas.

---

## 5. Ordem segura de implementacao futura

A ordem abaixo minimiza risco de inconsistencia entre entidades:

| Etapa | Fase | Acao | Motivo |
| --- | --- | --- | --- |
| 1 | 7.5.2 | `createOrdemServico` + `updateOrdemServico` | OS e o centro de tudo; deve ter tenantId primeiro |
| 2 | 7.5.2 | `createOrdemEvento` | Timeline da OS; baixo risco isolado |
| 3 | 7.5.3 | `createMovimentacaoEstoque` | Movimentacoes manuais; as automaticas (via OS) dependem do backend |
| 4 | 7.5.4 | `createDespesa` + `updateDespesa` | Despesas sao isoladas; bom ponto de entrada financeiro |
| 5 | 7.5.4 | `createConta` + `updateConta` | Contas nao vinculam OS; mais seguro que vendas |
| 6 | 7.5.4 | `createVenda` | So apos OS, estoque, clientes e contas alinhados |
| 7 | futura | `createOrcamento` | Vincula OS, cliente e produtos; depende de OS isolado |
| 8 | futura | Relatorios e Dashboard | Dependem de todos os modulos filtrados |
| 9 | futura | Impressao (OS, orcamento, cupom) | Ultimo passo; deve usar dados ja isolados por tenant |

---

## 6. Riscos criticos mapeados

| Risco | Modulos afetados | Impacto | Status |
| --- | --- | --- | --- |
| OS aparecer em empresa errada | ordens-servico, ordem-eventos | Exposicao de historico tecnico e dados de cliente | Pendente — backend nao filtra por tenant |
| Estoque baixar produto de outro tenant | movimentacoes-estoque, produtos | Saldo incorreto; custo de reposicao errado | Pendente |
| OS com partes de outro tenant | ordens-servico → produtos | OS com pecas de outra empresa; preco e margem incorretos | Pendente |
| Financeiro misturar receitas e despesas | vendas, despesas, contas | DRE incorreto; decisoes gerenciais comprometidas | Pendente |
| Relatorio consolidar dados de tenants diferentes | Dashboard, Financeiro | Indicadores errados; risco de vazamento de informacao comercial | Pendente |
| Impressao mostrar dados de empresa errada | OrdemDetalhe, Orcamento, PDV | Documento com CNPJ, logo ou termos incorretos entregue ao cliente | Pendente |
| Orcamento vincular produto de outro tenant | orcamentos, produtos | Preco e disponibilidade incorretos no orcamento | Pendente |
| Cliente de um tenant aparecer em OS de outro | ordens-servico, clientes | Dados pessoais de cliente expostos para outra empresa | Pendente |
| Movimentacao automatica (OS → estoque) sem tenant | Backend interno | Backend reduz estoque sem distinguir tenant; mistura saldos | Pendente — depende de backend |
| Venda com ordemServicoId de outro tenant | vendas, ordens-servico | Receita atribuida a empresa errada | Pendente |

---

## 7. Criterios para aplicar tenantId nesses fluxos

Somente avancar para fase 7.5.2 (OS) quando:

- Build frontend passando sem erros
- Ambiente staging separado do banco de producao
- Backup do banco realizado e restore validado
- Tenant padrao `rr-infocell` confirmado na config
- Rollback planejado (como reverter o commit ou remover o tenantId do payload)
- Testes manuais definidos (ver secao 8)
- Confirmacao de que o backend ignora o campo `tenantId` sem errar (nao rejeita com 400/422)
- Nenhuma alteracao em OS, estoque ou financeiro em producao enquanto staging nao estiver validado

---

## 8. Checklist manual futuro

Este checklist deve ser executado em staging apos aplicar tenantId nos fluxos criticos:

### OS
- [ ] Criar OS com cliente e aparelho do tenant
- [ ] Editar OS (alterar status, adicionar peca, registrar diagnostico)
- [ ] Adicionar peca/produto a OS
- [ ] Adicionar mao de obra a OS
- [ ] Verificar que peca adicionada pertence ao mesmo tenant
- [ ] Verificar que evento foi criado na timeline com tenantId correto
- [ ] Imprimir OS via interna e via cliente
- [ ] Confirmar que dados impressos sao da empresa correta

### Estoque
- [ ] Criar movimentacao manual de entrada
- [ ] Criar movimentacao manual de saida
- [ ] Criar ajuste de estoque
- [ ] Verificar que saldo do produto foi atualizado corretamente
- [ ] Verificar que historico de movimentacoes so exibe registros do tenant

### Financeiro
- [ ] Criar despesa
- [ ] Editar despesa
- [ ] Registrar pagamento de venda (via OS)
- [ ] Verificar que venda aparece no financeiro do tenant correto
- [ ] Verificar que despesa nao aparece em tenant diferente
- [ ] Gerar relatorio de DRE em staging com dois tenants; confirmar separacao

### Validacao de isolamento (staging com dois tenants)
- [ ] Criar OS no tenant A; confirmar que nao aparece no tenant B
- [ ] Baixar estoque no tenant A; confirmar que saldo do tenant B nao foi alterado
- [ ] Registrar despesa no tenant B; confirmar que nao aparece no DRE do tenant A
- [ ] Imprimir OS do tenant A; confirmar que logo e CNPJ sao do tenant A

---

## 9. Estado atual dos services

| Service | createX | updateX | listX | deleteX |
| --- | --- | --- | --- | --- |
| clientes.ts | tenantId aplicado | tenantId aplicado | sem filtro | sem validacao |
| produtos.ts | tenantId aplicado | tenantId aplicado | sem filtro | sem validacao |
| ordens-servico.ts | **sem tenantId** | **sem tenantId** | **sem filtro** | **sem validacao** |
| ordem-eventos.ts | **sem tenantId** | n/a | **sem filtro** | n/a |
| movimentacoes-estoque.ts | **sem tenantId** | n/a | **sem filtro** | n/a |
| despesas.ts | **sem tenantId** | **sem tenantId** | **sem filtro** | **sem validacao** |
| contas.ts | **sem tenantId** | **sem tenantId** | **sem filtro** | **sem validacao** |
| vendas.ts | **sem tenantId** | n/a | **sem filtro** | n/a |
| orcamentos.ts | **sem tenantId** | n/a | **sem filtro** | n/a |

Backend e banco ainda nao validam `tenantId` em nenhum modulo.
