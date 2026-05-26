# Resultado do Dry-Run — Auditoria de tenantId (Fase 8.9.2)

## 1. Objetivo

Este documento registra a analise do relatorio gerado pelo script dry-run de auditoria de tenantId,
define decisoes de migracao com base nos dados reais e estabelece os criterios para avancar para a
Fase 8.9.3 (script real de migracao).

Nenhuma escrita foi feita no Firestore. Este documento e de analise.

---

## 2. Execucao

| Campo | Valor |
| --- | --- |
| Data/hora | 2026-05-26T18:46:04.004Z |
| Ambiente detectado | `production` (NODE_ENV=production) |
| Projeto Firebase | `rr-infocell` |
| Comando executado | `cd backend && npx tsx src/scripts/audit-tenantId-dry-run.ts` |
| Relatorio gerado | `docs/nextassist/reports/audit-tenantId-dry-run-2026-05-26T18-46-04.md` |
| Escrita no Firestore | **Nenhuma** |

### ⚠️ Nota sobre o ambiente

O script detectou `NODE_ENV=production` e rodou contra o projeto Firebase `rr-infocell`, que e o
ambiente de producao real. O script foi somente leitura — nenhum dado foi alterado.

**O script de migracao real (Fase 8.9.3) ira rodar no mesmo ambiente**, pois o projeto nao possui
ambiente separado de staging no Firebase. A migracao sera feita diretamente em producao, com backup
previo obrigatorio.

---

## 3. Resumo por collection

| Collection | Total | Com tenantId | Sem tenantId | % sem | Acao recomendada |
| --- | --- | --- | --- | --- | --- |
| marcas | 0 | 0 | 0 | 0% | Nenhuma — sem registros customizados |
| categorias | 0 | 0 | 0 | 0% | Nenhuma — sem registros customizados |
| clientes | 43 | 0 | **43** | 100% | Script ou edicao manual (Grupo A) |
| produtos | 23 | 2 | **21** | 91.3% | Script ou edicao manual (Grupo A) |
| despesas | 0 | 0 | 0 | 0% | Nenhuma — sem registros |
| contas | 0 | 0 | 0 | 0% | Nenhuma — sem registros |
| ordensServico | 51 | 0 | **51** | 100% | Script + bloco OS/venda/mov (Grupo A+C) |
| movimentacoesEstoque | 59 | 4 | **55** | 93.2% | Script obrigatorio (Grupo B) |
| vendas | 38 | 0 | **38** | 100% | Script obrigatorio, bloco com OS (Grupo B+C) |
| **TOTAL** | **214** | **6** | **208** | **97.2%** | |

**Observacao:** dos 6 documentos com tenantId, 2 sao produtos e 4 sao movimentacoes criados apos a
implantacao das Fases 8.5 e 8.7.2 respectivamente. Confirmam que a persistencia esta funcionando
corretamente para novos registros.

---

## 4. Relacoes criticas

### Resumo

| Metrica | Valor |
| --- | --- |
| Total de OS sem tenantId | 51 |
| OS com venda vinculada | 35 |
| OS sem venda (nao finalizadas no PDV) | 16 |
| OS com movimentacao vinculada | 18 |
| Inconsistencias (OS sem tenantId + venda/mov com tenantId) | **0** |

### Resultado mais favoravel possivel: zero inconsistencias

Nenhuma OS tem venda ou movimentacao que ja possua tenantId. Isso significa que o conjunto de dados
e consistente — todas as OS antigas, suas vendas e movimentacoes estao uniformemente sem tenantId.
O script de migracao pode aplicar tenantId em blocos coesos sem conflito.

### OS com maior numero de movimentacoes vinculadas

| OS | Movimentacoes vinculadas |
| --- | --- |
| OS-31 (`sFV7fVV05TLFOkA6XZDL`) | 4 movimentacoes |
| OS-35 (`aB2jJ7WIO6L9lTuhFsN6`) | 2 movimentacoes |
| OS-3, OS-2, OS-21, OS-37, OS-42, OS-45, OS-53, OS-68 | 1 movimentacao cada |

### Movimentacoes sem vinculo com OS (manuais)

Total sem tenantId: 55. OS mapeadas vincularam uma parte dessas movimentacoes. As restantes sao
movimentacoes manuais (entrada ou saida sem `ordemServicoId`) e devem ser migradas separadamente
no script, sem dependencia de OS.

