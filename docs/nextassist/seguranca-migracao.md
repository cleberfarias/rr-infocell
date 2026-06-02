# Seguranca e Migracao

## Objetivo

Este guia define regras de seguranca para evoluir a RR Infocell para a base do produto NextAssist sem comprometer a operacao atual.

## Regras obrigatorias

- Nunca mexer direto na producao da RR Infocell.
- Sempre trabalhar na branch `nextassist-saas` para fases SaaS/White Label.
- Sempre rodar build antes de commit.
- Fazer commits pequenos por fase.
- Nao alterar banco sem backup.
- Nao aplicar multiempresa direto em producao.
- Criar ambiente staging antes de migracao real.
- Preservar a tag `rr-infocell-v1-estavel`.

## Producao da RR Infocell

A RR Infocell e cliente piloto, mas tambem e uma operacao real. Toda alteracao deve assumir que:

- Existem dados reais.
- Existem fluxos operacionais em uso.
- Impressao, OS, PDV, estoque e financeiro podem afetar atendimento e caixa.

Alteracoes nessas areas exigem revisao especifica.

## Branch e commits

Usar a branch:

```bash
nextassist-saas
```

Diretrizes:

- Um commit por fase ou por mudanca pequena.
- Evitar refatoracoes amplas.
- Evitar misturar documentacao, regra de negocio e migracao no mesmo commit.
- Descrever claramente o objetivo da mudanca.

## Build obrigatorio

Antes de commit, rodar:

```bash
cd frontend
npm run build
```

Quando houver mudanca TypeScript relevante, rodar tambem:

```bash
npx tsc --noEmit --project tsconfig.app.json
```

## Banco de dados

Nao alterar banco sem:

- Backup.
- Plano de migracao.
- Ambiente de teste.
- Validacao dos scripts.
- Plano de rollback.

Mudancas de banco devem ser tratadas como fase propria.

## Multiempresa

Multiempresa nao deve ser aplicado diretamente em producao.

Antes disso, e necessario:

- Definir `tenantId` ou `empresaId`.
- Mapear colecoes atuais.
- Mapear relacoes entre entidades.
- Criar scripts de migracao.
- Testar em staging.
- Validar com copia controlada dos dados.

## Staging

Antes de migracao real, criar um ambiente staging com:

- Frontend separado.
- Backend separado.
- Banco separado.
- Variaveis de ambiente separadas.
- Dados de teste ou copia controlada.

Esse ambiente deve ser usado para validar multiempresa, billing, White Label e migracoes.

## Tag estavel

Preservar a tag:

```bash
rr-infocell-v1-estavel
```

Essa tag representa a base estavel antes da evolucao SaaS e deve ser mantida como referencia para comparacao, rollback conceitual e auditoria tecnica.

## Checklist antes de fases criticas

Antes de qualquer fase que toque dados, regras de negocio ou producao:

- Confirmar branch correta.
- Confirmar backup.
- Confirmar ambiente de teste.
- Confirmar plano de rollback.
- Rodar build.
- Revisar diff.
- Validar manualmente os fluxos principais.

Fluxos principais:

- Login.
- Ordem de servico.
- Estoque.
- Orcamento.
- PDV.
- Impressao.
- Financeiro.
- WhatsApp.
