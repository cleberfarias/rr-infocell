# Validação Final — Vínculos Cruzados entre Entidades e Tenant

**Fase:** 9.14.7 — Validação final de guards de vínculo cruzado
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 🔲 Aguardando execução dos testes

---

## 1. Objetivo

Confirmar que os guards de vínculo cruzado implementados nas Fases 9.14.4–9.14.6 estão funcionando corretamente: o backend deve impedir que um usuário de um tenant crie relacionamentos com documentos de outro tenant, antes de ativar o segundo tenant fake.

---

## 2. Estado dos guards

| Módulo | Campo | Entidade relacionada | Guard ativo? | Fase | Observação |
|--------|-------|---------------------|:---:|:---:|-----------|
| movimentacoes-estoque | `produtoId` | produtos | ✅ | 9.14.4 | `produtosService.getById(produtoId, tenantId)` |
| ordens-servico | `clienteId` | clientes | ✅ | 9.14.5 | `clientesService.getById(clienteId, tenantId)` |
| ordens-servico | `aparelhoId` | aparelhos | ➖ | — | `aparelhos` sem `tenantId` no schema — limitação documentada |
| ordens-servico | `pecasUsadas[].produtoId` | produtos | ✅ | 9.14.5 | `produtosService.getById(produtoId, tenantId)` em `enrichPecasInput` e `ensurePositiveDeltasStock` |
| ordens-servico update | OS sendo editada | ordens-servico | ✅ | 9.14.5 | `getById(id, tenantId)` no início do `update` |
| vendas | `ordemServicoId` | ordens-servico | ✅ | 9.14.6 | `ordensServicoService.getById(ordemServicoId, tenantId)` |
| vendas | `itens[].produtoId` | produtos | ✅ | 9.14.6 | `produtosService.getById(produtoId, tenantId)` em `createVendaDireta` |

**6 de 7 campos críticos protegidos. 1 limitação documentada (aparelhoId).**

---

## 3. Como testar vínculos cruzados

**Método:** criar documentos temporários no Firebase Console com `tenantId: "tenant-teste"` e tentar acessá-los como usuário `rr-infocell`. Remover após o teste.

---

## 4. Checklist — Movimentações de Estoque

### Acesso legítimo

- [ ] `POST /api/movimentacoes-estoque` com `produtoId` rr-infocell → **201**
- [ ] `estoqueAtual` do produto reduz corretamente
- [ ] Movimentação salva com `tenantId: "rr-infocell"` no Firestore
- [ ] `GET /api/movimentacoes-estoque` lista a movimentação

### Vínculo cruzado

- [ ] Criar produto temporário em `produtos/{id}` com `tenantId: "tenant-teste"`
- [ ] `POST /api/movimentacoes-estoque` com esse `produtoId` → **404 `produto_not_found`**
- [ ] Produto de outro tenant **não é modificado** (estoqueAtual intocado)
- [ ] Nenhum erro 500

---

## 5. Checklist — Ordens de Serviço

### Criação com vínculos legítimos

- [ ] `POST /api/ordens-servico` com `clienteId` rr-infocell → **201**
- [ ] `POST /api/ordens-servico` com peça (`produtoId`) rr-infocell → **201**
- [ ] Peça baixa estoque corretamente
- [ ] Movimentação automática criada com `tenantId: "rr-infocell"`
- [ ] Evento da OS criado normalmente

### Criação com vínculos cruzados

- [ ] Criar cliente temporário com `tenantId: "tenant-teste"`
- [ ] `POST /api/ordens-servico` com esse `clienteId` → **404 `cliente_not_found`**
- [ ] Criar produto temporário com `tenantId: "tenant-teste"`
- [ ] `POST /api/ordens-servico` com esse produto nas peças → **404 `produto_not_found`**
- [ ] Nenhum erro 500 nos dois casos

### Edição com vínculos cruzados

- [ ] Criar OS temporária no Firestore com `tenantId: "tenant-teste"`
- [ ] `PUT /api/ordens-servico/{id-outro-tenant}` → **404 `ordem_servico_not_found`**
- [ ] `PUT /api/ordens-servico/:id-proprio` com `clienteId` de outro tenant → **404 `cliente_not_found`**
- [ ] `PUT /api/ordens-servico/:id-proprio` com peça de outro tenant → **404 `produto_not_found`**

### Regressão

- [ ] Impressão/orçamento da OS retorna dados completos
- [ ] Eventos da OS funcionando
- [ ] `buildOrdem()` e `applyPecasDeltas()` intocados — regras de cálculo preservadas

---

## 6. Checklist — Vendas/PDV

### Venda direta com vínculos legítimos

- [ ] `POST /api/vendas` sem `ordemServicoId`, com produto rr-infocell → **201**
- [ ] Baixa de estoque criada automaticamente
- [ ] Venda criada com `tenantId: "rr-infocell"` no Firestore
- [ ] Cálculo de total, desconto e troco corretos

### Venda via OS com vínculos legítimos

