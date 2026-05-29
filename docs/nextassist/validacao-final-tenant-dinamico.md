# Validação Final — Tenant Dinâmico (Fase 9)

**Fase:** 9.13 — Validação final consolidada
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 🔲 Aguardando execução dos testes

---

## 1. Objetivo

Esta validação confirma que todos os módulos de dados do NextAssist estão usando tenant dinâmico resolvido a partir de `usuarios/{uid}` no Firestore, com o fluxo completo:

```
Firebase Auth
→ requireAuth (verifica ID Token)
→ requireRole (verifica custom claim)
→ resolveTenant (busca usuarios/{uid} → request.tenantId)
→ handler (getRequestTenantId)
→ Firestore (filtra/salva pelo tenantId correto)
```

---

## 2. Estado final dos módulos

| Módulo | Fase | resolveTenant | Handler usa tenantId | Validado |
|--------|------|:---:|:---:|:---:|
| `/api/marcas` | 9.5 / 9.6 | ✅ | ✅ | 🔲 |
| `/api/categorias` | 9.7 | ✅ | ✅ | 🔲 |
| `/api/clientes` | 9.8 | ✅ | ✅ | 🔲 |
| `/api/produtos` | 9.8 | ✅ | ✅ | 🔲 |
| `/api/despesas` | 9.9 | ✅ | ✅ | 🔲 |
| `/api/contas` | 9.9 | ✅ | ✅ | 🔲 |
| `/api/movimentacoes-estoque` | 9.10 | ✅ | ✅ | 🔲 |
| `/api/ordens-servico` | 9.11 | ✅ | ✅ | 🔲 |
| `/api/vendas` | 9.12 | ✅ | ✅ | 🔲 |

**Observações por módulo:**

| Módulo | Observação |
|--------|-----------|
| marcas, categorias | Handler inline; sem repository separado |
| clientes, produtos | Camadas route → service → repository; tenantId explícito em `list` e `create` |
| despesas | Camadas route → service → repository; `pagoEm`, `pago`, `recorrente` intocados |
| contas | Handler inline; PUT não altera tenantId |
| movimentacoes-estoque | Baixa automática via OS usa `DEFAULT_TENANT_ID` como default — correto para mono-tenant |
| ordens-servico | `buildOrdem`, `applyPecasDeltas`, `garantia`, `senha`, eventos intocados |
| vendas | `findByOrdem` usa `DEFAULT_TENANT_ID` como default — correto para mono-tenant |

---

## 3. Pré-requisitos

Antes de executar os testes:

- [ ] Usuário autenticado no Firebase Auth
- [ ] Documento `usuarios/{uid}` existente no Firestore com:
  - `tenantId: "rr-infocell"`
  - `status: "ativo"`
- [ ] Backend rodando (`cd backend && npm run dev`)
- [ ] Frontend acessível (`cd frontend && npm run dev`)
- [ ] Console do backend visível para monitorar warnings `[resolveTenant]`
- [ ] Firebase Console aberto para verificar documentos criados

---

## 4. Checklist geral

- [ ] Login funciona normalmente
- [ ] Nenhuma rota retorna 401 indevido (apenas quando sem token)
- [ ] Nenhuma rota retorna 403 indevido (apenas quando role incorreta)
- [ ] Nenhuma rota retorna 500
- [ ] **Nenhum warning `[resolveTenant]` aparece** para usuário com `usuarios/{uid}` válido
- [ ] `usuarios/{uid}` é consultado como fonte do `tenantId` (sem hardcode de `rr-infocell` vindo do request)

---

## 5. Validação por módulo

### Marcas

- [ ] `GET /api/marcas` retorna 200 com lista de marcas
- [ ] Marcas padrão presentes (Apple, Samsung, Motorola...)
- [ ] `POST /api/marcas` cria marca com status 201
- [ ] Firestore → `marcas/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `DELETE /api/marcas/:id` funciona

### Categorias

- [ ] `GET /api/categorias` retorna 200 com lista de categorias
- [ ] Categorias padrão presentes (Peça, Produto, Serviço...)
- [ ] `POST /api/categorias` cria categoria com status 201
- [ ] Firestore → `categorias/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `DELETE /api/categorias/:id` funciona

### Clientes

- [ ] `GET /api/clientes` retorna 200 com lista de clientes
- [ ] Busca por nome/telefone funciona
- [ ] `POST /api/clientes` cria cliente com status 201
- [ ] Firestore → `clientes/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `PUT /api/clientes/:id` preserva `tenantId`
- [ ] `DELETE /api/clientes/:id` funciona (sem OS vinculada)

### Produtos

- [ ] `GET /api/produtos` retorna 200 com lista de produtos
- [ ] Filtros por categoria e ativo funcionam
- [ ] `POST /api/produtos` cria produto com status 201
- [ ] Firestore → `produtos/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `PUT /api/produtos/:id` preserva `tenantId`
- [ ] Regra de celular individual (estoqueAtual ≤ 1) funciona

### Despesas

- [ ] `GET /api/despesas` retorna 200 com lista de despesas
- [ ] Filtros por categoria e pago funcionam
- [ ] `POST /api/despesas` cria despesa com status 201
- [ ] Firestore → `despesas/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `PUT /api/despesas/:id` preserva `tenantId` e mantém `pagoEm`

### Contas

- [ ] `GET /api/contas` retorna 200 com lista de contas
- [ ] `POST /api/contas` cria conta com status 201
- [ ] Firestore → `contas/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `PUT /api/contas/:id` atualiza nome/tipo/saldo sem alterar `tenantId`

### Movimentações de Estoque

