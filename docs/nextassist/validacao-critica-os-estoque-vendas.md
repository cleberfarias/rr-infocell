# Validacao Critica Consolidada — OS, Estoque e Vendas (Fase 8.7.5)

## 1. Objetivo

Esta validacao confirma que os fluxos mais criticos do sistema continuam funcionando corretamente apos a persistencia de `tenantId` no backend (Fases 8.7.1 a 8.7.4).

Nao ha alteracao de codigo nesta fase. O objetivo e executar os cenarios de ponta a ponta e registrar os resultados antes de avancar para qualquer filtro por `tenantId` em queries/listagens (Fase 8.8).

**Entidades validadas:**
- Ordens de Servico (OS)
- Movimentacoes de Estoque (manuais e automaticas)
- Vendas/PDV (direta e vinculada a OS)

---

## 2. Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Branch `nextassist-saas` atualizada | | `git pull origin nextassist-saas` |
| Build do backend passando | | `cd backend && npm run build` |
| Backend rodando em staging/local (NAO producao) | | `PORT=3333 NODE_ENV=development node dist/server.js` |
| Firestore do projeto staging acessivel | | Console Firebase — projeto staging |
| Ambiente confirmado como staging (NAO producao) | | Verificar `FIREBASE_PROJECT_ID` no `.env` |
| Cliente e aparelho existentes no staging | | Necessarios para criar OS |
| Produto com estoque > 0 disponivel | | Necessario para OS com peca e venda direta |
| OS em status `pronto_para_retirada` disponivel ou criada durante o teste | | Para venda vinculada a OS |
| Rollback conhecido | | Sabe como reverter commit ou remover campo se necessario |

**ATENCAO: nao executar nenhum teste contra o banco de producao.**

---

## 3. Validacao de Ordens de Servico

### 3.1 OS sem peca

```bash
CLIENTE_ID=$(curl -s "http://localhost:3333/api/clientes?limit=1" | jq -r '.data[0].id')
APARELHO_ID=$(curl -s "http://localhost:3333/api/aparelhos?clienteId=$CLIENTE_ID&limit=1" | jq -r '.data[0].id')

curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Validacao 8.7.5 OS sem peca\",
    \"tipoSenha\": \"sem_senha\"
  }" | jq '{id, numero, status, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `tenantId: "rr-infocell"` no Firestore (colecao `ordensServico`) | | |
| `status: "recebido"` correto | | |

---

### 3.2 Editar OS

```bash
# Substitua <os-id> pelo id da OS criada acima
curl -s -X PUT http://localhost:3333/api/ordens-servico/<os-id> \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Validacao 8.7.5 OS editada\",
    \"tipoSenha\": \"sem_senha\",
    \"status\": \"em_analise\"
  }" | jq '{status, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| PUT retorna 200 | | |
| `tenantId: "rr-infocell"` preservado na response | | |
| `status: "em_analise"` atualizado | | |

---

### 3.3 OS com peca (cenario critico)

```bash
PRODUTO_ID=$(curl -s "http://localhost:3333/api/produtos" \
  | jq -r '[.data[] | select(.estoqueAtual > 0)] | .[0].id')
ESTOQUE_ANTES=$(curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" | jq '.data.estoqueAtual')
echo "Produto: $PRODUTO_ID | Estoque antes: $ESTOQUE_ANTES"

OS_COM_PECA=$(curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Validacao 8.7.5 OS com peca\",
    \"tipoSenha\": \"sem_senha\",
    \"pecasUsadas\": [{
      \"produtoId\": \"$PRODUTO_ID\",
      \"quantidade\": 1,
      \"valorUnitario\": 100
    }]
  }")
OS_COM_PECA_ID=$(echo $OS_COM_PECA | jq -r '.data.id')
echo $OS_COM_PECA | jq '{id, numero, tenantId, valorPecas}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na OS | | |
| `valorPecas` calculado corretamente | | |
| Estoque do produto reduzido em 1 | | |
| Movimentacao automatica gerada com `origem: "ordem_servico"` | | |
| Movimentacao automatica tem `tenantId: "rr-infocell"` | | |

```bash
# Verificar estoque apos OS
curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID" | jq '.data.estoqueAtual'
# Deve ser: $ESTOQUE_ANTES - 1

# Verificar movimentacao automatica
curl -s "http://localhost:3333/api/movimentacoes-estoque?produtoId=$PRODUTO_ID" \
  | jq '[.data[] | select(.ordemServicoId == "'$OS_COM_PECA_ID'")] | .[0] | {tipo, origem, tenantId, quantidade}'
```

---

## 4. Validacao de Movimentacoes Manuais de Estoque

```bash
PRODUTO_ID_MOV=$(curl -s "http://localhost:3333/api/produtos" \
  | jq -r '[.data[] | select(.estoqueAtual > 2)] | .[0].id')
