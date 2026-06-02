# Validacao Final — Listagens Filtradas por tenantId (Fase 8.8.9)

## 1. Objetivo

Esta fase confirma que todas as listagens principais do backend estao filtrando por `tenantId` e que o sistema esta pronto para uma decisao consciente sobre migracao de dados antigos. Nenhum codigo foi alterado nesta fase — o objetivo e validar em staging e documentar decisoes antes de qualquer script de migracao ou deploy para producao.

---

## 2. Estado atual dos filtros

| Entidade | Fase | Persistencia ativa? | Listagem filtrada? | Antigos sem tenantId aparecem? | Observacao |
| --- | --- | --- | --- | --- | --- |
| marcas | 8.2 / 8.8.1 | Sim | Sim | **Nao** | Marcas padrao (hardcoded) sempre aparecem |
| categorias | 8.3 / 8.8.2 | Sim | Sim | **Nao** | Categorias padrao (hardcoded) sempre aparecem |
| clientes | 8.4 / 8.8.3 | Sim | Sim | **Nao** | Voltam ao editar — `update()` aplica tenantId |
| produtos | 8.5 / 8.8.4 | Sim | Sim | **Nao** | Voltam ao editar — `update()` aplica tenantId |
| despesas | 8.6 / 8.8.5 | Sim | Sim | **Nao** | Voltam ao editar — `update()` aplica tenantId |
| contas | 8.6 / 8.8.5 | Sim | Sim | **Nao** | **Nao voltam ao editar** — PUT parcial nao injeta tenantId |
| movimentacoes-estoque | 8.7.2 / 8.8.6 | Sim | Sim | **Nao** | Imutaveis — sem `update()`, migracao requer script |
| ordens-servico | 8.7.3 / 8.8.7 | Sim | Sim | **Nao** | Voltam ao editar — `update()` aplica tenantId |
| vendas | 8.7.4 / 8.8.8 | Sim | Sim | **Nao** | Append-only — sem `update()`, migracao requer script |

---

## 3. Checklist geral de validacao

Para cada entidade abaixo, executar em staging antes de aprovar esta fase.

### Marcas

```bash
curl -s -X POST http://localhost:3333/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Marca Final Tenant 889"}' | jq '{id, tenantId, nome}'

curl -s "http://localhost:3333/api/marcas" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Marca nova aparece na listagem | |
| Marcas padrao presentes | |
| Marcas antigas sem tenantId NAO aparecem entre as customizadas | |

---

### Categorias

```bash
curl -s -X POST http://localhost:3333/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome": "Categoria Final Tenant 889"}' | jq '{id, tenantId, nome}'

curl -s "http://localhost:3333/api/categorias" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Categoria nova aparece na listagem | |
| Categorias padrao presentes | |

---

### Clientes

```bash
curl -s -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Final Tenant 889", "telefone": "11999990889"}' | jq '{id, tenantId}'

curl -s "http://localhost:3333/api/clientes" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/clientes?q=Final" | jq '.data[0] | {nome, tenantId}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Cliente aparece na listagem | |
| Clientes antigos sem tenantId NAO aparecem | |

---

### Produtos

```bash
curl -s -X POST http://localhost:3333/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "VAL-889",
    "nome": "Produto Final Tenant 889",
    "categoria": "peca",
    "estoqueAtual": 1,
    "estoqueMinimo": 0,
    "custo": 10,
    "precoVenda": 20
  }' | jq '{id, tenantId, estoqueAtual}'

curl -s "http://localhost:3333/api/produtos" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/produtos?categoria=peca" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Produto aparece na listagem | |
| Filtros categoria/busca funcionam | |
| Produtos antigos sem tenantId NAO aparecem | |

---

### Despesas

```bash
curl -s -X POST http://localhost:3333/api/despesas \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Despesa Final Tenant 889",
    "categoria": "outros",
    "valor": 89,
    "vencimento": "01/08",
    "recorrente": false,
    "pago": false
  }' | jq '{id, tenantId, descricao}'

curl -s "http://localhost:3333/api/despesas" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Despesa aparece na listagem | |
| Filtros categoria/pago funcionam | |
| Despesas antigas sem tenantId NAO aparecem | |

---

### Contas

```bash
curl -s -X POST http://localhost:3333/api/contas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Conta Final Tenant 889", "tipo": "caixa", "saldo": 0}' \
  | jq '{id: .data.id, tenantId: .data.tenantId, nome: .data.nome}'

curl -s "http://localhost:3333/api/contas" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Conta aparece na listagem | |
| Contas antigas sem tenantId NAO aparecem | |

---

### Movimentacoes de Estoque

```bash
PRODUTO_ID=$(curl -s "http://localhost:3333/api/produtos" | jq -r '.data[0].id')

curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d "{
    \"produtoId\": \"$PRODUTO_ID\",
    \"tipo\": \"entrada\",
    \"quantidade\": 2,
    \"motivo\": \"Validacao final tenant 889\"
  }" | jq '{id, tenantId, tipo, origem}'

curl -s "http://localhost:3333/api/movimentacoes-estoque" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/movimentacoes-estoque?tipo=entrada" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Movimentacao aparece na listagem | |
| Filtros produtoId/tipo funcionam | |
| Movimentacoes antigas sem tenantId NAO aparecem | |

---

### Ordens de Servico

```bash
CLIENTE_ID=$(curl -s "http://localhost:3333/api/clientes" | jq -r '.data[0].id')

curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"defeitoRelatado\": \"Validacao final tenant 889\",
    \"status\": \"recebido\",
    \"valorMaoObra\": 0
  }" | jq '{id, numero, tenantId, status}'

curl -s "http://localhost:3333/api/ordens-servico" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/ordens-servico?status=recebido" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` e numero sequencial | |
| OS aparece na listagem | |
| Filtros status/clienteId funcionam | |
| OS antigas sem tenantId NAO aparecem | |

---

### Vendas

```bash
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"direta\",
    \"itens\": [{\"produtoId\": \"$PRODUTO_ID\", \"quantidade\": 1}],
    \"formaPagamento\": \"pix\",
    \"valorRecebido\": 999
  }" | jq '{id, tenantId, tipo, valorTotal, status}'

curl -s "http://localhost:3333/api/vendas" | jq '{total: (.data | length)}'
curl -s "http://localhost:3333/api/vendas?status=finalizada" | jq '{total: (.data | length)}'
```

| Resultado esperado | Resultado |
| --- | --- |
| POST 201 com `tenantId: "rr-infocell"` | |
| Venda aparece na listagem | |
| Filtro por status funciona | |
| Vendas antigas sem tenantId NAO aparecem | |

---

### Endpoints criticos — nenhum deve retornar erro

```bash
for endpoint in marcas categorias clientes produtos despesas contas movimentacoes-estoque ordens-servico vendas; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

| Endpoint | Resultado esperado | Resultado |
| --- | --- | --- |
| GET /marcas | 200 | |
| GET /categorias | 200 | |
| GET /clientes | 200 | |
| GET /produtos | 200 | |
| GET /despesas | 200 | |
| GET /contas | 200 | |
| GET /movimentacoes-estoque | 200 | |
| GET /ordens-servico | 200 | |
| GET /vendas | 200 | |
| Nenhum 400/422/500 | — | |

---

## 4. Entidades com retorno via edicao (update com fallback)

Para as entidades abaixo, registros antigos sem `tenantId` voltam a aparecer na listagem automaticamente ao serem editados. O `update()` aplica `current.tenantId ?? DEFAULT_TENANT_ID`, sem necessidade de script.

| Entidade | Comportamento ao editar |
| --- | --- |
| clientes | Editar qualquer campo (nome, telefone, observacoes) aplica `tenantId` |
| produtos | Editar qualquer campo (nome, preco, estoque) aplica `tenantId` |
| despesas | Editar qualquer campo (valor, vencimento, pago) aplica `tenantId` |
| ordens-servico | Editar qualquer campo ou mudar status aplica `tenantId` |

**Validar para cada entidade com registros antigos relevantes:**

```bash
# Exemplo: editar cliente antigo sem tenantId
curl -s -X PUT http://localhost:3333/api/clientes/<id-cliente-antigo> \
  -H "Content-Type: application/json" \
  -d '{"nome": "<nome-atual>", "telefone": "<telefone-atual>"}' | jq '{id, tenantId}'

# Verificar que aparece na listagem apos edicao
curl -s "http://localhost:3333/api/clientes?q=<nome-atual>" | jq '.data[0] | {nome, tenantId}'
```

---

## 5. Entidades imutaveis ou sem injecao no update

Para as entidades abaixo, registros antigos sem `tenantId` **nao voltam naturalmente** e requerem migracao controlada.

### Movimentacoes de estoque

- Nao existe `update()` — registros sao imutaveis por design
- Movimentacoes antigas ficam ocultas permanentemente na listagem filtrada
- Continuam acessiveis via Firestore Console para consulta manual
- Para recuperar: script que adiciona `tenantId: "rr-infocell"` nos documentos sem o campo

### Vendas

- Nao existe `update()` — vendas sao append-only por design
- Vendas antigas ficam ocultas permanentemente na listagem filtrada
- Continuam acessiveis via Firestore Console para consulta manual
- Para recuperar: script que adiciona `tenantId: "rr-infocell"` nos documentos sem o campo

### Contas

- Existe PUT `/contas/:id`, mas usa `ref.update()` parcial — **nao injeta `tenantId`**
- Contas antigas nao voltam ao editar
- Para recuperar: script que adiciona `tenantId: "rr-infocell"` nos documentos sem o campo, ou alterar o PUT para injetar `tenantId` (avaliacao separada)

---

## 6. Validacao especifica: OS antigas e vendas vinculadas

Esta e a relacao de maior cuidado para qualquer plano de migracao.

### Cenario

```
OS antiga (sem tenantId) ←── vinculada ──→ Venda antiga (sem tenantId)
        ↓                                            ↓
  Fora da listagem                          Fora da listagem
  (8.8.7 filtrou)                           (8.8.8 filtrou)
