# Plano de implementacao de IA no RR Infocell

Este documento define uma proposta incremental para evoluir a IA do sistema RR Infocell sem criar risco operacional em financeiro, estoque, PDV ou dados de clientes.

## 1. Estado atual

O sistema ja possui um assistente IA basico:

- Frontend: `frontend/src/components/AIAssistant.tsx`.
- Service: `frontend/src/services/ajuda.ts`.
- Backend: `backend/src/modules/ajuda/ajuda.routes.ts`.
- Endpoint: `POST /api/ajuda/perguntar`.
- Configuracao: `OPENAI_API_KEY` no backend.
- Uso atual: tirar duvidas de uso do sistema com base em um prompt fixo.

Limitacao principal: a IA atual nao consulta dados reais do sistema nem executa analises estruturadas. Ela responde a partir de conhecimento estatico embutido no prompt.

## 2. Objetivos

Adicionar IA de forma util e controlada para:

1. reduzir erro operacional;
2. acelerar atendimento e orcamentos;
3. antecipar ruptura de estoque;
4. resumir problemas tecnicos;
5. melhorar busca global em linguagem natural.

IA nao deve substituir validacoes deterministicas de negocio. Em fluxos criticos, a IA deve sugerir, explicar ou alertar; a regra final deve ser implementada em codigo e validada por testes.

## 3. Principios de seguranca

- Nunca alterar dados automaticamente sem confirmacao explicita do usuario.
- Nunca enviar senhas de aparelho para IA, exceto se houver justificativa futura e mascaramento/controle especifico.
- Evitar enviar CPF/CNPJ, IMEI completo, telefone completo ou dados sensiveis quando nao forem necessarios.
- Em multiempresa/tenant, toda analise deve respeitar o `tenantId` resolvido no backend.
- Logs, prompts e respostas devem evitar expor dados pessoais desnecessarios.
- Toda recomendacao financeira deve deixar claro qual periodo e qual campo de data foi usado.
- Para decisoes criticas, manter uma regra deterministica no backend/frontend alem da explicacao da IA.

## 4. Arquitetura proposta

### 4.1 Camada de IA no backend

Criar um modulo dedicado:

```text
backend/src/modules/ia/
  ia.routes.ts
  ia.service.ts
  ia.schemas.ts
  ia.types.ts
  prompts/
```

Responsabilidades:

- centralizar chamadas ao provedor de IA;
- aplicar rate limit;
- montar contexto seguro por caso de uso;
- mascarar dados sensiveis;
- registrar erros em observabilidade;
- retornar respostas estruturadas quando necessario.

### 4.2 Frontend

Adicionar pontos de entrada pequenos e contextuais:

- alerta no modal de despesas;
- botao "Sugerir texto" em orcamentos;
- card "Sugestao de reposicao" no estoque;
- resumo inteligente na observabilidade;
- modo de busca natural no Command Palette.

### 4.3 Dados e contexto

Preferir contexto especifico e pequeno:

- para despesa: descricao, valor, vencimento, status, data atual;
- para orcamento: defeito, aparelho, diagnostico, pecas, historico resumido;
- para estoque: produto, estoque atual/minimo, movimentacoes recentes, OS que usaram a peca;
- para observabilidade: grupos de erros agregados, rotas, periodo, frequencia;
- para busca: consulta do usuario e indices textuais/semanticos permitidos.

## 5. Casos de uso priorizados

## 5.1 Financeiro e despesas: detector de anomalia

### Problema

O usuario pode marcar uma despesa vencida em um mes anterior como paga em outro mes e achar que isso muda a competencia financeira.

### MVP sem IA generativa

Implementar uma regra deterministica:

```text
Se despesa.vencimento esta em mes diferente de hoje
e usuario esta mudando pago de false para true,
mostrar confirmacao:
"Essa despesa venceu em junho/2026, mas esta sendo baixada em julho/2026.
O financeiro continuara considerando o vencimento. Confirmar baixa?"
```

### Evolucao com IA

