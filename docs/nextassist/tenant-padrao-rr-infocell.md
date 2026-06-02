# Tenant Padrao RR Infocell

## 1. Objetivo

Este documento define o desenho tecnico do tenant padrao inicial do NextAssist: `rr-infocell`.

O objetivo e orientar uma futura implementacao multiempresa com seguranca, associando os dados atuais da RR Infocell a um tenant inicial sem acoplar o produto NextAssist exclusivamente a esse cliente piloto.

Este documento nao representa migration, nao altera banco e nao cria codigo funcional.

## 2. Identidade do tenant padrao

Definicao conceitual do tenant inicial:

| Campo | Valor |
| --- | --- |
| `tenantId` | `rr-infocell` |
| `slug` | `rr-infocell` |
| `tenantName` | `RR Infocell` |
| `productName` | `NextAssist` |
| `systemName` | `RR Infocell` |
| `plan` | `premium` |
| `whiteLabel` | `true` |
| `status` | `active` |

Esse tenant deve representar a operacao atual da RR Infocell quando a arquitetura multiempresa for implementada.

## 3. Branding inicial

O branding inicial deve refletir a experiencia atual da RR Infocell.

Itens de branding:

- Logo atual da RR Infocell: `frontend/src/assets/logo-rrinfocell.png`
- Cores atuais: valores definidos em `frontend/src/config/tenantConfig.ts`
- `primaryColor`: cor primaria atual do tenant
- `secondaryColor`: cor secundaria atual do tenant
- `showPoweredBy`: conforme configuracao atual
- Nome exibido no sistema: `RR Infocell`

Comportamento esperado no White Label:

- A RR Infocell continua visualmente igual para o cliente piloto.
- O produto base permanece identificado internamente como NextAssist.
- Nome, logo, cores e plano devem vir de configuracao do tenant.
- Textos e documentos sensiveis devem ser avaliados antes de qualquer substituicao automatica.

## 4. Relacao entre NextAssist e RR Infocell

NextAssist e o produto base.

RR Infocell e o primeiro tenant/cliente piloto.

Diretrizes:

- O codigo nao deve ficar acoplado exclusivamente a RR Infocell.
- Configuracoes especificas devem vir de tenant/configuracao.
- Regras de negocio atuais da RR Infocell devem ser preservadas durante a transicao.
- Novas areas devem preferir helpers/contextos de tenant em vez de hardcode de marca.
- Dados historicos e documentos devem ser tratados com cuidado, pois podem exigir preservacao do nome original.

## 5. Modelo conceitual de tenant

Estrutura futura possivel para representar um tenant.

Exemplo conceitual, nao e migration real:

```json
{
  "id": "rr-infocell",
  "slug": "rr-infocell",
  "name": "RR Infocell",
  "status": "active",
  "plan": "premium",
  "branding": {
    "productName": "NextAssist",
    "systemName": "RR Infocell",
    "tenantName": "RR Infocell",
    "logo": "logo-rrinfocell.png",
    "primaryColor": "205 95% 55%",
    "secondaryColor": "220 12% 14%",
    "whiteLabel": true,
    "showPoweredBy": true
  },
  "modules": {
    "dashboard": true,
    "clientes": true,
    "ordensServico": true,
    "estoque": true,
    "financeiro": true,
    "relatorios": true,
    "mensagensAutomaticas": true,
    "whiteLabel": true,
    "multiUsuarios": true,
    "multiUnidades": true
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Esse modelo deve ser revisado antes de qualquer implementacao real.

## 6. Regras para dados existentes

Quando a migracao multiempresa for executada em ambiente controlado, todos os dados atuais do sistema deverao receber o `tenantId` `rr-infocell`.

Entidades candidatas:

- clientes
- produtos
- ordens de servico
- eventos de ordens de servico
- estoque
- movimentacoes de estoque
- financeiro
- contas
- despesas
- orcamentos
- vendas/PDV
- usuarios
- mensagens/WhatsApp
- checklists
- aparelhos
- categorias
- marcas
- fornecedores
- terceirizados
- relatorios/configuracoes

Regra geral:

- Registro existente da operacao atual deve pertencer ao tenant `rr-infocell`.
- Registro sem tenant em ambiente multiempresa deve ser tratado como dado pendente de migracao.
- Nenhuma query futura deve assumir que dado sem tenant e seguro.

## 7. Estrategia futura de criacao do tenant

Ordem segura sugerida:

1. Validar backup completo do banco.
2. Validar ambiente staging separado.
3. Criar registro conceitual do tenant `rr-infocell` em staging.
4. Aplicar `tenantId: "rr-infocell"` nos dados existentes em staging.
5. Ajustar queries em staging para filtrar por tenant.
6. Testar criacao, leitura, edicao e exclusao com tenant.
7. Testar isolamento com pelo menos um segundo tenant de teste.
8. Validar relatorios, impressao, estoque, financeiro, OS e WhatsApp.
9. Revisar plano de rollback.
10. So depois considerar uma janela controlada de producao.

## 8. Regras de seguranca

Regras obrigatorias para a arquitetura futura:

- Nenhum dado sem `tenantId` deve ser considerado seguro em ambiente multiempresa.
- Nenhum usuario deve acessar tenant diferente do seu.
- Backend deve validar `tenantId`.
- Frontend pode exibir tenant atual, mas nao deve ser fonte unica de seguranca.
- Relatorios sempre precisam filtrar por `tenantId`.
- Updates e deletes devem validar que o registro pertence ao tenant atual.
- Roles devem ser avaliadas no contexto do tenant.
- Regras de banco e Storage devem impedir acesso fora do tenant.

## 9. Riscos

### Acoplamento de codigo ao tenant RR Infocell

Risco de manter nomes, logos ou regras especificas hardcoded, dificultando novos tenants.

### Migration parcial

Risco de algumas colecoes receberem `tenantId` e outras nao, criando comportamento inconsistente.

### Registros sem tenantId

Em ambiente multiempresa, registros sem tenant podem aparecer em queries indevidas ou ficar inacessiveis.

### Relatorios misturados

Agregacoes sem filtro por tenant podem misturar dados financeiros, vendas, estoque e OS.

### Usuarios sem vinculo com tenant

Usuario autenticado sem membership claro pode acessar dados indevidos ou perder acesso legitimo.

### Permissoes sem contexto de tenant

Role global como `admin` nao deve ser suficiente em SaaS multiempresa. A role precisa estar vinculada ao tenant.

## 10. Checklist antes de implementar

Antes de qualquer implementacao real:

- Tenant padrao definido.
- Plano `premium` confirmado.
- Branding validado.
- Entidades mapeadas.
- Ambiente staging pronto.
- Backup completo pronto.
- Restore do backup validado.
- Rollback planejado.
- Testes manuais definidos.
- Responsaveis pela validacao definidos.
- Modelo de membership definido.
- Regras de permissao por tenant definidas.
- Queries prioritarias mapeadas.
- Relatorios prioritarios mapeados.
- Impressao e documentos revisados.
- WhatsApp/mensagens revisados.

## 11. Criterios para avancar

So deve avancar para codigo real quando:

- ambiente staging existir;
- backup estiver validado;
- plano de rollback existir;
- entidades prioritarias estiverem mapeadas;
- testes de isolamento estiverem definidos;
- modelo de tenant estiver aprovado;
- modelo de usuario/tenant estiver aprovado;
- regras de permissao estiverem desenhadas;
- validacao manual da RR Infocell estiver planejada.

Sem esses criterios, a evolucao deve permanecer em documentacao, types, helpers e preparacao sem persistencia.
