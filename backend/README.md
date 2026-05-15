# Backend — RR Infocell

API REST do sistema de gestão RR Infocell.

## Stack

- Node.js + Express + TypeScript
- Firebase Admin SDK + Firestore + Firebase Auth
- OpenAI SDK (GPT-4o-mini)
- Baileys (WhatsApp)
- Zod (validação de schemas)
- Vitest (testes)

## Módulos

| Módulo | Descrição |
|---|---|
| `health` | Status da API e Firebase Admin SDK |
| `clientes` | CRUD de clientes com busca |
| `aparelhos` | CRUD de aparelhos vinculados a clientes |
| `ordens-servico` | CRUD de OS com número sequencial e status |
| `checklists` | Checklist técnico de entrada/saída vinculado à OS |
| `ordem-eventos` | Linha do tempo e comentários por OS |
| `orcamentos` | Snapshot de orçamento com envio, aprovação e reprovação |
| `vendas` | Fechamento de caixa por OS e venda direta |
| `produtos` | CRUD de estoque com categorias, marcas, custos |
| `movimentacoes-estoque` | Entrada, saída, ajuste e histórico |
| `categorias` | Categorias customizáveis de produto (Firestore) |
| `marcas` | Marcas customizáveis de produto (Firestore) |
| `contas` | Contas bancárias com saldo (Firestore) |
| `despesas` | CRUD de despesas operacionais |
| `usuarios` | Gestão de usuários internos (Firebase Auth) |
| `whatsapp` | Conexão Baileys, mensagens, mídias, automações |
| `ajuda` | Assistente IA via OpenAI GPT-4o-mini |

## Como rodar

Da raiz do repositório:
```bash
make dev-backend
```

Ou diretamente:
```bash
cd backend
npm install
npm run dev
```

Servidor local: `http://localhost:3333`

Health check: `GET /api/health`

## Variáveis de ambiente

Copie `.env.example` para `.env`:

```env
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://127.0.0.1:5173

# Firebase (Firestore real)
FIREBASE_PROJECT_ID=rr-infocell
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.local.json

# Firebase (Firestore Emulator — opcional)
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
# FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

# OpenAI (assistente IA)
OPENAI_API_KEY=sk-...

# WhatsApp automações (opcional)
ATENDIMENTO_PIX_CHAVE=
ATENDIMENTO_PIX_NOME=
ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS=24
ATENDIMENTO_LEMBRETE_RETIRADA_DIAS=2
ATENDIMENTO_AUTOARQUIVAR_DIAS=7
```

## Autenticação

- `GET /api/health` — público
- Demais rotas — exigem `Authorization: Bearer <Firebase ID Token>`
- Custom claim `role`: `admin`, `atendente` ou `tecnico`

Para definir role de um usuário:
```bash
npm run auth:set-role -- --email usuario@exemplo.com --role admin
```

## Container (Cloud Run)

```bash
docker build -t rr-infocell-backend .
docker run -p 3333:3333 --env-file .env rr-infocell-backend
```

## Validação

```bash
npm run build
npm run lint
npm run format:check
npm test
```
