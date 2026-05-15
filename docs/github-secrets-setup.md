# Configuração dos Secrets do GitHub Actions

Para o deploy automático funcionar, você precisa configurar os seguintes secrets em:
**GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**

---

## Secrets obrigatórios para deploy

### 1. `GCP_SA_KEY` — Chave da Service Account do Google Cloud

Permite o GitHub Actions fazer deploy no Cloud Run.

**Como criar:**
```bash
# 1. Cria a service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy" \
  --project=rr-infocell

# 2. Concede permissões necessárias
gcloud projects add-iam-policy-binding rr-infocell \
  --member="serviceAccount:github-actions@rr-infocell.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding rr-infocell \
  --member="serviceAccount:github-actions@rr-infocell.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding rr-infocell \
  --member="serviceAccount:github-actions@rr-infocell.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 3. Gera a chave JSON
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@rr-infocell.iam.gserviceaccount.com

# 4. Copia o conteúdo do arquivo JSON para o secret
cat github-actions-key.json
```

Cole o **conteúdo completo do JSON** (incluindo `{` e `}`) como valor do secret.

---

### 2. `FIREBASE_SERVICE_ACCOUNT_RR_INFOCELL` — Service Account do Firebase Hosting

Permite o GitHub Actions fazer deploy no Firebase Hosting.

**Como criar:**
1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/rr-infocell/settings/serviceaccounts/adminsdk)
2. Clique em **"Gerar nova chave privada"**
3. Cole o conteúdo JSON como valor do secret

---

### 3. `CORS_ORIGIN` — URL do frontend em produção

Exemplo: `https://rr-infocell.web.app`

---

### 4. `OPENAI_API_KEY` — Chave da OpenAI para o assistente IA

Exemplo: `sk-proj-...`

---

### 5. Variáveis do Firebase (para o build do frontend)

| Secret | Onde encontrar |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Configurações do projeto → Seus apps |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Idem |
| `VITE_FIREBASE_APP_ID` | Idem |
| `VITE_API_BASE_URL` | URL do Cloud Run após primeiro deploy (ex: `https://rr-infocell-api-xxx-rj.a.run.app/api`) |

---

## Fluxo do deploy automático

```
Push para main
    │
    ├── backend job: tsc + lint + format + tests
    ├── frontend job: tsc + build (cria artifact)
    │
    └── Se CI passou:
         ├── deploy-backend → gcloud run deploy rr-infocell-api
         └── deploy-frontend → firebase deploy --only hosting
```

**PRs para main:** Rodam apenas CI (sem deploy).
**Merge na main:** Rodam CI + deploy automático.

---

## Primeiro deploy manual (antes do CI funcionar)

Antes de configurar os secrets, faça o primeiro deploy manualmente:

### Backend (Cloud Run)
```powershell
cd infra/scripts
.\deploy-backend-cloud-run.ps1 -CorsOrigin "https://rr-infocell.web.app"
```

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

Após o primeiro deploy manual, o Cloud Run URL estará disponível para configurar `VITE_API_BASE_URL` e `CORS_ORIGIN`.
