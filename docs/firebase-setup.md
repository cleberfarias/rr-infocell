# Setup Firebase

## Objetivo

Preparar o projeto RR Infocell para usar Firebase Hosting, Firebase Auth, Firestore, Firebase Storage e Firebase Admin SDK.

Esta configuracao ainda nao conclui a integracao real, porque depende da criacao do projeto no Firebase Console e da service account do backend.

## Arquivos criados

- `firebase.json`: configuracao do Firebase Hosting, regras e emuladores.
- `.firebaserc.example`: exemplo do alias do projeto Firebase.
- `infra/firebase/firestore.rules`: regras iniciais do Firestore.
- `infra/firebase/storage.rules`: regras iniciais do Storage.
- `frontend/.env.example`: variaveis publicas do Firebase client e API.
- `backend/.env.example`: variaveis privadas do Firebase Admin SDK.

## Passos no Firebase Console

1. Criar um projeto Firebase para o RR Infocell.
2. Ativar Firebase Auth.
3. Ativar Firestore.
4. Ativar Firebase Storage.
5. Cadastrar um app Web para obter as variaveis `VITE_FIREBASE_*`.
6. Criar uma service account para o backend.
7. Definir claims de perfil nos usuarios: `admin`, `atendente` ou `tecnico`.

## Configuracao local

Copie o exemplo de projeto:

```bash
copy .firebaserc.example .firebaserc
```

Atualize o ID do projeto em `.firebaserc`:

```json
{
  "projects": {
    "default": "seu-projeto-firebase"
  }
}
```

Crie o `.env` do frontend:

```bash
copy frontend\.env.example frontend\.env
```

Crie o `.env` do backend:

```bash
copy backend\.env.example backend\.env
```

## Variaveis do frontend

```text
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:3333/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Essas variaveis sao publicas no app web, mas ainda assim devem ser configuradas por ambiente.

## Variaveis do backend

```text
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://localhost:8080
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Nunca commitar `.env` real ou chave privada da service account.

## Regras iniciais

Firestore:

- `users`: usuario le o proprio documento; `admin` gerencia.
- `clientes`, `aparelhos`, `ordensServico`, `checklists`: acesso autenticado por perfil.
- `produtos` e `movimentacoesEstoque`: escrita restrita a `admin`.
- `vendas`, `auditLogs` e `counters`: protegidos para uso administrativo ou backend.
- Qualquer colecao nao prevista fica bloqueada.

Storage:

- `ordensServico/{ordemId}` aceita imagens de usuarios operacionais autenticados.
- `comprovantes/{ordemId}` aceita escrita de `admin` e `atendente`.
- Qualquer outro caminho fica bloqueado.

## Emuladores

Depois de instalar o Firebase CLI:

```bash
firebase emulators:start
```

Portas configuradas:

- Auth: `9099`
- Firestore: `8081`
- Hosting: `5000`
- Storage: `9199`
- Emulator UI: `4000`

## Deploy

Build do frontend:

```bash
cd frontend
npm run build
```

Deploy do hosting e regras:

```bash
firebase deploy --only hosting,firestore:rules,storage
```

## Pendencias para concluir a tarefa real

- Criar/configurar o projeto no Firebase Console.
- Copiar variaveis reais do app Web para `frontend/.env`.
- Criar service account e preencher `backend/.env`.
- Validar regras com emuladores.
- Criar usuarios iniciais e claims de perfil.
