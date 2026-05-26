# Resultado da Migração real — tenantId em Produção (Fase 8.9.5)

## 1. Identificação da execução

| Campo | Valor |
| --- | --- |
| Data | 2026-05-26 |
| Projeto Firebase | `rr-infocell` |
| Ambiente exibido pelo script | `development` (ver Observação abaixo) |
| Branch | `nextassist-saas` |
| Script executado | `backend/src/scripts/migrate-tenantId.ts` |
| Comando usado (PowerShell) | `$env:ALLOW_MIGRATION="true"` + `npx tsx src/scripts/migrate-tenantId.ts` |
| Status de encerramento | **CONCLUIDO** — sem erro no terminal |

---

## 2. Backup

| Campo | Valor |
| --- | --- |
| Bucket GCS | `gs://rr-infocell-firestore-backups-91248386036/backup-pre-migracao-20260526-1635` |
| Realizado antes da execução | Sim |

---

## 3. Relatório gerado pelo script

`docs/nextassist/reports/migrate-tenantId-2026-05-26T19-38-22.md`

---

## 4. Resultado por lote

### Lote 1 — clientes + produtos

| Collection | Migrados |
| --- | --- |
| clientes | 43 |
| produtos | 21 |
| **Total migrado** | **64** |
| Pulados (já tinham tenantId) | 2 |

### Lote 2 — OS + vendas + movimentações

| Collection | Migrados |
| --- | --- |
| ordensServico | 51 OS sem tenantId |
| movimentacoesEstoque | 32 manuais sem tenantId |
| vendas | 1 direta sem tenantId |
| **Total migrado** | **139** |
| Pulados (já tinham tenantId) | 4 |

### Consolidado

| Métrica | Valor |
| --- | --- |
| **Total migrado** | **203** |
| Total pulado (idempotência) | 6 |

> Nota: o dry-run estimou 208 documentos a migrar. Os 6 pulados são documentos que já
> possuíam tenantId (2 produtos + 4 movimentações criadas após as Fases 8.5 e 8.7.2),
> confirmando o comportamento esperado. O número real migrado (203) é consistente.

---

## 5. Observação — ambiente exibido como `development`

O script exibiu `Ambiente: development` no terminal, mas `Projeto: rr-infocell`.

**Explicação:** `NODE_ENV` não estava definido como `production` na sessão do terminal local,
mas as credenciais do Firebase Admin SDK (`GOOGLE_APPLICATION_CREDENTIALS`) apontavam para
o projeto `rr-infocell`, que é o ambiente de produção real. A escrita ocorreu no projeto correto.

**Melhoria sugerida para próximas migrações:** adicionar variável explícita de target, por exemplo:

```
MIGRATION_TARGET=production
```

E no script, exibir e logar essa variável separadamente do `NODE_ENV`, para evitar ambiguidade
entre o ambiente Node.js da sessão e o projeto Firebase alvo da escrita.

---

## 6. Checklist de validação pós-migração

- [ ] Listagem de clientes — registros antigos aparecem
- [ ] Listagem de produtos — registros antigos aparecem
- [ ] Listagem de OS — registros antigos aparecem
- [ ] Listagem de movimentações de estoque — registros antigos aparecem
- [ ] Listagem de vendas — registros antigos aparecem
- [ ] OS vinculada à venda — venda continua associada corretamente
- [ ] `findByOrdem` não retorna null indevido
- [ ] Estoque continua correto (histórico de movimentações consistente)
- [ ] Criar OS com peça baixa estoque normalmente
- [ ] Criar venda funciona normalmente
- [ ] Firestore Console — `tenantId: "rr-infocell"` confirmado em documentos de clientes
- [ ] Firestore Console — `tenantId: "rr-infocell"` confirmado em documentos de produtos
- [ ] Firestore Console — `tenantId: "rr-infocell"` confirmado em documentos de ordensServico
- [ ] Firestore Console — `tenantId: "rr-infocell"` confirmado em documentos de movimentacoesEstoque
- [ ] Firestore Console — `tenantId: "rr-infocell"` confirmado em documentos de vendas

---

## 7. Próxima fase

Após validação completa do checklist acima:

- Marcar todos os itens como `[x]` neste documento
- Commitar o documento atualizado
- Avaliar se há necessidade de nova rodada do dry-run para confirmar que `semTenantId = 0` em todas as collections migradas
- Considerar melhoria do guard de ambiente para scripts futuros (`MIGRATION_TARGET`)

---

## 8. Referências

| Documento | Localização |
| --- | --- |
| Checklist pré-execução | `docs/nextassist/checklist-execucao-migracao-producao.md` |
| Resultado do dry-run | `docs/nextassist/resultado-dry-run-tenantId.md` |
| Plano geral de migração | `docs/nextassist/plano-migracao-tenantId-dados-antigos.md` |
| Relatório gerado pelo script | `docs/nextassist/reports/migrate-tenantId-2026-05-26T19-38-22.md` |
