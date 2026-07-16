# RR Infocell - Guia para agentes

## Stack

- Frontend: React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query.
- Backend: Node.js + Express + TypeScript, Firebase Admin SDK/Firestore.
- Hospedagem: Cloud Run para backend e Firebase Hosting para frontend.
- Auth: Firebase Auth no frontend; `requireAuth` e `requireRole` no backend.

## Estrutura principal

```text
frontend/src/
  pages/          Uma pagina por rota/tela.
  components/     Componentes reutilizaveis, incluindo design-system/ e ui/.
  services/       Clientes REST que chamam o backend via apiRequest.
  constants/      business.ts, company.ts, query.ts, routes.ts, status.ts.
  lib/            formatters.ts, utils.ts, auth.tsx, financeiro.ts.
backend/src/
  modules/        Um modulo por entidade/feature.
  middlewares/    auth, tenant, error handling.
  scripts/        Scripts de manutencao Firestore.
nextassist-site/
  app/            Site comercial Next.js App Router.
  components/     Sessoes da landing, pricing, blog, cenas Three.js.
  lib/            Firebase/blog API do site comercial.
docs/nextassist/
  *.md            Roadmap SaaS, multiempresa, tenant, white label, planos.
```

## Regras de produto que nao podem regredir

- Modelo mental obrigatorio: RR Infocell e um cliente White Label (WL) em producao e o tenant piloto; NextAssist e a plataforma SaaS/White Label preparada para atender a RR Infocell e outros clientes.
- A RR Infocell deve ter identidade propria por tenant, incluindo logo, nome, cores, dados da empresa e demais personalizacoes. Nao use a marca NextAssist como identidade visual operacional desse cliente.
- Mudancas pedidas para "RR Infocell" normalmente afetam a operacao do cliente atual. Avalie se a regra tambem deve ir para a base SaaS comum.
- Mudancas pedidas para "NextAssist", "site", "planos", "SaaS", "WL" ou "White Label" devem considerar outros clientes futuros, nao apenas a RR Infocell.
- Nao trocar marca RR Infocell por NextAssist em documentos operacionais, fiscais, recibos, OS, garantias ou relatorios sem confirmar o contexto.
- Nao usar dados reais da RR Infocell como padrao comercial de outros tenants; eles sao dados do cliente piloto.
- Dados da empresa devem vir de `frontend/src/constants/company.ts`.
  Use `import { EMPRESA } from "@/constants/company";`; nao hardcode nome, CNPJ, endereco, telefone, WhatsApp ou tecnico padrao.
- Dark mode e o padrao visual do produto sao permanentes. Nao adicionar toggle de tema.
- Classes visuais recorrentes: `surface-panel`, `bg-gradient-primary`, `shadow-glow`, `glow-text`.
- Botao primario: `className="bg-gradient-primary text-primary-foreground shadow-glow"`.
- Fontes esperadas: Space Grotesk para headings, Inter para corpo, JetBrains Mono para valores/codigo.

## Estado, dados e autenticacao no frontend

- Nao usar Redux/Zustand. Use TanStack Query para dados do servidor e `useState`/`useMemo` para estado local.
- Query keys devem seguir os padroes de `frontend/src/constants/query.ts` e o que ja existe nas paginas.
- Mutations de update/delete devem invalidar a query correspondente com `queryClient.invalidateQueries`.
- Chamadas REST devem passar por `frontend/src/services/api.ts`.
- Nao disparar queries autenticadas antes do Firebase Auth estar pronto. Quando uma query roda em layout/global polling, use `enabled` com estado de autenticacao.
- Em producao, chamada sem `Authorization: Bearer <token>` gera `Token Firebase Auth nao informado` no middleware `requireAuth`.

## Formularios e formatacao

- Aplique `capitalizeFirst(value)` de `@/lib/formatters` em campos como nome, marca, modelo, endereco e observacoes.
- Nao capitalize email, CPF/CNPJ, IMEI, senha, SKU/codigo interno ou outros identificadores.
- Use `formatBRL`, `formatDate`, `formatDateShort`, `formatDateTime` e `parseMoney` de `@/lib/formatters` quando aplicavel.
- Nao usar `replaceAll`; use `.replace(/_/g, " ")` para compatibilidade.

## Financeiro e despesas

- O financeiro/DRE contabiliza despesas por `vencimento`, nao por `pagoEm` nem pela data em que a baixa foi feita.
- A regra de competencia fica em `frontend/src/lib/financeiro.ts`; alteracoes devem manter/expandir os testes em `frontend/src/lib/financeiro.test.ts`.
- Formatos aceitos de vencimento: `dd/mm`, `dd/mm/aaaa` e `aaaa-mm-dd`.
- Despesa marcada como paga pode receber `pagoEm` no backend, mas isso nao deve mover a despesa para outro mes do DRE.
- No Dashboard, metricas dentro de um bloco mensal devem usar o mesmo recorte temporal do bloco. Nao misture contagem historica com titulo "Valores de <mes>".

