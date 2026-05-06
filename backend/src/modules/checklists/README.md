# Modulo Checklists

## Objetivo

Registrar o estado tecnico do aparelho na entrada da ordem de servico. O checklist reduz conflito com o cliente e cria uma base objetiva para o tecnico.

## Status atual

CRUD implementado com validacao, service, repository em memoria/Firestore e testes de rotas.

A tela frontend de checklist esta integrada com OS real, upload de fotos no Firebase Storage, impressao limpa para papel e preenchimento do atendente pelo usuario logado.

Ao criar um checklist, o backend dispara uma mensagem automatica pelo WhatsApp para o cliente da OS com resumo dos itens com defeito, quantidade de fotos anexadas e observacoes gerais. A automacao e best effort: se o WhatsApp estiver desconectado, o checklist continua sendo salvo.

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
      "fotos": [
        {
          "nome": "frente.jpg",
          "url": "https://firebasestorage.googleapis.com/...",
          "path": "ordensServico/ordem-id/frente.jpg",
          "contentType": "image/jpeg",
          "uploadedAt": "2026-04-29T00:00:00.000Z"
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
- Fotos enviadas ao Storage devem ser persistidas no checklist como metadados.
- Checklist deve ser criado na entrada do aparelho e poder ser revisado durante a manutencao.
- Checklist criado deve notificar o cliente pelo WhatsApp quando houver telefone cadastrado e conexao ativa.

## Upload e impressao

Fotos do checklist sao enviadas pelo frontend para o caminho:

```text
ordensServico/{ordemId}/{timestamp}-{nome-do-arquivo}
```

O upload exige usuario autenticado no Firebase Auth com custom claim `role` igual a `admin`, `atendente` ou `tecnico`. O bucket tambem precisa estar com CORS liberado para o frontend local e para o Firebase Hosting.

O botao `Imprimir` da tela de checklist chama a impressao do navegador e usa uma versao propria para papel, sem menu lateral, botoes ou campos interativos.

## Validacao

```bash
npm run build
npm test
```

## Proximos passos

- Implementar exclusao fisica da imagem no Storage quando remover foto do checklist.
- Melhorar assinatura do cliente/atendente com captura digital.
