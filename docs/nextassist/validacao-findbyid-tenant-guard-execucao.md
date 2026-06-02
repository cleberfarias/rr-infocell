# Validação — Execução do Guard findById/getById

**Fase:** 9.14.2 — Validação do guard de tenant em leituras diretas por ID
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** 🔲 Aguardando execução dos testes

---

## 1. Objetivo

Confirmar que o guard implementado na Fase 9.14.1 está funcionando corretamente:

- Documento do **mesmo tenant** → retorna normalmente (200)
- Documento de **outro tenant** → retorna 404 (sem revelar existência)
- **Fluxos internos** (OS, venda, movimentações) → não impactados
- **Create/update/listagens** → sem regressão

---

## 2. Módulos protegidos

| Módulo | Rota protegida | Guard ativo |
|--------|---------------|:-----------:|
| clientes | `GET /api/clientes/:id` | ✅ |
| produtos | `GET /api/produtos/:id` | ✅ |
| despesas | `GET /api/despesas/:id` | ✅ |
| ordens-servico | `GET /api/ordens-servico/:id` | ✅ |

---

## 3. Checklist por módulo

### Como simular documento de outro tenant

Para testar o acesso cruzado sem criar um segundo usuário real:

1. No **Firebase Console → Firestore**, criar um documento temporário na coleção do módulo com `tenantId: "tenant-teste"`
2. Fazer `GET /api/{modulo}/{id-do-doc-criado}` autenticado como usuário `rr-infocell`
3. Resultado esperado: **404 Not Found**
4. Remover o documento após o teste

---

### 3.1 Clientes

**Acesso legítimo (mesmo tenant):**
- [ ] `GET /api/clientes/:id` com ID de cliente `rr-infocell` → status 200
- [ ] Resposta contém `nome`, `telefone`, `tenantId: "rr-infocell"` ou `tenantId` ausente (legacy)
- [ ] Nenhum warning `[resolveTenant]` no console

**Acesso cruzado (outro tenant):**
- [ ] Criar doc temporário em `clientes/{id-teste}` com `tenantId: "tenant-teste"`
- [ ] `GET /api/clientes/{id-teste}` como usuário rr-infocell → **404 Not Found**
- [ ] Resposta de erro não revela existência do documento
- [ ] Nenhum erro 500

**Regressão:**
- [ ] `GET /api/clientes` (listagem) retorna 200
- [ ] `POST /api/clientes` cria cliente normalmente
- [ ] `PUT /api/clientes/:id` atualiza cliente normalmente

---

### 3.2 Produtos

**Acesso legítimo:**
- [ ] `GET /api/produtos/:id` com ID de produto rr-infocell → status 200
- [ ] Resposta contém `nome`, `sku`, `estoqueAtual`, `tenantId`
- [ ] Nenhum warning no console

**Acesso cruzado:**
- [ ] Criar doc temporário em `produtos/{id-teste}` com `tenantId: "tenant-teste"`
- [ ] `GET /api/produtos/{id-teste}` como usuário rr-infocell → **404 Not Found**
- [ ] Nenhum erro 500

**Regressão:**
- [ ] `GET /api/produtos` (listagem) retorna 200
- [ ] `POST /api/produtos` cria produto normalmente
- [ ] `PUT /api/produtos/:id` atualiza produto normalmente
- [ ] Criar OS com peça → produto encontrado internamente (busca sem guard)

---

### 3.3 Despesas

**Acesso legítimo:**
- [ ] `GET /api/despesas/:id` com ID de despesa rr-infocell → status 200
- [ ] Resposta contém `descricao`, `valor`, `pago`, `tenantId`
- [ ] Nenhum warning no console

**Acesso cruzado:**
- [ ] Criar doc temporário em `despesas/{id-teste}` com `tenantId: "tenant-teste"`
- [ ] `GET /api/despesas/{id-teste}` como usuário rr-infocell → **404 Not Found**
- [ ] Nenhum erro 500

**Regressão:**
- [ ] `GET /api/despesas` (listagem) retorna 200
- [ ] `POST /api/despesas` cria despesa normalmente
- [ ] `PUT /api/despesas/:id` atualiza despesa normalmente (pagoEm, pago, recorrente preservados)

---

### 3.4 Ordens de Serviço

**Acesso legítimo:**
- [ ] `GET /api/ordens-servico/:id` com ID de OS rr-infocell → status 200
- [ ] Resposta contém `numero`, `status`, `clienteId`, `tenantId`
- [ ] Todos os campos da OS retornados (pecasUsadas, valorTotal, garantia, senha, etc.)
- [ ] Nenhum warning no console

