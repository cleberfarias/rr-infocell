# Validação — Tenant Demo via API

**Fase:** 9.16 — Criar dados mínimos do tenant fake e validar isolamento real
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ⚠️ Bloqueada — backend de produção não implantado com código da Fase 9.4

---

## ⚠️ Diagnóstico — 2026-05-29

**Problema identificado:** o backend de produção (Cloud Run) ainda roda o código anterior à Fase 9.4, onde `resolveTenant` retorna `DEFAULT_TENANT_ID = "rr-infocell"` fixo, sem ler `usuarios/{uid}`.

**Sintomas observados:**
- Demo user autenticado via API recebeu `tenantId: "rr-infocell"` (do fallback hardcoded)
- 12 documentos de teste foram criados incorretamente com `tenantId: "rr-infocell"` na coleção rr-infocell
- Demo user via listagem enxergava 61 clientes (todos de rr-infocell)
- Busca "Cliente Demo" retornou 1 resultado (o dado criado no rr-infocell)

**Limpeza executada:**
- Script `backend/src/scripts/cleanup-demo-test-data.ts` removeu os 12 documentos contaminantes
- Firestore restaurado ao estado anterior

**Pré-requisito para executar esta validação:**
- Deploy do branch `nextassist-saas` para o Cloud Run de produção (ou testar em ambiente local com backend atualizado)
- Após o deploy, `resolveTenant` lerá `usuarios/{uid}` → retornará `"nextassist-demo"` para o usuário demo

---

## Resultado da Execução — 2026-05-29 (Staging: rr-infocell-api-staging)

### ✅ Confirmado

| Teste | Resultado |
|-------|-----------|
| Demo user vê 0 clientes rr-infocell | ✅ (total: 1 — apenas Cliente Demo) |
| Demo user vê 0 produtos rr-infocell | ✅ (total: 2 — apenas demo) |
| Demo user vê 0 OS rr-infocell | ✅ (total: 10 — apenas OS demo sem peças) |
| Demo user vê 0 movimentações rr-infocell | ✅ (total: 3 — apenas movimentações demo) |
| Demo user vê 0 vendas rr-infocell | ✅ (total: 0 — sem vendas demo criadas) |
| Marca, categoria, cliente, produto, conta, despesa criados com `tenantId: nextassist-demo` | ✅ |
| Movimentação manual com produto demo | ✅ |
| OS sem peça | ✅ |
| OS com cliente rr-infocell → bloqueado | ✅ `cliente_not_found` |
| MOV com produto rr-infocell → bloqueado | ✅ `produto_not_found` |
| Venda com produto rr-infocell → bloqueado | ✅ `produto_not_found` |

### ❌ Bug identificado — `produto_not_found` em fluxos de escrita complexa

| Operação | Esperado | Obtido |
|----------|---------|--------|
| OS com peça (demo produto) | 201 | `produto_not_found` |
| Venda direta (demo produto) | 201 | `produto_not_found` |

**Causa raiz confirmada (2026-06-02, logs `DEBUG_TENANT_LOOKUP=true`):**

O `enrichPecasInput` e `createVendaDireta` recebem `tenantId=nextassist-demo` e **encontram o produto corretamente**. O bug ocorre no efeito colateral: quando `applyPecasDeltas` (OS) ou o equivalente em vendas dispara `movimentacoesEstoqueService.create` internamente, o `tenantId` passado para essa chamada é `rr-infocell` (valor default). A movimentação interna valida o produto com o tenant errado → `tenant_mismatch` → `produto_not_found`.

**Correção indicada:** propagar o `tenantId` do request para a chamada interna de `movimentacoesEstoqueService.create` dentro de OS e venda. Ver `docs/nextassist/diagnostico-produto-not-found-tenant-demo.md`.

**Não bloqueia isolamento:** a separação entre tenants está funcionando corretamente em todas as listagens e guards.

---

## 1. Objetivo

Validar que dados criados pelo usuário `demo@nextassist-demo.internal` ficam isolados no tenant `nextassist-demo`, sem afetar nem ser visíveis pelo tenant `rr-infocell`, e vice-versa.

Esta é a validação definitiva do isolamento multi-tenant antes de avançar para clientes reais.

---

## 2. Pré-requisitos

