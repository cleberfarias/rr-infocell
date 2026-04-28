# Modulo Checklists

## Objetivo

Registrar o estado tecnico do aparelho na entrada da ordem de servico. O checklist reduz conflito com o cliente e cria uma base objetiva para o tecnico.

## Status atual

Scaffold inicial.

Endpoint disponivel:

```text
GET /api/checklists
```

Resposta atual:

```json
{
  "data": [],
  "meta": {
    "module": "checklists",
    "status": "scaffold"
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

- Um checklist deve estar vinculado a uma ordem de servico.
- Cada item deve registrar um status tecnico.
- Checklist deve ser criado na entrada do aparelho e poder ser revisado durante a manutencao.

## Proximos passos

- Criar schema de validacao.
- Criar modelo dos itens.
- Implementar CRUD vinculado a OS.
- Integrar com Firestore.
- Criar testes de rotas.
