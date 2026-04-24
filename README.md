# RR Infocell

Sistema web para gestao de assistencia tecnica e loja de celulares.

O objetivo do projeto e centralizar o fluxo operacional da RR Infocell: clientes, aparelhos, ordens de servico, checklist tecnico, estoque basico, comprovantes e relatorios iniciais.

## Status do projeto

- Prototipo inicial aprovado pelo cliente.
- MVP definido com foco em assistencia tecnica.
- Firebase definido como base tecnica do MVP.
- Design system inicial criado e documentado.
- Frontend reorganizado em `frontend/`.

## Stack definida

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts

### Backend futuro

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
|   `-- README.md
|-- infra/
|   `-- README.md
|-- docs/
|   |-- design-system.md
|   |-- firebase-architecture.md
|   |-- mvp-scope.md
|   |-- notion-update-rule.md
|   `-- project-structure.md
`-- README.md
```

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Servidor local padrao:

```text
http://localhost:8080
```

## Validacao

```bash
cd frontend
npm run build
npm test
```

## Documentacao

- [Design system](docs/design-system.md)
- [Escopo do MVP](docs/mvp-scope.md)
- [Arquitetura Firebase](docs/firebase-architecture.md)
- [Estrutura do projeto](docs/project-structure.md)
- [Regra de atualizacao do Notion](docs/notion-update-rule.md)

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
