# Estrutura do projeto

## Estrutura atual

```text
rr-infocell/
|-- frontend/
|-- backend/
|-- infra/
|-- firebase.json
|-- .firebaserc.example
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
