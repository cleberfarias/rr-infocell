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

Telas integradas com API:

- `src/pages/Clientes.tsx`
- `src/pages/Aparelhos.tsx`

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
- `src/modules/aparelhos/aparelhos.routes.ts`
- `src/modules/aparelhos/aparelhos.service.ts`
- `src/modules/aparelhos/aparelhos.repository.ts`
- `src/modules/ordens-servico/ordens-servico.routes.ts`
- `src/modules/ordens-servico/ordens-servico.service.ts`
- `src/modules/ordens-servico/ordens-servico.repository.ts`

Modulos atuais:

- `health`: status da API.
- `clientes`: CRUD implementado com busca, validacao, Firestore/fallback local e testes.
- `aparelhos`: CRUD implementado com busca, filtro por cliente, validacao, Firestore/fallback local e testes.
- `ordens-servico`: CRUD implementado com numero sequencial, status, filtros, validacao de vinculos, Firestore/fallback local e testes.
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
- `infra/firebase/architecture.md`
- `infra/firebase/setup.md`
- `firebase.json`
- `.firebaserc.example`

## Docs

Documentacao do projeto e decisoes tecnicas.

Arquivos principais:

- `design-system.md`
- `mvp-scope.md`
- `project-structure.md`

## Makefile

Comandos de desenvolvimento na raiz:

- `make dev`: sobe backend e frontend em paralelo.
- `make dev-db`: sobe Firebase Emulator, backend e frontend em paralelo.
- `make dev-fresh`: para as portas locais e sobe tudo novamente.
- `make dev-stop`: encerra processos nas portas locais do app e dos emuladores.
- `make dev-backend`: sobe apenas o backend.
- `make dev-frontend`: sobe apenas o frontend.
- `make firebase-emulators`: sobe apenas Auth, Firestore e Storage Emulator.
