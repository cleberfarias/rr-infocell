# Validação — Guard de Tenant em findById/getById

**Fase:** 9.14.1
**Data:** 2026-05-29
**Branch:** nextassist-saas

---

## 1. Módulos protegidos

| Módulo | Rota protegida |
|--------|---------------|
| clientes | `GET /api/clientes/:id` |
| produtos | `GET /api/produtos/:id` |
| despesas | `GET /api/despesas/:id` |
| ordens-servico | `GET /api/ordens-servico/:id` |

---

## 2. Checklist de validação

### Acesso legítimo (usuário rr-infocell acessa doc rr-infocell)

- [ ] `GET /api/clientes/:id` com ID de cliente rr-infocell → 200 com dados
- [ ] `GET /api/produtos/:id` com ID de produto rr-infocell → 200 com dados
- [ ] `GET /api/despesas/:id` com ID de despesa rr-infocell → 200 com dados
- [ ] `GET /api/ordens-servico/:id` com ID de OS rr-infocell → 200 com dados

### Acesso cruzado (usuário rr-infocell tenta acessar doc de outro tenant)

> Para testar, criar um documento com `tenantId: "tenant-teste"` diretamente no Firestore e tentar acessá-lo como usuário `rr-infocell`.

- [ ] `GET /api/clientes/:id-outro-tenant` → 404 (não expõe existência)
- [ ] `GET /api/produtos/:id-outro-tenant` → 404
- [ ] `GET /api/despesas/:id-outro-tenant` → 404
- [ ] `GET /api/ordens-servico/:id-outro-tenant` → 404

### Fluxos internos (sem tenantId passado — não devem ser afetados)

- [ ] Criar OS com cliente existente → cliente encontrado pelo service (busca interna sem guard)
- [ ] Criar OS com peça → produto encontrado pelo service (busca interna sem guard)
- [ ] Finalizar venda via OS → OS encontrada pelo service de vendas (busca interna sem guard)
- [ ] Listagens continuam funcionando (GET sem /:id)

### Regressão geral

- [ ] `GET /api/ordens-servico` lista OS normalmente
- [ ] `POST /api/ordens-servico` cria OS normalmente
- [ ] `PUT /api/ordens-servico/:id` edita OS normalmente
- [ ] Vendas, estoque e produtos funcionando
- [ ] Nenhum erro 500

---

## 3. Como testar o acesso cruzado manualmente

**Passo 1:** No Firebase Console, criar um documento de teste em `clientes/{id-teste}` com:
```json
{
  "nome": "Cliente Outro Tenant",
  "tenantId": "tenant-teste",
  "telefone": "(00) 00000-0000",
  "createdAt": "2026-05-29T00:00:00.000Z",
  "updatedAt": "2026-05-29T00:00:00.000Z"
}
```

**Passo 2:** Logar como usuário rr-infocell e acessar `GET /api/clientes/{id-teste}`.

**Esperado:** 404 Not Found.

**Passo 3:** Remover o documento de teste.

---

## 4. Critérios de aprovação

- [ ] Acesso legítimo retorna 200 para todos os módulos
- [ ] Acesso cruzado retorna 404 para todos os módulos
- [ ] Fluxos internos (OS, venda, estoque) funcionam sem alteração
- [ ] Build TypeScript passou sem erros
