# Auditoria Backend — Preparacao Multiempresa

## 1. Objetivo

Esta auditoria mapeia o estado atual do backend e da persistencia do RR Infocell/NextAssist para preparar a implementacao real de `tenantId` de forma segura e gradual.

A Fase 7 concluiu a preparacao do frontend: todos os payloads de criacao e edicao das entidades operacionais principais ja incluem `tenantId: "rr-infocell"`. A validacao em staging confirmou que nenhum endpoint retornou 400/422 por causa desse campo.

Esta auditoria documenta **por que** o campo e ignorado hoje, **onde** o tenantId precisara ser adicionado e **qual ordem** minimiza o risco de quebrar operacoes em producao.

---

## 2. Estrutura do backend

```
backend/src/
  app.ts                   # Express app: cors, json, rate-limit, routes
  server.ts                # Entry point: app.listen
  routes.ts                # Router principal: monta todos os modulos com requireAuth + requireRole
  config/
    env.ts                 # Variaveis de ambiente com Zod (PORT, NODE_ENV, Firebase...)
    http.ts                # Configuracao de CORS
    rate-limit.ts          # Rate limiter express
  firebase/
    admin.ts               # Inicializacao Firebase Admin SDK (auth + Firestore)
  middlewares/
    auth.ts                # requireAuth + requireRole — Firebase Auth token validation
    not-found.ts           # 404 handler
    error-handler.ts       # Tratamento centralizado de erros (AppError)
  shared/
    errors.ts              # AppError com code, message, httpStatus
    api-response.ts        # Padrao de resposta { data } ou { error }
    http-status.ts         # Constantes HTTP status
  modules/                 # Um modulo por entidade
    aparelhos/
    categorias/
    checklists/
    clientes/
    contas/
    despesas/
    fornecedores/
    marcas/
    movimentacoes-estoque/
    orcamentos/
    ordem-eventos/
    ordens-servico/
    produtos/
    terceirizados/
    usuarios/
    vendas/
    whatsapp/
    observabilidade/
    health/
    ajuda/
  scripts/                 # Scripts de manutencao Firestore (tsx direto)
    limpar-dados-teste.ts
    reverter-venda-vanessa.ts
    zerar-banco-producao.ts
    normalizar-telefones.ts
    migrar-conversa-9digito.ts
    limpar-conversas-invalidas.ts
    set-user-role.ts
```

Cada modulo segue um padrao fixo de arquivos:

| Arquivo | Papel |
| --- | --- |
| `*.types.ts` | Tipos TypeScript da entidade (sem Zod) |
| `*.schemas.ts` | Schemas Zod de validacao de input |
| `*.repository.ts` | Acesso ao Firestore (ou Memory para testes) |
| `*.service.ts` | Regras de negocio (coordena repository e acoes compostas) |
| `*.routes.ts` | Rotas Express: parse schema → service → response |
| `*.routes.test.ts` | Testes de integracao por modulo |

---

## 3. Tecnologia e persistencia

| Aspecto | Tecnologia |
| --- | --- |
| Framework | Node.js + Express + TypeScript |
| Banco de dados | Cloud Firestore (Firebase Admin SDK) |
| ORM/ODM | Nenhum — chamadas diretas ao SDK Firestore |
| Validacao de payload | Zod — schemas por modulo em `*.schemas.ts` |
| Autenticacao | Firebase Auth — tokens JWT validados via `requireAuth` |
| Autorizacao | Roles no token (`admin`, `atendente`, `tecnico`) via `requireRole` |
| Fallback sem Firebase | `MemoryRepository` por modulo — usado em testes e dev sem credenciais |

### Como o Firestore e usado

Cada modulo define sua propria `collection` como constante local:

```ts
const clientesCollection = "clientes";
const ordensServicoCollection = "ordensServico";
const movimentacoesCollection = "movimentacoesEstoque";
const vendasCollection = "vendas";
```

Nao existe schema no banco — o Firestore e schema-less. A tipagem e feita exclusivamente pelo TypeScript e pelos schemas Zod no backend.

O Firestore esta configurado com:

```ts
firestoreInstance.settings({ ignoreUndefinedProperties: true });
```

Isso significa que campos com valor `undefined` nao sao gravados no banco — o que e o comportamento correto para campos opcionais.

---

## 4. Como o tenantId e ignorado hoje

**Comportamento atual:** o frontend envia `tenantId: "rr-infocell"` no payload. O backend nao retorna erro, mas tambem nao persiste o campo. Isso ocorre por dois motivos encadeados:

### 4.1 Zod usa strip mode por padrao

Todos os schemas usam `z.object({...})`, que por padrao remove campos desconhecidos ao fazer parse. Exemplo real:

