# Plano de Migracao de Dados

## 1. Objetivo da migracao

Este documento descreve um plano tecnico para uma migracao futura de dados do sistema RR Infocell para a arquitetura multiempresa do NextAssist.

A migracao futura devera associar todos os dados atuais da RR Infocell a um tenant padrao. Essa associacao permitira preparar o sistema para novos clientes sem misturar dados entre empresas.

Nesta fase, nada deve ser executado no banco de dados. Este documento e apenas planejamento.

## 2. Tenant padrao inicial

O tenant inicial da operacao atual deve representar a RR Infocell como cliente piloto do NextAssist.

Definicao conceitual:

- `tenantId`: `rr-infocell`
- `tenantName`: `RR Infocell`
- `plan`: `premium`
- `whiteLabel`: `true`

Esse tenant deve ser usado como destino de todos os registros existentes em uma migracao futura controlada.

## 3. Entidades candidatas a tenantId

As entidades abaixo provavelmente precisarao receber `tenantId` ou equivalente:

- clientes
- usuarios
- produtos
- estoque
- movimentacoes
- ordens de servico
- checklists
- orcamentos
- financeiro
- despesas
- vendas/PDV
- mensagens/WhatsApp
- relatorios
- configuracoes

Entidades auxiliares tambem devem ser revisadas antes da implementacao:

- aparelhos
- categorias
- marcas
- fornecedores
- terceirizados
- contas
- eventos de ordem de servico

## 4. Ordem segura de migracao

A migracao deve ser feita em etapas, sempre fora da producao primeiro.

### 4.1 Backup

Antes de qualquer alteracao:

- exportar o Firestore completo;
- registrar data, hora e responsavel pelo backup;
- validar se o backup pode ser restaurado;
- preservar uma copia imutavel.

### 4.2 Ambiente staging

Criar ou validar um ambiente staging separado:

- frontend separado;
- backend separado;
- banco separado;
- variaveis de ambiente separadas;
- dados de teste ou copia controlada da producao.

### 4.3 Criar tenant padrao

Criar em staging o tenant `rr-infocell` com plano `premium`.

Esse tenant sera a referencia para associar os dados atuais.

### 4.4 Aplicar tenantId em dados nao criticos primeiro

Comecar por dados de menor risco operacional, como:

- categorias;
- marcas;
- configuracoes de apoio;
- entidades auxiliares sem impacto direto em caixa.

Validar leitura e escrita antes de avancar.

### 4.5 Validar consultas

Depois de aplicar `tenantId` em dados nao criticos:

- ajustar consultas em staging;
- validar listagens;
- validar buscas;
- validar criacao, edicao e exclusao;
- garantir que registros sem tenant nao sejam retornados indevidamente.

### 4.6 Aplicar em entidades criticas

Somente depois das validacoes iniciais, migrar entidades criticas:

- clientes;
- ordens de servico;
- produtos;
- estoque;
- movimentacoes;
- vendas/PDV;
- financeiro;
- despesas;
- orcamentos;
- WhatsApp/mensagens.

### 4.7 Testar relatorios

Relatorios devem ser testados com atencao especial:

- dashboard;
- DRE;
- vendas;
- estoque;
- OS;
- financeiro;
- despesas.

Todas as agregacoes devem filtrar tenant obrigatoriamente.

### 4.8 Testar isolamento

Criar ao menos dois tenants em staging e validar:

- Tenant A nao le dados do Tenant B.
- Tenant A nao altera dados do Tenant B.
- Relatorios nao misturam dados.
- Usuarios nao acessam empresas indevidas.
- Impressao usa dados da empresa correta.

### 4.9 So depois producao

A producao so deve ser considerada depois de:

- migracao validada em staging;
- plano de rollback testado;
- build frontend aprovado;
- build backend aprovado;
- fluxos criticos validados manualmente;
- janela de execucao definida.

## 5. Estrategia de rollback

Rollback deve ser planejado antes da migracao.

Opcoes possiveis:

- restaurar backup completo do Firestore;
- reverter scripts de migracao em ambiente controlado;
- manter scripts idempotentes com logs de registros alterados;
- preservar exportacao antes e depois da migracao;
- bloquear novas escritas durante a janela critica, se necessario.

