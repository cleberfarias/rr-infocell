# Modulo Produtos e Estoque

## Objetivo

Gerenciar o estoque de pecas, produtos, acessorios, servicos e aparelhos para venda.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore e testes de rotas.
Celulares novos, seminovos e restaurados sao controlados como itens individuais por IMEI.
Movimentacoes manuais ficam no modulo `movimentacoes-estoque`.

Endpoints disponiveis:

```text
GET /api/produtos
GET /api/produtos?q=tela
GET /api/produtos?categoria=peca
GET /api/produtos?ativo=true
GET /api/produtos/:id
POST /api/produtos
PUT /api/produtos/:id
DELETE /api/produtos/:id
```

## Campos principais

- `sku`
- `nome`
- `categoria`: `peca`, `produto`, `acessorio`, `servico`, `celular_novo`, `celular_seminovo` ou `celular_restaurado`
- `estoqueAtual`
- `estoqueMinimo`
- `custo`
- `custoRestauracao`
- `precoVenda`
- `ativo`
- `observacoes`

## Campos de celular

- `imei`: obrigatorio para `celular_*`.
- `marca`
- `modelo`
- `cor`
- `capacidade`
- `estadoConservacao`
- `saudeBateria`
- `origem`: `compra`, `troca` ou `consignado`.
- `garantiaDias`
- `laudoEntrada`

## Regras de aparelho para venda

- Celular deve ter estoque individual: `estoqueAtual` nao pode passar de `1`.
- Cada aparelho vendido no PDV sai pelo IMEI especifico.
- Custo total operacional considera custo de entrada mais custo de restauracao.

## Integracoes

- Pecas usadas em OS disparam baixa automatica de estoque via modulo `movimentacoes-estoque`.
- Vendas diretas no PDV disparam baixa automatica de estoque com origem `venda`.
