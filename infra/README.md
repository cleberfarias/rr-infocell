# Infra

Pasta reservada para configuracoes de infraestrutura, deploy e ambiente local.

## Decisao do MVP

- Frontend: Firebase Hosting.
- Auth: Firebase Auth.
- Banco: Firestore.
- Arquivos futuros: Firebase Storage.
- Backend: API Node/Express publicada em Cloud Run, Render ou Railway.

## Arquivos futuros

```text
infra/
|-- firebase/
|   |-- firebase.json
|   |-- firestore.rules
|   |-- storage.rules
|   `-- .firebaserc.example
|-- scripts/
|   |-- deploy-frontend.sh
|   |-- deploy-backend.sh
|   `-- deploy-all.sh
`-- README.md
```

## Observacao

Docker pode ser usado para padronizar a API no futuro, mas PostgreSQL e Prisma ficam fora do MVP inicial.