**Acesso cruzado:**
- [ ] Criar doc temporário em `ordensServico/{id-teste}` com `tenantId: "tenant-teste"`
- [ ] `GET /api/ordens-servico/{id-teste}` como usuário rr-infocell → **404 Not Found**
- [ ] Nenhum erro 500

**Regressão:**
- [ ] `GET /api/ordens-servico` (listagem) retorna 200
- [ ] `POST /api/ordens-servico` cria OS normalmente
- [ ] `PUT /api/ordens-servico/:id` edita OS normalmente
- [ ] Criar OS com peça → movimentação automática criada
- [ ] Finalizar venda via OS → OS marcada como entregue

---

## 4. Validação de fluxos internos críticos

Esses fluxos usam `getById` internamente **sem tenantId** — não devem ser afetados pelo guard:

| Fluxo | Chamada interna | Esperado |
|-------|----------------|---------|
| Criar OS → valida cliente | `clientesService.getById(clienteId)` | Cliente encontrado, OS criada |
| Criar OS → enriquece peças | `produtosService.getById(produtoId)` | Produto encontrado, peça enriquecida |
| Movimentação → valida produto | `produtosService.getById(produtoId)` | Produto encontrado, estoque baixado |
| Venda via OS → busca OS | `ordensServicoService.getById(ordemId)` | OS encontrada, venda criada |

- [ ] Criar OS com cliente existente → 201 (cliente encontrado internamente)
- [ ] Criar OS com peça → 201 (produto encontrado internamente, estoque baixado)
- [ ] Finalizar venda via OS → 201 (OS encontrada internamente)
- [ ] `POST /api/movimentacoes-estoque` com produto existente → 201

---

## 5. Critérios de aprovação

A Fase 9.14.1 é validada quando **todos** os itens abaixo estiverem confirmados:

| Critério | Status |
|----------|--------|
| Documento do mesmo tenant retorna 200 (clientes) | 🔲 |
| Documento do mesmo tenant retorna 200 (produtos) | 🔲 |
| Documento do mesmo tenant retorna 200 (despesas) | 🔲 |
| Documento do mesmo tenant retorna 200 (ordens-servico) | 🔲 |
| Documento de outro tenant retorna 404 (clientes) | 🔲 |
| Documento de outro tenant retorna 404 (produtos) | 🔲 |
| Documento de outro tenant retorna 404 (despesas) | 🔲 |
| Documento de outro tenant retorna 404 (ordens-servico) | 🔲 |
| Fluxos internos (OS, venda, movimentação) funcionando | 🔲 |
| Listagens e create/update sem regressão | 🔲 |
| Nenhum erro 500 | 🔲 |

---

## 6. Critérios de bloqueio

Não avançar para 9.14.3 se:

| Bloqueio | Verificar |
|---------|-----------|
| Documento legítimo retorna 404 indevido | `entity.tenantId` pode estar ausente em docs antigos — o guard só bloqueia se ambos `tenantId` e `entity.tenantId` estiverem definidos |
| Documento de outro tenant ainda é retornado | Guard não foi ativado; verificar se `tenantId` chegou ao `findById` |
| Criação de OS quebra (cliente não encontrado) | Chamada interna sem `tenantId` — não deve ativar guard |
| Erro 500 em qualquer rota | Verificar logs do backend |

---

## 7. Nota sobre documentos sem tenantId (legados)

O guard só bloqueia quando **ambos** estão presentes:

```typescript
if (tenantId && entity.tenantId && entity.tenantId !== tenantId) return null;
```

Documentos migrados que porventura não tenham `tenantId` (edge case pós-Fase 8) **não são bloqueados** pelo guard. Isso é intencional: compatibilidade com dados legados durante transição. Ao ativar segundo tenant real, todos os documentos devem ter `tenantId` — confirmado pela migração da Fase 8.

---

## 8. Próxima fase sugerida

**Fase 9.14.3 — Auditoria de vínculos cruzados entre entidades**

Objetivo: mapear onde payloads aceitam IDs relacionados (`clienteId`, `produtoId`, `ordemServicoId`, `aparelhoId`) e identificar onde é necessário validar que "esse ID pertence ao mesmo tenant do usuário autenticado" — antes de criar o segundo tenant fake.

Escopo da auditoria:
- OS: `clienteId`, `aparelhoId`, `produtoId` (peças)
- Venda: `ordemServicoId`, `clienteId`, `produtoId`
- Movimentação: `produtoId`
- Aparelho: `clienteId`
- Checklist/orçamento: vínculos a mapear
