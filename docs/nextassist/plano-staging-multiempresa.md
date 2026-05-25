# Plano de Staging Multiempresa

## 1. Objetivo

Este documento define como testar a arquitetura multiempresa do NextAssist em ambiente staging antes de qualquer alteracao em producao.

O objetivo e validar tenant, isolamento de dados, permissoes, relatorios e fluxos criticos em um ambiente seguro, sem impactar a operacao real da RR Infocell.

Este plano nao cria migrations, nao altera banco e nao altera codigo funcional.

## 2. Ambiente staging

O ambiente staging ideal deve ser separado da producao.

Caracteristicas esperadas:

- Branch base: `nextassist-saas`
- Banco separado da producao
- Dados simulados ou copia controlada dos dados reais
- Firebase/Hosting separado, se aplicavel
- Backend separado, se aplicavel
- Variaveis de ambiente separadas
- Credenciais separadas
- Acesso restrito para testes
- Logs separados da producao
- Possibilidade de restaurar o banco staging rapidamente

O staging deve permitir testar multiempresa sem risco de alterar dados reais da RR Infocell.

## 3. Pre-requisitos

Antes de qualquer implementacao em staging:

- Backup validado da producao
- Tenant padrao `rr-infocell` definido
- Entidades mapeadas
- Plano de rollback documentado
- Checklist de isolamento pronto
- Responsavel pela validacao definido
- Criterios de aceite definidos
- Branch `nextassist-saas` atualizada
- Build atual validado
- Documentos de migracao e isolamento revisados

## 4. Estrategia de dados em staging

Existem duas abordagens principais para dados em staging.

### Dados simulados

Usar dados criados especificamente para testes.

Vantagens:

- Menor risco de exposicao de dados sensiveis
- Mais simples de descartar
- Permite criar cenarios controlados com multiplos tenants

Desvantagens:

- Pode nao revelar problemas de dados historicos reais
- Pode nao cobrir todos os formatos encontrados em producao

### Copia controlada de dados reais

Usar uma copia do banco real em ambiente separado.

Regras:

- Nunca usar a producao diretamente
- Anonimizar dados sensiveis se necessario
- Controlar acesso ao ambiente
- Registrar origem e data da copia
- Garantir que integracoes externas nao disparem efeitos reais

Essa abordagem ajuda a validar migracao com dados proximos da realidade, mas exige mais cuidado.

### Regra obrigatoria

Nunca testar tenant real em producao. Toda validacao multiempresa deve acontecer primeiro em staging.

## 5. Ordem sugerida de implementacao em staging

Ordem segura recomendada:

1. Criar tenant padrao `rr-infocell`.
2. Criar um segundo tenant ficticio para validar isolamento.
3. Adicionar `tenantId` em entidades menos criticas primeiro.
4. Validar leitura dessas entidades.
5. Validar criacao com gravação de `tenantId`.
6. Validar edicao respeitando `tenantId`.
7. Validar exclusao respeitando `tenantId`.
8. Aplicar `tenantId` em entidades criticas.
9. Validar OS, clientes, estoque e financeiro.
10. Validar relatorios.
11. Validar impressao/orcamento.
12. Validar usuarios e permissoes.
13. Validar mensagens/WhatsApp, se aplicavel.
14. Executar testes de isolamento entre tenants.
15. Registrar problemas e decisoes.

Entidades menos criticas podem incluir dados auxiliares como categorias, marcas ou configuracoes internas. Entidades criticas incluem OS, clientes, produtos, estoque, financeiro, vendas, usuarios e WhatsApp.

## 6. Plano de testes manuais

Checklist de testes manuais em staging:

- Login
- Dashboard
- Clientes
- Ordens de servico
- Checklist
- Orcamento
- Estoque
- Movimentacoes
- Financeiro
- Despesas
- PDV
- Relatorios
- Impressao
- Configuracoes da empresa
- Menu por plano
- Troca simulada de plano
- Tentativa de acessar dados de outro tenant

Para cada item, validar:

- listagem;
- busca;
- criacao;
- edicao;
- exclusao, quando existir;
- permissao por role;
- tenant correto nos dados exibidos.

## 7. Plano de testes de isolamento

Criar ao menos dois tenants em staging:

- Tenant A: `rr-infocell`
- Tenant B: tenant ficticio de teste

Validacoes obrigatorias:

- Tenant A nao ve dados do Tenant B.
- Tenant B nao ve dados do Tenant A.
- Relatorios nao misturam dados.
- Usuario nao acessa tenant errado.
- Update respeita `tenantId`.
- Delete respeita `tenantId`.
- Criacao de dados sempre grava `tenantId`.
- Filtros obrigatorios estao presentes.
- Buscas textuais continuam filtradas por tenant.
- Agregacoes financeiras filtram tenant antes de calcular totais.
- Impressao usa dados do tenant correto.
- WhatsApp usa conexao do tenant correto.

Testes negativos tambem devem existir:

- tentar buscar registro de outro tenant por ID;
- tentar atualizar registro de outro tenant;
- tentar excluir registro de outro tenant;
- tentar gerar relatorio com dados cruzados;
- tentar acessar rota com usuario sem vinculo ao tenant.

## 8. Criterios de aprovacao do staging

Staging so deve ser considerado aprovado quando:

- Build passa.
- Testes manuais passam.
- Dados nao misturam entre tenants.
- Relatorios exibem totais corretos.
- Impressao usa dados corretos da empresa.
- Permissoes funcionam por tenant.
- Rollback foi testado.
- Logs nao indicam vazamento ou erro de tenant.
- Fluxos criticos da RR Infocell continuam funcionando.
- Validacao do cliente piloto foi feita, se necessario.

## 9. Estrategia de rollback em staging

Rollback em staging deve ser simples e testavel.

Opcoes:

- Restaurar backup do banco staging.
- Voltar branch ou tag anterior.
- Desfazer migrations, quando existirem.
- Reexecutar seed/dados simulados.
- Validar sistema sem `tenantId` novamente.

Antes de qualquer teste destrutivo:

- registrar estado inicial;
- garantir backup do staging;
- documentar scripts executados;
- confirmar que producao nao esta conectada.

## 10. O que ainda nao fazer

Nesta fase, nao fazer:

- Nao aplicar em producao.
- Nao migrar banco real.
- Nao permitir multiplos clientes reais ainda.
- Nao cobrar planos ainda.
- Nao ativar tenant dinamico sem validacao.
- Nao depender apenas do frontend para seguranca.
- Nao liberar acesso externo ao staging sem controle.
- Nao conectar WhatsApp real de cliente sem validacao.
- Nao alterar documentos fiscais/operacionais sem revisao.

## 11. Criterios para avancar para producao futura

So considerar producao quando:

- Staging estiver aprovado.
- Rollback estiver validado.
- Queries criticas estiverem revisadas.
- Permissoes estiverem testadas.
- Backup de producao estiver pronto.
- Restore de producao estiver validado.
- Janela de manutencao estiver definida.
- Responsaveis por validacao estiverem definidos.
- Plano de comunicacao estiver definido.
- Fluxos criticos da RR Infocell tiverem checklist de aceite.

Sem esses criterios, a arquitetura multiempresa deve continuar restrita a staging, documentacao, types, helpers e testes controlados.
