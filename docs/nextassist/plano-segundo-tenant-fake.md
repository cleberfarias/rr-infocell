# Plano — Segundo Tenant Fake em Ambiente Controlado

**Fase:** 9.14 — Plano para teste de isolamento entre tenants
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 📋 Plano definido — aguardando aprovação antes de qualquer execução

---

## 1. Objetivo

Este plano define como testar o isolamento real entre dois tenants antes de liberar o sistema para múltiplos clientes reais.

O objetivo não é ativar um segundo cliente — é criar um ambiente controlado que comprove que um usuário do tenant A nunca enxerga dados do tenant B, e vice-versa. Só após essa validação o sistema poderá receber um segundo tenant real com segurança.

---

## 2. Estado atual

| Campo | Valor |
|-------|-------|
| Tenant ativo | `rr-infocell` |
| Total de usuários | 4 |
| Todos apontando para `rr-infocell` | ✅ |
| Todos os módulos com tenant dinâmico | ✅ (Fases 9.6–9.12) |
| Dados antigos migrados | ✅ (Fase 8) |
| Validação 9.13.1 aprovada | ✅ |
| Fallback `DEFAULT_TENANT_ID` ativo | ✅ (transitório — será removido antes do tenant real) |

---

## 3. Tenant fake proposto

```json
{
  "id": "nextassist-demo",
  "slug": "nextassist-demo",
  "nome": "NextAssist Demo",
  "productName": "NextAssist",
  "plano": "premium",
  "whiteLabel": true,
  "status": "active"
}
```

O tenant `nextassist-demo` será usado exclusivamente para validar isolamento. Não representará um cliente real. Poderá ser removido após a validação.

**Alternativa:** usar `rr-teste` se preferir manter nomenclatura consistente com o domínio `rr-infocell`.

---

## 4. Usuário de teste

Um único usuário controlado será criado para representar o tenant demo. Não criar ainda — apenas documentar o perfil.

| Campo | Valor planejado |
|-------|----------------|
| Email | `demo@nextassist-demo.internal` (ou similar) |
| UID | gerado pelo Firebase Auth no momento da criação |
| Display name | `Usuário Demo` |
| Role (custom claim) | `admin` |
| `tenantId` em `usuarios/{uid}` | `nextassist-demo` |
| `status` em `usuarios/{uid}` | `ativo` |
| Ambiente | staging ou produção isolada |

**Atenção:** criar o usuário em produção significa que ele terá acesso real ao Firebase Auth. Avaliar se o ambiente de staging é preferível para este teste.

---

## 5. Dados mínimos para o tenant fake

Para validar isolamento completo, o tenant `nextassist-demo` precisará de dados em cada coleção. Estes dados serão criados via API (autenticado como usuário demo), não manualmente no Firestore.

| Entidade | Quantidade | Propósito |
|----------|-----------|-----------|
| Marca | 1 | Confirmar filtro por tenant em marcas |
| Categoria | 1 | Confirmar filtro por tenant em categorias |
| Cliente | 1 | Base para OS e venda |
| Produto | 1 | Base para movimentação e OS com peça |
| Despesa | 1 | Confirmar isolamento financeiro |
| Conta | 1 | Confirmar isolamento financeiro |
| Movimentação manual | 1 | Confirmar filtro por tenant em estoque |
| OS sem peça | 1 | Confirmar isolamento de OS |
| OS com peça | 1 | Confirmar baixa automática de estoque no tenant correto |
| Venda direta | 1 | Confirmar isolamento de venda |
| Venda via OS | 1 (opcional) | Confirmar fluxo completo OS → Venda no tenant demo |

---

## 6. Critérios de isolamento

### Usuário `rr-infocell` não deve ver dados de `nextassist-demo`

| Verificação | Endpoint | Resultado esperado |
|-------------|---------|-------------------|
| Listagem de marcas | `GET /api/marcas` | Não retorna marcas do `nextassist-demo` |
| Listagem de clientes | `GET /api/clientes` | Não retorna clientes do `nextassist-demo` |
| Listagem de produtos | `GET /api/produtos` | Não retorna produtos do `nextassist-demo` |
| Listagem de OS | `GET /api/ordens-servico` | Não retorna OS do `nextassist-demo` |
| Listagem de vendas | `GET /api/vendas` | Não retorna vendas do `nextassist-demo` |
| Listagem de despesas | `GET /api/despesas` | Não retorna despesas do `nextassist-demo` |

### Usuário `nextassist-demo` não deve ver dados de `rr-infocell`

| Verificação | Resultado esperado |
|-------------|-------------------|
| Todas as listagens | Zero resultados de `rr-infocell` |
| Contagem de itens | Apenas os dados criados para `nextassist-demo` |
| Acesso a OS de outro tenant via ID | `404 Not Found` (findById não filtra por tenant — avaliar se precisa de guard adicional) |

### Ponto de atenção: `findById` e `getById`