---

## 5. Decisao de migracao

Com base nos dados do dry-run:

| Collection | Migrar via script? | Lote | Observacao |
| --- | --- | --- | --- |
| marcas | Nao necessario | — | 0 registros |
| categorias | Nao necessario | — | 0 registros |
| despesas | Nao necessario | — | 0 registros |
| contas | Nao necessario | — | 0 registros |
| clientes | **Sim (recomendado)** | 1 | 43 registros — escala impratica para edicao manual |
| produtos | **Sim (recomendado)** | 1 | 21 registros — escala aceitavel, mas script e mais seguro |
| ordensServico | **Sim** | 2 | 51 registros — parte do bloco OS/venda/mov |
| movimentacoesEstoque | **Sim** | 2 | 55 registros — parte do bloco + manuais separados |
| vendas | **Sim** | 2 | 38 registros — parte do bloco OS/venda |

### Ordem recomendada de migracao

```
Lote 1 (sem dependencias):
  clientes  →  43 documentos
  produtos  →  21 documentos

Lote 2 (bloco critico — executar junto):
  ordensServico         →  51 documentos
  vendas vinculadas     →  38 documentos
  movimentacoes da OS   →  ~37 documentos (vinculadas)
  movimentacoes manuais →  ~18 documentos (sem ordemServicoId)
```

**Total estimado a migrar: 208 documentos em 2 lotes.**

---

## 6. Riscos identificados

| Risco | Probabilidade | Mitigacao |
| --- | --- | --- |
| Script rodar em producao sem backup | Alta se nao controlado | Backup obrigatorio antes do Lote 1 |
| Migrar OS sem venda vinculada | Eliminado (zero inconsistencias) | Script processa bloco completo |
| 1 OS extra (OS-51 ausente na lista — lista limitada a 50) | Baixa | Script processa por query, nao por lista hardcoded |
| Movimentacoes manuais nao vinculadas a OS ficarem fora do bloco 2 | Media | Script deve cobrir todas movimentacoes sem tenantId, independente de ordemServicoId |
| Ambiguidade de ambiente (NODE_ENV=production) | Confirmada | Script 8.9.3 deve ter guard explicitico — ex.: variavel `ALLOW_MIGRATION=true` separada |
| 2 produtos ja com tenantId serem sobrescritos | Eliminada | Script deve verificar `!data.tenantId` antes de escrever |

---

## 7. Criterios para avancar para a Fase 8.9.3

A Fase 8.9.3 (script real de migracao) so deve ser iniciada quando todos os itens abaixo estiverem
confirmados:

- [x] Dry-run executado com sucesso
- [x] Relatorio gerado e revisado
- [x] Volumes por collection conhecidos (208 documentos a migrar)
- [x] Zero inconsistencias — conjunto de dados limpo para migracao
- [x] Ordem de migracao definida (Lote 1: clientes/produtos | Lote 2: OS/vendas/movimentacoes)
- [ ] **Backup do Firestore realizado antes de qualquer escrita**
- [ ] Guard de ambiente definido para o script real (ex.: `ALLOW_MIGRATION=true` ou `.env.migration`)
- [ ] Responsavel pela validacao pos-script confirmado
- [ ] Decisao consciente: migracao sera feita diretamente em producao (sem staging Firebase separado)

---

## 8. Proxima fase — 8.9.3

**Objetivo:** criar o script de migracao real com:

- Guard de ambiente: verificar variavel separada (`ALLOW_MIGRATION=true`) antes de qualquer escrita
- Processamento em dois lotes:
  - **Lote 1:** clientes + produtos (sem dependencias cruzadas)
  - **Lote 2:** OS + vendas vinculadas + movimentacoes (bloco conjunto, mesmo batch Firestore)
- Verificacao pre-escrita: `if (doc.data().tenantId) continue` — nunca sobrescreve tenantId existente
- Log de cada documento alterado (id, collection, timestamp)
- Parada imediata em caso de erro
- Relatorio final gerado em `docs/nextassist/reports/`
- Script idempotente: rodar duas vezes produz o mesmo resultado

**O script da 8.9.3 sera criado para rodar em producao**, com backup obrigatorio antes da execucao.

Referencia: `docs/nextassist/plano-migracao-tenantId-dados-antigos.md`
