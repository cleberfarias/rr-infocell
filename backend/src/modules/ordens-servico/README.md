# Modulo Ordens de Servico

## Objetivo

Gerenciar o fluxo central do sistema: abertura, acompanhamento, manutencao, conclusao e entrega das ordens de servico.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore, numero sequencial e testes de rotas.

Endpoints disponiveis:

```text
GET /api/ordens-servico
GET /api/ordens-servico?q=carrega
GET /api/ordens-servico?status=recebido
GET /api/ordens-servico?clienteId=cli_marcos_almeida
GET /api/ordens-servico/:id
POST /api/ordens-servico
PUT /api/ordens-servico/:id
DELETE /api/ordens-servico/:id
```

Resposta de listagem:

```json
{
  "data": [
    {
      "id": "ordem-id",
      "numero": 1,
      "clienteId": "cli_marcos_almeida",
      "aparelhoId": "apa_iphone_11_marcos",
      "defeitoRelatado": "Aparelho nao carrega",
      "status": "recebido",
      "tecnicoResponsavel": "Rafael S.",
      "valorPecas": 0,
      "valorMaoObra": 0,
      "valorTotal": 0,
      "entradaEm": "2026-04-29T00:00:00.000Z",
      "createdAt": "2026-04-29T00:00:00.000Z",
      "updatedAt": "2026-04-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "query": "",
    "status": "",
    "clienteId": "",
    "aparelhoId": ""
  }
}
```

## Campos previstos

- `id`
- `numero`
- `clienteId`
- `aparelhoId`
- `checklistId`
- `defeitoRelatado`
- `diagnostico`
- `status`
- `tecnicoResponsavel`
- `valorPecas`
- `valorMaoObra`
- `valorTotal`
- `entradaEm`
- `previsaoEntregaEm`
- `concluidaEm`
- `entregueEm`
- `createdAt`
- `updatedAt`

## Status previstos

- `recebido`
- `em_analise`
- `aguardando_aprovacao`
- `aguardando_peca`
- `em_manutencao`
- `pronto_para_retirada`
- `entregue`
- `cancelado`

## Regras previstas

- Toda OS deve estar vinculada a um cliente existente e a um aparelho existente.
- O aparelho deve pertencer ao cliente informado.
- Numero da OS e sequencial e gerado pelo backend.
- `valorTotal` e calculado pelo backend a partir de pecas e mao de obra.
- Ao marcar como `pronto_para_retirada`, o backend registra `concluidaEm`.
- Ao marcar como `entregue`, o backend registra `entregueEm`.
- OS entregue ou cancelada nao aceita edicoes operacionais.

## Validacao

```bash
npm run build
npm test
```

## Proximos passos

- Integrar tela de Nova OS com a API.
- Trocar listagem de ordens do frontend de mock para dados reais.
- Vincular checklist tecnico a uma OS real.
