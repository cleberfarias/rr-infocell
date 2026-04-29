# Backend RR Infocell

API base do MVP do RR Infocell.

## Stack definida

- Node.js
- Express
- TypeScript
- Firebase Admin SDK
- Firebase Auth
- Firestore

## Responsabilidades

- Validar regras de negocio.
- Proteger operacoes privadas.
- Gerar numero sequencial de ordem de servico.
- Centralizar escrita em colecoes sensiveis.
- Registrar historico de alteracoes.
- Expor endpoints para o frontend.

## Modulos iniciais

- `health`: endpoint de status da API e Firebase Admin SDK.
- `clientes`: CRUD de clientes com busca, validacao e testes.
- `aparelhos`: CRUD de aparelhos vinculados a clientes com busca, validacao e testes.
- `ordens-servico`: scaffold do fluxo central de OS.
- `checklists`: scaffold do checklist tecnico vinculado a OS.

Cada modulo tem um `README.md` proprio em `src/modules/<modulo>/README.md`.

## Como rodar

Pela raiz do repositorio:

```bash
make dev-backend
```

Ou diretamente na pasta do backend:

```bash
cd backend
npm install
npm run dev
```

Servidor local padrao:

```text
http://localhost:3333
```

Health check:

```text
GET /api/health
```

## Variaveis de ambiente

Copie `.env.example` para `.env` e preencha as credenciais quando o Firebase Admin SDK for usado de verdade.

```text
PORT=3333
CORS_ORIGIN=http://127.0.0.1:5173
FIREBASE_PROJECT_ID=rr-infocell
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
```

Sem credenciais, a API sobe em modo local e informa `firebaseAdmin: not_configured` no health check.

Para usar o Firestore real localmente, configure:

```text
FIREBASE_PROJECT_ID=rr-infocell
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.local.json
```

O arquivo de service account local deve ficar fora do Git.

Para usar Firestore Emulator sem service account, configure:

```text
FIREBASE_PROJECT_ID=rr-infocell
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

## Validacao

```bash
npm run build
npm run lint
npm run format:check
npm test
```

## Status

Base implementada com Express, TypeScript, middlewares globais, tratamento padronizado de erros, health check, modulos de clientes e aparelhos funcionais com Firestore real/fallback local, rotas scaffold de ordens de servico e checklists, e Firebase Admin SDK.
