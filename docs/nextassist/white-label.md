# Estrategia White Label

## Visao geral

NextAssist e o produto base. RR Infocell e o primeiro cliente/tenant e funciona como piloto real para a evolucao SaaS + White Label.

A estrategia e separar gradualmente identidade do produto, identidade do cliente e regras de negocio, sem quebrar a operacao atual da RR Infocell.

## Produto base

O produto base e:

- Nome comercial: NextAssist
- Publico-alvo: assistencias tecnicas
- Modelo futuro: SaaS com possibilidade de White Label

O nome NextAssist deve representar a plataforma, nao necessariamente o nome exibido para todos os clientes finais.

## Tenant piloto

O tenant piloto e:

- Nome: RR Infocell
- Papel: cliente piloto e origem operacional do sistema
- Plano atual: Premium

A RR Infocell deve continuar visualmente funcional e reconhecivel durante toda a transicao.

## Configuracao atual

Nesta etapa, nome, logo, cores e plano vem de `frontend/src/config/tenantConfig.ts`.

Campos principais:

- `productName`
- `systemName`
- `tenantName`
- `logo`
- `primaryColor`
- `secondaryColor`
- `plan`
- `whiteLabel`
- `showPoweredBy`

Essa configuracao e estatica, versionada no codigo e usada como preparacao para uma configuracao real por tenant.

## Configuracao por banco

As configuracoes editaveis vem do documento `tenants/{tenantId}` e possuem fallback estatico para preservar a operacao quando o documento ainda nao existe.

Possiveis dados futuros:

- Nome publico do sistema.
- Nome da empresa.
- Logo.
- Cores.
- Plano contratado.
- Status da assinatura.
- Dominio personalizado.
- Parametros de impressao.

## Limites da etapa atual

Nesta etapa, administradores podem editar a identidade e os dados operacionais do proprio tenant. Plano, assinatura, produto base e permissoes nao sao editaveis pela tela. O isolamento continua baseado no `tenantId` resolvido pelo backend.

## Diretriz de seguranca

Toda substituicao de textos fixos por configuracao White Label deve ser avaliada por contexto.

Exemplos sensiveis:

- Impressao.
- Recibos.
- Garantias.
- Relatorios financeiros.
- Dados fiscais.
- Dados historicos.

Nesses casos, a marca RR Infocell pode fazer parte de documento operacional ou legal e nao deve ser trocada sem revisao especifica.