A IA pode explicar o alerta em linguagem natural:

```text
"A baixa esta sendo feita fora do mes de vencimento. Isso nao altera o DRE,
que usa competencia por vencimento. Confirme se a conta realmente pertence
ao vencimento informado."
```

### Arquivos provaveis

- `frontend/src/pages/Despesas.tsx`
- `frontend/src/lib/financeiro.ts`
- `frontend/src/lib/financeiro.test.ts`
- `backend/src/modules/despesas/*`

### Validacao

- Teste unitario para competencia por vencimento.
- Teste manual: despesa vencida em junho marcada paga em julho permanece em junho no DRE.

## 5.2 Orcamentos: sugestao de texto

### Problema

Atendentes repetem textos parecidos para defeitos comuns.

### MVP

Adicionar botao "Sugerir texto do orcamento" na tela de orcamento/manutencao.

Entrada segura para IA:

```json
{
  "aparelho": "Samsung A13",
  "defeitoRelatado": "Tela quebrada",
  "diagnosticoTecnico": "Modulo frontal danificado",
  "pecas": ["Frontal A13 4G"],
  "valorTotal": 220
}
```

Saida esperada:

```json
{
  "texto": "Foi identificado dano no modulo frontal do aparelho. Recomendamos a substituicao da tela completa para restabelecer imagem e toque. Valor total: R$ 220,00.",
  "avisos": ["Texto deve ser revisado antes do envio ao cliente."]
}
```

### Evolucao

Usar historico de OS parecidas para sugerir textos mais consistentes:

- mesmo modelo;
- mesmo defeito;
- mesma peca usada;
- orcamentos aprovados anteriormente.

### Arquivos provaveis

- `frontend/src/pages/Orcamento.tsx`
- `frontend/src/pages/Manutencao.tsx`
- `backend/src/modules/ia/*`
- `backend/src/modules/ordens-servico/*`
- `backend/src/modules/orcamentos/*`

## 5.3 Estoque: sugestao de reposicao

### Problema

Pecas usadas com frequencia podem acabar antes da reposicao.

### MVP deterministico

Criar uma metrica simples:

```text
consumo_medio_30d = saidas_ultimos_30_dias / 30
dias_de_cobertura = estoqueAtual / consumo_medio_30d
```

Sinalizar:

```text
"Tela Moto G22: estoque atual 1, consumo recente 8 unidades/30 dias.
Sugestao: repor 5 unidades."
```

### Evolucao com IA

IA pode resumir motivos e priorizar compras:

- produtos mais usados;
- relacao com modelos de aparelho mais atendidos;
- sazonalidade;
- estoque parado versus estoque critico.

### Arquivos provaveis

- `frontend/src/pages/Estoque.tsx`
- `frontend/src/pages/Movimentacoes.tsx`
- `backend/src/modules/produtos/*`
- `backend/src/modules/movimentacoes-estoque/*`

## 5.4 Observabilidade: resumo inteligente de erros

### Problema

O painel tecnico mostra erros repetidos, mas o operador precisa interpretar manualmente a causa.

### MVP

Agrupar erros por:

- mensagem;
- rota;
- metodo;
- status;
- janela de tempo.

Gerar resumo:

```text
"Erro recorrente e sistematico: 59 ocorrencias de Token Firebase Auth nao informado
em GET /api/ordens-servico e GET /api/produtos. Padrao sugere chamadas do frontend
antes da hidratacao do Firebase Auth."
```

### Saida estruturada sugerida

```json
{
  "severidade": "media",
  "resumo": "Chamadas autenticadas sem token antes do Firebase Auth estar pronto.",
  "causaProvavel": "Race condition no frontend ou polling global sem enabled.",
  "rotasAfetadas": ["GET /api/ordens-servico", "GET /api/produtos"],
  "acaoRecomendada": "Garantir enabled nas queries ate isAuthenticated e isLoading estarem resolvidos."
}
```

### Arquivos provaveis

