# Arquitetura SaaS Futura

## Estado atual

O sistema opera com a RR Infocell como tenant piloto em producao e com base comum NextAssist SaaS + White Label. O backend ja resolve tenants dinamicamente e as integracoes fiscais e de pagamentos usam configuracao isolada por empresa.

Componentes atuais:

- `tenantConfig.ts`: configuracao estatica do tenant.
- `planModules.ts`: matriz estatica de capacidades por plano.
- `AppLayout.tsx`: comeca a respeitar modulos na navegacao.
- `TenantSettings.tsx`: permite ao administrador editar identidade e dados operacionais do proprio tenant.
- `Integracoes.tsx`: configura fiscal e pagamentos por tenant.
- `backend/src/modules/integracoes`: adaptadores, OAuth, criptografia e transacoes integradas.

## tenantConfig e configuracao remota

`tenantConfig.ts` centraliza dados do tenant atual.

O fallback estatico ainda existe para compatibilidade, mas identidade e dados operacionais editaveis sao persistidos em `tenants/{tenantId}`. Plano, assinatura e permissoes continuam sob controle da plataforma.

Limites:

- Nao deve ser usado como fonte final para plano, assinatura ou feature flags.
- Nao substitui o isolamento e as validacoes tenant-aware do backend.
- O provisionamento comercial ainda precisa ser automatizado.

## Integracoes fiscais e pagamentos

As configuracoes nao secretas ficam em `tenantIntegrations`; segredos criptografados ficam em `tenantIntegrationSecrets`. Estados OAuth temporarios usam `integrationOAuthStates` e pagamentos integrados usam `paymentTransactions`.

As credenciais OAuth da aplicacao pertencem ao NextAssist. Tokens e configuracoes operacionais pertencem a cada tenant. O backend valida aprovacao, valor, tenant e consumo unico antes de criar uma venda.

O Mercado Pago Point esta integrado. A configuracao fiscal esta pronta, mas os adaptadores de emissao NFC-e/NFS-e ainda precisam ser implementados. Consulte [Integracoes Fiscais e de Pagamentos](./integracoes-fiscais-pagamentos.md).

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

O identificador adotado e `tenantId`. Modulos tenant-aware devem usar `resolveTenant` e `getRequestTenantId`, e nunca aceitar o tenant do payload como autoridade isolada.

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

- Manter configuracao remota e fallback estatico apenas onde necessario.
- Expandir isolamento por tenant em qualquer nova area.
- Migrar dados antigos apenas com auditoria, backup e rollback.
- Automatizar provisionamento comercial e White Label avancado.
- Adicionar provedores fiscais e de pagamento por adaptadores, sem acoplar o nucleo a um fornecedor.
