# Validacao Intermediaria — Persistencia tenantId no Backend (Fase 8.6.1)

## 1. Objetivo

Esta validacao confirma que as entidades ja alteradas no backend estao persistindo `tenantId: "rr-infocell"` corretamente no Firestore staging, antes de avancar para entidades criticas como OS, movimentacoes de estoque e vendas.

Nenhum codigo foi alterado nesta fase. O objetivo e unicamente executar testes manuais e registrar os resultados.

**Criterio de avanco:** todas as entidades desta lista devem estar aprovadas antes de iniciar a Fase 8.7 (OS, eventos, movimentacoes, vendas).

---

## 2. Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Branch `nextassist-saas` atualizada e sincronizada | | `git pull origin nextassist-saas` |
| Build do backend passando | | `cd backend && npm run build` |
| Backend rodando em staging/local (NAO producao) | | `PORT=3333 NODE_ENV=development node dist/server.js` |
| Firestore do projeto staging acessivel | | Console Firebase → projeto de staging |
| Ambiente confirmado como staging (NAO producao) | | Verificar `FIREBASE_PROJECT_ID` no `.env` |
| Rollback conhecido | | Sabe como reverter commit ou remover campo se necessario |

**ATENCAO: nao executar nenhum teste contra o banco de producao.**

---

## 3. Checklist por entidade

### 3.1 Marcas

**Endpoint:** `POST /api/marcas`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Validacao Tenant Marca"}' | jq .
```

**Response esperada:** status 201, `data.id` presente, `data.nome` correto.

**Verificar no Firestore:** `marcas/<id-retornado>` deve conter:
```
nome: "Validacao Tenant Marca"
criadoEm: "<timestamp>"
tenantId: "rr-infocell"
```

**Listagem:**
```bash
curl -s http://localhost:3333/api/marcas | jq '.data | length'
```
Deve retornar numero maior que zero sem erro.

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` no Firestore | | |
| GET /marcas retorna 200 | | |
| Marcas anteriores (sem tenantId) continuam visiveis | | |

---

### 3.2 Categorias

**Endpoint:** `POST /api/categorias`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome": "Validacao Tenant Cat"}' | jq .
```

**Response esperada:** status 201, `data.id` presente.

**Verificar no Firestore:** `categorias/<id-retornado>` deve conter:
```
nome: "Validacao Tenant Cat"
criadoEm: "<timestamp>"
tenantId: "rr-infocell"
```

**Listagem:**
```bash
curl -s http://localhost:3333/api/categorias | jq '.data | length'
```
Deve incluir categorias padrao (peca, produto, acessorio...) + categoria criada.

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` no Firestore | | |
| GET /categorias retorna categorias padrao + nova | | |
| Categorias padrao hardcoded NAO possuem tenantId | | Esperado — sao constantes |

---

### 3.3 Clientes

**Endpoint:** `POST /api/clientes`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Validacao Tenant Cliente", "telefone": "11999990001"}' | jq .
```

**Response esperada:** status 201, campo `tenantId: "rr-infocell"` na response.

**Verificar no Firestore:** `clientes/<id-retornado>` deve conter:
```
nome: "Validacao Tenant Cliente"
telefone: "(11) 99999-0001"
tenantId: "rr-infocell"
createdAt: "<timestamp>"
updatedAt: "<timestamp>"
```

**Editar (verificar que tenantId e preservado):**
```bash
# Substitua <id> pelo id retornado no POST
curl -s -X PUT http://localhost:3333/api/clientes/<id> \
  -H "Content-Type: application/json" \
  -d '{"nome": "Validacao Tenant Cliente Editado", "telefone": "11999990001"}' \
  | jq .data.tenantId
```
Deve retornar `"rr-infocell"`.

**Listagem:**
```bash
curl -s "http://localhost:3333/api/clientes?q=Validacao" | jq '.data | length'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId` | | |
| `tenantId: "rr-infocell"` no Firestore | | |
| PUT preserva `tenantId` | | |
| GET /clientes retorna 200 | | |
| Clientes anteriores (sem tenantId) continuam visiveis | | |
| OS vinculadas a clientes continuam funcionando | | |

---

### 3.4 Produtos

**Endpoint:** `POST /api/produtos`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "VAL-TENANT-001",
    "nome": "Produto Validacao Tenant",
    "categoria": "peca",
    "estoqueAtual": 3,
    "estoqueMinimo": 1,
    "custo": 10,
    "precoVenda": 20
  }' | jq .
```

**Response esperada:** status 201, campo `tenantId: "rr-infocell"` na response.

**Verificar no Firestore:** `produtos/<id-retornado>` deve conter:
```
nome: "Produto Validacao Tenant"
estoqueAtual: 3
custo: 10
precoVenda: 20
tenantId: "rr-infocell"
```

**Editar:**
```bash
curl -s -X PUT http://localhost:3333/api/produtos/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "VAL-TENANT-001",
    "nome": "Produto Validacao Tenant Editado",
    "categoria": "peca",
    "estoqueAtual": 3,
    "estoqueMinimo": 1,
    "custo": 10,
    "precoVenda": 20
  }' | jq .data.tenantId
```
Deve retornar `"rr-infocell"`.

**Verificar que logica de estoque NAO foi afetada:**
```bash
curl -s http://localhost:3333/api/produtos/<id> | jq '.data | {estoqueAtual, custo, precoVenda, tenantId}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId` | | |
| `tenantId: "rr-infocell"` no Firestore | | |
| PUT preserva `tenantId` | | |
| `estoqueAtual`, `custo`, `precoVenda` corretos apos edit | | |
| GET /produtos retorna 200 | | |
| Produtos anteriores (sem tenantId) continuam visiveis | | |