- `frontend/src/pages/Observabilidade.tsx`
- `frontend/src/services/observabilidade.ts`
- `backend/src/modules/observabilidade/*`
- `backend/src/modules/ia/*`

## 5.5 Busca global em linguagem natural

### Problema

O buscador global tende a funcionar melhor para termos exatos, como OS, cliente ou IMEI.

### MVP

Interpretar consultas simples com regras:

```text
"OS canceladas de julho"
"cliente Joao com iPhone"
"produtos com estoque baixo"
```

Transformar em filtros existentes.

### Evolucao com busca semantica

Criar indice textual/semantico de:

- OS: numero, cliente, aparelho, defeito, diagnostico, status;
- clientes: nome, telefone mascarado;
- produtos: SKU, nome, marca, modelo;
- orcamentos: diagnostico e texto aprovado.

Consulta:

```text
"cliente que trouxe iPhone com problema na tela semana passada"
```

Resposta:

```text
"Encontrei 3 OS possiveis. A mais provavel e OS-273, cliente X, iPhone, defeito tela."
```

### Arquivos provaveis

- `frontend/src/components/CommandPalette.tsx`
- `backend/src/modules/ia/*`
- services de clientes, produtos e ordens.

## 6. Ordem recomendada de implementacao

| Fase | Entrega | Tipo | Risco | Valor |
| --- | --- | --- | --- | --- |
| 1 | Detector de anomalia em despesas | Regra + UX | Baixo | Alto |
| 2 | Resumo inteligente de observabilidade | IA generativa | Baixo/medio | Alto |
| 3 | Sugestao de texto de orcamento | IA generativa | Medio | Alto |
| 4 | Reposicao de estoque | Regra preditiva | Medio | Alto |
| 5 | Busca natural | IA/semantica | Medio/alto | Medio |

## 7. Planos comerciais com IA

O produto ja possui planos definidos no frontend:

- `frontend/src/config/kiwifyPlans.ts`
- `frontend/src/config/planModules.ts`
- `frontend/src/pages/Planos.tsx`

Hoje os planos principais sao `starter`, `profissional` e `empresarial`. A IA pode entrar de duas formas:

1. como um plano novo dedicado a IA;
2. como addon/recurso habilitado dentro dos planos existentes.

### 7.1 Opcao recomendada: addon IA

Criar um addon comercial chamado **IA Operacional**.

Motivo:

- evita duplicar todos os planos;
- permite vender IA para clientes do Profissional e Empresarial;
- deixa o Starter simples e barato;
- facilita limitar consumo por tenant.

Exemplo de oferta:

```text
IA Operacional
- Alertas inteligentes no financeiro
- Sugestao de texto para orcamentos
- Resumo inteligente de erros
- Sugestao de reposicao de estoque
- Busca inteligente em linguagem natural
```

Regras sugeridas:

| Plano | IA inclusa | Observacao |
| --- | --- | --- |
| Starter | Nao | Pode ver assistente basico de ajuda, sem IA operacional |
| Profissional | Addon opcional | Melhor encaixe comercial |
| Empresarial | Inclusa ou addon com limite maior | Pode justificar ticket maior |

### 7.2 Opcao alternativa: novo plano com IA

Adicionar um quarto plano, por exemplo **Profissional IA** ou **Inteligente**.

Exemplo:

```text
Starter - operacao basica
Profissional - controle completo
Profissional IA - controle completo + IA operacional
Empresarial - multiunidades, white label e IA avancada
```

Impacto:

- exige novo `PlanKey`;
- exige novo produto/checkout na Kiwify;
- exige atualizar matriz de modulos;
- exige comunicar melhor diferenca entre Profissional e Profissional IA.

### 7.3 Mudancas no site de planos

Arquivos provaveis:

- `frontend/src/config/kiwifyPlans.ts`
- `frontend/src/config/planModules.ts`
- `frontend/src/pages/Planos.tsx`
- possiveis paginas/site em `nextassist-site/`, se a landing comercial publica estiver separada do app.

Alteracoes sugeridas:

