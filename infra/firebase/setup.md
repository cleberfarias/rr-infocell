# Setup Firebase

## Objetivo

Preparar o projeto RR Infocell para usar Firebase Hosting, Firebase Auth, Firestore, Firebase Storage e Firebase Admin SDK.

O backend ja esta preparado para usar Firestore no modulo de clientes quando o Firebase Admin SDK estiver configurado. Sem credenciais, a API continua funcionando com repository em memoria para desenvolvimento local.

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
CORS_ORIGIN=http://127.0.0.1:5173
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GOOGLE_APPLICATION_CREDENTIALS=

# Opcional para emuladores locais
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

Nunca commitar `.env` real ou chave privada da service account.

## Firestore no backend

O modulo de clientes seleciona o armazenamento automaticamente:

- Com `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`: usa Firestore na colecao `clientes`.
- Com `FIREBASE_PROJECT_ID` e `GOOGLE_APPLICATION_CREDENTIALS`: usa Firestore real via service account JSON local.
- Com `FIRESTORE_EMULATOR_HOST` e `FIREBASE_PROJECT_ID`: usa Firestore Emulator sem exigir service account.
- Sem credenciais: usa armazenamento em memoria, apenas para desenvolvimento/testes locais.

## Firestore real

Status atual:

- Projeto Firebase: `rr-infocell`.
- Firestore database: `(default)`.
- Regiao do database: `nam5`.
- Regras publicadas de: `infra/firebase/firestore.rules`.
- Backend local autenticado por service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`.

Arquivo local usado no desenvolvimento:

```text
backend/firebase-service-account.local.json
```

Esse arquivo e ignorado pelo Git e nunca deve ser commitado.

Colecao inicial usada:

```text
clientes
```

Documento de cliente:

```json
{
  "id": "id-gerado",
  "nome": "Marcos Almeida",
  "telefone": "(11) 98432-1290",
  "documento": "123.456.789-00",
  "email": "marcos@example.com",
  "endereco": "Rua Exemplo, 123",
  "observacoes": "Cliente recorrente",
  "createdAt": "2026-04-28T14:00:00.000Z",
  "updatedAt": "2026-04-28T14:00:00.000Z"
}
```

Para usar emulador local com o backend:

```bash
firebase emulators:start --only auth,firestore,storage
```

Em outro terminal:

```bash
cd backend
npm run dev
```

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

## Pendencias operacionais

- Criar usuarios iniciais no Firebase Auth.
- Definir custom claims de perfil nos usuarios: `admin`, `atendente` ou `tecnico`.
- Criar rotina segura para setar claims pelo backend ou script administrativo.
