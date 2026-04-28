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

## Estado atual

- Projeto Firebase criado: `rr-infocell`.
- App Web criado e variaveis publicas obtidas.
- Firestore database criado: `(default)`.
- Regiao do Firestore: `nam5`.
- Cloud Firestore API habilitada.
- Regras do Firestore publicadas.
- Backend local validado gravando e lendo da colecao `clientes` no Firestore real.
- Service account local criada para desenvolvimento em `backend/firebase-service-account.local.json`.
- Frontend preparado com Firebase Auth client, `AuthProvider`, login/logout e protecao de rotas por perfil.

## Passos no Firebase Console

Itens ja executados:

1. Criar um projeto Firebase para o RR Infocell.
2. Ativar Firestore.
3. Cadastrar um app Web para obter as variaveis `VITE_FIREBASE_*`.
4. Criar service account local para o backend.

Itens ja preparados parcialmente:

1. Base do Firebase Auth no frontend.
2. Modo local de desenvolvimento com `VITE_AUTH_DEV_MODE=true`, sem exigir usuarios reais.

Itens pendentes:

1. Ativar o provedor Email/Password no Firebase Auth quando for testar acesso real.
2. Criar usuarios iniciais no Firebase Auth.
3. Configurar Firebase Storage quando upload de arquivos entrar no MVP.
4. Definir claims de perfil nos usuarios: `admin`, `atendente` ou `tecnico`.

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
VITE_AUTH_DEV_MODE=true
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Essas variaveis sao publicas no app web, mas ainda assim devem ser configuradas por ambiente.

`VITE_AUTH_DEV_MODE=true` mantem o login local por perfil, util para desenvolvimento enquanto os usuarios reais e custom claims ainda nao foram fechados. Para usar Firebase Auth real, altere para `false`, crie os usuarios no Firebase Console e entre com e-mail/senha reais.

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

## Firebase Auth no frontend

Arquivos principais:

- `frontend/src/lib/firebase.ts`: inicializa o app Firebase client quando as variaveis `VITE_FIREBASE_*` existem.
- `frontend/src/lib/auth.tsx`: centraliza sessao, login, logout, modo desenvolvimento e leitura futura de custom claims.
- `frontend/src/pages/Login.tsx`: usa o provider de auth e permite escolher o perfil localmente.
- `frontend/src/components/AppLayout.tsx`: protege as rotas internas e redireciona conforme o perfil.

Fluxo atual:

- Com `VITE_AUTH_DEV_MODE=true`: o login usa o perfil selecionado e nao chama Firebase Auth.
- Com `VITE_AUTH_DEV_MODE=false`: o login usa `signInWithEmailAndPassword`.
- Se o usuario tiver custom claim `role`, esse perfil sera usado.
- Se ainda nao houver claim, o perfil selecionado na tela de login funciona como fallback temporario.

O fallback por perfil deve ser removido quando os custom claims estiverem definidos para todos os usuarios reais.

## Firestore real

Status atual:

- Projeto Firebase: `rr-infocell`.
- Firestore database: `(default)`.
- Regiao do database: `nam5`.
- Regras publicadas de: `infra/firebase/firestore.rules`.
- Backend local autenticado por service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`.
- Validado com `POST /api/clientes` e `GET /api/clientes?q=Firebase Real`.

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
