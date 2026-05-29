# Dry-Run — Auditoria Usuarios x Tenant

**Fase:** 9.2 — Dry-run de usuarios atuais
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ✅ Script criado — aguardando execucao e revisao do relatorio

---

## 1. Objetivo

Auditar os usuarios existentes no Firebase Auth e mapear quais ja possuem documento `usuarios/{uid}` no Firestore, identificando:

- quais precisam ter o documento criado (Fase 9.3)
- quais ja estao corretos e podem ser mantidos
- quais requerem revisao manual antes de prosseguir
- quais podem ser ignorados (desativados sem documento)

Nenhuma escrita e feita nesta fase. O resultado e um relatorio Markdown para revisao.

---

## 2. Pre-requisitos

### Credenciais Firebase

O script usa a mesma logica dos demais scripts do projeto. Um dos conjuntos abaixo deve estar configurado:

**Opcao A — arquivo de conta de servico (recomendado para local):**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service-account.json
export FIREBASE_PROJECT_ID=rr-infocell
```

**Opcao B — variaveis de ambiente individuais (alternativa):**

```env
FIREBASE_PROJECT_ID=rr-infocell
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@rr-infocell.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

O arquivo `.env` ja existente em `backend/.env` normalmente contem essas variaveis para o ambiente de desenvolvimento.

### Dependencias

Nenhuma dependencia adicional — o script usa apenas pacotes ja presentes no projeto (`firebase-admin`, `dotenv`).

---

## 3. Comando de execucao

```bash
cd backend
npx tsx src/scripts/audit-users-tenant-dry-run.ts
```

O script:
1. Lista todos os usuarios do Firebase Auth (paginando ate 1000 por vez)
2. Busca documentos `usuarios/{uid}` no Firestore para cada UID
3. Cruza os dados e determina a acao recomendada para cada usuario
4. Gera o relatorio e imprime o resumo no console

**Tempo estimado:** menos de 30 segundos para dezenas de usuarios.

---

## 4. Saida esperada

### Console

```
============================================================
AUDIT DRY-RUN — Usuarios x Tenant
MODO SOMENTE LEITURA — Nenhuma escrita sera feita
============================================================

Ambiente:  development
Projeto:   rr-infocell
Timestamp: 2026-05-29T...

Listando usuarios do Firebase Auth...
  N usuario(s) encontrado(s)

Buscando documentos na colecao "usuarios"...
  M documento(s) encontrado(s)

Cruzando dados e determinando recomendacoes...
Gerando relatorio Markdown...

============================================================
RESUMO
============================================================

Total no Firebase Auth:  N
Com documento Firestore: M

✅  Manter documento:     X
⬜  Criar documento:      Y
⚠️   Revisar manualmente:  Z
🔕  Ignorar (desativado): W

Relatorio gerado em:
  .../docs/nextassist/reports/audit-users-tenant-dry-run-<timestamp>.md

Nenhuma escrita foi feita no Firestore.
Nenhuma custom claim foi alterada.
============================================================
```

### Relatorio Markdown

Gerado automaticamente em:

```
docs/nextassist/reports/audit-users-tenant-dry-run-<timestamp>.md
```

O relatorio contem:
- Resumo com totais por categoria
- Tabela de roles encontradas nas custom claims
- Detalhe por usuario agrupado por acao recomendada
- Proximos passos baseados nos achados

---

## 5. Como interpretar o resultado

### Acoes possiveis por usuario

| Acao | Significado | O que fazer na Fase 9.3 |
|------|-------------|------------------------|
| `✅ manter-documento` | Documento existe, `tenantId: "rr-infocell"`, `status` presente | Nada — ja esta correto |
| `⬜ criar-documento` | Usuario ativo sem documento `usuarios/{uid}` | Script de criacao ira criar o documento |
| `⚠️ revisar-manualmente` | Documento existe mas tem dado inconsistente (tenantId diferente, status ausente, etc.) | Analisar caso a caso antes de prosseguir |
| `🔕 ignorar-desativado` | Usuario desativado no Firebase Auth sem documento | Pode ser ignorado por ora — nao ira acessar o sistema |

### Motivos de revisao manual

| Motivo | O que significa |
|--------|----------------|
| `documento existe mas nao tem tenantId` | Documento criado manualmente sem o campo obrigatorio |
| `tenantId inesperado: "X"` | Documento aponta para tenant diferente de `rr-infocell` — revisar origem |
| `documento existe mas campo status ausente` | Documento legado sem o campo `status` — complementar antes de confiar |

---

## 6. Criterios para avancar para a Fase 9.3

A Fase 9.3 (criacao dos documentos `usuarios/{uid}`) so deve comecar quando:

- [ ] Script dry-run executado com sucesso
- [ ] Relatorio revisado pelo responsavel tecnico
- [ ] **Zero** usuarios na categoria `revisar-manualmente` (ou cada caso documentado e decidido)
- [ ] Quantidade de usuarios `criar-documento` confirmada e aprovada
- [ ] Nenhum `tenantId` diferente de `rr-infocell` sem justificativa

Se houver casos de revisao manual, cada um deve ser tratado individualmente antes de rodar o script de criacao.

---

## 7. O que a Fase 9.3 fara (nao agora)

Apos revisao do relatorio, a Fase 9.3 criara um segundo script — separado e explicitamente marcado como escrita — que:

- Recebe a lista de UIDs sem documento (saida do dry-run)
- Cria `usuarios/{uid}` com `tenantId: "rr-infocell"`, `status: "ativo"` e dados do Firebase Auth
- Opera em batches do Firestore
- Gera relatorio de confirmacao
- Nao altera usuarios que ja tem documento valido

O script de criacao nao sera o mesmo script desta auditoria — sera um arquivo separado para evitar confusao entre modo leitura e modo escrita.

---

## 8. Aviso de seguranca

O script `audit-users-tenant-dry-run.ts` contem a constante:

```typescript
const DRY_RUN = true as const;
```

Esta constante nao pode ser alterada para `false`. Para escrever no Firestore, um script separado deve ser criado, revisado e aprovado explicitamente.