```ts
// clientes.schemas.ts
export const clienteInputSchema = z.object({
  nome: z.string().trim().min(2),
  telefone: z.string().trim().optional(),
  // ... outros campos
  // tenantId NAO esta aqui
});
```

Quando o backend faz `clienteInputSchema.parse(request.body)`, o campo `tenantId` e removido silenciosamente. O resultado do parse nao contem `tenantId`.

### 4.2 O repository persiste apenas o resultado do parse

Os routes passam o resultado do parse diretamente para o service/repository:

```ts
const input = parseOrThrow(() => clienteInputSchema.parse(request.body));
// input nao tem tenantId — foi stripped pelo Zod
const data = await clientesService.create(input);
```

O repository faz spread de `input` no objeto que vai para o Firestore:

```ts
const cliente: Cliente = {
  id: document.id,
  ...input,          // tenantId nunca chega aqui
  createdAt: timestamp,
  updatedAt: timestamp,
};
await document.set(withoutUndefined(cliente));
```

**Conclusao:** `tenantId` e descartado no passo de validacao Zod e nunca chega ao Firestore. Nenhum registro atual possui `tenantId` persistido no banco.

---

## 5. Endpoints criticos mapeados

| Entidade | Endpoint | Metodo | Arquivo de rotas | Frontend ja envia tenantId | Risco | Prioridade backend |
| --- | --- | --- | --- | --- | --- | --- |
| Clientes | `/api/clientes` | POST | `clientes/clientes.routes.ts` | Sim | Baixo | Alta |
| Clientes | `/api/clientes/:id` | PUT | `clientes/clientes.routes.ts` | Sim | Baixo | Alta |
| Produtos | `/api/produtos` | POST | `produtos/produtos.routes.ts` | Sim | Baixo | Alta |
| Produtos | `/api/produtos/:id` | PUT | `produtos/produtos.routes.ts` | Sim | Baixo | Alta |
| Despesas | `/api/despesas` | POST | `despesas/despesas.routes.ts` | Sim | Baixo | Media |
| Despesas | `/api/despesas/:id` | PUT | `despesas/despesas.routes.ts` | Sim | Baixo | Media |
| Contas | `/api/contas` | POST | `contas/contas.routes.ts` | Sim | Baixo | Media |
| Contas | `/api/contas/:id` | PUT | `contas/contas.routes.ts` | Sim | Baixo | Media |
| Ordens de Servico | `/api/ordens-servico` | POST | `ordens-servico/ordens-servico.routes.ts` | Sim | Alto | Alta |
| Ordens de Servico | `/api/ordens-servico/:id` | PUT | `ordens-servico/ordens-servico.routes.ts` | Sim | Alto | Alta |
| Eventos OS | `/api/ordem-eventos` | POST | `ordem-eventos/ordem-eventos.routes.ts` | Sim | Baixo | Media |
| Movimentacoes | `/api/movimentacoes-estoque` | POST | `movimentacoes-estoque/movimentacoes-estoque.routes.ts` | Sim | Medio | Media |
| Vendas/PDV | `/api/vendas` | POST | `vendas/vendas.routes.ts` | Sim | Alto | Alta |
| Orcamentos | `/api/orcamentos` | POST | `orcamentos/orcamentos.routes.ts` | Nao | Medio | Media |
| Aparelhos | `/api/aparelhos` | POST | `aparelhos/aparelhos.routes.ts` | Nao | Baixo | Baixa |
| Checklists | `/api/checklists` | POST | `checklists/checklists.routes.ts` | Nao | Baixo | Baixa |
| Usuarios | `/api/usuarios` | POST | `usuarios/usuarios.routes.ts` | Nao | Alto | Alta |
| WhatsApp | `/api/whatsapp` | varios | `whatsapp/whatsapp.router.ts` | Nao | Alto | Futura |
| Categorias | `/api/categorias` | POST | `categorias/categorias.routes.ts` | Nao | Baixo | Baixa |
| Marcas | `/api/marcas` | POST | `marcas/marcas.routes.ts` | Nao | Baixo | Baixa |

---

## 6. Validacao de payload — estado atual

| Aspecto | Comportamento atual |
| --- | --- |
| Campos extras (ex: tenantId) | Silenciosamente removidos pelo Zod (strip mode) |
| tenantId e ignorado? | Sim — nao persiste, nao valida, nao retorna erro |
| Schemas tem modo strict? | Nao — nenhum schema usa `.strict()` |
| Validacao esta centralizada? | Nao — cada modulo tem seu proprio schema Zod |
| Schemas precisarao ser atualizados? | Sim — para aceitar e persistir tenantId formalmente |

