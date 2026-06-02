# Revisao Final — Staging Tenant Payloads

## 1. Objetivo

Este documento finaliza a etapa de preparacao frontend/staging da implementacao de `tenantId` no NextAssist.

Ate aqui, o trabalho foi exclusivamente aditivo no frontend: os payloads de criacao e edicao das entidades operacionais principais passaram a incluir o campo `tenantId` com o valor `rr-infocell`. Nenhuma regra de negocio, calculo, baixa de estoque, financeiro, impressao ou backend foi alterado.

Esta revisao consolida o estado atual, mapeia o que falta e define os criterios de entrada para a proxima grande etapa: backend e persistencia multiempresa real.

---

## 2. O que ja foi implementado

### Infraestrutura de tenant no frontend

- `frontend/src/config/tenantConfig.ts` — configuracao do tenant padrao
- `frontend/src/lib/tenant.ts` — helpers para obter tenant atual
- `frontend/src/lib/tenantPayload.ts` — helper `getTenantScopedPayload` para enriquecer payloads
- `frontend/src/contexts/TenantContext.tsx` — contexto de tenant para componentes
- `frontend/src/config/planModules.ts` — controle de acesso por plano

### Payloads com tenantId aplicado

- `frontend/src/services/clientes.ts` — createCliente, updateCliente
- `frontend/src/services/produtos.ts` — createProduto, updateProduto
- `frontend/src/services/despesas.ts` — createDespesa, updateDespesa
- `frontend/src/services/contas.ts` — createConta, updateConta
- `frontend/src/services/ordens-servico.ts` — createOrdemServico, updateOrdemServico
- `frontend/src/services/ordem-eventos.ts` — createOrdemEvento
- `frontend/src/services/movimentacoes-estoque.ts` — createMovimentacaoEstoque (manual)
- `frontend/src/services/vendas.ts` — createVenda

### Documentacao produzida

- `docs/nextassist/auditoria-pontos-tenant.md`
- `docs/nextassist/auditoria-fluxos-criticos-tenant.md`
- `docs/nextassist/tenant-payload.md`
- `docs/nextassist/validacao-staging-tenant-payloads.md`

---

## 3. Tabela de cobertura

| Service | createX | updateX | listagem alterada | delete alterado | Risco | Status |
| --- | --- | --- | --- | --- | --- | --- |
| clientes.ts | tenantId | tenantId | Nao | Nao | Baixo | Pronto para staging |
| produtos.ts | tenantId | tenantId | Nao | Nao | Baixo | Pronto para staging |
| despesas.ts | tenantId | tenantId | Nao | Nao | Baixo | Pronto para staging |
| contas.ts | tenantId | tenantId | Nao | Nao | Baixo | Pronto para staging |
| ordens-servico.ts | tenantId | tenantId | Nao | Nao | Alto — baixa de estoque no backend | Aguarda validacao manual |
| ordem-eventos.ts | tenantId | n/a | Nao | n/a | Baixo | Pronto para staging |
| movimentacoes-estoque.ts | tenantId (manual) | n/a | Nao | n/a | Medio — automaticas via OS nao alteradas | Aguarda validacao manual |
| vendas.ts | tenantId | n/a | Nao | n/a | Alto — vincula OS, produto e cliente | Aguarda validacao manual |
| orcamentos.ts | Sem tenantId | n/a | Nao | n/a | Medio | Pendente |
| whatsapp.ts | Sem tenantId | n/a | Nao | n/a | Alto | Pendente |
| usuarios.ts | Sem tenantId | n/a | Nao | n/a | Alto | Pendente |
| checklists.ts | Sem tenantId | n/a | Nao | n/a | Medio | Pendente |
| aparelhos.ts | Sem tenantId | n/a | Nao | n/a | Medio | Pendente |
| categorias.ts | Sem tenantId | n/a | Nao | n/a | Baixo | Pendente |
| marcas.ts | Sem tenantId | n/a | Nao | n/a | Baixo | Pendente |
| fornecedores.ts | Sem tenantId | n/a | Nao | n/a | Medio | Pendente |

---

## 4. O que NAO foi feito ainda

### Backend

- O backend **nao valida** `tenantId` em nenhum endpoint
- O backend **nao rejeita** dados sem `tenantId`
- O backend **nao resolve** tenant a partir do usuario autenticado
- O backend **nao filtra** queries por tenant
- O backend **nao impede** acesso a dados de outro tenant

### Banco de dados

- Nenhuma coluna/campo `tenantId` foi adicionado formalmente
- Nenhuma migration foi criada
- Os dados salvos **nao possuem** `tenantId` estruturado no banco
- O banco **nao possui** isolamento real entre empresas

### Listagens e consultas

- Todas as funcoes `list*` retornam dados sem filtro por tenant
- Um usuario poderia teoricamente ver dados de outro tenant se tivesse acesso ao endpoint

### Relatorios e impressao

- Dashboard consolida dados sem distinguir tenant
- Relatorio financeiro/DRE agrega sem filtro de tenant
- Impressao de OS, orcamento e cupom PDV usa dados da empresa hardcoded via `EMPRESA` de `company.ts`, nao via tenant dinamico
- Orcamentos nao possuem `tenantId` no payload

### Producao

- A producao do RR Infocell **nao deve ser migrada** enquanto o backend nao estiver preparado
- Todos os dados de producao continuam sem `tenantId` estruturado

---

## 5. Riscos restantes

