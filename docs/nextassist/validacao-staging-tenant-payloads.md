# Validacao de Staging — Tenant Payloads

## 1. Objetivo

Este documento orienta a validacao manual em staging para confirmar que a inclusao de `tenantId` nos payloads de criacao/edicao nao quebrou nenhum fluxo operacional do RR Infocell/NextAssist.

O campo `tenantId` foi adicionado como metadado aditivo nos seguintes services:

- `clientes.ts` — create e update
- `produtos.ts` — create e update
- `despesas.ts` — create e update
- `contas.ts` — create e update
- `ordens-servico.ts` — create e update
- `ordem-eventos.ts` — create
- `movimentacoes-estoque.ts` — create (apenas manual)
- `vendas.ts` — create

O backend atual deve ignorar o campo. Esta validacao confirma que ele de fato nao rejeita o campo com erro 400/422 e que os fluxos continuam identicos ao comportamento anterior.

---

## 2. Pre-requisitos

Antes de iniciar os testes, confirmar:

- [ ] Branch `nextassist-saas` atualizada e sincronizada com remoto
- [ ] Build frontend passando (`npm run build` sem erros)
- [ ] Ambiente staging disponivel e separado do banco de producao
- [ ] Usuario de teste com perfil admin/gestor criado no staging
- [ ] Dados de teste disponiveis (ao menos um cliente, produto e OS no staging)
- [ ] Plano de rollback conhecido: sabe como reverter o commit ou remover `tenantId` dos payloads se necessario
- [ ] DevTools do browser aberto na aba Network para inspecao de requests

---

## 3. Checklist geral

- [ ] Login com usuario admin/gestor no staging
- [ ] Navegacao entre paginas sem erros visuais
- [ ] Dashboard carrega sem erro
- [ ] Menu exibe os modulos corretos
- [ ] Tela de configuracoes da empresa exibe "RR Infocell" como tenant
- [ ] Plano premium ativo e visivel

---

## 4. Testes de clientes

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar cliente com nome, telefone e documento | Cadastro salvo, sem erro 400/422 | |
| Editar cliente existente | Edicao salva, sem erro 400/422 | |
| Listar clientes | Lista exibe registros corretamente | |
| Abrir detalhe do cliente | Dados exibidos corretamente | |

**Validacao Network (DevTools):**
- [ ] Payload do POST /clientes contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201
- [ ] Payload do PUT /clientes/:id contem `tenantId: "rr-infocell"`

---

## 5. Testes de produtos

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar produto com nome, preco e estoque | Cadastro salvo, sem erro 400/422 | |
| Editar produto existente | Edicao salva, sem erro 400/422 | |
| Listar produtos | Lista exibe registros corretamente | |
| Validar estoque minimo exibido | Valor correto sem alteracao | |

**Validacao Network:**
- [ ] Payload do POST /produtos contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201

---

## 6. Testes de despesas

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar despesa com descricao, categoria e valor | Cadastro salvo, sem erro 400/422 | |
| Editar despesa existente | Edicao salva, sem erro 400/422 | |
| Listar despesas | Lista exibe registros corretamente | |
| Excluir despesa | Exclusao concluida sem erro | |

**Validacao Network:**
- [ ] Payload do POST /despesas contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201

---

## 7. Testes de contas

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar conta financeira (ex: caixa, PIX) | Cadastro salvo, sem erro 400/422 | |
| Editar conta existente | Edicao salva, sem erro 400/422 | |
| Listar contas | Lista exibe registros corretamente | |
| Excluir conta | Exclusao concluida sem erro | |

**Validacao Network:**
- [ ] Payload do POST /contas contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201

---

## 8. Testes de OS

Este e o fluxo mais critico. Testar com atencao especial.

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar OS sem pecas (so defeito e cliente) | OS criada, sem erro 400/422 | |
| Criar OS com uma peca | OS criada, sem erro 400/422 | |
| Criar OS com multiplas pecas | OS criada, sem erro 400/422 | |
| Editar OS existente | Edicao salva, sem erro 400/422 | |
| Listar OS | Lista exibe registros corretamente | |
| Abrir detalhe da OS | Dados exibidos corretamente, sem erro | |
| Validar status da OS | Status exibido e atualizavel normalmente | |
| Criar OS com peca e verificar estoque | Saldo do produto reduzido corretamente (baixa automatica) | |

**Validacao Network:**
- [ ] Payload do POST /ordens-servico contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201
- [ ] Nenhuma chamada secundaria (ex: /movimentacoes-estoque) falha

**Validacao de estoque apos OS com pecas:**
- [ ] Acessar produto usado na OS
- [ ] Confirmar que `estoqueAtual` foi reduzido corretamente
- [ ] Confirmar que movimentacao automatica aparece no historico com `origem: "ordem_servico"`

---

