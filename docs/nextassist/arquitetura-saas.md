# Arquitetura SaaS Futura

## Estado atual

O sistema ainda opera como uma aplicacao dedicada a RR Infocell, mas com camadas iniciais para evoluir para NextAssist SaaS + White Label.

Componentes atuais:

- `tenantConfig.ts`: configuracao estatica do tenant.
- `planModules.ts`: matriz estatica de capacidades por plano.
- `AppLayout.tsx`: comeca a respeitar modulos na navegacao.
- `TenantSettings.tsx`: permite ao administrador editar identidade e dados operacionais do proprio tenant.

## tenantConfig estatico

`tenantConfig.ts` centraliza dados do tenant atual.

Hoje ele e estatico e faz parte do bundle do frontend. Isso e suficiente para preparar a arquitetura sem introduzir risco de banco ou backend.

Limites:

- Nao permite multiplos tenants em runtime.
- Nao permite edicao por usuario.
- Nao permite provisionamento comercial.

## planModules

`planModules.ts` define quais capacidades existem em cada plano.

Uso atual:

- Documentar os planos.
- Permitir consulta com `canUseModule`.
- Preparar filtros de navegacao.

Uso futuro:

- Controlar menus.
- Controlar chamadas de funcionalidades premium.
- Apoiar billing e provisionamento.

## AppLayout

O layout principal comeca a respeitar modulos por plano em itens de navegacao com `moduleKey`.

Diretriz:

- Filtrar apenas itens com mapeamento claro.
- Manter itens ambiguos visiveis.
- Nao bloquear acesso direto por URL sem fase especifica.

## TenantSettings

A tela de configuracoes da empresa le e grava branding e dados empresariais em `tenants/{tenantId}`.

O administrador do tenant pode editar nome, logo, cores, contatos, endereco e parametros usados em impressoes. Plano, status de assinatura, produto base e permissoes continuam sob controle da plataforma.

## Multiempresa real

Para virar SaaS real, o sistema precisara de um identificador de tenant.

Possiveis nomes:

- `tenantId`
- `empresaId`
- `organizationId`

A escolha deve ser feita antes de qualquer migracao de banco.

## Isolamento de dados

Servicos e dados precisarao ser isolados por empresa.

Pontos que exigem planejamento:

- Clientes.
- Ordens de servico.
- Produtos e estoque.
- Financeiro.
- Orcamentos.
- Usuarios.
- WhatsApp.
- Impressao e documentos.

Nenhuma dessas areas deve ser migrada sem desenho tecnico, testes e backup.

## Migracao de banco

Migracoes de banco devem seguir processo formal:

1. Backup completo.
2. Ambiente de teste ou staging.
3. Script idempotente quando possivel.
4. Validacao com dados reais anonimizados ou copia controlada.
5. Plano de rollback.
6. Janela de execucao definida.

Nao aplicar multiempresa diretamente em producao.

## Diretriz de evolucao

A evolucao para SaaS deve ser incremental:

- Primeiro configuracao estatica.
- Depois leitura de configuracao remota.
- Depois isolamento por tenant em novas areas.
- Depois migracao planejada dos dados existentes.
- Por fim, provisionamento comercial e White Label avancado.