1. Adicionar recursos de IA na lista de features do plano/addon.
2. Exibir badge como "Novo: IA operacional".
3. Separar "Assistente de ajuda" de "IA operacional".
4. Incluir textos claros de limite:
   - sugestoes por mes;
   - resumo de observabilidade;
   - busca inteligente;
   - sugestoes de orcamento.
5. Adicionar aviso:
   - "A IA sugere e resume; decisoes finais continuam com a equipe."

Exemplo de copy para o site:

```text
IA Operacional para assistencias tecnicas
Detecte inconsistencias financeiras, gere textos de orcamento, antecipe reposicao
de pecas e resuma erros tecnicos sem perder tempo lendo logs.
```

### 7.4 Ajuste tecnico de modulos por plano

Adicionar chaves de modulo IA:

```ts
export const moduleKeys = [
  // atuais...
  "iaAssistente",
  "iaFinanceiro",
  "iaOrcamentos",
  "iaEstoque",
  "iaObservabilidade",
  "iaBusca",
] as const;
```

Exemplo de politica:

```ts
starter: {
  iaAssistente: true,
  iaFinanceiro: false,
  iaOrcamentos: false,
  iaEstoque: false,
  iaObservabilidade: false,
  iaBusca: false,
}
profissional: {
  iaAssistente: true,
  iaFinanceiro: false, // true se addon ativo
  iaOrcamentos: false,
  iaEstoque: false,
  iaObservabilidade: false,
  iaBusca: false,
}
empresarial: {
  iaAssistente: true,
  iaFinanceiro: true,
  iaOrcamentos: true,
  iaEstoque: true,
  iaObservabilidade: true,
  iaBusca: true,
}
```

Para addon, apenas `PlanKey` nao basta. O tenant precisa de flags adicionais.

### 7.5 Ajuste no tenant/configuracao do sistema

Adicionar no modelo de tenant:

```ts
type AiFeatures = {
  enabled: boolean;
  financeiro: boolean;
  orcamentos: boolean;
  estoque: boolean;
  observabilidade: boolean;
  busca: boolean;
  monthlyLimit: number;
  usedThisMonth: number;
};
```

Local provavel:

- `backend/src/modules/tenants/tenant.types.ts`
- `backend/src/modules/tenants/tenant.schemas.ts`
- `backend/src/modules/tenants/tenant.config.ts`
- `frontend/src/contexts/TenantContext.tsx`
- `frontend/src/config/tenantConfig.ts`

O frontend deve esconder/desabilitar botoes de IA quando a feature nao estiver habilitada:

```text
Sugerir texto com IA -> bloqueado se !tenant.aiFeatures.orcamentos
Resumo inteligente -> bloqueado se !tenant.aiFeatures.observabilidade
Busca IA -> bloqueado se !tenant.aiFeatures.busca
```

O backend tambem deve validar a permissao. Nao confiar apenas no frontend.

### 7.6 Limites de uso e custo

Criar controle por tenant:

```text
ia_usage/{tenantId_yyyy_mm}
  tenantId
  month
  feature
  requests
  inputTokens
  outputTokens
  estimatedCost
  updatedAt
```

Regras:

- bloquear ou degradar quando atingir limite mensal;
- registrar feature usada;
- nao chamar IA em loop automatico;
- para observabilidade, cachear resumo por janela de tempo;
- para orcamento, gerar somente por clique do usuario;
- para busca, aplicar debounce e limite.

### 7.7 Kiwify e ativacao comercial

Para vender IA via Kiwify:

1. criar produto addon ou novo plano na Kiwify;
2. mapear `productId` no backend/frontend;
3. ajustar webhook para atualizar o tenant com `aiFeatures`;
4. mostrar no sistema se a IA esta ativa;
5. bloquear recursos quando pagamento estiver suspenso/cancelado.

Arquivos provaveis:

- `frontend/src/config/kiwifyPlans.ts`
- `backend/src/modules/webhooks/kiwify.*`
- `backend/src/modules/tenants/*`

### 7.8 Criterio de aceite para planos IA

