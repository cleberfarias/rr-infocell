# Modulo Aparelhos

## Objetivo

Gerenciar os aparelhos vinculados aos clientes. Este modulo sera usado para manter dados tecnicos do aparelho e apoiar a abertura de ordens de servico.

## Status atual

Scaffold inicial.

Endpoint disponivel:

```text
GET /api/aparelhos
```

Resposta atual:

```json
{
  "data": [],
  "meta": {
    "module": "aparelhos",
    "status": "scaffold"
  }
}
```

## Campos previstos

- `id`
- `clienteId`
- `marca`
- `modelo`
- `cor`
- `imeiSerial`
- `estadoFisico`
- `acessorios`
- `observacoes`
- `createdAt`
- `updatedAt`

## Regras previstas

- Um aparelho deve pertencer a um cliente existente.
- IMEI/serial deve ser opcional, mas pesquisavel quando informado.
- Um cliente pode ter varios aparelhos.
- Aparelhos devem poder ser reutilizados em novas ordens de servico.

## Proximos passos

- Criar schema de validacao.
- Criar service e repository.
- Implementar CRUD.
- Integrar com Firestore.
- Criar testes de rotas.
