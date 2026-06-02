# Planos e Modulos

## Objetivo

Este documento descreve a matriz inicial de planos do NextAssist. A configuracao tecnica atual fica em `frontend/src/config/planModules.ts`.

O tenant RR Infocell usa atualmente o plano `premium`, portanto deve continuar com todos os recursos atuais disponiveis durante a fase piloto.

## Modulos

Os modulos definidos inicialmente sao:

- Dashboard
- Clientes
- Ordens de Servico
- Estoque
- Financeiro
- Relatorios
- Mensagens Automaticas
- White Label
- Multiusuarios
- Multiunidades

## Plano Basico

Plano para operacoes pequenas que precisam controlar atendimento essencial.

Modulos previstos:

| Modulo | Disponivel |
| --- | --- |
| Dashboard | Sim |
| Clientes | Sim |
| Ordens de Servico | Sim |
| Estoque | Nao |
| Financeiro | Nao |
| Relatorios | Nao |
| Mensagens Automaticas | Nao |
| White Label | Nao |
| Multiusuarios | Nao |
| Multiunidades | Nao |

## Plano Profissional

Plano para assistencias que precisam operar atendimento, estoque, financeiro e acompanhamento gerencial.

Modulos previstos:

| Modulo | Disponivel |
| --- | --- |
| Dashboard | Sim |
| Clientes | Sim |
| Ordens de Servico | Sim |
| Estoque | Sim |
| Financeiro | Sim |
| Relatorios | Sim |
| Mensagens Automaticas | Nao |
| White Label | Nao |
| Multiusuarios | Sim |
| Multiunidades | Nao |

## Plano Premium

Plano completo para operacoes mais maduras, incluindo identidade White Label e expansao futura.

Modulos previstos:

| Modulo | Disponivel |
| --- | --- |
| Dashboard | Sim |
| Clientes | Sim |
| Ordens de Servico | Sim |
| Estoque | Sim |
| Financeiro | Sim |
| Relatorios | Sim |
| Mensagens Automaticas | Sim |
| White Label | Sim |
| Multiusuarios | Sim |
| Multiunidades | Sim |

## Estado atual do cliente piloto

A RR Infocell e o cliente piloto do NextAssist e permanece configurada com:

- `tenantName`: `RR Infocell`
- `productName`: `NextAssist`
- `plan`: `premium`

Como o plano atual e `premium`, nenhum menu ou fluxo existente deve ser removido para a RR Infocell nas fases iniciais.

## Diretriz para futuras alteracoes

Ao conectar modulos a menus, rotas ou regras de negocio:

- Comecar apenas pela navegacao.
- Nao bloquear rotas sem decisao explicita.
- Se houver duvida no mapeamento de uma tela para um modulo, manter a tela visivel.
- Validar sempre que o plano `premium` preserva a experiencia atual da RR Infocell.
