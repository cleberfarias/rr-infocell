# Escopo do MVP

## Objetivo

Entregar a primeira versao utilizavel do RR Infocell com foco no fluxo de assistencia tecnica.

## Dentro do MVP

1. Login simples para usuarios internos.
2. Cadastro de usuarios internos e nivel de acesso.
3. Dashboard inicial com indicadores operacionais.
4. Cadastro de clientes.
5. Cadastro de aparelhos.
6. Criacao de ordem de servico.
7. Checklist tecnico de entrada.
8. Upload de fotos no checklist tecnico.
9. Impressao do checklist tecnico.
10. Controle de status da OS.
11. Estoque de pecas e produtos com movimentacoes manuais.
12. Relatorio basico de ordens de servico.
13. Visualizacao ou impressao simples de comprovante da OS.

## Estado atual do fluxo de OS

- Backend de ordens de servico concluido com CRUD, status, numero sequencial, validacao de cliente/aparelho e testes.
- Frontend de abertura e listagem de OS integrado com API real.
- Tela de manutencao integrada com OS reais para atualizar diagnostico, status tecnico, responsavel, mao de obra, comentarios e linha do tempo.
- Tela de orcamentos integrada com OS reais para enviar proposta, aprovar e reprovar, gravando snapshot do orcamento e alterando status da OS.
- PDV/Caixa integrado com OS reais para registrar venda, pagamento, troco, evento de entrega e marcar OS como entregue.
- Checklist tecnico vinculado a OS real.
- Detalhe da OS implementado com dados reais de cliente/aparelho.
- Comprovante simples da OS implementado com impressao pelo navegador.
- Historico operacional de OS implementado via eventos de manutencao, orcamento e venda.
- Historico do cliente implementado na tela de clientes com aparelhos, OS, abertas, total gasto e ultimas OS.
- Dashboard inicial usa dados reais de OS e exibe relatorio basico por status.

## Estado atual do estoque

- Backend de produtos/estoque basico implementado com CRUD, filtros, Firestore/fallback local e testes.
- Tela de estoque integrada com API real.
- Indicadores de SKUs ativos, estoque baixo e valor em estoque calculados a partir dos dados reais.
- Movimentacoes manuais implementadas com entrada, saida, ajuste, historico por produto e bloqueio de estoque negativo.
- Baixa automatica por OS implementada a partir das pecas usadas no detalhe da OS.

## Estado atual do financeiro

- Backend de despesas implementado com CRUD, filtros, Firestore/fallback local e testes.
- Tela de despesas integrada com API real para cadastrar, editar, remover, filtrar e marcar pagamento.
- Tela financeira integrada com vendas, OS, produtos e despesas reais para DRE simplificado, receita semanal e impacto de pecas.

## Estado atual do atendimento WhatsApp

- Conexao WhatsApp implementada no backend via Baileys e QR code.
- Painel `/app/atendimento` implementado com conversas, chat, contexto do cliente e OS ativas.
- Envio manual e acoes de OS integradas ao WhatsApp.
- Envio usa o JID canonico retornado por `onWhatsApp()` para evitar erro com nono digito.
- Recebimento resolve mensagens `@lid` via `signalRepository.lidMapping.getPNForLID()` antes de salvar no Firestore.
- Diagnostico disponivel em `/api/whatsapp/status` com ultimo evento, ultimo envio, recibos e motivo de descarte.

## Fora do MVP

- PDV fiscal completo.
- DRE completo com competencia, centros de custo e exportacao.
- Relatorios avancados.
- Integracao com MarketUP.
- Assinatura digital.
- WhatsApp automatico avancado, templates e campanhas.
- Controle avancado de permissoes.
- Aplicativo mobile.

## Prioridade de entrega

### Alta

- Clientes.
- Aparelhos.
- Ordens de servico.
- Checklist tecnico.
- Upload de fotos do checklist.
- Impressao do checklist.
- Status da OS.
- Historico do cliente.

### Media

- Estoque e movimentacoes manuais.
- Dashboard.
- Relatorio basico.
- Comprovante simples.

### Baixa

- PDV completo.
- Financeiro completo.
- Integracoes externas.

## Criterio de pronto da Fase 1

- Escopo registrado no repo.
- Escopo registrado no Notion.
- Firebase definido como base tecnica.
- Estrutura inicial do repositorio preparada.