```

### findByOrdem herda filtro de tenantId

`findByOrdem(ordemServicoId)` chama `list({ ordemServicoId, status: "finalizada" })` internamente. A query Firestore agora inclui `.where("tenantId", "==", DEFAULT_TENANT_ID)`.

Consequencia: para uma OS antiga sem `tenantId`, `findByOrdem` retorna `null`. O sistema entende que nao ha venda finalizada para aquela OS. Se o endpoint de criacao de venda for chamado com o ID dessa OS antiga via API (nao pela interface), o sistema poderia criar uma segunda venda com `tenantId`.

### Por que isso e seguro na pratica

- OS antiga sem `tenantId` nao aparece na listagem de OS (Fase 8.8.7)
- O fluxo padrao no PDV exige selecionar a OS da listagem filtrada
- A OS antiga so estaria acessivel via ID direto (busca `findById()`, que continua sem filtro)
- Para acionar o fluxo de duplicidade, seria necessario chamar o endpoint de criacao de venda com o ID da OS antiga diretamente via API — nao pelo fluxo normal da interface

### Regra para migracao futura

**Se OS antiga for migrada (receber tenantId), a venda vinculada a ela tambem deve ser migrada no mesmo script.**

Migrar a OS sem migrar a venda vinculada tornaria a OS visivel na listagem, mas `findByOrdem` ainda retornaria `null` (venda sem tenantId), permitindo criacao de venda duplicada com tenantId.

```
Correto:   migrar OS + venda juntas, no mesmo script
Incorreto: migrar so a OS (venda permanece oculta, findByOrdem retorna null)
```

---

## 7. Decisao de migracao

Preencher antes de avancar para qualquer script de migracao real.

| Entidade | Migrar antes da producao? | Pode ocultar historico antigo? | Precisa de script? | Prioridade |
| --- | --- | --- | --- | --- |
| marcas | A definir | A definir | Nao (voltam ao editar) | Baixa |
| categorias | A definir | A definir | Nao (voltam ao editar) | Baixa |
| clientes | A definir | A definir | Nao (voltam ao editar) | Media |
| produtos | A definir | A definir | Nao (voltam ao editar) | Media |
| despesas | A definir | A definir | Nao (voltam ao editar) | Media |
| contas | A definir | A definir | **Sim** (PUT nao injeta tenantId) | Alta |
| movimentacoes-estoque | A definir | A definir | **Sim** (imutaveis) | Alta |
| ordens-servico | A definir | A definir | Nao (voltam ao editar) ou Sim (em lote) | Alta |
| vendas | A definir | A definir | **Sim** (append-only) | Alta |

**Dependencia critica:** se houver decisao de migrar OS, o script deve migrar OS e suas vendas vinculadas no mesmo lote.

---

## 8. Criterios de aprovacao desta fase

A Fase 8.8.9 so e aprovada se **todos** os itens abaixo estiverem confirmados:

- [ ] Todos os endpoints de listagem retornam 200
- [ ] Nenhum endpoint retornou 400/422/500
- [ ] Novo registro de cada entidade aparece na listagem com `tenantId: "rr-infocell"`
- [ ] Registros antigos sem `tenantId` ficam fora da listagem (comportamento esperado)
- [ ] Entidades com `update()` voltam ao editar (confirmado em staging)
- [ ] Entidades imutaveis/sem injecao no update estao com impacto documentado
- [ ] Relacao OS-venda e dependencia de migracao conjunta estao documentadas
- [ ] Tabela de decisao de migracao foi preenchida pela equipe

---

## 9. Criterios de bloqueio

Nao avancar para script de migracao ou producao se:

- [ ] Algum novo registro com `tenantId` **nao aparece** na listagem → investigar antes de continuar
- [ ] Alguma listagem critica retorna 400/422/500 → bug a corrigir antes de continuar
- [ ] OS e venda vinculada ficarem inconsistentes pos-migracao parcial → revisar o script
- [ ] Historico antigo de movimentacoes/vendas for necessario para relatorios e ainda nao houver plano de migracao aprovado
- [ ] Producao for impactada sem janela de manutencao planejada

---

## 10. Proxima fase sugerida — Fase 8.9

**Objetivo:** Plano de migracao controlada de dados antigos sem tenantId.

Esta fase ainda e documentacao/plano — nenhum script e executado nela.

O que a Fase 8.9 deve conter:
- Lista de colecoes a migrar e respectivos volumes estimados (via Firestore Console)
- Estrategia do script: leitura em batch → filtrar documentos sem `tenantId` → adicionar campo → gravar
- Ordem de execucao: movimentacoes → vendas + OS (juntas) → contas → o restante (ja voltam ao editar)
- Rollback: como reverter se o script falhar (remover campo `tenantId` dos documentos afetados)
- Janela de execucao: quando executar (antes ou apos deploy para producao)
- Validacao pos-script: confirmar que documentos migrados aparecem nas listagens filtradas

**Regra da Fase 8.9:** nenhuma linha de codigo do backend ou frontend e alterada. O plano e o script de migracao sao entregaveis separados, revisados antes de executar em qualquer ambiente com dados reais.