- [ ] Backend rodando: `cd backend && npm run dev`
- [ ] Frontend rodando (ou cliente HTTP como Insomnia/Postman)
- [ ] Login como usuário demo funcionando: `demo@nextassist-demo.internal`
- [ ] `usuarios/{H4Aw7VpFQugmtz1CY4FPCj2fTio1}` aponta para `tenantId: "nextassist-demo"`
- [ ] Custom claim `role: admin` configurada para o usuário demo
- [ ] Console do backend visível para monitorar warnings `[resolveTenant]`
- [ ] Firebase Console aberto para verificar `tenantId` dos documentos criados

---

## 3. Dados mínimos a criar via API (usuário demo logado)

Criar cada item abaixo autenticado como `demo@nextassist-demo.internal`. Após cada criação, verificar no Firestore que `tenantId: "nextassist-demo"`.

### 3.1 Marca

- [ ] `POST /api/marcas` com `{ "nome": "Marca Demo" }` → **201**
- [ ] Firestore → `marcas/{id}` → `tenantId: "nextassist-demo"` ✅

### 3.2 Categoria

- [ ] `POST /api/categorias` com `{ "nome": "Categoria Demo" }` → **201**
- [ ] Firestore → `categorias/{id}` → `tenantId: "nextassist-demo"` ✅

### 3.3 Cliente

- [ ] `POST /api/clientes` com `{ "nome": "Cliente Demo", "telefone": "(11) 99999-0001" }` → **201**
- [ ] Firestore → `clientes/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] Guardar o `clienteId` para uso na OS

### 3.4 Produto

- [ ] `POST /api/produtos` com estoque > 0 → **201**
- [ ] Firestore → `produtos/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] Guardar o `produtoId` para uso em movimentação e OS com peça

### 3.5 Despesa

- [ ] `POST /api/despesas` → **201**
- [ ] Firestore → `despesas/{id}` → `tenantId: "nextassist-demo"` ✅

### 3.6 Conta

- [ ] `POST /api/contas` com `{ "nome": "Caixa Demo" }` → **201**
- [ ] Firestore → `contas/{id}` → `tenantId: "nextassist-demo"` ✅

### 3.7 Movimentação manual de estoque

- [ ] `POST /api/movimentacoes-estoque` com `produtoId` do produto demo (entrada) → **201**
- [ ] Firestore → `movimentacoesEstoque/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] `estoqueAtual` do produto demo atualizado

### 3.8 OS sem peça

> Pré-requisito: aparelho cadastrado para o cliente demo

- [ ] `POST /api/ordens-servico` com `clienteId` demo, sem `pecasUsadas` → **201**
- [ ] Firestore → `ordensServico/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] Evento de criação registrado

### 3.9 OS com peça