| Risco | Descricao | Impacto | Mitigacao |
| --- | --- | --- | --- |
| Backend ignorar tenantId | Campo enviado mas nao persistido nem validado | Medio — preparacao sem efeito real | Confirmar em staging se campo e persistido |
| Backend rejeitar tenantId com 400/422 | Schema estrito rejeita campo desconhecido | Alto — quebra fluxos operacionais | Validar via checklist de staging; reverter service afetado |
| Dados salvos sem tenantId real | Backend ignora campo; Firestore nao persiste | Medio — migracao futura sera necessaria | Previsto; backend devera ser preparado na Fase 8 |
| Queries sem filtro | Listagens retornam dados de todos os tenants | Alto em SaaS real — vazamento de dados | Bloqueante para multiempresa real; depende de backend |
| Relatorios misturando dados | DRE, dashboard e estoque sem filtro de tenant | Alto — decisoes incorretas | Bloqueante para SaaS; depende de backend e queries |
| OS afetando estoque sem tenant | Baixa automatica de estoque nao distingue tenant | Alto em SaaS real | Bloqueante; depende de backend preparado |
| Impressao sem isolamento | Logo, CNPJ e dados impressos via `company.ts` fixo | Medio em staging; Alto em SaaS | Depende de branding dinamico por tenant |
| Vendas vinculando dados de tenants diferentes | Venda com OS/produto de outro tenant | Alto — inconsistencia financeira | Bloqueante para SaaS; depende de backend |

---

## 6. Validacoes obrigatorias antes de avancar para backend

Antes de iniciar a Fase 8, o checklist completo de validacao manual deve ser executado:

**Referencia:** `docs/nextassist/validacao-staging-tenant-payloads.md`

A fase so pode avancar quando:

- [ ] Todos os endpoints de criacao/edicao retornam 200/201 com tenantId no payload
- [ ] Nenhum endpoint retorna 400/422 por causa do campo `tenantId`
- [ ] OS sem pecas funciona normalmente
- [ ] OS com pecas funciona e baixa de estoque ocorre corretamente
- [ ] Movimentacoes manuais de estoque funcionam
- [ ] Vendas com produto e OS vinculada funcionam
- [ ] Estoque correto apos OS e venda
- [ ] Financeiro/caixa sem inconsistencia
- [ ] Timeline de OS com eventos registrados

---

## 7. Proxima grande etapa recomendada

**Fase 8 — Backend e persistencia multiempresa em staging**

Objetivo: preparar o backend para aceitar, persistir, validar e filtrar `tenantId` de forma real, iniciando por entidades de menor risco e avancando gradualmente para OS, estoque e financeiro.

**A Fase 8 so deve comecar apos:**

- Validacao manual completa da Fase 7.6 aprovada
- Backup do banco de staging realizado e restore validado
- Rollback planejado e testado
- Ambiente staging separado da producao confirmado
- Responsaveis tecnicos definidos para revisar queries e regras de isolamento

---

## 8. Ordem recomendada para implementacao backend futura

| Etapa | Acao | Motivo |
| --- | --- | --- |
| 1 | Criar modelo/colecao de tenants no banco | Base para resolucao de tenant por usuario |
| 2 | Criar tenant padrao `rr-infocell` no banco | Continuar operando sem quebrar producao |
| 3 | Adicionar middleware para resolver tenant do usuario autenticado | Backend nao deve confiar no tenantId do frontend |
| 4 | Adicionar `tenantId` em entidade simples primeiro (ex: categorias ou marcas) | Menor risco; validar pattern sem impacto |
| 5 | Ajustar create/update para persistir `tenantId` | Garantir que novos dados ja nascem com tenant |
| 6 | Ajustar listagens por tenantId (queries com filtro) | Primeiro passo de isolamento real |
| 7 | Ajustar delete e update para validar tenant antes de operar | Impedir operacao em dado de outro tenant |
| 8 | Expandir para clientes, produtos, despesas, contas | Entidades ja com tenantId no payload frontend |
| 9 | Expandir para OS e eventos | Entidade critica; validar baixa de estoque com tenant |
| 10 | Expandir para movimentacoes e vendas | Fluxo de maior acoplamento |
| 11 | Ajustar relatorios e dashboard | Agregacoes com filtro de tenant |
| 12 | Ajustar impressao e orcamentos | Usar dados dinamicos do tenant no documento |

---

## 9. Criterios de bloqueio

**Nao iniciar Fase 8 se:**

- Ambiente staging nao existir ou nao estiver separado da producao
- Testes manuais da Fase 7.6 nao tiverem sido executados
- Backend rejeitar `tenantId` com 400/422 em qualquer endpoint critico
- OS com pecas ou vendas apresentarem falha ou inconsistencia
- Baixa de estoque via OS nao funcionar corretamente
- Backup do banco nao existir ou restore nao tiver sido validado
- Rollback nao estiver documentado e testado
- Nenhum responsavel tecnico definido para revisar isolamento de queries

---

## 10. Conclusao

O frontend esta preparado para enviar `tenantId: "rr-infocell"` em todos os payloads de criacao e edicao das entidades operacionais principais.

**O sistema, entretanto, ainda nao e multiempresa real.**

Isolamento verdadeiro entre empresas requer que o backend:

1. resolva o tenant a partir do usuario autenticado (nao do payload);
2. filtre todas as queries por tenant;
3. valide que create/update/delete operem somente no tenant correto;
4. impeca vazamento de dados entre empresas.

O que foi feito no frontend e uma preparacao de payloads para facilitar a Fase 8, mas nao substitui a implementacao real de isolamento no backend e banco.

**A producao do RR Infocell continua protegida.** Nenhuma alteracao critica foi feita no backend, banco, migrations, regras de negocio, calculo financeiro, baixa de estoque ou impressao.

A Fase 7 esta encerrada.
