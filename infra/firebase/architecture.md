# Arquitetura Firebase do MVP

## Decisao

O MVP usara Firebase como base principal:

- Firebase Auth para usuarios internos.
- Firestore real como banco de dados principal.
- Firebase Storage para arquivos futuros.
- Firebase Hosting para o frontend.
- Firebase Admin SDK no backend Node/Express.

## Estado atual

- Projeto Firebase: `rr-infocell`.
- Firestore database: `(default)`.
- Regiao do Firestore: `nam5`.
- Colecao `clientes` validada com escrita/leitura pelo backend.
- Colecao `produtos` preparada para estoque via backend.
- Colecao `movimentacoesEstoque` preparada para historico de entrada, saida e ajuste.
- Backend local usa service account via `GOOGLE_APPLICATION_CREDENTIALS`.
- Frontend possui login Firebase Auth real e protecao de rotas por perfil.
- Backend possui endpoint administrativo para criar usuarios Firebase Auth e definir custom claim `role`.
- Tela administrativa de usuarios permite ao `admin` cadastrar usuarios internos e nivel de acesso.

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
- `produtos/{produtoId}` armazena SKU, nome, categoria, estoque atual, minimo, custo, venda e status ativo.
- `movimentacoesEstoque/{movimentacaoId}` armazena tipo, quantidade, estoque anterior/posterior, origem e motivo.

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
- Gerenciamento de usuarios exige token Firebase Auth com custom claim `role=admin`.
- Storage exige usuario autenticado e perfil operacional para fotos do checklist.
- Regras iniciais ficam em `infra/firebase/firestore.rules` e `infra/firebase/storage.rules`.
- Configuracao de Hosting, regras e emuladores fica em `firebase.json`.

## Setup operacional

O passo a passo de criacao do projeto, variaveis de ambiente, emuladores e deploy esta documentado em `infra/firebase/setup.md`.

## Backend Node/Express

O backend existe para:

- Validar regras de negocio.
- Gerar numero sequencial de OS.
- Aplicar permissoes de perfil.
- Evitar exposicao de operacoes sensiveis no frontend.
- Registrar auditoria.

## Migracao futura

PostgreSQL pode ser avaliado apenas se o sistema crescer e exigir consultas relacionais mais complexas. Nao faz parte do MVP.