**Implicacao para Fase 8:** adicionar `tenantId` nos schemas Zod nao quebrara o comportamento atual (Zod ja aceita campos extras). A diferenca e que, ao adicionar `tenantId` no schema, ele passara a ser retido apos o parse e chegara ao repository — onde podera ser persistido.

---

## 7. Persistencia atual — collections Firestore

| Collection | Modulo | tenantId presente? | Campos atuais relevantes |
| --- | --- | --- | --- |
| `clientes` | clientes | Nao | id, nome, telefone, documento, email, endereco, observacoes, createdAt, updatedAt |
| `produtos` | produtos | Nao | id, nome, sku, preco, estoqueAtual, estoqueMinimo, createdAt, updatedAt |
| `despesas` | despesas | Nao | id, descricao, categoria, valor, data, createdAt, updatedAt |
| `contas` | contas | Nao | id, nome, tipo, saldo, createdAt, updatedAt |
| `ordensServico` | ordens-servico | Nao | id, numero, clienteId, aparelhoId, defeitoRelatado, status, pecasUsadas, valorTotal, createdAt, updatedAt |
| `movimentacoesEstoque` | movimentacoes-estoque | Nao | id, produtoId, tipo, quantidade, origem, ordemServicoId, createdAt |
| `vendas` | vendas | Nao | id, ordemServicoId, clienteId, itens, formaPagamento, valorTotal, status, createdAt |
| `orcamentos` | orcamentos | Nao | id, clienteId, aparelhoId, itens, valorTotal, status, createdAt |
| `aparelhos` | aparelhos | Nao | id, clienteId, marca, modelo, imei, cor, createdAt |
| `checklists` | checklists | Nao | id, nome, itens, createdAt |
| `counters/ordensServico` | ordens-servico | Nao | nextNumero (contador atomico de numero de OS) |

**Observacao:** Usuarios sao gerenciados pelo Firebase Auth (nao pelo Firestore diretamente). O campo `role` e armazenado como custom claim no token JWT.

---

## 8. Queries e listagens — onde filtrar por tenantId no futuro

Todas as listagens atuais buscam todos os documentos da collection sem nenhum filtro por tenant. Isso e aceitavel com um unico tenant, mas sera bloqueante para multiempresa real.

| Modulo | Metodo de listagem | Filtros atuais | Filtro tenantId necessario |
| --- | --- | --- | --- |
| clientes | `list(search)` | Busca em memoria por nome/telefone/doc | Sim — `.where("tenantId", "==", tenantId)` |
| produtos | `list(search)` | Busca em memoria | Sim |
| despesas | `list(filters)` | Periodo, categoria | Sim |
| contas | `list()` | Nenhum | Sim |
| ordens-servico | `list(filters)` | status, prioridade, clienteId, aparelhoId | Sim — mais critico |
| movimentacoes-estoque | `list(filters)` | produtoId, tipo | Sim |
| vendas | `list(filters)` | ordemServicoId, status | Sim |
| orcamentos | `list(filters)` | clienteId, status | Sim |
| aparelhos | `list(filters)` | clienteId | Sim |
| checklists | `list()` | Nenhum | Sim |

### Impacto em relatorios e dashboard

O dashboard e os relatorios financeiros (DRE) consomem as listagens acima. Sem filtro por tenant, os numeros agregam dados de todos os tenants. Isso e bloqueante para SaaS real — um tenant poderia ver os dados financeiros de outro.

### Impacto na impressao e orcamentos

O sistema de impressao usa `EMPRESA` de `frontend/src/constants/company.ts` — dados hardcoded da empresa. Em SaaS real, os dados da empresa (nome, CNPJ, logo) precisarao ser resolvidos dinamicamente pelo tenant.

---

## 9. Riscos encontrados

| Risco | Descricao | Impacto | Quando resolve |
| --- | --- | --- | --- |
| tenantId descartado pelo Zod | Campo enviado pelo frontend mas removido no parse — nunca persistido | Medio — preparacao sem efeito real | Fase 8.1 |
| Registros sem tenantId | Todos os registros atuais no banco nao possuem campo tenantId | Alto — migracao futura necessaria | Fase 8.x — migracao de dados |
| Queries sem filtro | Listagens retornam todos os documentos da collection sem distinção de tenant | Alto em SaaS — vazamento de dados entre empresas | Fase 8.x — queries |
| OS e estoque sem tenant | Baixa de estoque via OS e via venda nao distingue tenant | Alto — inconsistencia de estoque em SaaS | Fase 8.x — service OS + movimentacoes |
| Relatorios misturando dados | Dashboard e DRE agregam sem filtro de tenant | Alto — decisoes incorretas em SaaS | Fase 8.x — relatorios |
| Usuarios sem vinculo a tenant | O sistema de autenticacao atual nao associa usuario a tenant | Alto — qualquer usuario pode ver dados de qualquer tenant | Fase 8.x — auth middleware |
| Impressao sem isolamento | Logo, CNPJ e dados impressos via `company.ts` hardcoded | Medio em staging, Alto em SaaS | Fase 8.x — branding dinamico |
| Backend resolve tenant via frontend | Nunca deve acontecer em producao — o tenant deve ser resolvido pelo backend a partir do usuario autenticado | Alto — usuario poderia forjar tenantId | Fase 8.x — middleware de resolucao de tenant |

