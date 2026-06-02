# Plano de Migracao — tenantId em Dados Antigos (Fase 8.9)

## 1. Objetivo

Este plano define como migrar dados antigos sem `tenantId` para `tenantId: "rr-infocell"` de forma controlada, sem risco de perda de dados ou inconsistencia entre entidades relacionadas. Nenhum script sera executado nesta fase — o objetivo e planejar e aprovar antes de implementar qualquer automacao.

---

## 2. Estado atual

| Aspecto | Situacao |
| --- | --- |
| Novos registros | Recebem `tenantId: "rr-infocell"` automaticamente via backend |
| Listagens | Filtram por `tenantId` em todas as entidades principais |
| Registros antigos | Ficam ocultos nas listagens filtradas |
| Producao | Nao deve receber deploy ate que a decisao de migracao esteja aprovada |

O sistema funciona corretamente para novos registros. O ponto pendente e decidir o que fazer com o historico anterior ao inicio da persistencia de `tenantId` (Fases 8.2 a 8.7.4).

---

## 3. Entidades por estrategia de migracao

### Grupo A — Migracao gradual por edicao (sem script)

Estas entidades possuem `update()` com fallback `current.tenantId ?? DEFAULT_TENANT_ID`. Qualquer edicao aplica `tenantId` automaticamente — sem necessidade de script se a equipe puder editar os registros relevantes manualmente.

| Entidade | Como migrar sem script |
| --- | --- |
| clientes | Editar qualquer campo (nome, telefone, observacoes) |
| produtos | Editar qualquer campo (nome, preco, estoque) |
| despesas | Editar qualquer campo (valor, vencimento, pago) |
| ordens-servico | Editar qualquer campo ou mudar status |

**Quando usar script mesmo assim:** se o volume de registros antigos for alto e editar manualmente cada um for inviavel operacionalmente, um script pontual e valido. A decisao depende do volume (ver Secao 5).

---

### Grupo B — Precisam de script obrigatorio

Estas entidades nao voltam naturalmente via edicao.

| Entidade | Motivo |
| --- | --- |
| contas | PUT `/contas/:id` usa `ref.update()` parcial — nao injeta `tenantId` |
| movimentacoes-estoque | Entidade imutavel — nao existe `update()` por design |
| vendas | Append-only — nao existe `update()` por design |

**Contas:** o PUT atual nao foi alterado para injetar `tenantId` (intencional — regra de seguranca das fases anteriores). Para recuperar contas antigas, o script e o caminho mais seguro. Alternativamente, pode-se alterar o PUT para injetar `tenantId` em uma fase futura separada.

**Movimentacoes e vendas:** registros de historico financeiro e operacional. A decisao de migrar deve considerar se esse historico e necessario para relatorios, auditoria ou consulta do cliente.

---

### Grupo C — Migracao conjunta obrigatoria

OS, vendas vinculadas e movimentacoes vinculadas sao interdependentes e **devem ser migradas no mesmo lote de script**.

```
Cenario de risco:

OS antiga (sem tenantId) ←── ordemServicoId ──→ Venda antiga (sem tenantId)
         ↓                                               ↓
   Migrar SEM migrar venda                    findByOrdem() retorna null
         ↓                                               ↓
   OS aparece na listagem              Permite criar venda duplicada com tenantId
```

**Regra obrigatoria do script:**

```
Para cada OS a migrar:
  1. Buscar venda com ordemServicoId == OS.id
  2. Buscar movimentacoes com ordemServicoId == OS.id
  3. Aplicar tenantId na OS
  4. Aplicar tenantId na(s) venda(s) vinculada(s)
  5. Aplicar tenantId nas movimentacoes vinculadas
  6. Tudo no mesmo batch — ou nada
```

---

## 4. Ordem segura de migracao

