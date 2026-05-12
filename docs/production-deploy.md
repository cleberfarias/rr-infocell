# Checklist de Deploy de Producao

## Objetivo

Preparar o RR Infocell para o primeiro deploy operacional em producao.

## Estado tecnico atual

- Frontend preparado para Firebase Hosting via `firebase.json`.
- Backend preparado para execucao Node.js e container em `backend/Dockerfile`.
- Backend definido para deploy no Google Cloud Run.
- Backend publicado no Cloud Run em `https://rr-infocell-api-91248386036.southamerica-east1.run.app`.
- Frontend publicado no Firebase Hosting em `https://rr-infocell.web.app`.
- Firestore, Storage e Firebase Auth definidos como base do MVP.
- Regras de Firestore e Storage versionadas em `infra/firebase/`.
- Rotas privadas da API protegidas por Firebase Auth em producao.
- Frontend envia o token Firebase Auth nas chamadas para a API quando o usuario real esta logado.

## Validacoes antes do deploy

Rodar na raiz dos respectivos pacotes:

```bash
cd backend
npm run build
npm run lint
npm test
```

```bash
cd frontend
npm run build
npm run lint
npm test
```

Validar imagem do backend quando o Docker Desktop estiver em execucao:

```bash
cd backend
docker build -t rr-infocell-backend:deploy-check .
```

## Variaveis de producao

### Frontend

```text
VITE_APP_ENV=production
VITE_API_BASE_URL=https://rr-infocell-api-91248386036.southamerica-east1.run.app/api
VITE_AUTH_DEV_MODE=false
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=rr-infocell
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend

```text
NODE_ENV=production
PORT=3333
CORS_ORIGIN=https://dominio-do-frontend
FIREBASE_PROJECT_ID=rr-infocell
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
ATENDIMENTO_PIX_CHAVE=
ATENDIMENTO_PIX_NOME=
ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS=24
ATENDIMENTO_LEMBRETE_RETIRADA_DIAS=2
ATENDIMENTO_AUTOARQUIVAR_DIAS=7
```

Em producao no Cloud Run, preferir a service account do proprio servico com Application Default Credentials. Nao usar arquivo JSON de service account no container.

## Deploy do backend no Cloud Run

Antes do deploy, confirme que `gcloud` esta autenticado e apontando para o projeto `rr-infocell`.

Executar pela raiz do repositorio:

```powershell
.\infra\scripts\deploy-backend-cloud-run.ps1 -CorsOrigin "https://URL_DO_FRONTEND"
```

Ou executar diretamente:

```bash
gcloud run deploy rr-infocell-api \
  --project rr-infocell \
  --region southamerica-east1 \
  --source backend \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=rr-infocell,CORS_ORIGIN=https://URL_DO_FRONTEND
```

Depois do deploy, usar a URL retornada pelo Cloud Run em `VITE_API_BASE_URL` com sufixo `/api`.

URL atual da API:

```text
https://rr-infocell-api-91248386036.southamerica-east1.run.app/api
```

URL atual do frontend:

```text
https://rr-infocell.web.app
```

Validacoes ja executadas em producao:

- `GET /api/health` no Cloud Run retornou `status: ok` e `firebaseAdmin: configured`.
- `GET /api/clientes` sem token no Cloud Run retornou `401`.
- Preflight CORS a partir de `https://rr-infocell.web.app` retornou `204` e liberou `authorization,content-type`.
- Firebase Hosting retornou `200`.
- Bundle publicado contem a URL do Cloud Run.
- Regras do Firestore e Storage foram publicadas.

## Ordem recomendada

1. Criar ou revisar usuarios reais no Firebase Auth.
2. Aplicar custom claims `admin`, `atendente` e `tecnico`.
3. Configurar service account/permissoes e publicar backend no Cloud Run.
4. Configurar `CORS_ORIGIN` com a URL real do frontend.
5. Configurar `VITE_API_BASE_URL` com a URL real da API.
6. Buildar e publicar frontend no Firebase Hosting.
7. Publicar regras do Firestore e Storage.
8. Testar login real com `VITE_AUTH_DEV_MODE=false`.
9. Testar fluxo completo: cliente, aparelho, OS, checklist com foto, manutencao, orcamento, venda/entrega e WhatsApp.
10. Configurar backup/exportacao do Firestore e monitoramento basico da API.

## Pendencias operacionais

- Configurar dominio ou subdominio de frontend e API.
- Confirmar lista final de usuarios da loja e seus perfis.
- Criar o primeiro usuario admin real e testar login em producao.
- Validar persistencia operacional do WhatsApp no Cloud Run, porque sessoes locais em container podem ser efemeras.
- Definir rotina de backup e restauracao do Firestore.
