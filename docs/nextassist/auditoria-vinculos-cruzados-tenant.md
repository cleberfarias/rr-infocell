# Auditoria — Vínculos Cruzados entre Entidades e Tenant

**Fase:** 9.14.3 — Auditoria de vínculos cruzados
**Data:** 2026-05-29
**Branch:** nextassist-saas

---

## 1. Objetivo

Mapear todos os pontos onde payloads recebem IDs relacionados de outras entidades (`clienteId`, `produtoId`, `aparelhoId`, `ordemServicoId`, etc.) sem validar se esses IDs pertencem ao mesmo tenant do usuário autenticado.

Este mapeamento é pré-requisito para criar o segundo tenant fake com segurança na Fase 9.15.

---

## 2. Conceito do risco

As proteções já implementadas cobrem:

| Proteção | O que cobre |
|---------|-------------|
| Listagens com `tenantId` | Dados que aparecem nas listagens — usuário só vê o seu |
| `findById` com guard | Acesso direto por ID a documentos — retorna 404 se é de outro tenant |

**O gap restante:** payloads podem enviar IDs de entidades relacionadas de outro tenant.

**Exemplo do risco:**
- Usuário do tenant B envia `POST /api/ordens-servico` com `clienteId` de um cliente do tenant A
- O backend encontra o cliente (busca interna sem guard) e cria a OS do tenant B vinculada a um cliente do tenant A
- Isso cria um vínculo cruzado que contamina os dados

Para fechar esse gap, o backend precisa validar: *"esse ID pertence ao mesmo tenant do usuário autenticado?"*

---

## 3. Tabela de vínculos

### Ordens de Serviço (`POST /api/ordens-servico`, `PUT /api/ordens-servico/:id`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `clienteId` | clientes | ❌ | **Alto** | Validar: `clientesService.getById(clienteId, tenantId)` |
| `aparelhoId` | aparelhos | ❌ | **Alto** | Validar existência + pertence ao cliente do mesmo tenant |
| `pecasUsadas[].produtoId` | produtos | ❌ | **Alto** | Validar: `produtosService.getById(produtoId, tenantId)` |
| `checklistId` | checklists | ❌ | Baixo | Sem tenantId em checklists — risco de leitura errada |

**Validações atuais:**
- `ensureClienteAndAparelho`: valida que aparelho pertence ao cliente — sem validação de tenant
- `enrichPecasInput`: busca produtos sem validação de tenant
- `ensurePositiveDeltasStock`: busca produtos sem validação de tenant

### Vendas (`POST /api/vendas`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `ordemServicoId` | ordens-servico | ❌ | **Alto** | Validar: `ordensServicoService.getById(ordemId, tenantId)` |
| `clienteId` | clientes | ❌ | Médio | Venda direta com clienteId — validar tenant |
| `itens[].produtoId` | produtos | ❌ | **Alto** | Validar: `produtosService.getById(produtoId, tenantId)` |

**Validações atuais:**
- `ordensServicoService.getById(input.ordemServicoId)` sem tenantId
- `produtosService.getById(item.produtoId)` sem tenantId
- Nenhuma validação de tenant nos relacionamentos

### Movimentações de Estoque (`POST /api/movimentacoes-estoque`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `produtoId` | produtos | ❌ | **Alto** | Validar: `produtosService.getById(produtoId, tenantId)` |
| `ordemServicoId` | ordens-servico | ❌ | Baixo | Campo opcional de vínculo — menos crítico |

**Contexto:** movimentações manuais via API aceitam `produtoId` sem validar tenant. Movimentações automáticas via OS usam `produtoId` que já foi validado pelo fluxo da OS — risco menor.

### Aparelhos (`POST /api/aparelhos`, `PUT /api/aparelhos/:id`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `clienteId` | clientes | ❌ | **Alto** | Aparelho sem tenantId — vínculo cruzado contamina cliente de outro tenant |

**Observação:** `aparelhosService.create` chama `clientesService.getById(input.clienteId)` sem tenantId. Um aparelho pode ser criado vinculado a um cliente de outro tenant.

### Orçamentos (`POST /api/orcamentos`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `ordemServicoId` | ordens-servico | ❌ | **Alto** | `ordensServicoService.getById(input.ordemServicoId)` sem tenantId |

**Observação:** orçamento é derivado da OS — se OS for de outro tenant, os dados do orçamento (clienteId, aparelhoId) virão de outro tenant.

### Eventos da OS (`POST /api/ordem-eventos`)

| Campo | Entidade relacionada | Valida tenant hoje? | Risco | Recomendação |
|-------|---------------------|:---:|:---:|-------------|
| `ordemServicoId` | ordens-servico | ❌ | Médio | `ordensServicoService.getById(ordemServicoId)` sem tenantId |

**Observação:** eventos são criados internamente pelo OS service na maioria dos casos. A rota externa aceita `ordemServicoId` sem validar tenant.

### WhatsApp / Automações

| Acesso | Entidade | Valida tenant hoje? | Risco | Recomendação |
|--------|---------|:---:|:---:|-------------|
| `ordensRepo.findById(checklist.ordemServicoId)` | ordens-servico | ❌ | Baixo | Automação interna — acionada por evento, não por payload externo |
| `clientesRepo.findById(os.clienteId)` | clientes | ❌ | Baixo | Idem — não exposto diretamente |
| `aparelhosRepo.findById(os.aparelhoId)` | aparelhos | ❌ | Baixo | Idem |

