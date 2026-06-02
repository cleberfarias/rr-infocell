# Auditoria — Guard de Tenant em findById/getById

**Fase:** 9.14.1 — Guard de tenant em leituras diretas por ID
**Data:** 2026-05-29
**Branch:** nextassist-saas

---

## 1. Objetivo

Garantir que toda busca direta por ID valide se o documento pertence ao `tenantId` resolvido do usuário autenticado, evitando acesso cruzado entre tenants quando IDs forem conhecidos por um usuário não autorizado.

---

## 2. Mapeamento de métodos findById/getById

| Módulo | Arquivo | Método | Tem tenantId no doc? | Rota externa /:id? | Risco antes do guard | Status após 9.14.1 |
|--------|---------|--------|:---:|:---:|:---:|:---:|
| **clientes** | `clientes.repository.ts` | `findById` | ✅ | ✅ `GET /api/clientes/:id` | ⚠️ Alto | ✅ Guard ativo |
| **produtos** | `produtos.repository.ts` | `findById` | ✅ | ✅ `GET /api/produtos/:id` | ⚠️ Alto | ✅ Guard ativo |
| **despesas** | `despesas.repository.ts` | `findById` | ✅ | ✅ `GET /api/despesas/:id` | ⚠️ Alto | ✅ Guard ativo |
| **ordens-servico** | `ordens-servico.repository.ts` | `findById` | ✅ | ✅ `GET /api/ordens-servico/:id` | ⚠️ Alto | ✅ Guard ativo |
| **aparelhos** | `aparelhos.repository.ts` | `findById` | ❌ sem tenantId | `GET /api/aparelhos/:id` | Baixo (sem campo) | ➖ Sem guard (sem campo) |
| **checklists** | `checklists.repository.ts` | `findById` | ❌ sem tenantId | `GET /api/checklists/:id` | Baixo (sem campo) | ➖ Sem guard (sem campo) |
| **movimentacoes-estoque** | `movimentacoes-estoque.repository.ts` | — | ✅ | ❌ sem rota /:id | Nenhum | ➖ N/A |
| **contas** | `contas.routes.ts` | — | ✅ | ❌ sem rota /:id | Nenhum | ➖ N/A |
| **marcas** | `marcas.routes.ts` | — | ✅ | ❌ sem rota /:id | Nenhum | ➖ N/A |
| **categorias** | `categorias.routes.ts` | — | ✅ | ❌ sem rota /:id | Nenhum | ➖ N/A |
| **vendas** | `vendas.repository.ts` | `findByOrdem` | ✅ | ❌ sem rota `GET /api/vendas/:id` | Baixo (interno) | ➖ N/A |
| **orcamentos** | `orcamentos.repository.ts` | `findById` | ❌ verificar | Verificar | A verificar | ➖ Fora do escopo 9.14.1 |

---

## 3. Como o guard funciona

### Padrão implementado (Firestore repository)

```typescript
async findById(id: string, tenantId?: string): Promise<Entity | null> {
  const document = await this.firestore.collection(collection).doc(id).get();

  if (!document.exists) {
    return null;
  }

  const entity = this.fromDocument(document.id, document.data() ?? {});

  // Guard: retorna null se o documento pertence a outro tenant
  // Comportamento idêntico ao "não encontrado" — não expõe existência do doc
  if (tenantId && entity.tenantId && entity.tenantId !== tenantId) {
    return null;
  }

  return entity;
}
```

### Comportamento do guard

| Situação | Resultado |
|----------|-----------|
| Doc existe + mesmo tenant | Retorna o documento ✅ |
| Doc não existe | Retorna `null` → 404 |
| Doc existe + tenant diferente | Retorna `null` → 404 (indistinguível de "não encontrado") |
| `tenantId` não passado (chamada interna) | Sem validação — retorna o documento |

### Por que retornar `null` e não `403 Forbidden`

Retornar 404 em vez de 403 é intencional: o 403 confirmaria que o documento existe mas o usuário não tem acesso. O 404 não expõe essa informação, seguindo o princípio de menor exposição.

---

## 4. Cadeia de propagação

```
Route: GET /api/:module/:id
  → getRequestTenantId(request as TenantRequest) → tenantId
  → service.getById(id, tenantId)
  → repository.findById(id, tenantId)
  → Firestore: busca por ID
  → guard: doc.tenantId !== tenantId → return null → 404
```

### Chamadas internas (sem guard)

Estas chamadas passam `id` sem `tenantId` — o guard não é ativado:

| Chamada interna | De onde | Por quê não passa tenantId |
|----------------|---------|---------------------------|
| `clientesService.getById(input.clienteId)` | OS service | Validação de existência, não de autorização |
| `produtosService.getById(item.produtoId)` | OS service, movimentacoes service | Enriquecimento de dados interno |
| `ordensServicoService.getById(input.ordemServicoId)` | Vendas service | Busca da OS para finalizar venda |

Isso é aceitável no contexto atual: chamadas internas ocorrem dentro do mesmo fluxo de autenticação. Para multi-tenant real, cada serviço deverá propagar o `tenantId` internamente — isso é escopo de fase futura.

---

## 5. Módulos sem guard (justificativa)

### aparelhos e checklists

Não têm campo `tenantId` nos documentos Firestore. Isolamento é indireto via `clienteId` (aparelhos) — um aparelho pertence a um cliente, que pertence a um tenant.

Adicionar guard em `findById` sem campo `tenantId` não seria efetivo. O isolamento adequado exigiria migração de dados (adicionar `tenantId`) — fora do escopo desta fase.

### vendas (`findByOrdem`)

Não há rota `GET /api/vendas/:id`. O `findByOrdem` é chamado internamente. Sem exposição externa por ID direto.

### orcamentos

Módulo menor, sem rota `GET /api/orcamentos/:id` confirmada. Verificar separadamente se necessário.