## 9. Testes de eventos da OS

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar comentario/evento em OS existente | Evento salvo, sem erro 400/422 | |
| Verificar timeline da OS | Evento aparece na timeline corretamente | |
| Listar eventos de uma OS | Lista exibe registros corretamente | |

**Validacao Network:**
- [ ] Payload do POST /ordem-eventos contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201

---

## 10. Testes de movimentacoes manuais de estoque

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar entrada manual de estoque | Movimentacao salva, saldo aumentado, sem erro 400/422 | |
| Criar saida manual de estoque | Movimentacao salva, saldo reduzido, sem erro 400/422 | |
| Listar movimentacoes | Lista exibe registros corretamente | |
| Validar saldo do produto apos movimentacao | Saldo correto, consistente com movimentacao | |

**Validacao Network:**
- [ ] Payload do POST /movimentacoes-estoque contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201

**Validacao adicional:**
- [ ] Criar OS com peca apos movimentacao manual — confirmar que baixa automatica continua funcionando

---

## 11. Testes de vendas / PDV

Este e o fluxo de maior acoplamento. Testar com atencao especial.

| Acao | Resultado esperado | Status |
| --- | --- | --- |
| Criar venda com produto | Venda salva, sem erro 400/422 | |
| Criar venda vinculada a cliente | Venda salva, sem erro 400/422 | |
| Criar venda vinculada a OS | Venda salva, sem erro 400/422 | |
| Listar vendas | Lista exibe registros corretamente | |
| Validar estoque apos venda | Saldo reduzido corretamente | |
| Validar financeiro/caixa | Valores corretos, sem inconsistencia | |

**Validacao Network:**
- [ ] Payload do POST /vendas contem `tenantId: "rr-infocell"`
- [ ] Resposta retorna status 200 ou 201
- [ ] Nenhuma chamada secundaria falha

---

## 12. Validacao tecnica via DevTools / Network

Para cada fluxo testado, abrir o DevTools (F12) → aba Network e confirmar:

1. **Request payload contem tenantId**
   - Clicar na requisicao (ex: POST /clientes)
   - Aba "Payload" ou "Request Body"
   - Confirmar que aparece `"tenantId": "rr-infocell"` no JSON

2. **Resposta nao retorna erro**
   - Status deve ser 200 ou 201
   - Nao deve aparecer 400 (Bad Request) ou 422 (Unprocessable Entity)

3. **Nenhuma chamada inesperada falha**
   - Verificar se nao ha requests com status 4xx ou 5xx apos qualquer acao

4. **Inspecao de response body**
   - Confirmar que o dado retornado esta correto (id, campos esperados)
   - Verificar se `tenantId` aparece ou nao no response (depende do backend)

---

## 13. Criterios de aprovacao

A fase de validacao so e considerada aprovada quando:

- [ ] Build passa sem erros
- [ ] Login e navegacao funcionam normalmente
- [ ] Todos os endpoints de criacao/edicao retornam 200 ou 201
- [ ] Nenhum endpoint retorna 400/422 por causa do campo `tenantId`
- [ ] OS sem pecas funciona corretamente
- [ ] OS com pecas funciona e baixa de estoque ocorre como antes
- [ ] Movimentacoes manuais de estoque funcionam
- [ ] Vendas funcionam com e sem OS vinculada
- [ ] Estoque correto apos OS e vendas
- [ ] Financeiro/caixa sem inconsistencia
- [ ] Timeline de OS com eventos registrados corretamente

---

## 14. Criterios de bloqueio

**Nao avancar para a proxima fase se:**

- Backend rejeitar `tenantId` com erro 400 ou 422 em qualquer endpoint
- OS com pecas apresentar erro ou nao reduzir estoque
- Baixa automatica de estoque falhar ou ficar inconsistente
- Venda apresentar erro ou nao registrar no financeiro
- Financeiro ou caixa ficarem com valores incorretos
- Qualquer fluxo critico (OS, estoque, venda) apresentar comportamento diferente do esperado

**Acao em caso de bloqueio:**

1. Nao commitar novas alteracoes
2. Identificar qual endpoint esta rejeitando o campo
3. Verificar se o backend tem validacao estrita de schema (ex: `strict` no Firestore ou middleware rejeitando campos desconhecidos)
4. Reverter o `getTenantScopedPayload` apenas no service afetado
5. Documentar o bloqueio antes de tentar alternativa

---

## 15. Proxima fase sugerida

Se todos os criterios de aprovacao forem atendidos:

**Fase 7.7 — Revisao final da implementacao staging antes de backend/filtros reais**

Objetivo da Fase 7.7:
- Revisar documentacao gerada ate agora
- Confirmar que todos os services criticos estao cobertos
- Mapear o que ainda falta para backend real (filtros, validacao de tenant, isolation)
- Definir quando e como o backend comecara a validar `tenantId`
- Preparar criterios de entrada para a fase de backend multiempresa real
