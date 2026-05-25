# Checklist Final Multiempresa

## 1. Objetivo

Este checklist deve ser usado antes de iniciar qualquer implementacao real de `tenantId` ou `empresaId` no sistema.

Ele funciona como uma trava de seguranca para reduzir risco antes de alterar banco, migrations, backend, frontend, services, queries ou regras de negocio.

Enquanto todos os pontos criticos nao estiverem validados, a evolucao multiempresa deve permanecer em documentacao, types, helpers e testes controlados.

## 2. Checklist de seguranca geral

- [ ] Branch `nextassist-saas` atualizada.
- [ ] Producao RR Infocell protegida.
- [ ] Tag `rr-infocell-v1-estavel` preservada.
- [ ] Tags das fases anteriores criadas.
- [ ] Build atual passando.
- [ ] Documentacao `docs/nextassist/` revisada.
- [ ] Responsaveis pela validacao definidos.
- [ ] Escopo da fase aprovado.
- [ ] Nenhuma alteracao direta planejada em producao sem janela.
- [ ] Riscos conhecidos documentados.

## 3. Checklist de ambiente

- [ ] Ambiente staging criado.
- [ ] Banco staging separado da producao.
- [ ] Variaveis de ambiente separadas.
- [ ] Firebase/Hosting separado, se aplicavel.
- [ ] Backend staging separado, se aplicavel.
- [ ] Acesso restrito ao staging.
- [ ] Logs disponiveis.
- [ ] Monitoramento basico disponivel.
- [ ] Integracoes externas desativadas ou isoladas.
- [ ] Credenciais de producao nao usadas em staging.

## 4. Checklist de backup e rollback

- [ ] Backup da producao feito.
- [ ] Backup testado.
- [ ] Restauracao testada em staging.
- [ ] Plano de rollback documentado.
- [ ] Tag segura definida antes da implementacao.
- [ ] Janela de manutencao planejada para producao futura.
- [ ] Responsavel por rollback definido.
- [ ] Tempo estimado de rollback documentado.
- [ ] Criterios para acionar rollback definidos.

## 5. Checklist de tenant padrao

- [ ] `tenantId` `rr-infocell` definido.
- [ ] `slug` `rr-infocell` definido.
- [ ] Plano `premium` confirmado.
- [ ] `whiteLabel` ativo.
- [ ] Branding validado.
- [ ] Configuracao atual compativel com `tenantConfig.ts`.
- [ ] Nome exibido como RR Infocell validado.
- [ ] Produto base NextAssist documentado.
- [ ] Vinculo futuro dos usuarios com o tenant planejado.
- [ ] Modelo de tenant aprovado.

## 6. Checklist de entidades

Validar se as entidades foram mapeadas:

- [ ] clientes
- [ ] usuarios
- [ ] produtos
- [ ] estoque
- [ ] movimentacoes
- [ ] ordens de servico
- [ ] eventos de ordens de servico
- [ ] checklists
- [ ] orcamentos
- [ ] financeiro
- [ ] contas
- [ ] despesas
- [ ] vendas/PDV
- [ ] mensagens/WhatsApp
- [ ] relatorios
- [ ] configuracoes
- [ ] aparelhos
- [ ] categorias
- [ ] marcas
- [ ] fornecedores
- [ ] terceirizados

## 7. Checklist de services/queries

- [ ] Services candidatos mapeados.
- [ ] Queries de listagem mapeadas.
- [ ] Queries de detalhe mapeadas.
- [ ] Creates mapeados.
- [ ] Updates mapeados.
- [ ] Deletes mapeados.
- [ ] Relatorios mapeados.
- [ ] Impressao/orcamento mapeados.
- [ ] Buscas textuais mapeadas.
- [ ] Agregacoes financeiras mapeadas.
- [ ] Risco de query sem `tenantId` documentado.
- [ ] Repositories backend prioritarios identificados.
- [ ] Camada de validacao por tenant planejada.

## 8. Checklist de permissoes