ESTOQUE_MOV=$(curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID_MOV" | jq '.data.estoqueAtual')
echo "Produto: $PRODUTO_ID_MOV | Estoque: $ESTOQUE_MOV"
```

### 4.1 Entrada manual

```bash
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d "{
    \"produtoId\": \"$PRODUTO_ID_MOV\",
    \"tipo\": \"entrada\",
    \"quantidade\": 3,
    \"motivo\": \"Validacao 8.7.5 entrada manual\"
  }" | jq '{id, tipo, origem, estoqueAnterior, estoquePosterior, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `tenantId: "rr-infocell"` no Firestore (colecao `movimentacoesEstoque`) | | |
| `origem: "manual"` | | |
| `estoquePosterior` = `estoqueAnterior` + 3 | | |

---

### 4.2 Saida manual

```bash
curl -s -X POST http://localhost:3333/api/movimentacoes-estoque \
  -H "Content-Type: application/json" \
  -d "{
    \"produtoId\": \"$PRODUTO_ID_MOV\",
    \"tipo\": \"saida\",
    \"quantidade\": 1,
    \"motivo\": \"Validacao 8.7.5 saida manual\"
  }" | jq '{id, tipo, origem, estoqueAnterior, estoquePosterior, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `origem: "manual"` | | |
| `estoquePosterior` = `estoqueAnterior` - 1 | | |

```bash
# Verificar saldo final
curl -s "http://localhost:3333/api/produtos/$PRODUTO_ID_MOV" | jq '.data.estoqueAtual'
# Deve ser: $ESTOQUE_MOV + 3 - 1
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| `estoqueAtual` do produto correto apos entrada e saida | | |

---

## 5. Validacao de Vendas/PDV

### 5.1 Venda direta

```bash
PRODUTO_VENDA=$(curl -s "http://localhost:3333/api/produtos" \
  | jq -r '[.data[] | select(.estoqueAtual > 0 and .categoria != "servico")] | .[0]')
PRODUTO_VENDA_ID=$(echo $PRODUTO_VENDA | jq -r '.id')
PRODUTO_VENDA_PRECO=$(echo $PRODUTO_VENDA | jq '.precoVenda')
echo "Produto: $PRODUTO_VENDA_ID | Preco: $PRODUTO_VENDA_PRECO"

curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d "{
    \"itens\": [{
      \"produtoId\": \"$PRODUTO_VENDA_ID\",
      \"quantidade\": 1
    }],
    \"formaPagamento\": \"pix\",
    \"valorRecebido\": $PRODUTO_VENDA_PRECO
  }" | jq '{id, tipo, status, valorTotal, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` na response | | |
| `tenantId: "rr-infocell"` no Firestore (colecao `vendas`) | | |
| `tipo: "direta"`, `status: "finalizada"` | | |
| Estoque do produto reduzido em 1 | | |
| `troco` calculado corretamente | | |

---

### 5.2 Venda vinculada a OS (opcional — requer OS pronto_para_retirada)

Para criar uma OS pronto_para_retirada para este teste:

```bash
# Passo 1 — criar OS com mao de obra
OS_PDV=$(curl -s -X POST http://localhost:3333/api/ordens-servico \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Validacao 8.7.5 OS PDV\",
    \"tipoSenha\": \"sem_senha\",
    \"valorMaoObra\": 150
  }")
OS_PDV_ID=$(echo $OS_PDV | jq -r '.data.id')

# Passo 2 — colocar em pronto_para_retirada
curl -s -X PUT http://localhost:3333/api/ordens-servico/$OS_PDV_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"aparelhoId\": \"$APARELHO_ID\",
    \"defeitoRelatado\": \"Validacao 8.7.5 OS PDV\",
    \"tipoSenha\": \"sem_senha\",
    \"valorMaoObra\": 150,
    \"status\": \"pronto_para_retirada\"
  }" | jq '{status, tenantId}'

# Passo 3 — criar venda via OS
curl -s -X POST http://localhost:3333/api/vendas \
  -H "Content-Type: application/json" \
  -d "{
    \"ordemServicoId\": \"$OS_PDV_ID\",
    \"formaPagamento\": \"pix\",
    \"valorRecebido\": 150
  }" | jq '{id, tipo, ordemServicoId, status, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST /vendas retorna 201 | | |
| `tipo: "ordem_servico"` | | |
| `tenantId: "rr-infocell"` na venda | | |
| OS atualizada para `status: "entregue"` | | |
| Evento de venda criado na OS | | |

---

### 5.3 Verificar listagem de vendas

```bash
curl -s http://localhost:3333/api/vendas | jq '{total: (.data | length), http: "200 OK"}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Vendas anteriores (sem tenantId) continuam visiveis | | |

---

## 6. Validacao Cruzada

| Cenario | Resultado | Observacao |
| --- | --- | --- |
| Produto usado em OS continua com saldo correto | | |
| Produto vendido continua com saldo correto | | |
| Movimentacoes automaticas (origem `ordem_servico`) aparecem na listagem | | |
| Movimentacoes manuais (origem `manual`) aparecem na listagem | | |
| OS, venda e movimentacao possuem `tenantId: "rr-infocell"` | | |
| Registros antigos sem `tenantId` continuam visiveis nas listagens | | |
| GET /ordens-servico retorna 200 sem erro | | |
| GET /movimentacoes-estoque retorna 200 sem erro | | |
| GET /vendas retorna 200 sem erro | | |
| GET /produtos retorna 200 com estoques corretos | | |

