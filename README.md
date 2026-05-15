# RR Infocell

Sistema web de gestão para assistência técnica e loja de celulares.

## Visão geral

Sistema completo para centralizar o fluxo operacional da RR Infocell: clientes, aparelhos, ordens de serviço, checklist técnico, estoque, movimentações, PDV, financeiro, WhatsApp e treinamento.

## Status atual — Branch TECH-V2

MVP publicado e validado com o cliente. Em evolução contínua com feedbacks reais de uso.

## Stack

### Frontend
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- react-icons + lucide-react
- Recharts + react-day-picker + date-fns (ptBR)
- @tanstack/react-query

### Backend
- Node.js + Express + TypeScript
- Firebase Admin SDK + Firestore + Firebase Auth
- OpenAI SDK (GPT-4o-mini para assistente IA)

### Infra
- Firebase Hosting (frontend)
- Cloud Run (backend Node/Express)
- Firestore (banco principal)
- Firebase Storage (fotos do checklist)

## Estrutura do repositório

```
rr-infocell/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (shadcn + custom)
│   │   ├── constants/        # Status labels, routes, query config, business rules
│   │   ├── lib/              # Formatters (date-fns), utils
│   │   ├── pages/            # Todas as telas do sistema
│   │   └── services/         # Clientes de API
│   └── public/
│       └── screenshots/      # Screenshots usados no Centro de Treinamento
├── backend/
│   └── src/modules/          # aparelhos, ajuda, categorias, checklists,
│                             # clientes, contas, despesas, marcas,
│                             # movimentacoes-estoque, orcamentos,
│                             # ordem-eventos, ordens-servico,
│                             # produtos, usuarios, vendas, whatsapp
├── infra/
├── docs/
└── Makefile
```

## Como rodar

```bash
make dev
```

Serviços locais:
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:3333`

Se as portas estiverem ocupadas:
```bash
make dev-fresh
```

## Módulos implementados

### Fluxo principal de atendimento
```
Nova OS → Checklist → Manutenção → Orçamento → PDV/Caixa → Termo de Garantia
```
Cada etapa navega automaticamente para a próxima ao salvar.

### Telas disponíveis
| Rota | Descrição |
|---|---|
| `/app` | Dashboard com métricas, OS recentes e alertas |
| `/app/ordens/nova` | Nova OS com cadastro rápido de cliente + aparelho |
| `/app/ordens` | Lista de OS com filtros, busca, countdown de prazo |
| `/app/checklist` | Checklist técnico de entrada e saída com fotos |
| `/app/manutencao` | Diagnóstico, peças, linha do tempo, status |
| `/app/orcamento` | Envio e aprovação de orçamento via WhatsApp |
| `/app/estoque` | Dashboard de consulta de produtos e nível de estoque |
| `/app/movimentacoes` | Entrada/saída/transferência com NF-e |
| `/app/pdv` | Fechamento de OS e venda direta |
| `/app/financeiro` | DRE, gráfico semanal, contas bancárias, exportar PDF |
| `/app/despesas` | Registro de despesas operacionais |
| `/app/clientes` | Cadastro e histórico |
| `/app/aparelhos` | Histórico de dispositivos por cliente |
| `/app/atendimento` | WhatsApp integrado com Baileys |
| `/app/usuarios` | Gestão de acessos (admin, atendente, técnico) |
| `/app/treinamento` | Centro de treinamento com guias passo a passo |

### Backend — endpoints principais
```
GET/POST/PUT/DELETE /api/clientes
GET/POST/PUT/DELETE /api/aparelhos
GET/POST/PUT/PATCH  /api/ordens-servico
GET/POST/PUT        /api/checklists
GET/POST            /api/movimentacoes-estoque
GET/POST/PUT/DELETE /api/produtos
GET/POST/DELETE     /api/categorias
GET/POST/DELETE     /api/marcas
GET/POST/PUT/DELETE /api/contas
GET/POST            /api/orcamentos
GET/POST            /api/vendas
GET/POST/PUT/DELETE /api/despesas
GET                 /api/usuarios/tecnicos
POST                /api/ajuda/perguntar   ← Assistente IA (GPT-4o-mini)
```

## Autenticação

Firebase Auth com custom claim `role` (`admin`, `atendente`, `tecnico`).

Em desenvolvimento, `VITE_AUTH_DEV_MODE=true` permite entrar sem usuário real.

Para criar admin:
```bash
cd backend
npm run auth:set-role -- --email admin@exemplo.com --role admin
```

## Variáveis de ambiente

### Backend (`backend/.env`)
```
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://127.0.0.1:5173
FIREBASE_PROJECT_ID=rr-infocell
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.local.json
OPENAI_API_KEY=sk-...
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3333/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=rr-infocell.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rr-infocell
VITE_FIREBASE_STORAGE_BUCKET=rr-infocell.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Validação

```bash
# Frontend
cd frontend && npm run build && npx tsc --noEmit

# Backend
cd backend && npm run build && npm run lint
```

## Funcionalidades principais

- ✅ Fluxo completo de OS com navegação automática entre etapas
- ✅ Cadastro rápido de cliente + aparelho dentro da Nova OS
- ✅ Checklist técnico de entrada e saída com upload de fotos
- ✅ Orçamento enviado via WhatsApp com aprovação registrada
- ✅ Termo de Garantia impresso no Detalhe da OS
- ✅ Estoque com categorias/marcas customizáveis, gauge de nível, NF-e
- ✅ PDV com fechamento de OS e venda direta
- ✅ DRE simplificado com exportação em PDF
- ✅ Contas bancárias com saldo editável
- ✅ WhatsApp integrado (Baileys) com ações automáticas de OS
- ✅ Assistente IA (GPT-4o-mini) com guias rápidos do sistema
- ✅ Centro de treinamento com screenshots reais e progresso por módulo
- ✅ Dark/light mode com persistência
- ✅ Command Palette (Ctrl+K), mobile navigation, DatePicker ptBR
- ✅ Refatoração: constants/, formatters.ts, react-icons, react-day-picker

## Documentação

- [Regras de Negócio](docs/business-rules.md)
- [Escopo do MVP](docs/mvp-scope.md)
- [Design System](docs/design-system.md)
- [Estrutura do Projeto](docs/project-structure.md)
- [Deploy em Produção](docs/production-deploy.md)
- [Backend](backend/README.md)
- [Infra](infra/README.md)
- [WhatsApp](whatsapp/README.md)
- [Notion (documentação do projeto)](https://www.notion.so/34c9de4c6a6380b39ea4f86242ff322a)
