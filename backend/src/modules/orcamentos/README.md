# Modulo orcamentos

Registra o snapshot comercial de uma OS no momento de envio, aprovacao ou reprovacao.

## Endpoints

- `GET /api/orcamentos?ordemServicoId=<id>` lista orcamentos.
- `POST /api/orcamentos` cria ou atualiza o ultimo orcamento da OS.

## Regras

- O orcamento copia numero da OS, cliente, aparelho, diagnostico, pecas, mao de obra e total.
- Status suportados: `rascunho`, `enviado`, `aprovado`, `reprovado`.
- Cada alteracao gera evento de OS do tipo `orcamento`.
- A colecao Firestore usada e `orcamentos`.