---

### 3.5 Despesas

**Endpoint:** `POST /api/despesas`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/despesas \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Despesa Validacao Tenant",
    "categoria": "outros",
    "valor": 99,
    "vencimento": "31/12/2026"
  }' | jq .
```

**Response esperada:** status 201, campo `tenantId: "rr-infocell"` na response.

**Verificar no Firestore:** `despesas/<id-retornado>` deve conter:
```
descricao: "Despesa Validacao Tenant"
valor: 99
pago: false
recorrente: false
tenantId: "rr-infocell"
```

**Editar:**
```bash
curl -s -X PUT http://localhost:3333/api/despesas/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Despesa Validacao Tenant Editada",
    "categoria": "outros",
    "valor": 99,
    "vencimento": "31/12/2026",
    "pago": true
  }' | jq '{tenantId: .data.tenantId, pago: .data.pago, pagoEm: .data.pagoEm}'
```
`tenantId` deve ser `"rr-infocell"`. `pago` deve ser `true`. `pagoEm` deve ser preenchido.

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 com `tenantId` | | |
| `tenantId: "rr-infocell"` no Firestore | | |
| PUT preserva `tenantId` | | |
| Marcacao como `pago: true` funciona corretamente | | |
| Campo `pagoEm` preenchido apos marcar como pago | | |
| Campo `recorrente` correto | | |
| GET /despesas retorna 200 | | |

---

### 3.6 Contas

**Endpoint:** `POST /api/contas`

**Criar:**
```bash
curl -s -X POST http://localhost:3333/api/contas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Conta Validacao Tenant", "tipo": "pix", "saldo": 500}' | jq .
```

**Response esperada:** status 201, `data.id` presente.

**Verificar no Firestore:** `contas/<id-retornado>` deve conter:
```
nome: "Conta Validacao Tenant"
tipo: "pix"
saldo: 500
ativa: true
tenantId: "rr-infocell"
```

**Editar (verificar que tenantId persiste com update parcial):**
```bash
curl -s -X PUT http://localhost:3333/api/contas/<id> \
  -H "Content-Type: application/json" \
  -d '{"nome": "Conta Validacao Tenant Editada"}' | jq .
```
Verificar no Firestore que `tenantId` ainda esta presente apos o PUT (o `ref.update()` e parcial e nao sobrescreve campos nao enviados).

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| `tenantId: "rr-infocell"` no Firestore apos POST | | |
| PUT retorna 200 | | |
| `tenantId` permanece no Firestore apos PUT | | Update parcial nao sobrescreve |
| GET /contas retorna 200 | | |
| Contas anteriores (sem tenantId) continuam visiveis | | |

---

## 4. Resultado consolidado

| Entidade | Create OK | tenantId no Firestore | Update preserva tenantId | Listagem OK | Status geral |
| --- | --- | --- | --- | --- | --- |
| Marcas | | | N/A — sem update | | |
| Categorias | | | N/A — sem update | | |
| Clientes | | | | | |
| Produtos | | | | | |
| Despesas | | | | | |
| Contas | | | | | |

**Data de execucao:** ___/___/______

**Executado por:** ___________________________

**Ambiente staging:** ___________________________

---

## 5. Criterios de aprovacao

A validacao so e considerada aprovada quando TODOS os itens abaixo forem verificados:

- [ ] Todos os novos registros possuem `tenantId: "rr-infocell"` no Firestore
- [ ] Nenhum update remove ou altera o `tenantId` existente
- [ ] Todas as listagens continuam retornando dados (incluindo registros antigos sem tenantId)
- [ ] Nenhum endpoint retornou 400, 422 ou 500
- [ ] Nenhuma regra de negocio foi alterada (pago/pagoEm em despesas, estoque em produtos)
- [ ] Nenhuma OS, movimentacao de estoque ou venda foi afetada

---

## 6. Criterios de bloqueio

**Nao avancar para a Fase 8.7 se:**

- Qualquer entidade nao salvar `tenantId` no Firestore
- Update remover ou alterar `tenantId` para valor incorreto
- Listagem de qualquer entidade retornar erro
- Firestore receber dados inconsistentes ou campos ausentes
- Calculos de negocio (pago, estoque, financeiro) apresentarem comportamento diferente
- Qualquer endpoint retornar 400/422/500

**Acao em caso de bloqueio:**
1. Identificar qual entidade ou endpoint falhou
2. Anotar o erro exato (status HTTP, mensagem, campo afetado)
3. Reverter apenas o modulo afetado
4. Documentar antes de tentar alternativa
5. Nao avancar com outras entidades ate entender o motivo

---

## 7. Proxima etapa — Fase 8.7

**Condicao de entrada:** todos os criterios de aprovacao desta fase atendidos.

**Objetivo da Fase 8.7:** persistir `tenantId` nas entidades criticas do sistema:

| Entidade | Risco | Observacao |
| --- | --- | --- |
| `ordens-servico` | Alto | Acoplada com baixa de estoque e eventos |
| `ordem-eventos` | Medio | Depende de ordens-servico existir |
| `movimentacoes-estoque` | Alto | Baixa automatica via OS e manual |
| `vendas` | Alto | Vincula OS, produto, cliente e financeiro |

**A Fase 8.7 so deve comecar apos:**
- Esta validacao intermediaria aprovada e registrada
- Backup do banco de staging realizado
- Rollback planejado e testado para cada entidade critica
- Responsavel tecnico definido para revisar OS e estoque
