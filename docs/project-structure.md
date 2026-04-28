# Estrutura do projeto

## Estrutura atual

```text
rr-infocell/
|-- frontend/
|-- backend/
|-- infra/
|-- firebase.json
|-- .firebaserc.example
|-- Makefile
|-- docs/
`-- README.md
```

## Frontend

Contem o app React/Vite atual.

Responsabilidades:

- Telas.
- Layout.
- Componentes de interface.
- Design system.
- Integracao com API.
- Integracao com Firebase client quando necessario.

## Backend

Contem a API Node/Express base do MVP.

Responsabilidades:

- Regras de negocio.
- Autenticacao validada via Firebase Admin SDK.
- Operacoes sensiveis no Firestore.
- Geracao de numero automatico de OS.
- Logs de auditoria.

Arquivos principais:

- `src/app.ts`
- `src/server.ts`
- `src/routes.ts`
- `src/firebase/admin.ts`
- `src/modules/health/health.routes.ts`
- `src/modules/clientes/clientes.routes.ts`
- `src/modules/clientes/clientes.service.ts`
- `src/modules/clientes/clientes.repository.ts`

Modulos atuais:

- `health`: status da API.
- `clientes`: CRUD implementado com busca, validacao e testes.
- `aparelhos`: scaffold.
- `ordens-servico`: scaffold.
- `checklists`: scaffold.

Cada modulo possui documentacao propria em `backend/src/modules/<modulo>/README.md`.

## Infra

Contem configuracoes de deploy e ambiente Firebase.

Responsabilidades:

- Firebase Hosting.
- Regras do Firestore.
- Regras do Storage.
- Scripts de deploy.
- Documentacao de ambiente.

Arquivos principais:

- `infra/firebase/firestore.rules`
- `infra/firebase/storage.rules`
- `firebase.json`
- `.firebaserc.example`

## Docs

Documentacao do projeto e decisoes tecnicas.

Arquivos principais:

- `design-system.md`
- `mvp-scope.md`
- `firebase-architecture.md`
- `firebase-setup.md`
- `project-structure.md`

## Makefile

Comandos de desenvolvimento na raiz:

- `make dev`: sobe backend e frontend em paralelo.
- `make dev-fresh`: para as portas locais e sobe tudo novamente.
- `make dev-stop`: encerra processos nas portas `3333` e `5173`.
- `make dev-backend`: sobe apenas o backend.
- `make dev-frontend`: sobe apenas o frontend.
