# RR Infocell Design System

## Objetivo

Padronizar a interface do RR Infocell para um sistema operacional de assistencia tecnica: denso, claro, rapido de escanear e consistente entre dashboard, ordens de servico, checklist, estoque, PDV e financeiro.

## Base tecnica

- Tailwind CSS com tokens em `frontend/src/index.css`.
- Componentes base shadcn/ui em `frontend/src/components/ui`.
- Componentes de produto em `frontend/src/components/design-system`.
- Tokens nomeados em `frontend/src/lib/design-system.ts`.
- Icones via `lucide-react`.

## Identidade visual

- Tema: graphite tech escuro.
- Cor primaria: azul tecnico para acao principal, foco e destaques.
- Cores semanticas:
  - `success`: concluido, pago, entregue.
  - `warning`: pendente, aguardando aprovacao, atencao operacional.
  - `destructive`: atraso, erro, reprovacao, bloqueio.
  - `info`: analise, acompanhamento e estados informativos.
- Bordas e superficies devem manter contraste baixo, com foco na leitura dos dados.

## Tipografia

- Display: `Space Grotesk` para titulos, numeros grandes e destaques.
- Texto: `Inter` para interface, labels e conteudo.
- Mono: `JetBrains Mono` para OS, datas, valores tecnicos, status compactos e identificadores.

## Componentes de produto

### `PageHeader`

Use no topo de paginas internas para titulo, descricao curta e acoes.

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

Use para areas com cabecalho e conteudo: tabelas, listas, graficos e blocos de formulario.

```tsx
<SectionPanel title="Ordens recentes" description="Atualizadas nas ultimas 24h">
  <Tabela />
</SectionPanel>
```

## Regras de uso

- Acao principal da tela usa `Button` default ou `bg-gradient-primary` quando precisa de destaque.
- Acoes secundarias usam `outline` ou `ghost`.
- Cards devem usar `surface-panel` para manter a aparencia do produto.
- Tabelas devem priorizar densidade, alinhamento e leitura rapida.
- Status devem usar `StatusBadge`; nao criar badges manuais com cores soltas.
- Nao usar cores Tailwind cruas como `blue-500`, `red-500` ou `green-500` em telas do produto. Preferir tokens (`primary`, `success`, `warning`, `destructive`, `muted`, `border`).
- Icones devem vir de `lucide-react`.
- Raio padrao: `rounded-md` para controles e `rounded-lg` para paineis.

## Proximos componentes recomendados

- `DataTable` para listagens de OS, clientes, estoque e financeiro.
- `FormField` para padronizar label, hint, erro e input.
- `StatusTimeline` para ciclo de vida da ordem de servico.
- `EmptyState` para telas sem dados.
- `ConfirmDialog` para acoes destrutivas.
