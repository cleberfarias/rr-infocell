# Auditoria de Pontos para Tenant

## 1. Objetivo da auditoria

Este documento mapeia onde `tenantId` ou `empresaId` precisara ser aplicado futuramente para transformar o sistema RR Infocell na base multiempresa do NextAssist.

A auditoria nao altera codigo, banco, migrations, frontend, backend ou services. O objetivo e orientar uma implementacao futura segura, reduzindo risco de vazamento de dados entre empresas.

## 2. Pastas analisadas

Pastas relevantes encontradas no projeto:

- `frontend/src/services`
- `frontend/src/pages`
- `frontend/src/components`
- `frontend/src/lib`
- `frontend/src/config`
- `frontend/src/contexts`
- `frontend/src/types`
- `backend/src/modules`
- `backend/src/middlewares`
- `backend/src/config`
- `backend/src/firebase`
- `infra/firebase`
- `docs/nextassist`

Arquivos de infraestrutura relevantes:

- `infra/firebase/firestore.rules`
- `infra/firebase/storage.rules`
- `firebase.json`
- `.firebaserc.example`

## 3. Services candidatos a tenantId

| Area | Arquivo provavel | Tipo de dado manipulado | Risco se nao filtrar por tenantId | Prioridade |
| --- | --- | --- | --- | --- |
| Clientes | `frontend/src/services/clientes.ts` | clientes e dados cadastrais | Exibir ou alterar clientes de outra empresa | Alta |
| Usuarios | `frontend/src/services/usuarios.ts` | usuarios, roles e status | Usuario acessar ou administrar empresa indevida | Alta |
| Produtos | `frontend/src/services/produtos.ts` | catalogo, preco, estoque atual | Misturar produtos, precos e saldos entre empresas | Alta |
| Ordens de servico | `frontend/src/services/ordens-servico.ts` | OS, status, prazos, dados de atendimento | Vazamento de historico tecnico e dados de clientes | Alta |
| Eventos da OS | `frontend/src/services/ordem-eventos.ts` | historico e timeline da OS | Eventos de uma empresa aparecerem em OS de outra | Alta |
| Movimentacoes | `frontend/src/services/movimentacoes-estoque.ts` | entradas, saidas e ajustes de estoque | Baixa de estoque ou historico misturado | Alta |
| Financeiro/contas | `frontend/src/services/contas.ts` | contas financeiras e lancamentos | Relatorios financeiros incorretos ou vazamento de caixa | Alta |
| Despesas | `frontend/src/services/despesas.ts` | despesas e categorias | DRE e custos misturados entre tenants | Media |
| Orcamentos | `frontend/src/services/orcamentos.ts` | orcamentos e itens | Orcamento com cliente, valores ou empresa incorretos | Media |
| Vendas/PDV | `frontend/src/services/vendas.ts` | vendas, itens, pagamentos | Caixa, estoque e comprovantes de tenants diferentes misturados | Media |
| WhatsApp | `frontend/src/services/whatsapp.ts` | mensagens, conexoes e automacoes | Envio ou exposicao de conversa do tenant errado | Alta |
| Checklists | `frontend/src/services/checklists.ts` | modelos e respostas | Respostas tecnicas ou modelos indevidos entre empresas | Media |
| Aparelhos | `frontend/src/services/aparelhos.ts` | aparelhos e modelos | Associar aparelho de cliente a tenant errado | Media |
| Categorias | `frontend/src/services/categorias.ts` | categorias de produtos/servicos | Catalogos administrativos misturados | Baixa |
| Marcas | `frontend/src/services/marcas.ts` | marcas cadastradas | Dados auxiliares compartilhados indevidamente | Baixa |
| Fornecedores | `frontend/src/services/fornecedores.ts` | fornecedores | Fornecedores e vinculos comerciais expostos | Media |
| Terceirizados | `frontend/src/services/terceirizados.ts` | terceiros e prestadores | Prestadores de uma empresa visiveis para outra | Media |
| Observabilidade | `frontend/src/services/observabilidade.ts` | eventos tecnicos e status | Logs tecnicos misturarem tenants futuramente | Baixa |
| Ajuda | `frontend/src/services/ajuda.ts` | assistente/ajuda | Baixo risco de dados de negocio, mas contexto futuro deve ser revisado | Baixa |
| API base | `frontend/src/services/api.ts` | camada HTTP comum | Local candidato para contexto/header futuro, se o desenho tecnico escolher isso | Alta |