## PDV, OS e descontos

- OS calcula `valorTotal` como pecas + mao de obra - desconto.
- No fechamento de OS no PDV, se `selectedOrdem.desconto` existir, mostre a linha do desconto antes do total para evitar confusao no caixa.
- Venda/finalizacao de OS deve invalidar queries relacionadas: ordens, ordem individual, vendas e eventos.
- Ao lidar com pagamento de OS, respeite `valorAdiantado`, `formaPagamentoAdiantamento`, desconto e troco.

## Integracoes fiscais e pagamentos

- A documentacao de referencia fica em `docs/nextassist/integracoes-fiscais-pagamentos.md`.
- Configuracoes fiscais, tokens OAuth, terminal e adquirente sao sempre resolvidos por `tenantId`; nunca use credenciais de um tenant em outro.
- `MERCADO_PAGO_CLIENT_ID` e `MERCADO_PAGO_CLIENT_SECRET` pertencem a aplicacao NextAssist. Cada cliente conecta a propria conta via OAuth e nao recebe essas credenciais globais.
- Segredos persistidos devem usar a criptografia de `backend/src/modules/integracoes/integracoes.crypto.ts`. Nunca salvar senha de certificado, token ou client secret em texto puro, frontend, Git ou logs.
- No pagamento integrado, o backend deve validar tenant, status aprovado, valor suficiente e consumo unico antes de criar a venda. Validacao apenas no frontend nao e aceitavel.
- A integracao Mercado Pago Point esta ativa; o status atual usa polling de Orders. Webhook assinado, estorno e recuperacao de pendencias ainda sao trabalhos futuros.
- A interface ja armazena configuracao de NFC-e/NFS-e, mas emissao fiscal real ainda nao esta implementada. Nao apresentar configuracao salva como nota fiscal autorizada.
- Novos adquirentes e emissores devem implementar `PaymentProvider` ou `FiscalProvider`, preservando o nucleo e o isolamento multiempresa.

## Sistema de impressao

| Tipo | Onde | Como |
| --- | --- | --- |
| OS via cliente | `OrdemDetalhe.tsx` | `PrintPreviewDialog` + `OsPreviewContent({ viaInterna: false })` |
| OS via interna | `OrdemDetalhe.tsx` | `PrintPreviewDialog` + `OsPreviewContent({ viaInterna: true })`; exibe senha |
| Cupom termico | `PDV.tsx` | `buildCupomHtml()` + `window.open()` com `@page { size: 80mm }` |
| Nota de orcamento | `Orcamento.tsx` | `PrintPreviewDialog` + `NotaOrcamentoContent` com logo/fallback |

## Campos sensiveis da OS

O tipo `OrdemServico` no frontend e backend inclui:

- `tipoSenha: "sem_senha" | "numerica" | "padrao" | "nao_informou"`.
- `senhaAparelho?: string`, apenas quando numerica.
- `padraoDeSenha?: string`, sequencia como `1 -> 5 -> 9`, apenas quando padrao.

Via interna de impressao pode exibir senha; via cliente nao deve expor senha do aparelho.

## Backend

- Rotas passam por `routes.use(requireAuth)` exceto `/health`.
- Controle de permissao por modulo fica em `backend/src/routes.ts` com `requireRole`.
- Modulos tenant-aware devem usar `resolveTenant` e `getRequestTenantId`.
- Repositorios usam Firestore quando configurado e geralmente possuem fallback in-memory para testes.
- Valide entrada com Zod em `*.schemas.ts`; nao confie em payload do frontend.
- Erros devem passar pelo handler padrao e observabilidade, usando `AppError` quando apropriado.

## Modulos backend

`aparelhos`, `categorias`, `checklists`, `clientes`, `contas`, `despesas`, `fornecedores`, `marcas`, `movimentacoes-estoque`, `orcamentos`, `ordem-eventos`, `ordens-servico`, `produtos`, `usuarios`, `vendas`, `whatsapp`, `observabilidade`, `tenants`.

## NextAssist SaaS, planos e site comercial

