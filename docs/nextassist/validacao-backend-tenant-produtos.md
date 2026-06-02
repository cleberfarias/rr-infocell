# Validacao Backend — Persistencia tenantId em Produtos (Fase 8.5)

## 1. O que foi alterado

O modulo `produtos` passou a persistir `tenantId` no Firestore, seguindo o mesmo padrao seguro aplicado em `clientes` na Fase 8.4.

### Arquivos alterados

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/produtos/produtos.types.ts` | Campo `tenantId?: string` adicionado ao tipo `Produto` |
| `backend/src/modules/produtos/produtos.repository.ts` | Import de `DEFAULT_TENANT_ID`; `create()` e `update()` persistem tenantId; `fromDocument()` le tenantId do Firestore |

**O que NAO foi alterado:**
- `produtos.schemas.ts` — schema Zod intocado; tenantId do frontend continua sendo descartado
- `produtos.service.ts` — sem alteracao (logica de estoque, custo, preco intocada)
- `produtos.routes.ts` — sem alteracao
- Listagem GET /produtos — continua global, sem filtro por tenant
- Logica de `estoqueAtual`, `estoqueMinimo`, `custo`, `precoVenda` — sem alteracao
- DELETE /produtos/:id — sem alteracao

---

## 2. Estrategia

Identica ao padrao de clientes:

```typescript
// create() — inject tenantId from backend
const produto: Produto = {
  id: document.id,
  ...input,              // tenantId NAO vem aqui (Zod strip)
  ativo: input.ativo ?? true,
  tenantId: DEFAULT_TENANT_ID,  // ← backend controla
  createdAt: timestamp,
  updatedAt: timestamp,
};

// update() — preserve existing tenantId
const produto: Produto = {
  ...current,
  ...input,
  ativo: input.ativo ?? current.ativo,
  tenantId: current.tenantId ?? DEFAULT_TENANT_ID,  // ← preserve ou define padrao
  updatedAt: now(),
};

// fromDocument() — read tenantId from Firestore
tenantId: data.tenantId ? String(data.tenantId) : undefined,
```

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Colecao `produtos` acessivel no Firestore | | |

---

### Criar produto novo via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/produtos com campos obrigatorios retorna 201 | | |
| Response contem `id`, `nome`, `estoqueAtual` | | |
| Response contem `tenantId: "rr-infocell"` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "TST-TENANT-001",
    "nome": "Produto Teste Tenant",
    "categoria": "peca",
    "estoqueAtual": 5,
    "estoqueMinimo": 2,
    "custo": 10,
    "precoVenda": 20
  }' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "sku": "TST-TENANT-001",
    "nome": "Produto Teste Tenant",
    "estoqueAtual": 5,
    "tenantId": "rr-infocell",
    ...
  }
}
```

---

### Verificar campo tenantId no Firestore

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `produtos` | | |
| Localizar o documento pelo `id` retornado na API | | |
| Documento contem campo `tenantId: "rr-infocell"` | | |
| `estoqueAtual`, `custo`, `precoVenda` com valores corretos | | |

**Estrutura esperada no Firestore:**
```
produtos/
  <id-gerado>/
    sku: "TST-TENANT-001"
    nome: "Produto Teste Tenant"
    estoqueAtual: 5
    estoqueMinimo: 2
    custo: 10
    precoVenda: 20
    tenantId: "rr-infocell"   ← novo campo
    createdAt: "2026-05-26T..."
    updatedAt: "2026-05-26T..."
```

---

### Editar produto via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| PUT /api/produtos/:id retorna 200 | | |
| Response contem `tenantId: "rr-infocell"` | | |
| `estoqueAtual`, `custo`, `precoVenda` permanecem corretos | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
# Substitua <id> pelo id retornado no POST anterior
curl -s -X PUT http://localhost:3333/api/produtos/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "TST-TENANT-001",
    "nome": "Produto Teste Tenant Editado",
    "categoria": "peca",
    "estoqueAtual": 5,
    "estoqueMinimo": 2,
    "custo": 10,
    "precoVenda": 20
  }' | jq '.data.tenantId'
```

---

### Verificar listagem continua funcionando

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/produtos retorna 200 | | |
| Listagem inclui o produto recem-criado | | |
| Listagem inclui produtos antigos (sem tenantId) | | |
| Nenhum erro 500 | | |

---

### Verificar que logica de estoque NAO foi afetada

| Item | Resultado | Observacao |
| --- | --- | --- |
| Criar OS com peca deste produto → baixa de estoque ocorre normalmente | | |
| Movimentacao manual de entrada → saldo aumentado corretamente | | |
| Movimentacao manual de saida → saldo reduzido corretamente | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagem filtrada por tenantId | Nao — GET /produtos retorna todos os produtos |
| Produtos existentes migrados | Nao — apenas novos registros tem tenantId |
| Logica de estoque alterada | Nao — `estoqueAtual` continua gerenciado pelo service |
| Baixa automatica via OS alterada | Nao — `ordens-servico.service.ts` intocado |
| Movimentacoes alteradas | Nao — `movimentacoes-estoque.repository.ts` intocado |
| Isolamento real entre empresas | Nao — ainda e um unico tenant "rr-infocell" |

---

## 5. Proxima fase sugerida — Fase 8.6

**Objetivo:** apos confirmar persistencia em produtos, avancar para:
- `despesas` — modulo com repository padrao, sem acoplamento com OS ou estoque
- ou `contas` — igualmente simples

**Criterio de entrada para Fase 8.6:**
- [ ] Validacao manual da Fase 8.5 aprovada (tenantId visivel no Firestore)
- [ ] Logica de estoque (OS com pecas, movimentacoes) sem erro apos a mudanca
- [ ] Listagem de produtos continua funcionando
