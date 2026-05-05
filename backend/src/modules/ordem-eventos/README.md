# Modulo ordem-eventos

Registra a linha do tempo operacional de uma ordem de servico.

## Endpoints

- `GET /api/ordem-eventos?ordemServicoId=<id>` lista eventos de uma OS.
- `POST /api/ordem-eventos` cria comentario, diagnostico, status, orcamento ou venda.

## Regras

- Todo evento deve estar vinculado a uma OS existente.
- Eventos sao ordenados por `createdAt` desc.
- A colecao Firestore usada e `ordemEventos`.
