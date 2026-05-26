# Checklist de Execucao — Staging Tenant Payloads

## Como usar

Execute item por item no ambiente staging com DevTools aberto (F12 → aba Network).
Registre o resultado de cada teste antes de avancar.

**Colunas:**
- **Resultado:** OK | Falhou | Pulado
- **Observacao:** endpoint, status HTTP, mensagem de erro ou comportamento inesperado

---

## Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Branch `nextassist-saas` atualizada | | |
| Build passando (`npm run build` sem erros) | | |
| Ambiente staging disponivel e separado da producao | | |
| Usuario admin/gestor criado no staging | | |
| DevTools aberto, aba Network ativa | | |
| Rollback conhecido (sabe como reverter se necessario) | | |

---

## Geral

| Item | Resultado | Observacao |
| --- | --- | --- |
| Login funciona normalmente | | |
| Navegacao entre paginas sem erro visual | | |
| Dashboard carrega sem erro | | |
| Tenant exibe "RR Infocell" | | |
| Plano premium ativo e visivel | | |

---

## Clientes

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar cliente → sem erro 400/422 | | |
| Editar cliente existente → sem erro 400/422 | | |
| Listar clientes → lista correta | | |
| Network: POST /clientes tem `"tenantId": "rr-infocell"` | | |
| Network: PUT /clientes/:id tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## Produtos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar produto → sem erro 400/422 | | |
| Editar produto existente → sem erro 400/422 | | |
| Listar produtos → lista correta | | |
| Estoque minimo exibido corretamente | | |
| Network: POST /produtos tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## Despesas

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar despesa → sem erro 400/422 | | |
| Editar despesa existente → sem erro 400/422 | | |
| Listar despesas → lista correta | | |
| Network: POST /despesas tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## Contas

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar conta → sem erro 400/422 | | |
| Editar conta existente → sem erro 400/422 | | |
| Listar contas → lista correta | | |
| Network: POST /contas tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## OS — CRITICO

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar OS sem pecas → sem erro 400/422 | | |
| Criar OS com uma peca → sem erro 400/422 | | |
| Criar OS com multiplas pecas → sem erro 400/422 | | |
| Editar OS existente → sem erro 400/422 | | |
| Listar OS → lista correta | | |
| Abrir detalhe da OS → dados corretos | | |
| Validar status da OS → atualizavel normalmente | | |
| Estoque do produto apos OS com peca → saldo reduzido corretamente | | |
| Historico de movimentacoes → aparece com `origem: ordem_servico` | | |
| Network: POST /ordens-servico tem `"tenantId": "rr-infocell"` | | |
| Nenhuma chamada secundaria falhou | | |
| Response retorna status 200 ou 201 | | |

---

## Eventos da OS

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar comentario/evento em OS → sem erro 400/422 | | |
| Evento aparece na timeline corretamente | | |
| Listar eventos da OS → lista correta | | |
| Network: POST /ordem-eventos tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## Movimentacoes Manuais de Estoque

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar entrada manual → sem erro 400/422, saldo aumentado | | |
| Criar saida manual → sem erro 400/422, saldo reduzido | | |
| Listar movimentacoes → lista correta | | |
| Saldo do produto correto apos movimentacao | | |
| Criar OS com peca apos movimentacao → baixa automatica continua funcionando | | |
| Network: POST /movimentacoes-estoque tem `"tenantId": "rr-infocell"` | | |
| Response retorna status 200 ou 201 | | |

---

## Vendas / PDV — CRITICO

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar venda com produto → sem erro 400/422 | | |
| Criar venda vinculada a cliente → sem erro 400/422 | | |
| Criar venda vinculada a OS → sem erro 400/422 | | |
| Estoque correto apos venda | | |
| Financeiro/caixa sem inconsistencia | | |
| Network: POST /vendas tem `"tenantId": "rr-infocell"` | | |
| Nenhuma chamada secundaria falhou | | |
| Response retorna status 200 ou 201 | | |

---

## Resultado final

| Area | Status geral | Observacao |
| --- | --- | --- |
| Pre-requisitos | | |
| Geral | | |
| Clientes | | |
| Produtos | | |
| Despesas | | |
| Contas | | |
| OS | | |
| Eventos da OS | | |
| Movimentacoes | | |
| Vendas / PDV | | |

**Data de execucao:** ___/___/______

**Executado por:** ___________________________

**Ambiente staging:** ___________________________

---

## Regra de decisao

### Se tudo passar

Liberado iniciar **Fase 8.0 — Auditoria real do backend multiempresa**.

### Se algum endpoint retornar 400/422 por causa de tenantId

1. Parar imediatamente. Nao iniciar Fase 8.
2. Identificar qual endpoint rejeitou o campo.
3. Anotar na coluna Observacao: endpoint, status HTTP e mensagem de erro.
4. Reverter apenas o service afetado (remover `getTenantScopedPayload` somente naquele service).
5. Documentar a falha antes de tentar alternativa.
6. Nao avançar com outros fluxos ate entender o motivo da rejeicao.