- [ ] `POST /api/ordens-servico` com `clienteId` demo e `pecasUsadas[produtoId demo]` → **201**
- [ ] Firestore → `ordensServico/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] Movimentação automática criada com `tenantId: "nextassist-demo"` ✅
- [ ] `estoqueAtual` do produto demo reduzido

### 3.10 Venda direta

- [ ] `POST /api/vendas` sem `ordemServicoId`, com `produtoId` demo → **201**
- [ ] Firestore → `vendas/{id}` → `tenantId: "nextassist-demo"` ✅
- [ ] Baixa de estoque do produto demo criada

### 3.11 Venda via OS (opcional)

- [ ] OS demo no status `pronto_para_retirada`
- [ ] `POST /api/vendas` com `ordemServicoId` da OS demo → **201**
- [ ] OS demo marcada como `entregue`
- [ ] Venda criada com `tenantId: "nextassist-demo"` ✅

---

## 4. Validação de isolamento — usuário rr-infocell não vê dados demo

Logar como qualquer usuário `rr-infocell` e verificar que os dados demo **não aparecem**:

| Endpoint | Esperado | Status |
|----------|----------|--------|
| `GET /api/marcas` | Sem "Marca Demo" | 🔲 |
| `GET /api/categorias` | Sem "Categoria Demo" | 🔲 |
| `GET /api/clientes` | Sem "Cliente Demo" | 🔲 |
| `GET /api/produtos` | Sem produto demo | 🔲 |
| `GET /api/ordens-servico` | Sem OS demo | 🔲 |
| `GET /api/vendas` | Sem venda demo | 🔲 |
| `GET /api/movimentacoes-estoque` | Sem movimentações demo | 🔲 |
| `GET /api/despesas` | Sem despesa demo | 🔲 |
| `GET /api/contas` | Sem conta demo | 🔲 |

---

## 5. Validação de isolamento — usuário demo não vê dados rr-infocell

Logar como `demo@nextassist-demo.internal` e verificar que dados da RR Infocell **não aparecem**:

| Endpoint | Esperado | Status |
|----------|----------|--------|
| `GET /api/clientes` | Zero clientes de rr-infocell | 🔲 |
| `GET /api/produtos` | Zero produtos de rr-infocell | 🔲 |
| `GET /api/ordens-servico` | Zero OS de rr-infocell | 🔲 |
| `GET /api/vendas` | Zero vendas de rr-infocell | 🔲 |
| `GET /api/movimentacoes-estoque` | Zero movimentações de rr-infocell | 🔲 |

---

## 6. Validação de vínculos cruzados

Ainda logado como usuário demo, testar tentativas de vínculo com dados de rr-infocell:

| Cenário | Payload | Esperado | Status |
|---------|---------|---------|--------|
| OS demo + cliente demo | `clienteId` do demo | 201 ✅ | 🔲 |
| OS demo + produto demo | `produtoId` do demo | 201 ✅ | 🔲 |
| OS demo + cliente rr-infocell | `clienteId` de rr-infocell | **404** ❌ | 🔲 |
| OS demo + produto rr-infocell | `produtoId` de rr-infocell | **404** ❌ | 🔲 |
| Venda demo + produto rr-infocell | `produtoId` de rr-infocell | **404** ❌ | 🔲 |
| Venda demo + OS rr-infocell | `ordemServicoId` de rr-infocell | **404** ❌ | 🔲 |
| Movimentação demo + produto rr-infocell | `produtoId` de rr-infocell | **404** ❌ | 🔲 |

---

## 7. Validação crítica de fluxos no tenant demo

- [ ] Baixa automática de estoque funciona no tenant demo (OS com peça)
- [ ] Movimentação automática tem `tenantId: "nextassist-demo"`
- [ ] Venda direta funciona no tenant demo
- [ ] Venda via OS funciona no tenant demo
- [ ] `findByOrdem` retorna venda correta do tenant demo
- [ ] Segunda venda para mesma OS demo retorna **400**
- [ ] **Nenhum warning `[resolveTenant]`** no console para usuário demo
- [ ] **Nenhum erro 500** em nenhum fluxo

---

## 8. Critérios de aprovação

| Critério | Status |
|----------|--------|
| Todos os dados demo criados com `tenantId: "nextassist-demo"` | 🔲 |
| rr-infocell não enxerga dados demo | 🔲 |
| Demo não enxerga dados rr-infocell | 🔲 |
| Vínculos cruzados bloqueados (cliente, produto, OS) | 🔲 |
| OS, estoque e venda funcionam no tenant demo | 🔲 |
| Sem warning `[resolveTenant]` para usuário demo | 🔲 |
| Sem erros 500 | 🔲 |

---

## 9. Critérios de bloqueio

Não avançar para Fase 9.17 se qualquer item abaixo ocorrer:

| Bloqueio | Causa provável |
|---------|---------------|
| Dado demo nasce com `tenantId: "rr-infocell"` | `resolveTenant` com fallback ativo — verificar `usuarios/{uid}` |
| Usuário demo enxerga dados rr-infocell | Filtro Firestore usando `DEFAULT_TENANT_ID` fixo em algum módulo |
| Usuário rr-infocell enxerga dados demo | Idem |
| Vínculo cruzado aceito | Guard não está sendo acionado — verificar cadeia route → service |
| OS quebra no tenant demo | Verificar `clienteId` e `aparelhoId` do tenant |
| Venda quebra no tenant demo | Verificar `ordemServicoId` e `produtoId` |
| Estoque inconsistente | Verificar fluxo de movimentação automática |

---

## 10. Próxima fase sugerida

**Fase 9.17 — Registrar resultado e decidir próximos passos para SaaS real**

Após aprovação desta validação:

1. Registrar o resultado oficial (aprovado/reprovado + achados)
2. Decidir o que fazer com o tenant demo (`nextassist-demo`):
   - Manter para testes contínuos
   - Remover e limpar dados
   - Promover a tenant real
3. Definir roadmap para o segundo tenant cliente real:
   - Remoção do fallback `DEFAULT_TENANT_ID`
   - Migração de `aparelhos` para incluir `tenantId`
   - Criação automática de `usuarios/{uid}` no onboarding
4. Preparar processo de onboarding de novos tenants (script controlado + documentação)
