# Modulo vendas

Fecha o caixa de uma OS pronta para retirada.

## Endpoints

- `GET /api/vendas?ordemServicoId=<id>` lista vendas.
- `POST /api/vendas` finaliza uma venda vinculada a OS.

## Regras

- Somente OS com status `pronto_para_retirada` pode ser finalizada.
- `valorRecebido` deve ser maior ou igual ao total da OS.
- Ao finalizar, a OS passa para `entregue`, recebe dados de pagamento e a venda salva valor, forma de pagamento e troco.
- Cada finalizacao gera evento de OS do tipo `venda`.
- A colecao Firestore usada e `vendas`.
