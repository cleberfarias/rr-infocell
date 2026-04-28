# Infra

Pasta reservada para configuracoes de infraestrutura, deploy e ambiente local.

## Decisao do MVP

- Frontend: Firebase Hosting.
- Auth: Firebase Auth.
- Banco: Firestore real no projeto `rr-infocell`.
- Arquivos futuros: Firebase Storage.
- Backend: API Node/Express publicada em Cloud Run, Render ou Railway.

## Arquivos Firebase

```text
infra/
|-- firebase/
|   |-- architecture.md
|   |-- setup.md
|   |-- firestore.rules
|   `-- storage.rules
|-- scripts/
|   |-- deploy-frontend.sh
|   |-- deploy-backend.sh
|   `-- deploy-all.sh
`-- README.md
```

Arquivos na raiz:

- `firebase.json`
- `.firebaserc.example`

Esses dois arquivos ficam na raiz porque a Firebase CLI usa esse local por padrao. As regras e documentos especificos do Firebase ficam em `infra/firebase/`.

## Observacao

Docker pode ser usado para padronizar a API no futuro, mas PostgreSQL e Prisma ficam fora do MVP inicial.

## Estado Firebase

- Projeto Firebase: `rr-infocell`.
- Firestore database: `(default)`.
- Regiao atual do Firestore: `nam5`.
- Regras do Firestore publicadas a partir de `infra/firebase/firestore.rules`.
- Backend local pode usar Firestore real via service account JSON ignorada pelo Git.
- Emuladores continuam disponiveis para desenvolvimento isolado.

## Desenvolvimento local

Os servicos podem ser iniciados pela raiz do repositorio:

```bash
make dev
```

Para rodar com banco local via Firestore Emulator:

```bash
make dev-db
```

Se as portas locais ja estiverem ocupadas:

```bash
make dev-fresh
```

Portas padrao:

- Frontend: `5173`
- Backend: `3333`
- Firebase Emulator UI: `4000`
- Firestore Emulator: `8081`
- Auth Emulator: `9099`
- Storage Emulator: `9199`