Para producao, a estrategia mais segura e ter backup restauravel e janela definida. Nenhuma migracao deve iniciar sem confirmacao de restore.

## 6. Validacoes antes da migracao

Checklist antes de qualquer alteracao real:

- Confirmar branch `nextassist-saas`.
- Confirmar tag estavel `rr-infocell-v1-estavel`.
- Confirmar ambiente staging funcional.
- Fazer backup completo do banco.
- Validar processo de restore.
- Definir nome oficial do identificador: `tenantId`, `empresaId` ou outro.
- Definir modelo de tenant.
- Mapear todas as colecoes.
- Mapear todas as queries.
- Mapear relatorios e agregacoes.
- Mapear documentos de impressao.
- Mapear arquivos em Storage.
- Criar plano de rollback.
- Criar testes de isolamento.
- Rodar build frontend.
- Rodar build backend.
- Validar fluxos criticos manualmente.

Fluxos criticos:

- login;
- clientes;
- ordens de servico;
- estoque;
- movimentacoes;
- orcamentos;
- PDV/vendas;
- financeiro;
- despesas;
- impressao;
- WhatsApp;
- usuarios;
- relatorios.

## 7. Validacoes depois da migracao

Checklist apos migracao em staging:

- Todos os registros esperados possuem `tenantId`.
- Nao ha registros criticos sem tenant.
- Listagens retornam apenas dados do tenant atual.
- Buscas retornam apenas dados do tenant atual.
- Relatorios agregam apenas dados do tenant atual.
- Usuario de um tenant nao acessa dados de outro.
- Criacao de novos registros grava tenant corretamente.
- Edicao preserva tenant corretamente.
- Exclusao nao afeta outro tenant.
- Impressao usa nome, logo e dados corretos da empresa.
- Estoque mantem saldos corretos.
- Financeiro mantem totais corretos.
- OS mantem historico e eventos corretos.
- WhatsApp mantem mensagens e conexoes isoladas.

## 8. Riscos por modulo

### OS

Riscos:

- OS aparecer para empresa errada.
- Historico de eventos misturado.
- Cliente de outro tenant vinculado por engano.
- Impressao de OS com dados de empresa incorreta.

### Estoque

Riscos:

- Saldo misturado entre empresas.
- Movimentacao aplicada no produto errado.
- Baixa de estoque no tenant errado.
- Custo e margem incorretos.

### Financeiro

Riscos:

- DRE misturando empresas.
- Receitas ou despesas incorretas.
- Caixa e contas compartilhados indevidamente.
- Relatorios financeiros invalidos.

### Relatorios

Riscos:

- Agregacoes sem filtro por tenant.
- Indicadores comerciais misturados.
- Dashboards exibindo dados de outra empresa.
- Decisoes gerenciais com base errada.

### Impressao/orcamento

Riscos:

- CNPJ, telefone, endereco ou logo incorretos.
- Termos de garantia de empresa errada.
- Orcamento vinculado a cliente ou OS de outro tenant.
- Documento operacional invalido.

### Usuarios/permissoes

Riscos:

- Usuario acessar empresa indevida.
- Role global ser usada como permissao multiempresa.
- Admin de uma empresa visualizar outra.
- Falta de membership por tenant.

### WhatsApp/mensagens

Riscos:

- Conexao de WhatsApp compartilhada indevidamente.
- Mensagem enviada para cliente errado.
- Historico de conversa exposto para outro tenant.
- Automacao disparada no tenant incorreto.

## 9. Criterios para avancar para implementacao

So sera seguro criar migrations ou camadas reais quando:

- ambiente staging estiver pronto;
- backup e restore estiverem validados;
- modelo de tenant estiver definido;
- estrategia de autenticacao por tenant estiver definida;
- repositories backend tiverem plano de filtro obrigatorio;
- regras de seguranca estiverem planejadas;
- testes de isolamento estiverem especificados;
- fluxos criticos tiverem checklist de validacao;
- RR Infocell tiver uma janela segura de migracao;
- existir plano de rollback aprovado.

Antes disso, qualquer evolucao deve se limitar a types, helpers, documentacao e preparacao sem persistencia.
