# Modulo Despesas

Gerencia despesas operacionais da loja para alimentar a tela de despesas e o financeiro simples.

## Endpoints

```text
GET /api/despesas
GET /api/despesas?q=internet
GET /api/despesas?categoria=luz
GET /api/despesas?pago=true
GET /api/despesas/:id
POST /api/despesas
PUT /api/despesas/:id
DELETE /api/despesas/:id
```

## Campos principais

- `descricao`
- `categoria`: `aluguel`, `agua`, `luz`, `internet`, `telefone`, `salarios`, `marketing`, `impostos` ou `outros`
- `fornecedor`
- `valor`
- `vencimento`
- `recorrente`
- `pago`
- `pagoEm`

## Regras

- Valor deve ser maior que zero.
- Ao marcar uma despesa como paga pela primeira vez, o backend preenche `pagoEm`.
- A colecao Firestore usada e `despesas`.
- O campo `vencimento` alimenta a competencia do financeiro. Formatos aceitos pelo frontend financeiro: `dd/mm`, `dd/mm/aaaa` e `aaaa-mm-dd`.
- Despesa nao recorrente e considerada no DRE somente uma vez, quando o vencimento cai dentro do periodo selecionado.
- Despesa recorrente e considerada mensalmente a partir do primeiro vencimento informado.
- Despesas com vencimento futuro nao devem ser descontadas do lucro liquido de periodos anteriores.
