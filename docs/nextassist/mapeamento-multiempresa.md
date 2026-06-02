# Mapeamento Multiempresa/Tenant

## 1. Visao geral

O sistema atual nasceu como RR Infocell e esta sendo evoluido para o NextAssist, uma plataforma SaaS + White Label.

Hoje o tenant e estatico e definido no frontend por `frontend/src/config/tenantConfig.ts`. Essa configuracao permite preparar marca, plano e informacoes do cliente piloto, mas ainda nao representa multiempresa real.

Para uma arquitetura SaaS real, sera necessario criar um identificador persistente de empresa/tenant, por exemplo:

- `tenantId`
- `empresaId`
- `organizationId`

Esse identificador devera existir nos dados, nas consultas, nas permissoes e nos fluxos operacionais. Nesta fase, nenhum `tenantId` deve ser adicionado ainda. Este documento e apenas um mapeamento tecnico para orientar as proximas fases.

## 2. Entidades que provavelmente precisarao de tenantId/empresaId

As entidades abaixo provavelmente precisarao carregar um identificador de tenant para garantir isolamento entre empresas.

| Area | Entidades provaveis | Observacoes |
| --- | --- | --- |
| Clientes | `clientes`, historico de atendimento, aparelhos vinculados | Clientes nao podem ser compartilhados entre empresas. |
| Usuarios | `usuarios`, tecnicos, atendentes, administradores | Usuario pode pertencer a um tenant ou, futuramente, a multiplos tenants com papeis diferentes. |
| Produtos | `produtos`, categorias, marcas, fornecedores | Catalogo e precos podem variar por empresa. |
| Estoque | saldo, minimo, movimentacoes, ajustes | Isolamento e critico para evitar mistura de saldo. |
| Movimentacoes | `movimentacoes-estoque` | Toda movimentacao precisa apontar para produto e tenant corretos. |
| Ordens de servico | `ordens-servico`, eventos da OS, historico | Fluxo central do sistema; qualquer vazamento aqui e critico. |
| Checklists | modelos e respostas de checklist | Pode haver modelos globais no futuro, mas respostas devem ser por tenant. |
| Orcamentos | orcamentos, itens, aprovacoes | Devem seguir o tenant da OS ou do cliente. |
| Financeiro | contas, recebimentos, DRE, indicadores | Alto risco de mistura de dados entre empresas. |
| Despesas | despesas, categorias de despesa | Devem ser isoladas por tenant. |
| Vendas/PDV | vendas, itens, pagamentos, caixa | Impacto direto em caixa, estoque e documentos. |
| Mensagens/WhatsApp | conexoes, mensagens, automacoes, vinculos | Cada empresa deve ter conexao e historico proprios. |
| Configuracoes da empresa | dados de tenant, logo, cores, plano, documentos | Hoje estatico; futuramente deve ser persistido por tenant. |
| Relatorios | dashboards, DRE, estoque, vendas, OS | Todos os relatorios precisam filtrar tenant de forma obrigatoria. |

Entidades auxiliares como `aparelhos`, `categorias`, `marcas`, `fornecedores`, `terceirizados` e `contas` tambem devem ser revisadas antes de qualquer migracao.

## 3. Arquivos e modulos candidatos a impacto

Este mapeamento considera a estrutura atual do projeto. A lista nao deve ser tratada como plano de implementacao imediato.

### Frontend: configuracao e autenticacao

Arquivos candidatos:

- `frontend/src/config/tenantConfig.ts`
- `frontend/src/config/planModules.ts`
- `frontend/src/lib/auth.tsx`
- `frontend/src/lib/firebase.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/MobileNav.tsx`
- `frontend/src/pages/TenantSettings.tsx`

Possiveis impactos futuros:

- Carregar tenant atual apos login.
- Guardar tenant ativo em contexto/helper.
- Exibir configuracoes reais do tenant.
- Ajustar menu por plano vindo do backend.
- Evitar que a UI assuma RR Infocell como tenant unico.

### Frontend: services

Pasta candidata:

- `frontend/src/services/`

Services encontrados que provavelmente precisarao transportar ou respeitar tenant:

- `clientes.ts`
- `usuarios.ts`
- `produtos.ts`
- `movimentacoes-estoque.ts`
- `ordens-servico.ts`
- `ordem-eventos.ts`
- `checklists.ts`
- `orcamentos.ts`
- `contas.ts`
- `despesas.ts`
- `vendas.ts`
- `whatsapp.ts`
- `fornecedores.ts`
- `terceirizados.ts`
- `aparelhos.ts`
- `categorias.ts`
- `marcas.ts`

