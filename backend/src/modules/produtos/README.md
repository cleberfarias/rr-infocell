# Modulo Produtos e Estoque

## Objetivo

Gerenciar o estoque basico de pecas, produtos e acessorios usados pela assistencia tecnica.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore e testes de rotas.
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
- `categoria`: `peca`, `produto`, `acessorio` ou `servico`
- `estoqueAtual`
- `estoqueMinimo`
- `custo`
- `precoVenda`
- `ativo`
- `observacoes`

## Proximos passos

- Integrar baixa de pecas usadas na OS/manutencao.