## 4. Paginas/telas candidatas

| Tela | Arquivo provavel | Dados exibidos | Risco de vazamento entre empresas | Prioridade |
| --- | --- | --- | --- | --- |
| Dashboard | `frontend/src/pages/Dashboard.tsx` | indicadores, OS, vendas, estoque, financeiro | Agregacoes misturadas e decisoes gerenciais incorretas | Alta |
| Clientes | `frontend/src/pages/Clientes.tsx` | clientes e contatos | Dados pessoais de clientes expostos | Alta |
| Ordens | `frontend/src/pages/Ordens.tsx` | listagem de OS | OS de outra empresa visivel | Alta |
| Nova OS | `frontend/src/pages/NovaOS.tsx` | criacao de OS, cliente, aparelho | Criar OS no tenant errado | Alta |
| Detalhe da OS | `frontend/src/pages/OrdemDetalhe.tsx` | historico, senha, impressao, dados do cliente | Exposicao de dados sensiveis e documentos incorretos | Alta |
| Checklist | `frontend/src/pages/Checklist.tsx` | checklists e impressao | Dados tecnicos de outro tenant | Media |
| Manutencao | `frontend/src/pages/Manutencao.tsx` | OS em manutencao e eventos | Tecnicos acessarem OS de outra empresa | Alta |
| Orcamento | `frontend/src/pages/Orcamento.tsx` | orcamentos e impressao | Valores e documentos de outro tenant | Media |
| Estoque | `frontend/src/pages/Estoque.tsx` | produtos, saldos e ajustes | Saldos e custos misturados | Alta |
| Movimentacoes | `frontend/src/pages/Movimentacoes.tsx` | historico de estoque | Auditoria de estoque incorreta | Alta |
| PDV | `frontend/src/pages/PDV.tsx` | vendas, caixa, comprovantes | Venda ou comprovante no tenant errado | Media |
| Financeiro | `frontend/src/pages/Financeiro.tsx` | DRE, indicadores, relatorios | Vazamento financeiro e indicadores incorretos | Alta |
| Despesas | `frontend/src/pages/Despesas.tsx` | despesas e categorias | Custos misturados | Media |
| Usuarios | `frontend/src/pages/Usuarios.tsx` | usuarios, roles, status | Administracao indevida de usuarios | Alta |
| Atendimento | `frontend/src/pages/Atendimento.tsx` | mensagens e WhatsApp | Conversas e automacoes de tenant errado | Alta |
| Aparelhos | `frontend/src/pages/Aparelhos.tsx` | aparelhos/modelos | Dados auxiliares de tenant errado | Media |
| Tenant Settings | `frontend/src/pages/TenantSettings.tsx` | tenant, plano e branding | Mostrar configuracao de empresa errada | Baixa |
| Observabilidade | `frontend/src/pages/Observabilidade.tsx` | logs/status tecnico | Logs de tenants misturados futuramente | Baixa |
| Treinamento | `frontend/src/pages/Treinamento.tsx` | conteudo de treinamento | Baixo risco operacional | Baixa |

## 5. Componentes criticos

Componentes e areas que podem receber dados de varias entidades:

- `frontend/src/components/AppLayout.tsx`: menu, navegacao, notificacoes de OS e estoque.
- `frontend/src/components/MobileNav.tsx`: navegacao mobile e acesso a areas sensiveis.
- `frontend/src/components/CommandPalette.tsx`: busca e atalhos; precisa respeitar tenant se listar dados no futuro.
- `frontend/src/components/AIAssistant.tsx`: pode receber contexto operacional no futuro.
- `frontend/src/components/PrintPreviewDialog.tsx`: base para impressao; deve garantir dados do tenant correto.
- Componentes de tabela/listagem em paginas: devem receber dados ja filtrados.
- Conteudos de impressao em OS, orcamento, PDV e financeiro: precisam usar empresa correta.
- Componentes relacionados a WhatsApp/mensagens: devem respeitar conexao e historico do tenant.