---

## 10. Ordem recomendada para implementacao real

Esta ordem minimiza risco ao introduzir multiempresa gradualmente, sempre com validacao em staging antes de avancar.

| Etapa | Acao | Risco | Modulo de referencia |
| --- | --- | --- | --- |
| 8.1 | Criar colecao `tenants` no Firestore e documento para `rr-infocell` | Baixo | Novo modulo `tenants` |
| 8.2 | Criar middleware `resolveTenant` que le tenant do token, nao do payload | Baixo | `middlewares/tenant.ts` |
| 8.3 | Adicionar `tenantId` no schema + tipo de entidade simples (ex: categorias) | Baixo | `categorias/` |
| 8.4 | Persistir `tenantId` no `create()` da entidade simples | Baixo | `categorias.repository.ts` |
| 8.5 | Filtrar listagem por `tenantId` na entidade simples | Baixo | `categorias.repository.ts` |
| 8.6 | Validar em staging — novo registro tem tenantId, listagem filtrada | — | checklist |
| 8.7 | Repetir etapas 8.3–8.6 para clientes, produtos, despesas, contas | Baixo/Medio | `clientes/`, `produtos/`, etc. |
| 8.8 | Adicionar tenantId em OS + validar baixa de estoque com tenant | Alto | `ordens-servico/`, `movimentacoes-estoque/` |
| 8.9 | Adicionar tenantId em vendas | Alto | `vendas/` |
| 8.10 | Adicionar tenantId em orcamentos e eventos da OS | Medio | `orcamentos/`, `ordem-eventos/` |
| 8.11 | Ajustar relatorios, dashboard e DRE para filtrar por tenant | Alto | `observabilidade/`, frontend |
| 8.12 | Ajustar impressao para usar dados dinamicos do tenant | Medio | `frontend/src/constants/company.ts` → tenant dinamico |
| 8.13 | Migracao de dados — adicionar tenantId nos registros existentes | Alto | script de migracao |

### Criterio de avanco

Cada etapa so pode avancar quando:
- Testes manuais em staging aprovados
- Nenhum endpoint critico retornando erro por causa de tenantId
- Backup do banco de staging realizado antes de cada etapa critica

---

## 11. Proxima fase sugerida

**Fase 8.1 — Criar estrutura de tenant padrao no banco (staging)**

Objetivo:
- Criar a collection `tenants` no Firestore de staging
- Criar o documento `rr-infocell` com os dados da empresa (nome, CNPJ, plano, etc.)
- Criar o middleware `resolveTenant` que le o tenant do token Firebase (custom claim ou lookup)
- Nao alterar nenhum modulo de entidade nesta fase
- Validar que o middleware funciona sem quebrar nenhuma rota existente

Criterios de entrada para Fase 8.1:
- [ ] Ambiente staging separado da producao confirmado
- [ ] Backup do banco de staging realizado e restore validado
- [ ] Responsavel tecnico definido para revisar implementacao
- [ ] Checklist de validacao da Fase 7.6 aprovado (ja aprovado em 26/05/2026)

---

## 12. Resumo do estado atual

| Aspecto | Estado |
| --- | --- |
| Frontend envia tenantId | Sim — todos os 8 services principais |
| Backend aceita tenantId sem erro | Sim — Zod strip mode descarta silenciosamente |
| tenantId e persistido no Firestore | Nao — descartado no parse Zod |
| Algum registro tem tenantId no banco | Nao |
| Backend resolve tenant do usuario | Nao — nao existe middleware de tenant |
| Queries filtram por tenantId | Nao — todas as listagens sao globais |
| Sistema e multiempresa real | Nao — preparacao concluida no frontend, backend ainda nao implementado |

**O frontend esta pronto. O backend precisa ser implementado do zero para multiempresa real.**

A producao do RR Infocell continua protegida: nenhuma alteracao critica foi feita no backend, banco ou regras de negocio. A Fase 8 deve comecar no ambiente de staging com entidades de menor risco.