- O produto SaaS/White Label e NextAssist; RR Infocell e um cliente WL em producao e o tenant piloto operacional.
- Trate logo, marca, cores, dados empresariais e demais personalizacoes da RR Infocell como configuracao exclusiva do tenant. Elas nao devem virar padrao global da plataforma nem ser herdadas por outros clientes.
- O sistema deve ser mantido como base comum: melhorias estruturais entram no produto, mas configuracoes, branding, dados e permissoes devem ser resolvidos por tenant/plano quando forem SaaS.
- Para outro cliente com White Label, o app deve poder exibir marca, cores, dados de empresa, plano e permissoes diferentes sem alterar regras centrais de OS, PDV, estoque e financeiro.
- Ao implementar algo para SaaS real, nao confiar em config estatica do frontend como fonte final; o backend/tenant deve ser a fonte de verdade para plano, status de assinatura e features.
- O app operacional fica em `frontend/` + `backend/`; o site comercial/landing fica em `nextassist-site/`.
- Antes de alterar SaaS, tenant, white label, billing, planos ou site comercial, leia os docs relevantes em `docs/nextassist/`.
- O roadmap principal esta em `docs/nextassist/roadmap.md`; arquitetura SaaS em `docs/nextassist/arquitetura-saas.md`; estrategia white label em `docs/nextassist/white-label.md`.
- Planos do app operacional estao em `frontend/src/config/planModules.ts` e `frontend/src/config/kiwifyPlans.ts`.
- A tela de planos dentro do app esta em `frontend/src/pages/Planos.tsx`.
- O pricing/site publico fica no `nextassist-site`, principalmente em `components/Pricing.tsx` e secoes importadas por `app/page.tsx`.
- Mudancas de plano devem manter coerencia entre: site publico, tela `Planos`, Kiwify productId/checkout, matriz `planModules`, tenant config e webhooks Kiwify.
- Recursos de IA por plano devem ser tratados como feature flags por tenant, nao apenas texto comercial no site.
- Nao ativar bloqueio real de recurso premium apenas no frontend; backend tambem deve validar permissao/plano para endpoints sensiveis.
- Para o plano/addon IA, use como referencia `docs/ai-implementation-plan.md`.

## Next.js site comercial

- `nextassist-site` usa Next.js 16, React 19, Tailwind 4 e App Router.
- O `nextassist-site/AGENTS.md` exige ler docs locais em `node_modules/next/dist/docs/` antes de usar APIs Next.js, porque a versao pode ter mudancas incompatíveis.
- Para UI do site, preserve a identidade NextAssist e a narrativa SaaS para assistencias tecnicas.
- Evite copiar regras visuais do app operacional quando a landing ja tiver sistema visual proprio.
- Para cenas 3D, use Three.js/React Three Fiber e valide que o canvas nao fica em branco no desktop e mobile quando a alteracao tocar essa area.

## Fornecedores e terceirizados

- Fornecedores e terceirizados ja tem endpoints/backend em parte do projeto, mas ainda ha fluxos historicos/localStorage no frontend.
- Antes de alterar, confirme o fluxo real da tela em questao e preserve compatibilidade com chaves legadas como `rr-fornecedores`, `rr-produto-fornecedor` e `rr-terceirizados` se ainda estiverem em uso.

## Comandos uteis

```bash
# Frontend
cd frontend && npm run dev
cd frontend && npm run build
npx tsc --noEmit --project frontend/tsconfig.app.json
cd frontend && npm run test

# Backend
cd backend && npm run dev
cd backend && npm run build
cd backend && npm run test

# Site comercial NextAssist
cd nextassist-site && npm run dev
cd nextassist-site && npm run build
cd nextassist-site && npm run lint
```

Scripts de manutencao conhecidos:

```bash
cd backend
npx tsx src/scripts/limpar-dados-teste.ts
npx tsx src/scripts/reverter-venda-vanessa.ts
```

## Antes de finalizar alteracoes

- Rode pelo menos o typecheck/build do lado alterado.
- Para regras financeiras, rode `cd frontend && npm run test -- financeiro.test.ts`.
- Se mexer em UI critica, preferir validar visualmente no navegador/dev server.
- Nao incluir arquivos soltos ou scripts de manutencao nao relacionados no commit.

## Commit e deploy automatico

- Commit local nao dispara deploy. O deploy de producao ocorre apos `push` para `main`, desde que o commit altere caminhos monitorados pelo workflow.
- `.github/workflows/ci.yml` monitora `frontend/**`, `backend/**`, `infra/**` e o proprio workflow. Depois das validacoes, faca commit apenas dos arquivos da tarefa, envie `main` e acompanhe o run `CI / CD` ate concluir.
- O workflow gera artefatos separados: RR Infocell para `rr-infocell.web.app` e NextAssist para `nextassist.web.app`. Nao reutilize um unico build com a mesma identidade nos dois targets.
- Alteracoes em `nextassist-site/**` disparam o workflow separado `.github/workflows/nextassist-deploy.yml`.
- Mudancas apenas em documentacao ou `AGENTS.md` nao disparam deploy, salvo quando o arquivo estiver listado nos filtros do workflow.
