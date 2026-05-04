# Modulo Movimentacoes de Estoque

## Objetivo

Registrar entrada, saida e ajuste manual de estoque mantendo historico por produto.

## Status atual

Implementado com validacao, service, repository em memoria/Firestore e testes de rotas.

Endpoints disponiveis:

```text
GET /api/movimentacoes-estoque
GET /api/movimentacoes-estoque?produtoId=<produtoId>
GET /api/movimentacoes-estoque?tipo=entrada
POST /api/movimentacoes-estoque
```

## Regras principais

- `entrada`: soma `quantidade` ao estoque atual do produto.
- `saida`: subtrai `quantidade` e bloqueia estoque negativo.
- `ajuste`: define o estoque final informado em `estoqueFinal`.
- Toda movimentacao salva estoque anterior, estoque posterior, produto, SKU, motivo e origem.

## Proximos passos

- Integrar baixa automatica de pecas usadas na OS/manutencao.
- Amarrar movimentacoes de origem `ordem_servico` ao fechamento ou etapa tecnica da OS.