Diretriz futura:

- Nao espalhar `tenantId` manualmente por todas as telas.
- Preferir uma camada helper central para anexar tenant nas chamadas.
- Validar se o tenant deve ir em token, header, path, query string ou ser inferido no backend.

### Frontend: pages

Pasta candidata:

- `frontend/src/pages/`

Paginas sensiveis:

- `Dashboard.tsx`
- `Clientes.tsx`
- `Ordens.tsx`
- `NovaOS.tsx`
- `OrdemDetalhe.tsx`
- `Checklist.tsx`
- `Manutencao.tsx`
- `Orcamento.tsx`
- `Estoque.tsx`
- `Movimentacoes.tsx`
- `PDV.tsx`
- `Financeiro.tsx`
- `Despesas.tsx`
- `Usuarios.tsx`
- `Atendimento.tsx`
- `TenantSettings.tsx`

Risco:

- Telas podem combinar dados de varios services. Mesmo que cada service filtre corretamente, componentes agregadores e relatorios precisam ser revisados.

### Backend: modulos

Pasta candidata:

- `backend/src/modules/`

Modulos encontrados:

- `clientes`
- `usuarios`
- `produtos`
- `movimentacoes-estoque`
- `ordens-servico`
- `ordem-eventos`
- `checklists`
- `orcamentos`
- `contas`
- `despesas`
- `vendas`
- `whatsapp`
- `aparelhos`
- `categorias`
- `marcas`
- `fornecedores`
- `terceirizados`
- `ajuda`
- `observabilidade`

Arquivos por modulo que provavelmente serao impactados:

- `*.types.ts`
- `*.schemas.ts`
- `*.repository.ts`
- `*.service.ts`
- `*.routes.ts`
- `*.routes.test.ts`

Diretriz futura:

- Repositories devem aplicar filtro por tenant de forma obrigatoria.
- Services devem validar relacoes entre entidades do mesmo tenant.
- Routes devem obter tenant de fonte confiavel, nao do corpo livre da requisicao.

### Backend: autenticacao e configuracao

Arquivos candidatos:

- `backend/src/middlewares/auth.ts`
- `backend/src/firebase/admin.ts`
- `backend/src/config/env.ts`
- `backend/src/config/http.ts`
- `backend/src/config/rate-limit.ts`

Possiveis impactos futuros:

- Associar usuario autenticado a tenant.
- Resolver tenant atual por claim, membership ou parametro seguro.
- Aplicar limites por tenant.
- Registrar logs com tenant.

### Regras de seguranca e infraestrutura

Arquivos candidatos:

- `infra/firebase/firestore.rules`
- `infra/firebase/storage.rules`
- `firebase.json`
- `.firebaserc.example`

Possiveis impactos futuros:

- Regras do Firestore devem impedir leitura/escrita fora do tenant.
- Storage deve separar arquivos por tenant.
- Ambientes Firebase precisam separar producao e staging.

## 4. Estrategia futura de migracao

Uma migracao multiempresa deve ser feita em etapas, nunca diretamente em producao.

### Etapa 1: criar staging

Criar ambiente separado com:

- Frontend separado.
- Backend separado.
- Firebase/Firestore separado.
- Variaveis de ambiente separadas.
- Dados de teste ou copia controlada.

### Etapa 2: fazer backup do banco

Antes de qualquer alteracao:

- Exportar Firestore.
- Registrar data/hora do backup.
- Validar possibilidade de restore.
- Preservar uma copia imutavel.

### Etapa 3: criar tenant padrao

Criar um tenant padrao para a operacao atual:

- `tenantId`: `rr-infocell`
- Nome: `RR Infocell`
- Plano: `premium`
- White Label: ativo

Esse tenant deve representar todos os dados atuais da RR Infocell.

### Etapa 4: adicionar tenantId nos registros existentes

Em ambiente de teste, adicionar `tenantId: "rr-infocell"` nos registros existentes.

Pontos de atencao:

- Entidades principais e subentidades.
- Registros historicos.
- Relacoes entre OS, cliente, produto, venda e financeiro.
- Eventos e logs que precisam continuar consultaveis.

### Etapa 5: ajustar queries

Todas as consultas devem filtrar por `tenantId`.

Diretriz:

- O filtro deve ficar no backend/repository sempre que possivel.
- O frontend nao deve ser a unica barreira de isolamento.
- Relatorios devem receber filtros de tenant obrigatorios.