| Etapa | Acao | Observacao |
| --- | --- | --- |
| 1 | Backup completo do Firestore (staging) | Exportar antes de qualquer script |
| 2 | Contar documentos sem `tenantId` por colecao | Ver Secao 5 |
| 3 | Rodar dry-run sem escrita | Ver Secao 6 |
| 4 | Revisar relatorio do dry-run | Identificar inconsistencias antes de escrever |
| 5 | Migrar marcas e categorias, se necessario | Volume provavelmente baixo |
| 6 | Migrar contas | Sem dependencias cruzadas |
| 7 | Migrar clientes, produtos, despesas | Apenas se nao for usar edicao manual |
| 8 | Migrar OS | Bloco critico — executar junto com etapas 9 e 10 |
| 9 | Migrar movimentacoes vinculadas as OS migradas | Mesmo batch da etapa 8 |
| 10 | Migrar vendas vinculadas as OS migradas | Mesmo batch da etapa 8 |
| 11 | Validar listagens em staging | Confirmar que registros migrados aparecem |
| 12 | Validar OS + venda + movimentacao | Confirmar consistencia pos-migracao |
| 13 | Decidir sobre producao | Somente apos aprovacao completa do staging |

---

## 5. Volumes estimados

Preencher via Firestore Console (aba "Dados" → selecionar collection → contar documentos) antes de aprovar o script.

| Collection | Total documentos | Sem tenantId | Com tenantId | Prioridade | Acao recomendada |
| --- | --- | --- | --- | --- | --- |
| marcas | — | — | — | Baixa | Migrar ou aguardar edicao manual |
| categorias | — | — | — | Baixa | Migrar ou aguardar edicao manual |
| clientes | — | — | — | Media | Edicao manual ou script |
| produtos | — | — | — | Media | Edicao manual ou script |
| despesas | — | — | — | Media | Edicao manual ou script |
| contas | — | — | — | Alta | Script obrigatorio |
| ordensServico | — | — | — | Alta | Script obrigatorio (bloco com vendas) |
| movimentacoesEstoque | — | — | — | Alta | Script obrigatorio |
| vendas | — | — | — | Alta | Script obrigatorio (bloco com OS) |

**Como contar documentos sem tenantId via script de auditoria (dry-run):**

```typescript
// Exemplo de query de auditoria (nao escreve nada)
const snap = await db.collection("ordensServico").get();
const semTenant = snap.docs.filter((doc) => !doc.data().tenantId);
console.log(`ordensServico sem tenantId: ${semTenant.length}`);
```

---

## 6. Estrategia de dry-run (auditoria sem escrita)

O primeiro script a ser criado na Fase 8.9.1 deve:

- [ ] Conectar ao Firestore de staging (nunca producao)
- [ ] Para cada collection: contar total de documentos e quantos nao possuem `tenantId`
- [ ] Listar os IDs dos documentos sem `tenantId`
- [ ] Para cada OS sem `tenantId`: identificar vendas e movimentacoes vinculadas (com ou sem `tenantId`)
- [ ] Gerar relatorio em JSON ou Markdown com:
  - totais por collection
  - lista de IDs afetados
  - mapeamento OS → venda → movimentacoes
  - alertas de inconsistencia (OS sem venda vinculada, ou com venda que ja tem tenantId)
- [ ] **Nao escrever nada no Firestore**
- [ ] **Nao alterar nenhum documento**

O dry-run e obrigatorio e deve ser aprovado antes de rodar o script real.

### Como executar o dry-run (Fase 8.9.1)

O script foi criado em `backend/src/scripts/audit-tenantId-dry-run.ts`. Para rodar:

```bash
cd backend
npx tsx src/scripts/audit-tenantId-dry-run.ts
```

O script:
- Conecta ao Firestore usando as credenciais do `.env`
- Analisa as 9 collections principais
- Mapeia relacoes OS → vendas → movimentacoes
- **Nao escreve nada no banco**
- Gera relatorio Markdown em `docs/nextassist/reports/audit-tenantId-dry-run-<timestamp>.md`

Para interpretar o resultado, consulte `docs/nextassist/dry-run-tenantId-auditoria.md`.

---

## 7. Estrategia do script real

O script de migracao real, a ser criado somente apos aprovacao do dry-run, deve:

