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

### `DataTable`

Use para listagens operacionais com colunas densas, leitura horizontal e acoes por linha.

```tsx
<DataTable
  columns={columns}
  data={ordens}
  getRowKey={(ordem) => ordem.id}
  emptyState={<EmptyState title="Nenhuma ordem encontrada" />}
/>
```

### `FormField`

Use para padronizar label, hint e erro em filtros e formularios.

```tsx
<FormField id="cliente" label="Cliente" hint="Nome completo ou telefone">
  <Input id="cliente" />
</FormField>
```

### `EmptyState`

Use em tabelas e paineis sem dados, sempre com mensagem objetiva e acao quando existir proximo passo claro.

```tsx
<EmptyState
  icon={ClipboardList}
  title="Nenhuma ordem encontrada"
  description="Ajuste a busca ou crie uma nova ordem de servico."
/>
```

## Regras de uso

- Acao principal da tela usa `Button` default ou `bg-gradient-primary` quando precisa de destaque.
- Acoes secundarias usam `outline` ou `ghost`.
- Cards devem usar `surface-panel` para manter a aparencia do produto.
- Tabelas devem usar `DataTable` e priorizar densidade, alinhamento e leitura rapida.
- Campos de formulario e filtros devem usar `FormField` para manter label, hint e erro consistentes.
- Estados vazios devem usar `EmptyState`; nao deixar paineis sem dados em branco.
- Status devem usar `StatusBadge`; nao criar badges manuais com cores soltas.
- Nao usar cores Tailwind cruas como `blue-500`, `red-500` ou `green-500` em telas do produto. Preferir tokens (`primary`, `success`, `warning`, `destructive`, `muted`, `border`).
- Icones devem vir de `lucide-react`.
- Raio padrao: `rounded-md` para controles e `rounded-lg` para paineis.

## Proximos componentes recomendados

- `StatusTimeline` para ciclo de vida da ordem de servico.
- `ConfirmDialog` para acoes destrutivas.
