# RR Infocell — Guia para Codex

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Node.js + Express + TypeScript, Firestore (Firebase Admin SDK)
- **Hospedagem:** Cloud Run (backend) + Firebase Hosting (frontend)
- **Auth:** Firebase Auth

## Estrutura do projeto

```
frontend/src/
  pages/          # Uma página por rota
  components/     # Componentes reutilizáveis (design-system, ui/)
  services/       # Funções de API (fetch para backend REST)
  constants/      # business.ts, company.ts, routes.ts, status.ts, query.ts
  lib/            # formatters.ts, utils.ts
backend/src/
  modules/        # Um módulo por entidade (ordens-servico, produtos, vendas...)
  scripts/        # Scripts utilitários de manutenção do Firestore
```

## Dados da empresa (não hardcode!)

Sempre importe de `frontend/src/constants/company.ts`:
```ts
import { EMPRESA } from "@/constants/company";
// EMPRESA.nome, EMPRESA.cnpj, EMPRESA.enderecoCompleto, EMPRESA.telefone, EMPRESA.tecnicoPadrao
```

## Tema e estilo

- **Dark mode permanente** — nunca adicionar toggle de tema
- Classes principais: `surface-panel`, `bg-gradient-primary`, `shadow-glow`, `glow-text`
- Fontes: Space Grotesk (headings), Inter (body), JetBrains Mono (mono/código)
- Botão primário: `className="bg-gradient-primary text-primary-foreground shadow-glow"`

## Estado global

- **Sem Redux/Zustand** — TanStack Query para dados do servidor, `useState` para estado local
- Query keys seguem o padrão do arquivo `constants/query.ts`

## Formulários e capitalização

- `capitalizeFirst(value)` de `@/lib/formatters` deve ser aplicado em campos de texto como nome, marca, modelo, endereço, observações
- Campos que **não** devem ter capitalização: email, CPF/CNPJ, IMEI, senha, código interno

## Sistema de impressão

Há quatro tipos de impressão no sistema:

| Tipo | Onde | Como |
|------|------|------|
| OS via cliente | `OrdemDetalhe.tsx` | `PrintPreviewDialog` + `OsPreviewContent({ viaInterna: false })` |
| OS via interna | `OrdemDetalhe.tsx` | `PrintPreviewDialog` + `OsPreviewContent({ viaInterna: true })` — exibe senha |
| Cupom térmico | `PDV.tsx` | `buildCupomHtml()` → `window.open()` com `@page { size: 80mm }` para BAK |
| Nota de orçamento | `Orcamento.tsx` | `PrintPreviewDialog` + `NotaOrcamentoContent` com logo/fallback |

## Campos da OS: senha do aparelho

O tipo `OrdemServico` (backend e frontend) tem:
- `tipoSenha: "sem_senha" | "numerica" | "padrao" | "nao_informou"`
- `senhaAparelho?: string` (senha digitada com números e/ou letras; valor técnico ainda usa `numerica` por compatibilidade)
- `padraoDeSenha?: string` (sequência como "1 → 5 → 9", apenas quando padrão)

## Fornecedores e terceirizados

- **Fornecedores:** localStorage (`rr-fornecedores`, `rr-produto-fornecedor`) — backend pendente
- **Terceirizados:** localStorage (`rr-terceirizados`) — backend pendente

## Scripts de manutenção

```bash
cd backend
npx tsx src/scripts/limpar-dados-teste.ts      # remove dados de teste
npx tsx src/scripts/reverter-venda-vanessa.ts  # exemplo de reversão de venda
```

## Módulos backend disponíveis

`aparelhos`, `categorias`, `checklists`, `clientes`, `contas`, `despesas`, `fornecedores`, `marcas`, `movimentacoes-estoque`, `orcamentos`, `ordem-eventos`, `ordens-servico`, `produtos`, `usuarios`, `vendas`, `whatsapp`

## Comandos úteis

```bash
# Frontend
cd frontend && npm run dev       # dev server
cd frontend && npm run build     # build produção
npx tsc --noEmit --project frontend/tsconfig.app.json  # type check

# Backend
cd backend && npm run dev        # dev server (porta 3333)
cd backend && npm run build      # build
```

## Convenções

- Não usar `replaceAll` — usar `.replace(/_/g, " ")` para compatibilidade TS
- Mutations de update/delete devem invalidar a query correspondente com `queryClient.invalidateQueries`
- Dialogs de confirmação antes de excluir qualquer registro
- Após editar ou excluir, a listagem deve atualizar automaticamente