Observacao: layout e componentes visuais nao substituem filtros no backend. Eles devem consumir dados ja isolados.

## 6. Pontos de autenticacao/permissao

Arquivos relacionados:

- `frontend/src/lib/auth.tsx`
- `frontend/src/lib/roles.ts`
- `frontend/src/lib/firebase.ts`
- `backend/src/middlewares/auth.ts`
- `backend/src/modules/usuarios`
- `infra/firebase/firestore.rules`

Permissoes futuras deverao considerar:

- usuario autenticado;
- role do usuario;
- `tenantId` atual;
- plano do tenant;
- status do tenant;
- membership do usuario naquele tenant.

Risco principal: manter apenas role global, como `admin`, `atendente` ou `tecnico`, nao e suficiente em um SaaS multiempresa. Um admin deve ser admin de um tenant especifico, nao necessariamente de todos.

## 7. Pontos de relatorio e impressao

Arquivos/telas candidatos:

- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Financeiro.tsx`
- `frontend/src/pages/PDV.tsx`
- `frontend/src/pages/OrdemDetalhe.tsx`
- `frontend/src/pages/Orcamento.tsx`
- `frontend/src/pages/Checklist.tsx`
- `frontend/src/components/PrintPreviewDialog.tsx`

Riscos:

- Relatorios financeiros misturarem receitas/despesas de tenants diferentes.
- Dashboard consolidar OS, vendas e estoque de outra empresa.
- Impressao de OS usar logo, CNPJ, endereco ou termos de outro tenant.
- Orcamento ser gerado com dados comerciais errados.
- Cupom/recibo de PDV refletir empresa incorreta.

Diretriz: relatorios devem filtrar tenant antes de agregar dados. Impressao deve usar dados de empresa resolvidos a partir do tenant do documento.

## 8. Priorizacao para implementacao futura

| Prioridade | Areas | Motivo |
| --- | --- | --- |
| Alta | OS, clientes, produtos, estoque, financeiro, usuarios | Dados operacionais, pessoais, financeiros e de permissao. Vazamento ou mistura causa impacto direto. |
| Media | relatorios, despesas, orcamento, PDV, WhatsApp, checklists | Alta relevancia operacional, mas podem depender de entidades principais ja isoladas. |
| Baixa | branding, configuracoes visuais, textos institucionais, observabilidade, treinamento | Menor risco de dados de negocio, mas ainda precisam de desenho correto em fase SaaS. |

## 9. Checklist antes de implementar

Antes de qualquer implementacao real de `tenantId`:

- Confirmar ambiente staging.
- Fazer backup do banco.
- Validar restore do backup.
- Definir tenant padrao `rr-infocell`.
- Definir nome oficial do campo: `tenantId`, `empresaId` ou outro.
- Mapear services.
- Mapear queries.
- Mapear repositories backend.
- Mapear relatorios.
- Mapear documentos de impressao.
- Mapear Storage e anexos.
- Definir como usuario se vincula a tenant.
- Definir como roles funcionam por tenant.
- Criar testes manuais.
- Criar testes automatizados de isolamento quando possivel.
- Planejar rollback.
- Validar build frontend.
- Validar build backend.

## 10. Recomendacao final

A proxima fase recomendada e criar um documento de desenho tecnico para o `tenantId` padrao, definindo:

- nome definitivo do campo;
- formato do identificador;
- modelo de tenant;
- modelo de membership de usuarios;
- origem confiavel do tenant no backend;
- estrategia para repositories;
- plano de testes de isolamento.

Somente depois desse desenho e da validacao em staging deve iniciar implementacao real. A primeira implementacao deve ocorrer em ambiente controlado, nunca diretamente na producao da RR Infocell.
