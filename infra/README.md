# Infra

Pasta reservada para configuracoes de infraestrutura, deploy e ambiente local.

## Decisao do MVP

- Frontend: Firebase Hosting.
- Auth: Firebase Auth.
- Banco: Firestore.
- Arquivos futuros: Firebase Storage.
- Backend: API Node/Express publicada em Cloud Run, Render ou Railway.

## Arquivos Firebase

```text
infra/
|-- firebase/
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

## Observacao

Docker pode ser usado para padronizar a API no futuro, mas PostgreSQL e Prisma ficam fora do MVP inicial.

## Desenvolvimento local

Os servicos podem ser iniciados pela raiz do repositorio:

```bash
make dev
```

Se as portas locais ja estiverem ocupadas:

```bash
make dev-fresh
```

Portas padrao:

- Frontend: `5173`
- Backend: `3333`
