# RR Infocell Design System

## Objetivo

Padronizar a interface do RR Infocell para um sistema operacional de assistência técnica: denso, claro, rápido de escanear e consistente entre dashboard, ordens de serviço, checklist, estoque, PDV e financeiro.

## Base técnica

- Tailwind CSS com tokens em `src/index.css`.
- Componentes base shadcn/ui em `src/components/ui`.
- Componentes de produto em `src/components/design-system`.
- Tokens nomeados em `src/lib/design-system.ts`.
- Ícones via `lucide-react`.

## Identidade visual

- Tema: graphite tech escuro.
- Cor primária: azul técnico para ação principal, foco e destaques.
- Cores semânticas:
  - `success`: concluído, pago, entregue.
  - `warning`: pendente, aguardando aprovação, atenção operacional.
  - `destructive`: atraso, erro, reprovação, bloqueio.
  - `info`: análise, acompanhamento e estados informativos.
- Bordas e superfícies devem manter contraste baixo, com foco na leitura dos dados.

## Tipografia

- Display: `Space Grotesk` para títulos, números grandes e destaques.
- Texto: `Inter` para interface, labels e conteúdo.
- Mono: `JetBrains Mono` para OS, datas, valores técnicos, status compactos e identificadores.

## Componentes de produto

### `PageHeader`

Use no topo de páginas internas para título, descrição curta e ações.

```tsx
<PageHeader
  eyebrow="// Visao geral"
  title="Resumo do dia"
  description="sexta-feira, 24 de abril"
/>
```

### `MetricCard`

Use para indicadores de dashboard e resumos financeiros.

```tsx
<MetricCard
  icon={ClipboardList}
  label="Ordens abertas"
  value={12}
  hint="aguardando acao"
/>
```

### `SectionPanel`

Use para áreas com cabeçalho e conteúdo: tabelas, listas, gráficos e blocos de formulário.

```tsx
<SectionPanel title="Ordens recentes" description="Atualizadas nas ultimas 24h">
  <Tabela />
</SectionPanel>
```

## Regras de uso

- Ação principal da tela usa `Button` default ou `bg-gradient-primary` quando precisa de destaque.
- Ações secundárias usam `outline` ou `ghost`.
- Cards devem usar `surface-panel` para manter a aparência do produto.
- Tabelas devem priorizar densidade, alinhamento e leitura rápida.
- Status devem usar `StatusBadge`; não criar badges manuais com cores soltas.
- Não usar cores Tailwind cruas como `blue-500`, `red-500` ou `green-500` em telas do produto. Preferir tokens (`primary`, `success`, `warning`, `destructive`, `muted`, `border`).
- Ícones devem vir de `lucide-react`.
- Raio padrão: `rounded-md` para controles e `rounded-lg` para painéis.

## Próximos componentes recomendados

- `DataTable` para listagens de OS, clientes, estoque e financeiro.
- `FormField` para padronizar label, hint, erro e input.
- `StatusTimeline` para ciclo de vida da ordem de serviço.
- `EmptyState` para telas sem dados.
- `ConfirmDialog` para ações destrutivas.
