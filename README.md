# RR Infocell

Sistema web para gestao de assistencia tecnica e loja de celulares.

O objetivo do projeto e centralizar o fluxo operacional da RR Infocell: clientes, aparelhos, ordens de servico, checklist tecnico, estoque basico, comprovantes e relatorios iniciais.

## Status do projeto

- Prototipo inicial aprovado pelo cliente.
- MVP definido com foco em assistencia tecnica.
- Firebase definido como base tecnica do MVP.
- Design system inicial criado e documentado.
- Frontend reorganizado em `frontend/`.
- Backend base criado em `backend/`.
- Modulo de clientes implementado com API REST, tela integrada, Firestore/fallback local e testes.

## Stack definida

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts

### Backend

- Node.js
- Express
- TypeScript
- Firebase Admin SDK
- Firebase Auth
- Firestore

### Infra

- Firebase Hosting para o frontend.
- Firestore como banco principal.
- Firebase Storage para arquivos futuros.
- Cloud Run, Render ou Railway para API Node/Express.

## Estrutura do repositorio

```text
rr-infocell/
|-- frontend/
|   |-- src/
|   |-- public/
|   |-- package.json
|   `-- vite.config.ts
|-- backend/
|   |-- src/
|   |-- package.json
|   `-- README.md
|-- infra/
|   |-- firebase/
|   `-- README.md
|-- firebase.json
|-- .firebaserc.example
|-- Makefile
|-- docs/
|   |-- design-system.md
|   |-- firebase-architecture.md
|   |-- firebase-setup.md
|   |-- mvp-scope.md
|   |-- notion-update-rule.md
|   `-- project-structure.md
`-- README.md
```

## Como rodar tudo junto

```bash
make dev
```

Para rodar com Firebase Emulator local:

```bash
make dev-db
```

Se as portas ja estiverem ocupadas por uma execucao anterior:

```bash
make dev-fresh
```

Servicos locais:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://localhost:3333
Firebase UI: http://127.0.0.1:4000
```

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Servidor local padrao:

```text
http://127.0.0.1:5173
```

## Como rodar o backend

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

## Validacao

```bash
cd frontend
npm run build
npm test
```

```bash
cd backend
npm run build
npm run lint
npm run format:check
npm test
```

## Documentacao

- [Design system](docs/design-system.md)
- [Escopo do MVP](docs/mvp-scope.md)
- [Arquitetura Firebase](docs/firebase-architecture.md)
- [Setup Firebase](docs/firebase-setup.md)
- [Estrutura do projeto](docs/project-structure.md)
- [Regra de atualizacao do Notion](docs/notion-update-rule.md)
- [Backend](backend/README.md)
- [Modulo clientes](backend/src/modules/clientes/README.md)

## Funcionalidades do MVP

- Login simples.
- Dashboard inicial.
- Cadastro de clientes.
- Cadastro de aparelhos.
- Ordem de servico.
- Checklist tecnico.
- Controle de status da OS.
- Estoque basico.
- Relatorio basico de OS.
- Comprovante simples da OS.

## Fora do MVP inicial

- PDV completo.
- DRE completo.
- Integracao com MarketUP.
- Upload de fotos.
- Assinatura digital.
- Envio automatico por WhatsApp.
- App mobile.
