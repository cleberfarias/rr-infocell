# Cloud Run

## Decisao

O backend Node/Express do MVP sera publicado no Google Cloud Run.

Motivos:

- Mantem backend e Firebase no mesmo ecossistema Google Cloud.
- Permite escalar para zero em periodos sem uso.
- Usa container Docker ja versionado em `backend/Dockerfile`.
- Permite usar a service account do proprio Cloud Run sem commitar ou empacotar chave JSON.

## Servico

```text
Projeto: rr-infocell
Servico: rr-infocell-api
Regiao sugerida: southamerica-east1
Runtime: container Node.js
Porta: variavel PORT injetada pelo Cloud Run
```

## Permissoes

Criar ou escolher uma service account para o servico Cloud Run e conceder permissao minima para:

- Firebase Auth Admin.
- Cloud Firestore.
- Firebase Storage, quando o backend precisar ler/gravar arquivos.

Evitar usar `GOOGLE_APPLICATION_CREDENTIALS` ou arquivo JSON de service account em producao.

## Deploy inicial

Executar a partir da raiz do repositorio:

```bash
gcloud run deploy rr-infocell-api \
  --project rr-infocell \
  --region southamerica-east1 \
  --source backend \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 1 \
  --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=rr-infocell,CORS_ORIGIN=https://URL_DO_FRONTEND
```

`--allow-unauthenticated` deixa o endpoint HTTP publico, mas as rotas privadas continuam protegidas pela API com Firebase ID token. `GET /api/health` permanece publico para health check.

Depois do deploy, copiar a URL gerada pelo Cloud Run e configurar no frontend:

```text
VITE_API_BASE_URL=https://rr-infocell-api-91248386036.southamerica-east1.run.app/api
```

URL atual:

```text
https://rr-infocell-api-91248386036.southamerica-east1.run.app
```

## Validacao atual

- Servico `rr-infocell-api` publicado em `southamerica-east1`.
- `GET /api/health` retorna `status: ok`.
- Rotas privadas sem Firebase ID token retornam `401`.
- CORS liberado para `https://rr-infocell.web.app`.

## Pontos de atencao

- WhatsApp/Baileys mantem o socket conectado em memoria. Por isso o servico deve rodar com `--min-instances 1` e `--max-instances 1`; assim todos os navegadores, mesmo em maquinas diferentes com o mesmo login, chegam na mesma instancia conectada.
- O filesystem do Cloud Run ainda e efemero entre novos deploys/recriacoes. Se a revisao for recriada, pode ser necessario escanear o QR novamente.
- `min-instances=1` reduz cold start e estabiliza o WhatsApp, mas aumenta custo.
- Configurar alertas de billing antes do primeiro uso real.