- Site mostra claramente quais planos tem IA.
- Sistema esconde ou bloqueia recursos de IA fora do plano.
- Backend impede chamada de endpoint IA sem permissao.
- Tenant registra quais features IA estao ativas.
- Uso mensal e contabilizado por tenant.
- Cancelamento/suspensao na Kiwify remove acesso aos recursos IA.

## 8. Proposta de endpoints

```text
POST /api/ia/despesas/analisar-baixa
POST /api/ia/orcamentos/sugerir-texto
POST /api/ia/observabilidade/resumir
GET  /api/ia/estoque/sugestoes-reposicao
POST /api/ia/busca
```

Todos os endpoints devem usar:

- `requireAuth`;
- `requireRole` adequado;
- `resolveTenant` quando consultar dados;
- `aiLimiter` ou limiter especifico;
- Zod schema para entrada;
- logs de erro via observabilidade.

## 9. Prompting e saida estruturada

Preferir respostas JSON em fluxos que alimentam UI. Exemplo para observabilidade:

```json
{
  "resumo": "string",
  "causaProvavel": "string",
  "severidade": "baixa | media | alta",
  "acoesRecomendadas": ["string"]
}
```

Para textos ao cliente, retornar tambem avisos:

```json
{
  "texto": "string",
  "tom": "claro e profissional",
  "precisaRevisaoHumana": true,
  "avisos": ["Nao prometer prazo ou garantia sem dados da OS."]
}
```

## 10. Controle de custo

- Limitar tamanho de prompts e numero de registros enviados.
- Usar agregacoes antes de chamar IA.
- Cachear resumos de observabilidade por janela de tempo.
- Nao chamar IA automaticamente em cada renderizacao de tela.
- Botao explicito para gerar sugestao em orcamento.
- Para estoque, calcular regra localmente e usar IA apenas para resumo/priorizacao.

## 11. Criterios de aceite por fase

### Fase 1 - Despesas

- Alerta aparece quando baixa ocorre em mes diferente do vencimento.
- Confirmacao deixa claro que DRE usa vencimento.
- Teste de competencia por vencimento continua passando.

### Fase 2 - Observabilidade

- Painel mostra resumo agrupado de erros recorrentes.
- Resumo identifica rotas, frequencia, causa provavel e acao recomendada.
- Raw logs continuam disponiveis.

### Fase 3 - Orcamentos

- Texto sugerido nunca e enviado automaticamente.
- Atendente pode editar antes de salvar/enviar.
- Prompt nao envia dados sensiveis desnecessarios.

### Fase 4 - Estoque

- Sugestao de reposicao explica base de calculo.
- Nao altera estoque nem cria pedido automaticamente.
- Produtos inativos nao entram como prioridade, salvo filtro explicito.

### Fase 5 - Busca

- Busca natural retorna resultados com explicacao do criterio.
- Usuario pode abrir o registro encontrado.
- Nao expor dados fora do tenant.

## 12. Pendencias antes de codar

- Definir quais dados podem ser enviados ao provedor de IA.
- Definir mascaramento padrao para telefone, IMEI e documentos.
- Definir se historico de OS pode alimentar sugestoes de orcamento.
- Definir politica de retencao de logs de prompts/respostas.
- Revisar custo estimado por recurso antes de ativar em producao.
- Definir se IA sera addon, novo plano ou recurso incluso no Empresarial.
- Criar produto/checkout Kiwify para IA, se for addon ou novo plano.
- Definir limites mensais por plano e comportamento ao atingir limite.

## 13. Recomendacao pratica

Comecar pela Fase 1, Fase 2 e desenho comercial do addon IA:

1. Fase 1 reduz erro operacional real com baixo risco e quase sem custo de IA.
2. Fase 2 melhora suporte tecnico e usa dados ja agregados pela observabilidade.
3. O addon IA permite monetizar sem baguncar a matriz atual de planos.

Depois disso, implementar Fase 3 em orcamentos, porque gera valor direto para atendimento sem alterar dados automaticamente.