- [ ] Roles atuais entendidas.
- [ ] Relacao usuario x tenant planejada.
- [ ] Acesso admin/gestor definido.
- [ ] Bloqueio entre tenants planejado.
- [ ] Backend definido como fonte de seguranca.
- [ ] Frontend nao sera usado como unica barreira.
- [ ] Membership por tenant desenhada.
- [ ] Permissao por plano considerada.
- [ ] Status do tenant considerado.
- [ ] Regras de Firestore/Storage planejadas.

## 9. Checklist de testes

Testes manuais obrigatorios:

- [ ] login
- [ ] dashboard
- [ ] clientes
- [ ] OS
- [ ] checklist
- [ ] orcamento
- [ ] estoque
- [ ] movimentacoes
- [ ] financeiro
- [ ] despesas
- [ ] PDV
- [ ] relatorios
- [ ] impressao
- [ ] configuracoes da empresa
- [ ] menus por plano
- [ ] usuarios/permissoes
- [ ] WhatsApp/mensagens, se aplicavel

Para cada fluxo, validar:

- [ ] listagem
- [ ] busca
- [ ] detalhe
- [ ] criacao
- [ ] edicao
- [ ] exclusao, quando existir
- [ ] permissao por role
- [ ] tenant correto nos dados exibidos

## 10. Checklist de isolamento

- [ ] Tenant A nao ve dados do Tenant B.
- [ ] Tenant B nao ve dados do Tenant A.
- [ ] Relatorios nao misturam dados.
- [ ] Updates respeitam `tenantId`.
- [ ] Deletes respeitam `tenantId`.
- [ ] Creates gravam `tenantId`.
- [ ] Usuarios nao acessam tenant errado.
- [ ] Impressao nao mistura dados.
- [ ] Orcamentos usam empresa correta.
- [ ] Financeiro agrega apenas dados do tenant.
- [ ] Estoque baixa apenas produtos do tenant.
- [ ] OS e eventos pertencem ao mesmo tenant.
- [ ] WhatsApp usa conexao do tenant correto.
- [ ] Acesso por ID direto nao retorna dados de outro tenant.

## 11. Criterios de bloqueio

Nao avancar se houver qualquer uma destas situacoes:

- Sem backup validado.
- Sem staging.
- Sem rollback.
- Sem testes de isolamento.
- Sem mapeamento de services criticos.
- Com duvidas em financeiro.
- Com duvidas em estoque.
- Com duvidas em OS.
- Com risco de afetar producao RR Infocell.
- Com permissao por tenant indefinida.
- Com queries criticas nao mapeadas.
- Com relatorios sem estrategia de filtro.
- Com integracoes externas sem isolamento.

## 12. Criterios para avancar para implementacao real

So e seguro avancar quando:

- Todos os checklists criticos estiverem marcados.
- Staging estiver pronto.
- Rollback estiver testado.
- Entidades criticas estiverem mapeadas.
- Services criticos estiverem mapeados.
- Queries criticas estiverem mapeadas.
- Testes estiverem definidos.
- Responsaveis tiverem aprovado.
- Plano de comunicacao estiver definido, se houver impacto operacional.
- Janela de validacao estiver definida.

Areas criticas que precisam de aprovacao explicita:

- OS
- clientes
- produtos
- estoque
- financeiro
- usuarios/permissoes
- relatorios
- impressao
- WhatsApp/mensagens

## 13. Proxima etapa sugerida

A proxima grande fase deve ser:

**Fase 7 — Implementacao controlada em staging**

Essa fase deve ocorrer apenas em ambiente seguro e separado da producao. Ainda nao deve ser aplicada na producao da RR Infocell.

Objetivo da Fase 7:

- implementar tenant em staging;
- validar isolamento;
- testar migracao controlada;
- revisar permissoes;
- validar relatorios;
- validar impressao;
- confirmar rollback.

Somente apos aprovacao completa em staging deve ser considerada uma fase futura de producao.