- [ ] `GET /api/movimentacoes-estoque` retorna 200 com histórico
- [ ] Filtro por `produtoId` funciona
- [ ] `POST /api/movimentacoes-estoque` (entrada manual) cria com status 201
- [ ] Firestore → `movimentacoesEstoque/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] Saída com estoque insuficiente retorna 400

---

## 6. Validação crítica — Ordens de Serviço

### OS sem peça

- [ ] `POST /api/ordens-servico` cria OS com status 201
- [ ] Firestore → `ordensServico/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] `numero` da OS incrementado corretamente
- [ ] `GET /api/ordens-servico` lista a OS criada
- [ ] `GET /api/ordens-servico/:id` retorna detalhe da OS

### OS com peça

- [ ] `POST /api/ordens-servico` com `pecasUsadas` cria OS com status 201
- [ ] `estoqueAtual` do produto reduz corretamente após a criação
- [ ] Movimentação automática criada em `movimentacoesEstoque`
- [ ] Firestore → movimentação automática → `tenantId: "rr-infocell"` ✅
- [ ] `origem: "ordem_servico"` na movimentação
- [ ] Erro 400 se estoque insuficiente

### Edição de OS

- [ ] `PUT /api/ordens-servico/:id` atualiza OS com status 200
- [ ] `tenantId` preservado no documento
- [ ] OS em status terminal (`entregue`, `sem_conserto`, `cancelado`) retorna 400

### Orçamento/Impressão

- [ ] Detalhe da OS (`GET /api/ordens-servico/:id`) retorna todos os campos
- [ ] Frontend consegue montar a via de impressão com os dados da OS

### Eventos

- [ ] Evento criado ao criar OS (status inicial)
- [ ] Evento criado ao mudar status
- [ ] `GET /api/ordem-eventos?ordemServicoId=...` retorna eventos

---

## 7. Validação crítica — Vendas/PDV

### Venda direta (PDV sem OS)

- [ ] `POST /api/vendas` sem `ordemServicoId` cria venda com status 201
- [ ] Firestore → `vendas/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] Baixa de estoque do produto criada automaticamente
- [ ] Troco calculado corretamente
- [ ] Celular individual (quantidade = 1) validado
- [ ] Erro 400 em estoque insuficiente

### Venda via OS

- [ ] OS deve estar com status `pronto_para_retirada` — validação ativa
- [ ] `POST /api/vendas` com `ordemServicoId` finaliza a venda com status 201
- [ ] Firestore → `vendas/{id}` → `tenantId: "rr-infocell"` ✅
- [ ] OS marcada como `entregue` no Firestore
- [ ] Evento de venda registrado na OS
- [ ] Erro 400 se pagamento insuficiente

### findByOrdem

- [ ] `GET /api/vendas?ordemServicoId=...` retorna venda da OS
- [ ] Tentativa de criar segunda venda para a mesma OS retorna 400

---

## 8. Validação cruzada

- [ ] Produto usado em OS mantém `tenantId` original no Firestore
- [ ] Movimentação gerada por OS mantém `tenantId: "rr-infocell"`
- [ ] Venda vinculada à OS é encontrada pelo `findByOrdem`
- [ ] Filtros de listagem (status, categoria, clienteId etc.) respeitam o `tenantId`
- [ ] Dados antigos (migrados na Fase 8) continuam visíveis nas listagens
- [ ] Nenhum dado "vaza" entre filtros

---

## 9. Critérios de aprovação

A Fase 9 é aprovada quando **todos** os itens abaixo estiverem confirmados:

| Critério | Status |
|----------|--------|
| Todos os módulos retornam 200 no GET | 🔲 |
| Novos registros salvam `tenantId: "rr-infocell"` | 🔲 |
| PUT/update preserva `tenantId` existente | 🔲 |
| OS funciona com e sem peça | 🔲 |
| Venda funciona direta e via OS | 🔲 |
| Estoque correto após movimentações | 🔲 |
| Nenhum warning `[resolveTenant]` para usuários válidos | 🔲 |
| Nenhum erro 400/422/500 inesperado | 🔲 |

---

## 10. Critérios de bloqueio

Não avançar para Fase 9.14 se qualquer um dos itens abaixo ocorrer:

| Bloqueio | Verificar |
|---------|-----------|
| Módulo perde dados na listagem | tenantId do filtro Firestore |
| `tenantId` não salvo em novo registro | middleware resolveTenant, getRequestTenantId |
| `resolveTenant` cai em fallback sem motivo | documento `usuarios/{uid}` no Firestore |
| OS quebra ao criar com peça | `applyPecasDeltas`, movimentacoesEstoqueService |
| Venda quebra (direta ou via OS) | vendasService, ordensServicoService.update |
| Estoque inconsistente | movimentacoesEstoqueService, produtos.estoqueAtual |
| `findByOrdem` retorna null indevido | vendasRepository.list, filtro tenantId |

---

## 11. Próxima fase sugerida

**Fase 9.14 — Revisão final da Fase 9 e preparação para segundo tenant fake**

Objetivo: revisar os pontos ainda pendentes antes de ativar múltiplos tenants reais:

1. Confirmar que o fallback `DEFAULT_TENANT_ID` nunca é acionado para usuários válidos em produção
2. Definir o processo de criação automática de `usuarios/{uid}` para novos usuários
3. Validar em staging com um segundo tenant fake (`rr-test`) para confirmar isolamento completo
4. Documentar o plano de remoção do fallback `DEFAULT_TENANT_ID`
5. Preparar rollback plan para o caso de um tenant inválido ser ativado acidentalmente
