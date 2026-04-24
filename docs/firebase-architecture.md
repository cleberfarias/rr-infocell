# Arquitetura Firebase do MVP

## Decisao

O MVP usara Firebase como base principal:

- Firebase Auth para usuarios internos.
- Firestore como banco de dados.
- Firebase Storage para arquivos futuros.
- Firebase Hosting para o frontend.
- Firebase Admin SDK no backend Node/Express.

## Por que Firebase

- Reduz complexidade inicial.
- Acelera validacao do MVP.
- Integra autenticacao, banco e hosting.
- Atende bem os fluxos iniciais de clientes, aparelhos, OS, checklist e estoque basico.

## Colecoes iniciais

```text
users
clientes
aparelhos
ordensServico
checklists
produtos
vendas
movimentacoesEstoque
auditLogs
counters
```

## Modelo de relacionamento

- `clientes/{clienteId}` armazena dados do cliente.
- `aparelhos/{aparelhoId}` referencia `clienteId`.
- `ordensServico/{ordemId}` referencia `clienteId` e `aparelhoId`.
- `checklists/{checklistId}` referencia `ordemServicoId`.
- `movimentacoesEstoque/{movimentacaoId}` referencia `produtoId` e, quando existir, `ordemServicoId`.

## Numero automatico de OS

Usar colecao `counters` com documento `ordensServico`.

Fluxo recomendado:

1. Backend recebe pedido de criacao de OS.
2. Backend abre transacao no Firestore.
3. Incrementa `counters/ordensServico.nextNumber`.
4. Cria `ordensServico/{id}` com `numero` sequencial.
5. Registra evento em `auditLogs`.

## Perfis iniciais

- `admin`: acesso total.
- `atendente`: clientes, aparelhos, abertura de OS e checklist.
- `tecnico`: diagnostico, manutencao, checklist e status tecnico.

## Regras de seguranca

- Usuarios autenticados podem ler dados operacionais conforme perfil.
- Escritas sensiveis devem passar pelo backend.
- Dados financeiros e configuracoes devem ser restritos a `admin`.
- Storage deve exigir usuario autenticado e vinculo com OS quando fotos forem implementadas.

## Backend Node/Express

O backend existe para:

- Validar regras de negocio.
- Gerar numero sequencial de OS.
- Aplicar permissoes de perfil.
- Evitar exposicao de operacoes sensiveis no frontend.
- Registrar auditoria.

## Migracao futura

PostgreSQL pode ser avaliado apenas se o sistema crescer e exigir consultas relacionais mais complexas. Nao faz parte do MVP.