Os métodos `findById` no Firestore buscam por ID direto, sem filtro de tenant. Se um usuário do `nextassist-demo` souber o ID de uma OS do `rr-infocell`, poderá acessá-la via `GET /api/ordens-servico/:id`.

**Decisão a tomar antes da 9.15:** adicionar validação de `tenantId` no `findById` ou aceitar o risco (por ora, IDs são UUIDs opacos e não há listagem cross-tenant).

---

## 7. Plano de execução futuro (Fase 9.15)

A execução seguirá esta ordem, cada passo com aprovação explícita antes do próximo:

```
Passo 1 — Criar tenant fake
  Script: criar documento em coleção de tenants ou apenas definir o tenantId
  Validar: tenantId "nextassist-demo" não colide com dados existentes

Passo 2 — Criar usuário fake no Firebase Auth
  Ferramenta: set-user-role.ts com --email --password --role admin
  Validar: usuário criado e custom claim role=admin atribuída

Passo 3 — Criar usuarios/{uid} para o usuário demo
  Script: create-user-tenant-documents.ts adaptado, ou criação direta
  tenantId: "nextassist-demo"
  status: "ativo"
  Validar: dry-run confirma usuário demo em "manter-documento"

Passo 4 — Criar dados mínimos (via API autenticada como usuário demo)
  Login como usuário demo no frontend
  Criar 1 marca, 1 categoria, 1 cliente, 1 produto, 1 despesa, 1 conta
  Criar 1 OS sem peça, 1 OS com peça
  Criar 1 venda direta
  Validar: Firestore mostra tenantId: "nextassist-demo" em cada documento

Passo 5 — Validar isolamento como usuário rr-infocell
  Login como usuário rr-infocell
  Listar marcas, categorias, clientes, produtos, OS, vendas
  Confirmar: zero dados do nextassist-demo aparecem

Passo 6 — Validar isolamento como usuário nextassist-demo
  Login como usuário demo
  Listar todos os módulos
  Confirmar: zero dados do rr-infocell aparecem

Passo 7 — Testar fluxo crítico no tenant demo
  OS + estoque + movimentação automática + venda
  Confirmar: todos os documentos têm tenantId: "nextassist-demo"

Passo 8 — Registrar resultado e planejar remoção
  Documentar os achados
  Se aprovado: definir quando remover o tenant demo ou promovê-lo a real
  Se reprovado: identificar o ponto de vazamento e corrigir

Passo 9 — Remover o fallback DEFAULT_TENANT_ID
  Só após aprovação do isolamento
  Alterar resolveTenant para retornar 403 se usuarios/{uid} não existir
  Garantir que todos os novos usuários recebam usuarios/{uid} automaticamente
```

---

## 8. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:---:|:---:|-----------|
| Fallback `rr-infocell` mascarar usuário sem documento | Baixa | Alto | 4/4 usuários têm documento; auditoria confirmou |
| Usuário demo criado sem `usuarios/{uid}` | Média | Alto | Criar `usuarios/{uid}` antes de fazer o primeiro login |
| Dados criados com tenant errado (ex: usuário demo ainda sem doc) | Média | Alto | Executar dry-run antes de qualquer criação |
| `findById` não valida tenant — acesso cross-tenant por ID | Média | Médio | Avaliar guard de tenant em `findById` antes de tenant real |
| Relatórios/impressão sem validação visual | Baixa | Médio | Confirmar manualmente antes de 9.15 |
| Integração WhatsApp pode ignorar tenant | Médio | Médio | `automacoesAtendimentoService` não filtra por tenant; avaliar para múltiplos tenants |
| Automações dependentes de tenant no futuro | Baixa | Médio | Documentar como ponto de evolução pós-9.15 |
| Usuário demo esquecido em produção | Baixa | Baixo | Documentar processo de remoção antes de criar |

---

## 9. Critérios para avançar para 9.15

A Fase 9.15 (criação efetiva do tenant fake) só deve começar quando:

- [ ] Este plano aprovado por quem decide a arquitetura
- [ ] Tenant fake `nextassist-demo` aprovado (ou alternativa definida)
- [ ] Usuário de teste definido (email, role, ambiente)
- [ ] Decisão tomada sobre `findById` sem filtro de tenant
- [ ] Ambiente definido (produção ou staging separado)
- [ ] Processo de remoção do tenant demo documentado
- [ ] Dados mínimos de teste aprovados
- [ ] Confirmação de que o fallback `DEFAULT_TENANT_ID` será removido após validação

---

## 10. Próxima fase sugerida

**Fase 9.15 — Criar tenant fake e usuário de teste com script controlado**

Entregas esperadas:
- Script para criar `usuarios/{uid}` com `tenantId: "nextassist-demo"` para o usuário de teste
- Dry-run antes de qualquer criação
- Relatório de confirmação pós-criação
- Checklist de validação de isolamento (executado manualmente no frontend)
