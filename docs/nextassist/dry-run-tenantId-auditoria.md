# Dry-Run — Auditoria de tenantId (Fase 8.9.1)

## Objetivo

Identificar todos os documentos sem `tenantId` no Firestore de staging, mapear relacoes criticas entre OS, vendas e movimentacoes, e gerar um relatorio de leitura para embasar a decisao de migracao. Nenhuma escrita e feita no banco.

---

## Pre-requisitos

| Item | Como verificar |
| --- | --- |
| Acesso ao Firestore de staging | Variavel `GOOGLE_APPLICATION_CREDENTIALS` apontando para chave de servico do projeto staging |
| `FIREBASE_PROJECT_ID` configurado | Verificar `.env` ou `.env.local` em `backend/` |
| Node.js + tsx instalados | `cd backend && npx tsx --version` |
| Backend buildado ou tsx disponivel | tsx compila na hora, nao precisa de build previo |

---

## Como executar

```bash
cd backend
npx tsx src/scripts/audit-tenantId-dry-run.ts
```

O script:
1. Conecta ao Firestore usando as credenciais de ambiente
2. Le cada collection sem escrever nada
3. Mapeia relacoes OS → vendas → movimentacoes
4. Gera relatorio Markdown em `docs/nextassist/reports/audit-tenantId-dry-run-<timestamp>.md`
5. Exibe resumo no terminal

---

## Saida esperada no terminal

```
============================================================
AUDIT DRY-RUN — Documentos sem tenantId no Firestore
MODO SOMENTE LEITURA — Nenhuma escrita sera feita
============================================================

Ambiente:  development
Projeto:   rr-infocell-staging
Timestamp: 2026-05-26T12:00:00.000Z

Analisando collections...
  marcas... ok
  categorias... ok
  clientes... 12 sem tenantId
  produtos... 8 sem tenantId
  despesas... 3 sem tenantId
  contas... 2 sem tenantId
  ordensServico... 45 sem tenantId
  movimentacoesEstoque... 87 sem tenantId
  vendas... 31 sem tenantId

Mapeando relacoes OS → vendas → movimentacoes (45 OS sem tenantId)...
  45 OS mapeadas

============================================================
RESUMO
============================================================

✅  marcas                 0/15 sem tenantId
✅  categorias             0/12 sem tenantId
⚠️  clientes               12/145 sem tenantId
⚠️  produtos               8/92 sem tenantId
⚠️  despesas               3/48 sem tenantId
⚠️  contas                 2/5 sem tenantId
⚠️  ordensServico          45/312 sem tenantId
⚠️  movimentacoesEstoque   87/654 sem tenantId
⚠️  vendas                 31/287 sem tenantId

Total: 1570 documentos | Sem tenantId: 188
OS mapeadas: 45 | Inconsistencias: 0

Relatorio gerado em:
  /caminho/para/docs/nextassist/reports/audit-tenantId-dry-run-2026-05-26T12-00-00.md

Nenhuma escrita foi feita no Firestore.
============================================================
```

---

## Como interpretar o resultado

### Tabela de volumes

| Icone | Significado |
| --- | --- |
| ✅ | Todos os documentos da collection ja possuem tenantId — nenhuma acao necessaria |
| ⚠️ | Ha documentos sem tenantId — avaliar acao conforme grupo |

### Grupos de acao

| Collection | Grupo | Acao |
| --- | --- | --- |
| marcas, categorias | A | Editar o registro aplica tenantId automaticamente |
| clientes, produtos, despesas | A | Editar o registro aplica tenantId automaticamente |
| ordensServico | A | Editar qualquer campo ou mudar status aplica tenantId |
| contas | B | Script obrigatorio — PUT parcial nao injeta tenantId |
| movimentacoesEstoque | B | Script obrigatorio — imutavel, sem update() |
| vendas | B | Script obrigatorio — append-only, sem update() |

### Secao de relacoes criticas

O script mapeia cada OS sem `tenantId` e lista suas vendas e movimentacoes vinculadas. Prestar atencao em:

| Indicador | O que significa | Acao |
| --- | --- | --- |
| OS sem tenantId, venda sem tenantId | Situacao normal — migrar OS + venda juntas | OK para script conjunto |
| OS sem tenantId, venda **com** tenantId ⚠️ | Inconsistencia — venda ja foi migrada, OS nao | Revisar antes do script |
| OS sem tenantId, nenhuma venda | OS sem finalizacao no PDV — migrar apenas a OS | Mais simples |
| OS sem tenantId, movimentacao **com** tenantId ⚠️ | Inconsistencia parcial | Revisar antes do script |

### Arquivo de relatorio

O relatorio Markdown gerado em `docs/nextassist/reports/` contem:
- Data/hora e ambiente da auditoria
- Tabela completa de volumes
- Lista de IDs sem tenantId por collection (limitada a 50 por collection)
- Mapeamento completo de relacoes OS → vendas → movimentacoes
- Recomendacoes por grupo

---

## O que o script NAO faz

- Nao escreve nada no Firestore
- Nao atualiza, cria ou remove documentos
- Nao chama `.set()`, `.update()`, `.delete()` ou `.batch().commit()`
- Nao executa migracao real
- Nao altera backend, services ou rotas

---

## Criterios para aprovar proxima fase (script real)

O relatorio desta auditoria deve ser revisado e todos os itens abaixo aprovados antes de criar o script de migracao real:

- [ ] Volumes por collection conhecidos e registrados
- [ ] Nenhuma inconsistencia critica (OS com tenantId mas venda vinculada sem, ou vice-versa) sem plano de resolucao
- [ ] Decisao tomada: quais collections migrar via script vs. edicao manual
- [ ] Ordem de migracao definida (ver `plano-migracao-tenantId-dados-antigos.md`)
- [ ] Backup do Firestore realizado antes do script real
- [ ] Responsavel pela validacao pos-script definido
- [ ] Staging validado com a 8.8.9 antes de qualquer producao

---

## Proxima fase — 8.9.2

**Objetivo:** criar o script de migracao real, somente apos aprovacao do relatorio desta auditoria.

O script da 8.9.2:
- Rodara apenas em staging primeiro
- Processara OS + vendas + movimentacoes vinculadas no mesmo batch
- Nao sobrescrevera tenantId existente
- Gerara log de cada documento alterado
- Incluira guard de ambiente (nao roda em producao)
