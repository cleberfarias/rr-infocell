# Modulo vendas

Fecha o caixa de uma OS pronta para retirada e registra venda direta sem OS.

## Endpoints

- `GET /api/vendas?ordemServicoId=<id>` lista vendas.
- `POST /api/vendas` finaliza uma venda vinculada a OS ou uma venda direta com `itens`.

## Regras

- Somente OS com status `pronto_para_retirada` pode ser finalizada.
- `valorRecebido` deve ser maior ou igual ao total da OS.
- Ao finalizar, a OS passa para `entregue`, recebe dados de pagamento e a venda salva valor, forma de pagamento e troco.
- Cada finalizacao gera evento de OS do tipo `venda`.
- Venda direta aceita carrinho de produtos, acessorios, servicos e celulares.
- Celular em venda direta deve ser vendido individualmente e preserva o IMEI no item da venda.
- Produtos e acessorios geram movimentacao de estoque do tipo `saida` com origem `venda`.
- Servicos avulsos entram no total da venda sem movimentar estoque fisico.
- Garantia por item usa `garantiaDias` informado na venda ou o padrao cadastrado no produto.
- A colecao Firestore usada e `vendas`.
