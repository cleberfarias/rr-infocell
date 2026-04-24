# Regra de negocio: atualizacao do Notion

## Objetivo

Manter o Notion como fonte operacional de acompanhamento do projeto RR Infocell, refletindo o estado real do repositorio e das decisoes tomadas.

## Regra principal

Toda alteracao relevante no projeto deve atualizar o Notion no mesmo ciclo de trabalho.

Uma alteracao e relevante quando afeta:

- Escopo do MVP.
- Arquitetura tecnica.
- Estrutura de pastas.
- Design system.
- Status de tarefa.
- Fase do projeto.
- Deploy, Firebase ou infraestrutura.
- Decisoes comerciais ou validacoes com cliente.

## Quando atualizar o Notion

Atualizar o Notion sempre que:

1. Uma tarefa for iniciada.
2. Uma tarefa for concluida.
3. Uma tarefa for bloqueada.
4. Uma decisao tecnica for tomada.
5. Um documento local em `docs/` for criado ou alterado.
6. Um commit fechar uma tarefa do backlog.
7. Uma tarefa for substituida por outra abordagem.

## Campos obrigatorios no backlog

Toda tarefa no backlog deve manter:

- `Status`
- `Concluido`
- `Fase`
- `Modulo`
- `Prioridade`
- `Responsavel`
- `Descricao`

## Estados permitidos

### Backlog

Tarefa identificada, mas ainda nao pronta para execucao imediata.

### A Fazer

Tarefa pronta para execucao.

### Em andamento

Tarefa em execucao no ciclo atual.

### Em revisao

Implementacao feita, mas ainda sem validacao final.

### Concluido

Tarefa implementada, validada e refletida no repositorio ou na documentacao.

### Bloqueado

Tarefa impedida por dependencia, decisao pendente ou mudanca de estrategia.

## Criterio para marcar como concluido

Uma tarefa so pode ser marcada como `Concluido` quando:

- O artefato esperado foi criado ou atualizado.
- A documentacao local foi atualizada quando aplicavel.
- O Notion foi atualizado.
- Build/testes passaram quando houver impacto em codigo.
- O commit foi criado quando a entrega envolver arquivos do repositorio.

## O que nao marcar como concluido

Nao marcar como concluido quando:

- A tarefa foi apenas discutida.
- A tarefa foi parcialmente implementada.
- A tarefa foi substituida por outra abordagem.
- O resultado ainda nao foi validado.
- O codigo mudou, mas a documentacao relacionada ficou pendente.

Nesses casos, usar `Backlog`, `Em andamento`, `Em revisao` ou `Bloqueado`.

## Regra para tarefas substituidas

Quando uma tarefa perder sentido por decisao tecnica:

1. Marcar `Status` como `Bloqueado`.
2. Reduzir prioridade se ela nao for mais parte do MVP.
3. Atualizar a descricao explicando a nova decisao.
4. Manter a tarefa como historico, sem marcar como concluida.

Exemplo: tarefa com PostgreSQL substituida por Firebase.

## Relacao entre repo e Notion

O repositorio guarda a documentacao versionada em `docs/`.

O Notion guarda:

- Visao operacional do backlog.
- Status de tarefas.
- Decisoes resumidas.
- Links ou referencias para documentos do repo.

Se houver conflito entre repo e Notion, atualizar ambos no mesmo ciclo e registrar a decisao mais recente.

## Padrao de descricao ao concluir tarefa

Ao concluir uma tarefa no Notion, a descricao deve dizer:

- O que foi entregue.
- Onde esta no repositorio.
- Se houve validacao.
- Qual commit fechou a entrega, quando existir.

Exemplo:

```text
Repositório reorganizado com frontend, backend, infra e docs.
Documentação atualizada em docs/project-structure.md.
Validado com npm run build e npm test em frontend/.
Commit: 3d04b6a.
```

## Checklist de encerramento de ciclo

Antes de encerrar um ciclo de trabalho:

- [ ] Conferir `git status`.
- [ ] Rodar validacoes aplicaveis.
- [ ] Atualizar documentos em `docs/`.
- [ ] Atualizar tarefas no Notion.
- [ ] Criar commit quando houver mudanca no repo.
- [ ] Fazer push quando a entrega precisar estar no GitHub.