```bash
# Verificacao rapida de todos os endpoints criticos
for endpoint in ordens-servico movimentacoes-estoque vendas produtos; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

---

## 7. Verificacao no Firestore

Para cada collection abaixo, localizar um documento criado apos a Fase 8.7 e confirmar o campo `tenantId`:

| Collection | Campo esperado | Como verificar |
| --- | --- | --- |
| `ordensServico` | `tenantId: "rr-infocell"` | Console Firebase → colecao `ordensServico` → documento recente |
| `movimentacoesEstoque` | `tenantId: "rr-infocell"` | Console Firebase → colecao `movimentacoesEstoque` → documento recente |
| `vendas` | `tenantId: "rr-infocell"` | Console Firebase → colecao `vendas` → documento recente |
| `ordemEventos` | `tenantId: "rr-infocell"` | Console Firebase → colecao `ordemEventos` → documento recente |

**Documentos antigos (criados antes da Fase 8.7):** nao possuem `tenantId` — isso e esperado. A migracao de dados existentes sera tratada em fase separada.

---

## 8. Criterios de Aprovacao

A fase 8.7.5 so e considerada aprovada quando TODOS os itens abaixo forem verificados:

- [ ] OS sem peca cria com `tenantId: "rr-infocell"` no Firestore
- [ ] OS editada preserva `tenantId`
- [ ] OS com peca cria com `tenantId: "rr-infocell"` e dispara baixa de estoque correta
- [ ] Movimentacao automatica da OS tem `tenantId: "rr-infocell"`
- [ ] Movimentacao manual de entrada tem `tenantId: "rr-infocell"` e saldo correto
- [ ] Movimentacao manual de saida tem `tenantId: "rr-infocell"` e saldo correto
- [ ] Venda direta tem `tenantId: "rr-infocell"` e reduz estoque
- [ ] Venda vinculada a OS tem `tenantId: "rr-infocell"` e atualiza OS para entregue
- [ ] Nenhuma listagem (OS, movimentacoes, vendas, produtos) retornou erro
- [ ] Nenhum endpoint retornou 400, 422 ou 500
- [ ] Nenhuma regra de calculo foi alterada (saldo, desconto, troco, valorTotal)
- [ ] Registros antigos sem `tenantId` continuam visiveis

---

## 9. Criterios de Bloqueio

**Nao avancar para a Fase 8.8 se:**

- Venda falhar (400/422/500)
- OS com peca falhar ou nao disparar baixa de estoque
- Saldo de estoque inconsistente apos qualquer operacao
- `tenantId` nao for salvo em qualquer das collections validadas
- Listagem de qualquer entidade retornar erro
- Calculo de valores (troco, valorTotal, saldo devedor) apresentar resultado errado
- OS nao transitar de status corretamente na venda

**Acao em caso de bloqueio:**
1. Identificar qual entidade ou fluxo falhou
2. Anotar o erro exato (status HTTP, mensagem, campo afetado)
3. Nao avancar com outras fases ate entender e resolver o problema
4. Documentar o erro e a correcao antes de retomar

---

## 10. Resultado da Validacao

| Secao | Status | Data | Observacao |
| --- | --- | --- | --- |
| 3.1 OS sem peca | | | |
| 3.2 OS editada | | | |
| 3.3 OS com peca | | | |
| 4.1 Movimentacao entrada manual | | | |
| 4.2 Movimentacao saida manual | | | |
| 5.1 Venda direta | | | |
| 5.2 Venda via OS | | | |
| 6. Validacao cruzada | | | |
| 7. Firestore confirmado | | | |

**Data de execucao:** ___/___/______

**Executado por:** ___________________________

**Ambiente staging:** ___________________________

**Status geral:** [ ] Aprovado [ ] Reprovado (preencher ao final)

---

## 11. Proxima Fase — 8.8

**Condicao de entrada:** todos os criterios de aprovacao desta fase atendidos e registrados.

**Objetivo da Fase 8.8:** planejar e implementar filtros por `tenantId` em listagens, comecando pela entidade de menor risco.

Candidatos para Fase 8.8 (por ordem de risco crescente):

| Entidade | Risco | Observacao |
| --- | --- | --- |
| `marcas` | Baixo | Entidade de referencia, sem acoplamento financeiro |
| `categorias` | Baixo | Idem |
| `clientes` | Medio | Listagem usada em formulario de OS |
| `produtos` | Medio | Listagem usada em OS, PDV e orcamento |
| `movimentacoes-estoque` | Alto | Historico financeiro |
| `ordens-servico` | Alto | Acoplada com estoque e vendas |
| `vendas` | Alto | Acoplada com OS e financeiro |

**Regras para a Fase 8.8:**
- Comecar por apenas uma entidade simples (marcas ou categorias)
- Filtro deve ser `where("tenantId", "==", tenantId)` — simples, sem compostos
- Validar em staging que registros sem `tenantId` ficam ocultos (comportamento esperado)
- Nao aplicar filtro em entidades criticas sem validacao separada
- Nao mexer em relatorios, impressao ou financeiro
