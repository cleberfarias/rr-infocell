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
- Tela de manutencao integrada com OS reais para atualizar diagnostico, status tecnico, responsavel e mao de obra.
- Checklist tecnico vinculado a OS real.
- Detalhe da OS implementado com dados reais de cliente/aparelho.
- Comprovante simples da OS implementado com impressao pelo navegador.
- Dashboard inicial usa dados reais de OS e exibe relatorio basico por status.

## Estado atual do estoque

- Backend de produtos/estoque basico implementado com CRUD, filtros, Firestore/fallback local e testes.
- Tela de estoque integrada com API real.
- Indicadores de SKUs ativos, estoque baixo e valor em estoque calculados a partir dos dados reais.
- Movimentacoes manuais implementadas com entrada, saida, ajuste, historico por produto e bloqueio de estoque negativo.
- Baixa automatica por OS implementada a partir das pecas usadas no detalhe da OS.

## Fora do MVP

- PDV completo.
- DRE completo.
- Relatorios avancados.
- Integracao com MarketUP.
- Assinatura digital.
- Envio automatico por WhatsApp.
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
