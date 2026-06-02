# Checklist de Execução — Migração tenantId em Produção (Fase 8.9.4)

## 1. Identificação

| Campo | Valor |
| --- | --- |
| Data planejada | _a preencher antes da execução_ |
| Ambiente | `production` — projeto Firebase `rr-infocell` |
| Branch | `nextassist-saas` |
| Script | `backend/src/scripts/migrate-tenantId.ts` |
| Responsável técnico | _a preencher_ |
| Responsável por validar no sistema | _a preencher_ |

---

## 2. Checklist pré-execução

Todos os itens abaixo devem estar marcados antes de rodar o script.

### Backup

- [ ] Backup do Firestore exportado para bucket GCS
- [ ] Nome/path do bucket: `gs://_______________/backup-pre-migracao-tenantId-___________`
- [ ] Export confirmado no bucket (arquivo `.overall_export_metadata` presente)
- [ ] Procedimento de restore testado ou documentado (`gcloud firestore import <path>`)

### Dry-run e dados

- [ ] Dry-run mais recente executado: `docs/nextassist/reports/audit-tenantId-dry-run-2026-05-26T18-46-04.md`
- [ ] Relatório do dry-run revisado e aprovado (`docs/nextassist/resultado-dry-run-tenantId.md`)
- [ ] Volumes por collection confirmados:
  - clientes: 43 documentos
  - produtos: 21 documentos
  - ordensServico: 51 documentos
  - vendas: 38 documentos
  - movimentacoesEstoque: 55 documentos
  - **Total: 208 documentos**
- [ ] Zero inconsistências confirmadas no dry-run

### Script e ordem

- [ ] Ordem de migração aprovada: Lote 1 (clientes/produtos) → Lote 2 (OS/vendas/movimentações)
- [ ] Script revisado: `backend/src/scripts/migrate-tenantId.ts`
- [ ] Guard `ALLOW_MIGRATION=true` compreendido — sem a variável o script aborta sem escrever nada

### Contexto operacional

- [ ] Janela de menor uso definida: _a preencher_ (ex.: fora do horário comercial)
- [ ] Plano de rollback documentado (ver Seção 4)
- [ ] Tag de segurança criada antes da execução:
  ```
  git tag nextassist-before-tenantId-production-migration
  git push origin nextassist-before-tenantId-production-migration
  ```
- [ ] Tag acima confirmada no repositório remoto

### Decisão consciente

- [ ] **Decisão registrada**: não há ambiente Firebase separado de staging — a migração será executada diretamente em produção, com backup prévio como única proteção.

---

## 3. Comando de execução

### PowerShell (Windows)

```powershell
cd backend
$env:ALLOW_MIGRATION="true"
npx tsx src/scripts/migrate-tenantId.ts
```

### Git Bash / WSL / Linux / macOS

```bash
cd backend
ALLOW_MIGRATION=true npx tsx src/scripts/migrate-tenantId.ts
```

> O script aborta imediatamente em caso de erro. Nenhuma escrita parcial é deixada sem log.
> O relatório é gerado em `docs/nextassist/reports/migrate-tenantId-<timestamp>.md`.

---

## 4. Plano de rollback

| Situação | Ação |
| --- | --- |
| Script interrompido antes do Lote 2 | Lote 1 pode ter sido parcialmente aplicado — script é idempotente, re-executar completa sem duplicar |
| Erro no Lote 2 | Lote 1 já commitado — avaliar re-executar somente Lote 2 ou restaurar backup completo |
| Dados incorretos descobertos pós-execução | Restaurar backup via `gcloud firestore import gs://<bucket>/<path>` |
| Rollback pontual | Usar o relatório gerado (`migrate-tenantId-<timestamp>.md`) para identificar os IDs alterados e remover `tenantId` campo a campo com script separado |

Referência completa: `docs/nextassist/plano-migracao-tenantId-dados-antigos.md` (Seção 8).

---

## 5. Checklist pós-execução

Executar imediatamente após o script terminar sem erros.

### Relatório e terminal

- [ ] Terminal encerrado com `CONCLUIDO` (sem `ERRO`)
- [ ] Relatório gerado: `docs/nextassist/reports/migrate-tenantId-<timestamp>.md`
- [ ] Total migrado no relatório bate com os volumes do dry-run (~208 documentos)
- [ ] Nenhum documento listado como erro no relatório

### Firestore — spot check manual

- [ ] Abrir Firestore Console → collection `clientes` → confirmar campo `tenantId: "rr-infocell"` em pelo menos 3 documentos aleatórios
- [ ] Abrir `ordensServico` → confirmar `tenantId` em pelo menos 3 OS antigas
- [ ] Abrir `vendas` → confirmar `tenantId` em pelo menos 3 vendas antigas
- [ ] Abrir `movimentacoesEstoque` → confirmar `tenantId` em pelo menos 3 movimentações antigas

### Sistema — listagens

- [ ] Listagem de clientes carrega registros antigos
- [ ] Listagem de produtos carrega registros antigos
- [ ] Listagem de OS carrega registros antigos (filtrar por status)
- [ ] Listagem de movimentações de estoque carrega registros antigos
- [ ] Listagem de vendas carrega registros antigos
- [ ] Listagem de despesas (não migradas por script — sem tenantId ainda — não devem aparecer somem)
- [ ] Listagem de contas (idem despesas)

### Sistema — fluxos críticos

- [ ] Abrir uma OS antiga → dados carregados corretamente
- [ ] OS antiga com venda vinculada → venda visível no PDV / detalhe da OS
- [ ] `findByOrdem` não retorna null indevido (testar finalização de OS antiga se seguro)
- [ ] Criar novo cliente → aparece na listagem imediatamente
- [ ] Criar nova OS → aparece na listagem imediatamente

### Consistência de estoque e financeiro

- [ ] Estoque de produtos antigos visível e sem inconsistência
- [ ] Movimentações de OS antigas visíveis e consistentes com a OS

---

## 6. Pós-execução: próxima fase

Após o script rodar e todos os itens do Checklist Pós-Execução estarem marcados:

**Fase 8.9.5 — Registro do resultado real da migração**

Criar `docs/nextassist/reports/migrate-tenantId-<timestamp>.md` já é gerado automaticamente pelo script.
A Fase 8.9.5 consiste em:
- Revisar o relatório gerado
- Registrar em `docs/nextassist/resultado-migracao-tenantId.md` o resultado real (volumes, erros, observações)
- Commitar o relatório e o registro de resultado
- Marcar a tag `nextassist-phase-8-9-5-migration-complete`

---

## 7. Referências

| Documento | Localização |
| --- | --- |
| Plano geral de migração | `docs/nextassist/plano-migracao-tenantId-dados-antigos.md` |
| Guia do dry-run | `docs/nextassist/dry-run-tenantId-auditoria.md` |
| Resultado do dry-run | `docs/nextassist/resultado-dry-run-tenantId.md` |
| Relatório gerado pelo dry-run | `docs/nextassist/reports/audit-tenantId-dry-run-2026-05-26T18-46-04.md` |
| Script de migração | `backend/src/scripts/migrate-tenantId.ts` |
| Script de auditoria (dry-run) | `backend/src/scripts/audit-tenantId-dry-run.ts` |
