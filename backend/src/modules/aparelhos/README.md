# Modulo Aparelhos

## Objetivo

Gerenciar os aparelhos vinculados aos clientes. Este modulo sera usado para manter dados tecnicos do aparelho e apoiar a abertura de ordens de servico.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore e testes de rotas.

Endpoint disponivel:

```text
GET /api/aparelhos
```

Resposta de listagem:

```json
{
  "data": [
    {
      "id": "apa_iphone_11_marcos",
      "clienteId": "cli_marcos_almeida",
      "marca": "Apple",
      "modelo": "iPhone 11",
      "cor": "Preto",
      "imeiSerial": "356789012345678",
      "estadoFisico": "Tela com riscos leves",
      "acessorios": "Sem carregador",
      "createdAt": "2026-04-29T00:00:00.000Z",
      "updatedAt": "2026-04-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "query": "",
    "clienteId": ""
  }
}
```

Endpoints disponiveis:

```text
GET /api/aparelhos
GET /api/aparelhos?q=iphone
GET /api/aparelhos?clienteId=cli_marcos_almeida
GET /api/aparelhos/:id
POST /api/aparelhos
PUT /api/aparelhos/:id
DELETE /api/aparelhos/:id
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

## Validacao

```bash
npm run build
npm test
```

## Proximos passos

- Integrar tela de aparelhos no frontend.
- Usar aparelhos na abertura de ordem de servico.
