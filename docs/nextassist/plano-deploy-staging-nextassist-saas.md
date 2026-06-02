# Plano — Deploy Staging para nextassist-saas

**Fase:** 9.16.1 — Estratégia de deploy seguro para testes multi-tenant
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 📋 Plano definido — aguardando aprovação antes de qualquer execução

---

## 1. Problema atual

O GitHub Actions está configurado para disparar deploy automático para o Cloud Run de produção (`rr-infocell-api`) apenas quando há push na branch `main`:

```yaml
if: github.ref == 'refs/heads/main'
```

A branch `nextassist-saas` contém mudanças estruturais grandes (Fases 9.0–9.16) que ainda não foram validadas em ambiente real de multi-tenant. Fazer merge direto na `main` levaria essas mudanças para o sistema RR Infocell em produção antes da validação completa.

**Consequência descoberta na Fase 9.16:** ao testar o usuário demo contra a API de produção (código antigo), todos os dados criados foram salvos com `tenantId: "rr-infocell"` em vez de `"nextassist-demo"`. Foi necessário limpar 12 documentos do Firestore.

---

## 2. Por que a main não deve ser usada agora

| Risco | Impacto |
|-------|---------|
| Merge de branch grande sem staging | Mudanças vão direto para cliente real |
| `resolveTenant` dinâmico não testado em produção | Pode causar fallback inesperado para usuários reais |
| Guards de vínculo cruzado novos | Se houver bug, afeta OS, estoque e vendas em produção |
| Dado de tenant demo misturado com rr-infocell | Já aconteceu — requer limpeza manual |
| Sem rollback automático no CI/CD | Requer novo push para reverter |

---

## 3. Arquitetura atual de deploy

```
GitHub push → main
    ↓
GitHub Actions (.github/workflows/*.yml)
    ↓
gcloud run deploy rr-infocell-api
    ↓
Cloud Run: rr-infocell-api (produção)
    ↓
Clientes reais da RR Infocell
```

O que precisamos:

```
GitHub push → nextassist-saas
    ↓
Deploy manual ou workflow separado
    ↓
Cloud Run: rr-infocell-api-staging (isolado)
    ↓
Testes multi-tenant com usuário demo
    ↓ (aprovado)
PR nextassist-saas → main
    ↓
GitHub Actions → produção (planejado, com validação)
```

---

## 4. Estratégia recomendada: Cloud Run separado

### Opção A — Deploy manual (mais rápida)

Criar um novo serviço Cloud Run apontando para a branch `nextassist-saas` via `gcloud run deploy` com source:

```bash
cd backend

gcloud run deploy rr-infocell-api-staging \
  --project rr-infocell \
  --region southamerica-east1 \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_PROJECT_ID=rr-infocell" \
  --set-secrets "FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest" \
  --set-secrets "FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest"
```

Este serviço usa o mesmo Firebase/Firestore de produção, mas com o novo código. O Firestore é compartilhado — os dados `tenantId: "nextassist-demo"` ficam isolados dos dados `rr-infocell` pelo próprio filtro de tenant.

### Opção B — Workflow GitHub Actions separado (mais controlada)

Criar `.github/workflows/deploy-staging.yml` disparado manualmente (`workflow_dispatch`) ou por push na `nextassist-saas`:

```yaml
name: Deploy Staging (nextassist-saas)
on:
  workflow_dispatch:
  push:
    branches: [nextassist-saas]

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/nextassist-saas'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloud Run Staging
        run: |
          gcloud run deploy rr-infocell-api-staging \
            --project rr-infocell \
            --region southamerica-east1 \
            --source backend/ \
            --set-env-vars "NODE_ENV=production"
```

**Recomendação:** começar com a Opção A (deploy manual) para validar rapidamente. Criar Opção B depois se for necessário deploy frequente.

---

## 5. Nome do serviço staging

| Campo | Valor |
|-------|-------|
| Nome do serviço | `rr-infocell-api-staging` |
| Projeto GCP | `rr-infocell` |
| Região | `southamerica-east1` |
| Branch fonte | `nextassist-saas` |
| Firestore | mesmo de produção (Firestore unificado por tenantId) |
| Firebase Auth | mesmo de produção |

