# Isolamento por Tenant

## 1. Objetivo

O isolamento por tenant sera a camada responsavel por garantir que cada empresa acesse apenas seus proprios dados dentro do NextAssist.

Hoje a RR Infocell opera como cliente piloto com tenant estatico. Em uma arquitetura SaaS real, o sistema precisara impedir que dados de clientes, ordens de servico, estoque, financeiro, mensagens e relatorios sejam lidos ou alterados por outra empresa.

Este documento orienta a implementacao futura. Nenhuma mudanca de codigo, banco ou migracao deve ser feita nesta etapa.

## 2. Principios de isolamento

Os principios abaixo devem guiar a implementacao multiempresa.

- Toda entidade de negocio deve possuir `tenantId` ou `empresaId`.
- Toda query deve filtrar obrigatoriamente por `tenantId`.
- Todo create deve salvar o `tenantId` correto.
- Todo update deve validar que o registro pertence ao `tenantId` atual.
- Todo delete deve validar que o registro pertence ao `tenantId` atual.
- Relatorios devem sempre considerar `tenantId`.
- Permissoes devem ser avaliadas junto com `tenantId`.
- O frontend nunca deve ser a unica barreira de isolamento.
- O backend deve ser a fonte confiavel para validar tenant e acesso.
- Regras de seguranca do banco/storage devem impedir acesso fora do tenant.

## 3. Camadas impactadas

### Frontend

O frontend devera usar a informacao do tenant atual para:

- exibir marca e configuracoes corretas;
- adaptar menus por plano;
- enviar requisicoes no contexto correto, se esse for o modelo escolhido;
- evitar UI assumindo RR Infocell como tenant unico.

O frontend nao deve ser responsavel sozinho por impedir vazamento de dados.

### Services

Os services do frontend provavelmente precisarao ser revisados para:

- nao espalhar `tenantId` manualmente por cada tela;
- usar uma camada comum de contexto de requisicao;
- evitar que telas passem tenant arbitrario;
- manter compatibilidade com queries futuras filtradas no backend.

### Backend/API

O backend devera:

- resolver o tenant do usuario autenticado;
- validar se o usuario pertence ao tenant;
- aplicar filtro obrigatorio por tenant nas consultas;
- validar tenant antes de update/delete;
- impedir que o corpo da requisicao defina tenant livremente;
- registrar logs e auditoria com tenant.

### Banco de dados

O banco devera armazenar `tenantId` ou equivalente nas entidades de negocio.

Tambem sera necessario revisar:

- indices;
- regras de seguranca;
- colecoes com subdocumentos;
- dados historicos;
- arquivos vinculados em Storage.

### Autenticacao

A autenticacao devera permitir descobrir quais tenants um usuario pode acessar.

Possiveis abordagens futuras:

- custom claims;
- tabela/colecao de membership;
- perfil por tenant;
- tenant ativo selecionado apos login.

### Permissoes

Permissoes devem combinar:

- usuario autenticado;
- tenant atual;
- papel do usuario naquele tenant;
- plano contratado pelo tenant.

Role global nao e suficiente para um SaaS multiempresa.

### Relatorios

Relatorios sao pontos criticos porque agregam muitos dados.

Todo relatorio devera filtrar por tenant antes de qualquer agregacao, incluindo:

- dashboard;
- financeiro;
- DRE;
- vendas;
- estoque;
- ordens de servico;
- despesas.

### Impressao/orcamento

Documentos impressos devem usar dados do tenant correto:

- nome da empresa;
- logo;
- CNPJ;
- telefone;
- endereco;
- termos;
- dados do tecnico/atendente.

Uma impressao com dados de outro tenant pode gerar problema operacional, comercial ou legal.

### WhatsApp/mensagens

WhatsApp e mensagens devem ser isolados por tenant:

- conexao;
- historico;
- vinculos com clientes;
- automacoes;
- templates;
- status da sessao.

Mensagens enviadas pelo tenant errado sao um risco critico.

## 4. Estrategia futura para frontend

O frontend ja possui uma base inicial com `TenantContext` e `useTenant`.

Essa camada pode ser usada futuramente para obter:

- tenant atual;
- plano;
- branding;
- modulos disponiveis.

