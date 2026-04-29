# Modulo Checklists

## Objetivo

Registrar o estado tecnico do aparelho na entrada da ordem de servico. O checklist reduz conflito com o cliente e cria uma base objetiva para o tecnico.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore e testes de rotas.

Endpoints disponiveis:

```text
GET /api/checklists
GET /api/checklists?ordemServicoId=<id>
GET /api/checklists?aparelhoId=<id>
GET /api/checklists/:id
POST /api/checklists
PUT /api/checklists/:id
DELETE /api/checklists/:id
```

Resposta de listagem:

```json
{
  "data": [
    {
      "id": "checklist-id",
      "ordemServicoId": "ordem-id",
      "aparelhoId": "aparelho-id",
      "itens": [
        {
          "nome": "Tela",
          "status": "funcionando"
        }
      ],
      "observacoesGerais": "Aparelho recebido sem carregador.",
      "criadoPor": "Camila O.",
      "createdAt": "2026-04-29T00:00:00.000Z",
      "updatedAt": "2026-04-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "ordemServicoId": "",
    "aparelhoId": ""
  }
}
```

## Campos previstos

- `id`
- `ordemServicoId`
- `aparelhoId`
- `itens`
- `observacoesGerais`
- `criadoPor`
- `createdAt`
- `updatedAt`

Cada item do checklist deve ter:

- `nome`
- `status`: `funcionando`, `com_defeito` ou `nao_testado`
- `observacao`

## Itens iniciais previstos

- Tela
- Touch
- Camera
- Microfone
- Alto-falante
- Botoes
- Conector de carga
- Wi-Fi
- Bluetooth
- Bateria

## Regras previstas

- Um checklist deve estar vinculado a uma ordem de servico existente.
- O aparelho do checklist deve ser o mesmo aparelho vinculado a OS.
- Cada item deve registrar um status tecnico.
- Checklist deve ser criado na entrada do aparelho e poder ser revisado durante a manutencao.

## Validacao

```bash
npm run build
npm test
```

## Proximos passos

- Integrar tela de checklist com OS real.
- Abrir checklist pelo botao da listagem de ordens.