- [ ] Rodar apenas em staging primeiro — nunca diretamente em producao
- [ ] Verificar `NODE_ENV` ou variavel de ambiente para confirmar o ambiente antes de qualquer escrita
- [ ] Processar documentos em lotes (batches de 50 a 100 documentos por vez)
- [ ] Para cada documento: verificar se `tenantId` ja existe antes de aplicar (nao sobrescrever)
- [ ] Para OS: processar junto com vendas e movimentacoes vinculadas no mesmo batch
- [ ] Registrar log de cada documento alterado (id, collection, timestamp)
- [ ] Parar imediatamente em caso de erro — nao continuar parcialmente
- [ ] Gerar relatorio final com: total migrado por collection, lista de IDs, erros encontrados
- [ ] Ser idempotente: rodar duas vezes deve produzir o mesmo resultado

---

## 8. Estrategia de rollback

Antes de executar qualquer script:

| Acao | Como |
| --- | --- |
| Backup pre-migracao | Exportar Firestore completo via `gcloud firestore export` |
| Lista de IDs alterados | O script gera e salva a lista antes e durante a execucao |
| Rollback pontual | Script separado que remove `tenantId` apenas dos documentos que o script de migracao adicionou (usando a lista gerada) |
| Rollback completo | Restore do backup via `gcloud firestore import` |

**Criterio para acionar rollback:**
- Relatorio do script indica erro em qualquer collection critica
- Listagem pos-script nao mostra registros esperados
- Inconsistencia detectada entre OS, venda e movimentacao

---

## 9. Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
| --- | --- | --- | --- |
| Migrar venda sem migrar OS vinculada | Alta (se script nao cobrir o bloco) | Alto — OS visivel, venda duplicavel | Script processa OS + venda + movimentacao no mesmo batch |
| Migrar OS sem venda vinculada | Alta (mesmo motivo) | Alto — findByOrdem retorna null | Idem |
| Sobrescrever tenantId existente | Baixa (com verificacao) | Medio | Script verifica antes de escrever |
| Rodar em producao por engano | Baixa (com variavel de ambiente) | Muito alto | Guard de ambiente obrigatorio no script |
| Historico continuar oculto pos-migracao | Baixa (se script for correto) | Medio | Dry-run e validacao antes do script real |
| Duplicidade de venda para OS antiga | Media (sem script, em acesso direto via API) | Medio | Migrar OS + venda juntas elimina o risco |
| Impacto em relatorios financeiros | A avaliar | Alto | Validar relatorios em staging pos-migracao |
| Volume inesperadamente alto | A avaliar | Medio — tempo de execucao | Dry-run mapeia volumes antes do script |

---

## 10. Criterios para aprovar criacao do script real

O script de migracao so deve ser implementado quando **todos** os itens abaixo estiverem aprovados:

- [ ] Staging validado com a 8.8.9 (listagens novas funcionando)
- [ ] Backup do Firestore de staging realizado
- [ ] Volumes por collection conhecidos e documentados (Secao 5 preenchida)
- [ ] Dry-run executado e relatorio aprovado
- [ ] Ordem de migracao aprovada pela equipe
- [ ] Estrategia de rollback definida e testada
- [ ] Responsavel pela validacao pos-script definido
- [ ] Janela de execucao definida (staging primeiro, producao depois)
- [ ] Nenhum deploy para producao antes da validacao completa de staging

---

## 11. Proxima fase sugerida — Fase 8.9.1

**Objetivo:** criar o script dry-run de auditoria de documentos sem `tenantId`.

O script da Fase 8.9.1:
- Conecta ao Firestore de staging (leitura apenas)
- Conta documentos sem `tenantId` por collection
- Lista IDs afetados
- Mapeia OS → vendas → movimentacoes para identificar dependencias
- Gera relatorio JSON ou Markdown
- **Nao escreve nada no Firestore**

O script sera criado em `backend/src/scripts/` e executado com:

```bash
cd backend
npx tsx src/scripts/auditoria-tenant-dry-run.ts
```

**A Fase 8.9.1 ainda nao altera dados. E uma fase de leitura e relatorio.**

Somente apos o dry-run aprovado e os criterios da Secao 10 cumpridos, avanca-se para o script de migracao real.