Porem, `TenantContext` nao substitui validacao no backend. Ele deve ser tratado como uma camada de apresentacao e conveniencia.

Diretriz futura:

- usar `useTenant()` para exibicao e contexto visual;
- evitar passar tenant livremente a partir de formularios;
- preferir que o backend resolva tenant com base no usuario autenticado;
- manter filtros sensiveis no backend/repository.

## 5. Estrategia futura para backend

O backend devera resolver o tenant atual a partir de fonte confiavel.

Possiveis fontes:

- token autenticado;
- membership do usuario;
- claim validada;
- tenant selecionado e validado contra o usuario.

Depois de resolver o tenant, o backend deve:

- anexar `tenantId` ao contexto da requisicao;
- aplicar filtros nos repositories;
- impedir acesso a registros de outro tenant;
- garantir que creates gravem tenant correto;
- garantir que updates/deletes validem tenant;
- registrar tenant em logs.

O corpo da requisicao nao deve ser considerado fonte confiavel para `tenantId`.

## 6. Estrategia para queries

Os exemplos abaixo sao conceituais. Eles nao devem ser copiados como codigo real nesta fase.

### Buscar clientes por tenantId

```text
tenantId = resolverTenantDoUsuario(request)

clientes = clientesRepository.listar({
  where: {
    tenantId: tenantId
  }
})
```

### Buscar produtos por tenantId

```text
tenantId = resolverTenantDoUsuario(request)

produtos = produtosRepository.listar({
  where: {
    tenantId: tenantId,
    ativo: true
  }
})
```

### Buscar OS por tenantId

```text
tenantId = resolverTenantDoUsuario(request)

ordens = ordensServicoRepository.listar({
  where: {
    tenantId: tenantId,
    status: filtros.status
  }
})
```

### Gerar relatorio por tenantId

```text
tenantId = resolverTenantDoUsuario(request)

vendas = vendasRepository.listarPorPeriodo({
  tenantId: tenantId,
  inicio: periodo.inicio,
  fim: periodo.fim
})

despesas = despesasRepository.listarPorPeriodo({
  tenantId: tenantId,
  inicio: periodo.inicio,
  fim: periodo.fim
})

relatorio = calcularIndicadores(vendas, despesas)
```

## 7. Riscos criticos

### Query sem filtro de tenant

Uma unica query sem filtro pode expor dados de outra empresa.

### Relatorio misturando dados

Relatorios financeiros, estoque, vendas e dashboard podem gerar indicadores incorretos se agregarem dados de varios tenants.

### Usuario acessando rota de outra empresa

Rotas protegidas apenas por role podem permitir acesso indevido se nao houver validacao de tenant.

### Update/delete sem validar empresa

Mesmo que listagens estejam filtradas, updates e deletes precisam validar que o registro pertence ao tenant atual.

### Impressao mostrando dados de outro tenant

Orcamentos, OS, garantias e recibos devem usar branding e dados da empresa correta.

### Integracao WhatsApp vinculada ao tenant errado

Conexao, mensagens e automacoes de WhatsApp precisam ser isoladas para evitar envio ou exposicao indevida.

## 8. Checklist de implementacao futura

Antes de iniciar codigo real:

- Tenant padrao `rr-infocell` definido.
- Dados migrados em staging.
- Queries mapeadas.
- Services revisados.
- Repositories backend mapeados.
- Testes de isolamento criados.
- Permissoes revisadas.
- Relatorios validados.
- Impressao e orcamento revisados.
- WhatsApp/mensagens revisados.
- Regras de seguranca planejadas.
- Rollback planejado.
- Backup validado.
- Ambiente staging funcional.

## 9. Criterios para avancar para codigo real

So deve avancar para implementacao real quando houver:

- ambiente staging separado;
- backup completo validado;
- plano de rollback definido;
- modelo de tenant aprovado;
- estrategia de autenticacao por tenant definida;
- lista de queries e repositories mapeada;
- testes manuais definidos;
- testes de isolamento planejados;
- criterios de aceite por modulo;
- janela segura para validar a RR Infocell.

Sem esses itens, a evolucao deve permanecer em documentacao, types, helpers e preparacao sem persistencia.
