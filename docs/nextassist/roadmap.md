# Roadmap NextAssist

## Visao geral

O NextAssist e a evolucao do sistema RR Infocell para uma plataforma SaaS + White Label voltada a assistencias tecnicas. A RR Infocell permanece como cliente piloto e referencia operacional, sem perda de funcionalidades existentes durante a transicao.

O objetivo do roadmap e permitir evolucao incremental, com mudancas pequenas, revisaveis e seguras.

## Fase 1: Tenant/White Label inicial

Criar uma camada estatica de configuracao do tenant em `frontend/src/config/tenantConfig.ts`.

Escopo:
- Definir `productName` como `NextAssist`.
- Manter `systemName` e `tenantName` como `RR Infocell`.
- Centralizar logo, cores principais, plano e flags White Label.
- Substituir apenas usos seguros de marca na interface.

Resultado esperado:
- RR Infocell continua funcionando visualmente como cliente piloto.
- A base passa a reconhecer internamente o produto NextAssist.

## Fase 2: Planos e modulos

Criar a configuracao estatica de planos em `frontend/src/config/planModules.ts`.

Escopo:
- Definir planos `basico`, `profissional` e `premium`.
- Definir flags de modulos.
- Criar helper `canUseModule(moduleKey, plan)`.
- Manter o tenant atual no plano `premium`.

Resultado esperado:
- O sistema passa a ter uma matriz clara de capacidades por plano.
- Nenhuma funcionalidade e bloqueada nesta fase.

## Fase 3: Navegacao por modulos

Preparar o layout para respeitar modulos por plano no futuro.

Escopo:
- Adicionar `moduleKey` opcional em itens de navegacao.
- Filtrar apenas itens com mapeamento claro.
- Manter itens sem correspondencia clara sempre visiveis.
- Nao bloquear rotas nem acesso direto por URL.

Resultado esperado:
- A navegacao fica pronta para planos futuros.
- RR Infocell, usando plano `premium`, continua vendo os menus atuais.

## Fase 4: Configuracoes da empresa somente leitura

Criar uma tela inicial de configuracoes do tenant em modo somente leitura.

Escopo:
- Exibir dados de `tenantConfig`.
- Exibir plano atual e modulos disponiveis.
- Nao criar formulario, persistencia ou backend.
- Nao salvar qualquer configuracao.

Resultado esperado:
- Administradores conseguem visualizar o tenant atual.
- A tela prepara o caminho para configuracao real em fase futura.

## Fase 5: Documentacao estrategica

Criar documentacao inicial em `docs/nextassist/`.

Escopo:
- Roadmap.
- Planos e modulos.
- Estrategia White Label.
- Arquitetura SaaS futura.
- Guia de seguranca para migracao.

Resultado esperado:
- O projeto passa a ter diretrizes claras para evolucao segura.
- Futuras alteracoes ficam orientadas por documentos versionados.

## Fase 6: Preparacao para multiempresa/tenant real

Introduzir desenho tecnico para `tenantId` ou `empresaId`.

Escopo futuro:
- Definir modelo de dados por empresa.
- Planejar isolamento por tenant em Firestore.
- Planejar migracao dos dados atuais da RR Infocell.
- Criar ambiente de teste com dados anonimizados ou de staging.

Regras:
- Nao aplicar multiempresa direto em producao.
- Nao alterar colecoes reais sem backup e plano de rollback.

## Fase 7: SaaS comercial

Preparar o produto para operacao comercial.

Escopo futuro:
- Cadastro de empresas.
- Provisionamento de tenant.
- Controle de plano.
- Billing e status de assinatura.
- Onboarding comercial.
- Observabilidade por tenant.

Resultado esperado:
- NextAssist deixa de ser apenas uma base tecnica e passa a operar como produto SaaS.

## Fase 8: White Label avancado

Evoluir White Label para configuracao completa por tenant.

Escopo futuro:
- Nome do sistema por tenant.
- Logo configuravel.
- Cores configuraveis.
- Dominios personalizados.
- Templates de impressao por empresa.
- Parametros comerciais por tenant.

Resultado esperado:
- Clientes podem usar o NextAssist com identidade visual propria, mantendo a base comum do produto.