**Observação:** automações WhatsApp são acionadas internamente pelo fluxo da OS. Não há endpoint externo que aceite IDs arbitrários. Risco baixo.

---

## 4. Classificação de risco consolidada

| Módulo | Campo | Risco | Impacto |
|--------|-------|:---:|---------|
| ordens-servico | `clienteId` | **Alto** | OS vinculada a cliente de outro tenant | ✅ Guard ativo (Fase 9.14.5) |
| ordens-servico | `aparelhoId` | **Alto** | Aparelho de outro tenant na OS | ➖ Sem guard — `aparelhos` sem tenantId no schema |
| ordens-servico | `pecasUsadas[].produtoId` | **Alto** | Produto de outro tenant baixado do estoque errado | ✅ Guard ativo (Fase 9.14.5) |
| vendas | `ordemServicoId` | **Alto** | Venda finaliza OS de outro tenant | ✅ Guard ativo (Fase 9.14.6) |
| vendas | `itens[].produtoId` | **Alto** | Produto de outro tenant vendido e baixado do estoque errado | ✅ Guard ativo (Fase 9.14.6) |
| movimentacoes-estoque | `produtoId` | **Alto** | Movimentação afeta estoque de produto de outro tenant | ✅ Guard ativo (Fase 9.14.4) |
| aparelhos | `clienteId` | **Alto** | Aparelho vinculado a cliente de outro tenant |
| orcamentos | `ordemServicoId` | **Alto** | Orçamento com dados de OS de outro tenant |
| ordem-eventos | `ordemServicoId` | Médio | Evento na OS de outro tenant |
| vendas | `clienteId` | Médio | Venda direta vinculada a cliente de outro tenant |
| checklists | `aparelhoId`, `ordemServicoId` | Baixo | Sem tenantId em checklists — impacto indireto |

---

## 5. Regras recomendadas

**Regra universal para vínculos:** sempre que um payload receber um ID relacionado, o backend deve:

```
1. Buscar o documento pelo ID com tenantId resolvido
2. Se não encontrar (não existe ou é de outro tenant) → retornar 404 ou 400 genérico
3. Nunca revelar se o ID existe em outro tenant
4. Nunca criar vínculo com entidade de outro tenant
```

**Implementação:** passar `tenantId` nas chamadas internas de `getById`:

```typescript
// Antes (sem guard de vínculo)
const cliente = await clientesService.getById(input.clienteId);

// Depois (com guard de vínculo)
const cliente = await clientesService.getById(input.clienteId, tenantId);
```

`getById` já aceita `tenantId` como parâmetro opcional (implementado na Fase 9.14.1). Basta começar a passar o valor.

---

## 6. Ordem segura de implementação futura

A validação de vínculos deve ser implementada de fora para dentro, começando pelas entidades mais simples:

```
Passo 1 — Movimentações de estoque
  → validar produtoId com tenantId em movimentacoesEstoqueService.create

Passo 2 — Ordens de Serviço
  → validar clienteId e aparelhoId em ensureClienteAndAparelho
  → validar produtoId em enrichPecasInput e ensurePositiveDeltasStock

Passo 3 — Vendas
  → validar ordemServicoId em vendasService.create
  → validar produtoId em createVendaDireta
  → validar clienteId em createVendaDireta

Passo 4 — Aparelhos
  → validar clienteId em aparelhosService.create e update

Passo 5 — Orçamentos e Eventos
  → validar ordemServicoId em orcamentosService.create
  → validar ordemServicoId em ordemEventosService.create

Passo 6 — Validação cruzada completa
  → teste com dois tenants em staging
```

---

## 7. Estado atual dos módulos sem tenantId

| Módulo | Tem tenantId? | Impacto no vínculo |
|--------|:---:|-------------|
| aparelhos | ❌ | Vinculado por `clienteId` — isolamento indireto |
| checklists | ❌ | Vinculado por `aparelhoId` e `ordemServicoId` |
| ordem-eventos | ❌ (campo interno) | Vinculado por `ordemServicoId` |
| orcamentos | ❌ (a verificar) | Vinculado por `ordemServicoId` |

Estes módulos precisarão de migração (adicionar `tenantId`) antes de multi-tenant completo. Isso é escopo de fase futura além da 9.15.

---

## 8. Critérios antes da Fase 9.14.4

Só avançar quando:

- [x] Todos os campos de vínculo mapeados neste documento
- [x] Riscos altos identificados e ordenados
- [x] Ordem de implementação definida
- [x] Módulos sem tenantId documentados (aparelhos, checklists, ordem-eventos)
- [ ] Decisão tomada: a 9.14.4 será implementação dos guards de vínculo ou plano técnico antes do segundo tenant fake?

---

## 9. Próxima fase sugerida

**Fase 9.14.4 — Implementar guard de vínculo cruzado**

Escopo mínimo seguro antes do segundo tenant fake:

1. Validar `produtoId` em movimentações de estoque manuais
2. Validar `clienteId` e `produtoId` em ordens de serviço
3. Validar `ordemServicoId` e `produtoId` em vendas

Esses três cobrem os riscos **Alto** mais críticos e usam a infraestrutura já existente — `getById(id, tenantId)` já aceita o parâmetro. A mudança é passar o tenantId que já está disponível via `request.tenantId`.
