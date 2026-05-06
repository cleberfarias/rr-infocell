# RR Infocell

Sistema web para gestao de assistencia tecnica e loja de celulares.

O objetivo do projeto e centralizar o fluxo operacional da RR Infocell: clientes, aparelhos, ordens de servico, checklist tecnico, estoque, comprovantes e relatorios iniciais.

## Status do projeto

- Prototipo inicial aprovado pelo cliente.
- MVP definido com foco em assistencia tecnica.
- Firebase definido como base tecnica do MVP.
- Design system inicial criado e documentado.
- Frontend reorganizado em `frontend/`.
- Backend base criado em `backend/`.
- Modulo de clientes implementado com API REST, tela integrada, Firestore/fallback local e testes.
- Modulo de aparelhos implementado no backend com API REST, validacao, Firestore/fallback local e testes.
- Tela de aparelhos integrada no frontend com listagem, busca, filtro por cliente e CRUD.
- Modulo de ordens de servico implementado no backend com API REST, numero sequencial, validacao de vinculos, Firestore/fallback local e testes.
- Telas de ordens de servico integradas com API real para abertura e listagem de OS.
- Detalhe da OS implementado com consulta real de cliente/aparelho, comprovante simples e impressao.
- Tela de manutencao integrada com OS reais para diagnostico, status tecnico, mao de obra e pecas usadas.
- Tela de orcamentos integrada com OS reais para envio, aprovacao e reprovacao por status.
- PDV/Caixa integrado com OS reais prontas para retirada, registro de pagamento e entrega.
- Dashboard inicial integrado com dados reais de OS, relatorio por status e resumo financeiro previsto.
- Modulo de checklist tecnico implementado no backend com API REST, vinculo com OS/aparelho, Firestore/fallback local e testes.
- Tela de checklist tecnico integrada com OS real e API de checklists.
- Modulo de produtos/estoque implementado com API REST, Firestore/fallback local, testes e tela integrada.
- Movimentacoes manuais de estoque implementadas com entrada, saida, ajuste, historico por produto e bloqueio de estoque negativo.
- Baixa automatica de pecas usadas na OS integrada ao estoque.
- Upload de fotos no checklist funcionando com Firebase Storage, regras por custom claim e metadados salvos no checklist.
- Impressao do checklist tecnico implementada com versao limpa para papel contendo OS, cliente, aparelho, itens, fotos e assinaturas.
- Firestore real ativo no projeto `rr-infocell` e modulo de clientes validado gravando no banco real.
- Base de Firebase Auth preparada no frontend com `AuthProvider`, login/logout e protecao de rotas por perfil.
- Tela administrativa de usuarios implementada para criar usuarios internos e definir nivel de acesso.
- Modulo de Atendimento WhatsApp implementado com conversas, midias, acoes de OS, automacoes de abertura/status/lembretes e PIX opcional.

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
- Firebase Storage para fotos e comprovantes.
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
|   |   |-- architecture.md
|   |   |-- setup.md
|   |   |-- firestore.rules
|   |   `-- storage.rules
|   `-- README.md
|-- firebase.json
|-- .firebaserc.example
|-- Makefile
|-- docs/
|   |-- design-system.md
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

Por padrao, o backend local usa Firestore real quando `backend/.env` aponta para uma service account via `GOOGLE_APPLICATION_CREDENTIALS`. Use `make dev-db` apenas quando quiser trabalhar com banco emulado.

## Autenticacao no frontend

O frontend ja tem base para Firebase Auth. Em desenvolvimento, `VITE_AUTH_DEV_MODE=true` permite entrar escolhendo o perfil na tela de login sem precisar criar usuarios reais ainda.

Para testar com usuarios reais do Firebase Auth:

1. Configure `frontend/.env` com as variaveis `VITE_FIREBASE_*`.
2. Altere `VITE_AUTH_DEV_MODE=false`.
3. Crie o primeiro admin pelo script `npm run auth:set-role`.
4. Entre com o admin real e use `/app/usuarios` para cadastrar os demais usuarios.

As permissoes finas por usuario usam custom claim `role` com os valores `admin`, `atendente` ou `tecnico`.

Para definir a claim de perfil via backend:

```bash
cd backend
npm run auth:set-role -- --email atendente@rrinfocell.com --role atendente
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
- [Arquitetura Firebase](infra/firebase/architecture.md)
- [Setup Firebase](infra/firebase/setup.md)
- [Estrutura do projeto](docs/project-structure.md)
- [Regra de atualizacao do Notion](docs/notion-update-rule.md)
- [Backend](backend/README.md)
- [Modulo clientes](backend/src/modules/clientes/README.md)
- [Modulo aparelhos](backend/src/modules/aparelhos/README.md)
- [Modulo ordens de servico](backend/src/modules/ordens-servico/README.md)
- [Modulo checklists](backend/src/modules/checklists/README.md)
- [Modulo usuarios](backend/src/modules/usuarios/README.md)
- [Modulo produtos e estoque](backend/src/modules/produtos/README.md)
- [Modulo movimentacoes de estoque](backend/src/modules/movimentacoes-estoque/README.md)

## Funcionalidades do MVP

- Login com base preparada para Firebase Auth.
- Cadastro de usuarios internos por perfil.
- Dashboard inicial.
- Cadastro de clientes.
- Cadastro de aparelhos.
- Ordem de servico.
- Checklist tecnico.
- Controle de status da OS.
- Upload de fotos no checklist.
- Impressao do checklist tecnico.
- Relatorio basico de OS por status no dashboard.
- Visualizacao e impressao simples de comprovante da OS.
- Estoque integrado com API real, CRUD de produtos, movimentacoes manuais e baixa por OS.
- Atendimento WhatsApp com envio/recebimento de mensagens, midias, acoes de OS e automacoes operacionais.

## Fora do MVP inicial

- PDV completo.
- DRE completo.
- Integracao com MarketUP.
- Assinatura digital.
- Envio automatico por WhatsApp.
- App mobile.