### Etapa 6: testar isolamento

Criar ao menos dois tenants de teste e validar:

- Tenant A nao le dados do Tenant B.
- Usuarios de um tenant nao alteram dados de outro.
- Relatorios nao misturam dados.
- Estoque, financeiro e OS permanecem isolados.
- Impressao usa dados da empresa correta.

### Etapa 7: liberar multiplos clientes

Somente depois do isolamento validado:

- Criar fluxo de cadastro de novos tenants.
- Criar provisionamento comercial.
- Criar rotina de suporte e auditoria.

## 5. Riscos

### Vazamento de dados entre empresas

Risco mais critico. Pode ocorrer se uma query esquecer filtro por tenant ou se uma regra de seguranca permitir acesso amplo.

### Filtros esquecidos em queries

Consultas de listagem, busca, dashboards e relatorios sao candidatas a erro. O risco aumenta em telas que combinam varias entidades.

### Relatorios misturando tenants

Financeiro, estoque, vendas e dashboard podem gerar decisoes erradas se dados forem agregados sem tenant.

### Usuarios acessando dados de outra empresa

O controle de acesso precisa validar usuario, role e tenant. Apenas role nao e suficiente em SaaS multiempresa.

### Impactos em financeiro, estoque e OS

Essas areas sao operacionais e sensiveis:

- Financeiro afeta caixa e DRE.
- Estoque afeta saldo e custo.
- OS afeta atendimento e historico do cliente.

Qualquer erro pode impactar a operacao real da RR Infocell.

### Problemas em impressao e orcamento

Documentos podem exibir nome, CNPJ, telefone, endereco, logo e termos. Em multiempresa, todos esses dados precisam vir do tenant correto.

### WhatsApp e mensagens

Conexoes, automacoes e mensagens devem ser separadas por tenant. Um erro pode enviar mensagem para cliente errado ou expor conversas.

## 6. Checklist antes de implementar tenantId

Antes de qualquer alteracao real:

- Confirmar branch `nextassist-saas`.
- Confirmar que a tag `rr-infocell-v1-estavel` esta preservada.
- Criar ou validar ambiente staging.
- Fazer backup completo do banco.
- Definir nome padrao do identificador: `tenantId`, `empresaId` ou outro.
- Definir modelo de tenant.
- Definir como usuario se relaciona com tenant.
- Definir como roles funcionam por tenant.
- Mapear todas as colecoes do Firestore.
- Mapear todas as queries backend.
- Mapear todas as queries diretas, se existirem.
- Mapear relatorios e agregacoes.
- Mapear documentos de impressao.
- Mapear arquivos em Storage.
- Criar plano de migracao.
- Criar plano de rollback.
- Criar testes de isolamento.
- Rodar build frontend.
- Rodar build backend.
- Validar manualmente fluxos criticos em staging.

Fluxos criticos:

- Login.
- Clientes.
- Ordens de servico.
- Checklists.
- Orcamentos.
- Estoque.
- Movimentacoes.
- PDV/vendas.
- Financeiro.
- Despesas.
- Impressao.
- WhatsApp.
- Usuarios.
- Relatorios.

## 7. Proximas fases sugeridas

### Fase 6.1: types/interfaces de tenant sem persistencia

Criar apenas tipos TypeScript para representar tenant e plano, sem alterar banco nem services.

Objetivo:

- Padronizar nomes.
- Reduzir ambiguidade antes da implementacao real.
- Evitar espalhar estruturas diferentes pelo projeto.

### Fase 6.2: camada helper de tenant atual

Criar um helper central para obter o tenant atual, ainda baseado em `tenantConfig`.

Objetivo:

- Preparar o codigo para trocar origem estatica por origem remota no futuro.
- Evitar imports diretos em excesso de `tenantConfig`.
- Nao alterar comportamento.

### Fase 6.3: planejar migracao de dados

Criar documento tecnico e scripts de prova em ambiente local/staging.

Objetivo:

- Mapear colecoes.
- Definir ordem de migracao.
- Definir validacoes.
- Definir rollback.

Nenhum script deve ser executado em producao nesta fase.

### Fase 6.4: aplicar tenantId em ambiente de teste

Adicionar `tenantId` apenas no ambiente staging/teste.

Objetivo:

- Validar queries.
- Validar isolamento.
- Validar relatorios.
- Validar documentos e impressao.

Somente depois dessa fase deve ser considerada uma migracao controlada da RR Infocell em producao.