- [ ] OS com status `pronto_para_retirada` no tenant rr-infocell
- [ ] `POST /api/vendas` com esse `ordemServicoId` → **201**
- [ ] OS marcada como `entregue`
- [ ] Venda criada com `tenantId: "rr-infocell"` no Firestore

### Venda direta com vínculo cruzado

- [ ] Criar produto temporário com `tenantId: "tenant-teste"`
- [ ] `POST /api/vendas` com esse `produtoId` nos itens → **404 `produto_not_found`**
- [ ] Produto de outro tenant **não é baixado do estoque**

### Venda via OS com vínculo cruzado

- [ ] Criar OS temporária com `tenantId: "tenant-teste"` e `status: "pronto_para_retirada"`
- [ ] `POST /api/vendas` com esse `ordemServicoId` → **404 `ordem_servico_not_found`**
- [ ] OS de outro tenant **não é marcada como entregue**

### Regressão

- [ ] `findByOrdem` funcionando (segunda venda para mesma OS retorna 400)
- [ ] `GET /api/vendas` retorna 200

---

## 7. Limitação conhecida — aparelhoId

**Estado atual:** `aparelhoId` não tem guard direto de tenant.

**Motivo:** a coleção `aparelhos` no Firestore não possui campo `tenantId`. Adicionar guard sem o campo não é efetivo.

**Mitigação parcial ativa:** a validação `aparelho.clienteId !== cliente.id` permanece ativa. Para criar um vínculo cruzado via `aparelhoId`, o atacante precisaria:
1. Saber o UUID do aparelho de outro tenant (ID opaco, não listável por outro tenant)
2. Usar um `clienteId` válido no próprio tenant
3. O aparelho não pertenceria ao cliente → validação `aparelho_cliente_mismatch` bloquearia

**Resolução completa:** adicionar `tenantId` à coleção `aparelhos` (migração de dados) e adicionar guard em `aparelhosService.getById(aparelhoId, tenantId)`. Escopo de fase futura antes de múltiplos tenants reais em produção.

**Decisão:** este risco residual é **aceitável para o teste com tenant fake** (Fase 9.15), desde que o tenant fake seja criado em ambiente controlado e não em produção com dados reais de clientes.

---

## 8. Critérios de aprovação

A Fase 9.14.7 é aprovada quando **todos** os itens abaixo estiverem confirmados:

| Critério | Status |
|----------|--------|
| Movimentação com produto do mesmo tenant → 201 | 🔲 |
| Movimentação com produto de outro tenant → 404 | 🔲 |
| OS com cliente do mesmo tenant → 201 | 🔲 |
| OS com cliente de outro tenant → 404 | 🔲 |
| OS com produto do mesmo tenant → 201 | 🔲 |
| OS com produto de outro tenant → 404 | 🔲 |
| Edição de OS de outro tenant → 404 | 🔲 |
| Venda direta com produto do mesmo tenant → 201 | 🔲 |
| Venda direta com produto de outro tenant → 404 | 🔲 |
| Venda via OS do mesmo tenant → 201 | 🔲 |
| Venda via OS de outro tenant → 404 | 🔲 |
| Estoque correto após movimentações | 🔲 |
| OS, vendas e movimentações sem regressão | 🔲 |
| Nenhum erro 500 | 🔲 |
| `aparelhoId` documentado como risco residual aceitável para Fase 9.15 | ✅ |

---

## 9. Critérios de bloqueio

**Não avançar para Fase 9.15 se:**

| Bloqueio | Ação |
|---------|------|
| Vínculo cruzado aceito em qualquer módulo | Identificar o guard faltando e implementar antes |
| Venda aceita produto de outro tenant | Verificar `createVendaDireta` |
| OS aceita cliente ou produto de outro tenant | Verificar `ensureClienteAndAparelho` e `enrichPecasInput` |
| Movimentação aceita produto de outro tenant | Verificar `movimentacoesEstoqueService.create` |
| Edição de OS de outro tenant aceita | Verificar `getById(id, tenantId)` no `update` |
| Estoque inconsistente após teste | Investigar cadeia de movimentações |
| Aparelho sem guard considerado bloqueante pela equipe | Migrar coleção `aparelhos` antes de prosseguir |

---

## 10. Próxima fase

**Fase 9.15 — Criar segundo tenant fake + usuário demo com script controlado**

Pré-requisitos confirmados por esta validação:
- Listagens isoladas por tenant (Fases 9.6–9.12)
- Leituras diretas por ID protegidas (Fase 9.14.1)
- Vínculos entre entidades protegidos (Fases 9.14.4–9.14.6)
- Fallback `DEFAULT_TENANT_ID` ainda ativo (transitório)
- `usuarios/{uid}` como fonte do tenant (Fase 9.4)

A Fase 9.15 criará `usuarios/{uid}` com `tenantId: "nextassist-demo"` para um usuário de teste, validando o isolamento real entre dois tenants com dados reais no Firestore.