**Por que usar o mesmo Firestore:** os dados são isolados por `tenantId`. Criar um Firestore separado exigiria replicar todos os dados rr-infocell e adiciona complexidade. Como a validação usa `tenantId: "nextassist-demo"` e os filtros estão corretos, o compartilhamento é seguro.

---

## 6. Variáveis de ambiente necessárias

O serviço staging precisa das mesmas variáveis do serviço de produção:

```
NODE_ENV=production
FIREBASE_PROJECT_ID=rr-infocell
FIREBASE_CLIENT_EMAIL=<service-account>
FIREBASE_PRIVATE_KEY=<private-key>
```

Se o serviço de produção usa Secret Manager para as chaves Firebase, o staging pode compartilhar os mesmos secrets (mesmas permissões de IAM do service account de deploy).

---

## 7. Como validar que o staging tem o código novo

Após o deploy, verificar se `resolveTenant` está lendo `usuarios/{uid}`:

**Método 1 — Log de warning:**

Fazer uma requisição autenticada com um usuário que NÃO tem `usuarios/{uid}` e verificar o warning no Cloud Logging:

```
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rr-infocell-api-staging AND textPayload:resolveTenant" --limit=10
```

Se aparecer `[resolveTenant] usuarios/<uid> nao encontrado`, o novo código está ativo.

**Método 2 — Comportamento do usuário demo:**

Logar como `demo@nextassist-demo.internal` e fazer `GET /api/clientes` no staging. Se retornar apenas 1 cliente (o Cliente Demo), o isolamento está funcionando. Se retornar 61, o código antigo está ativo.

**Método 3 — Endpoint health + versão:**

Verificar a revisão do Cloud Run após o deploy:

```bash
gcloud run services describe rr-infocell-api-staging \
  --region southamerica-east1 \
  --format="value(status.latestReadyRevisionName,status.latestCreatedRevisionName)"
```

A revisão deve ser nova (timestamp após o deploy manual).

---

## 8. Como repetir a Fase 9.16 com segurança

Após deploy do staging:

1. Substituir a URL nas chamadas de teste:
   ```
   # Antes (produção)
   https://rr-infocell-api-91248386036.southamerica-east1.run.app/api

   # Depois (staging)
   https://rr-infocell-api-staging-<hash>-rj.a.run.app/api
   ```

2. Seguir o checklist de `docs/nextassist/validacao-tenant-demo-via-api.md`

3. Se qualquer dado for criado incorretamente, usar `cleanup-demo-test-data.ts` para limpar

4. Só avançar para merge na `main` após aprovação completa do checklist

---

## 9. Plano de rollback do staging

O serviço staging é independente — remover não afeta produção:

```bash
gcloud run services delete rr-infocell-api-staging --region=southamerica-east1
```

Se dados indesejados forem criados no Firestore durante testes, usar o script de limpeza existente ou criar um específico para o tenant demo.

---

## 10. Critérios para abrir PR na main

Só abrir PR `nextassist-saas → main` quando:

- [ ] Staging deployado com código da branch `nextassist-saas`
- [ ] Fase 9.16 completa com isolamento confirmado no staging
- [ ] Usuário demo vê apenas dados `nextassist-demo`
- [ ] Usuário rr-infocell não vê dados `nextassist-demo`
- [ ] Vínculos cruzados bloqueados no staging
- [ ] OS, estoque e venda funcionam no tenant demo no staging
- [ ] Nenhum dado de teste contaminando rr-infocell
- [ ] Build TypeScript passa na branch `nextassist-saas`
- [ ] PR revisado por ao menos 1 pessoa
- [ ] Janela de deploy planejada (não em horário de pico da RR Infocell)
- [ ] Plano de rollback definido (qual revisão do Cloud Run usar se precisar voltar)

---

## 11. Decisão imediata recomendada

Para avançar rapidamente sem esperar workflow:

```
Opção A — Deploy manual do backend staging:

cd c:/Users/clebe/dev/rr-infocell/backend
gcloud run deploy rr-infocell-api-staging \
  --project rr-infocell \
  --region southamerica-east1 \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=rr-infocell" \
  --set-secrets "FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest,FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest"
```

Tempo estimado: 3–5 minutos para o build e deploy.

Após o deploy, apontar os testes para a URL do staging e repetir a Fase 9.16.
