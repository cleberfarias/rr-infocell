# Validacao Backend — Persistencia tenantId em Categorias (Fase 8.3)

## 1. O que foi alterado

O modulo `categorias` passou a persistir `tenantId` no Firestore, seguindo o mesmo padrao aplicado em `marcas` na Fase 8.2.

A alteracao foi minima e cirurgica:

```typescript
// backend/src/modules/categorias/categorias.routes.ts — POST /categorias

// Antes:
.add({ nome: nome.trim(), criadoEm: new Date().toISOString() })

// Depois:
.add({ nome: nome.trim(), criadoEm: new Date().toISOString(), tenantId: DEFAULT_TENANT_ID })
```

O valor de `DEFAULT_TENANT_ID` e `"rr-infocell"`, definido em `backend/src/modules/tenants/tenant.config.ts`.

**O que NAO foi alterado:**
- Listagem GET /categorias — continua retornando CATEGORIAS_PADRAO hardcoded + registros do Firestore sem filtro de tenant
- DELETE /categorias/:id — sem alteracao
- Nenhum outro modulo foi tocado

---

## 2. Observacao sobre categorias

O modulo `categorias` tem uma caracteristica diferente de `marcas`: o GET mescla categorias padrao hardcoded com registros do Firestore:

```typescript
const CATEGORIAS_PADRAO = [
  { id: "peca", nome: "Peca", padrao: true },
  { id: "produto", nome: "Produto", padrao: true },
  // ...
];

// GET retorna: [...CATEGORIAS_PADRAO, ...customizadas]
```

Isso nao afeta a persistencia de `tenantId` — apenas categorias criadas via POST sao salvas no Firestore. As categorias padrao sao hardcoded e nao tem tenantId.

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |
| Colecao `categorias` acessivel no Firestore | | |

---

### Criar categoria nova via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/categorias com `{ "nome": "Teste Tenant" }` retorna 201 | | |
| Response contem `id` e `nome` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste Tenant Cat"}' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "nome": "Teste Tenant Cat",
    "padrao": false
  }
}
```

---

### Verificar campo tenantId no Firestore

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `categorias` | | |
| Localizar o documento pelo `id` retornado na API | | |
| Documento contem campo `tenantId` | | |
| Valor do campo e `"rr-infocell"` | | |
| Documento contem `nome`, `criadoEm` e `tenantId` | | |

**Estrutura esperada no Firestore:**
```
categorias/
  <id-gerado>/
    nome: "Teste Tenant Cat"
    criadoEm: "2026-05-26T..."
    tenantId: "rr-infocell"   ← novo campo
```

---

### Verificar listagem continua funcionando

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/categorias retorna 200 | | |
| Listagem inclui as categorias padrao (peca, produto, acessorio...) | | |
| Listagem inclui a categoria recem-criada | | |
| Nenhum erro 500 | | |

**Comando de teste:**
```bash
curl -s http://localhost:3333/api/categorias | jq '.data | length'
```

---

### Verificar que categorias existentes nao foram afetadas

| Item | Resultado | Observacao |
| --- | --- | --- |
| Categorias criadas antes desta fase NAO possuem `tenantId` no Firestore | | Esperado — sem migracao |
| Categorias padrao hardcoded nao possuem `tenantId` | | Esperado — sao constantes TypeScript |
| Sistema continua funcionando normalmente | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagem filtrada por tenantId | Nao — GET /categorias retorna todas as categorias |
| Categorias existentes migradas | Nao — apenas novos registros tem tenantId |
| Categorias padrao com tenantId | Nao — sao constantes TypeScript, nao registros Firestore |
| Outros modulos com tenantId | Nao — somente categorias nesta fase |
| Isolamento real entre empresas | Nao — ainda e um unico tenant "rr-infocell" |

---

## 5. Resultado esperado

| Item | Status |
| --- | --- |
| Build do backend passa | OK — `npm run build` sem erros |
| POST /categorias persiste tenantId no Firestore | A validar em staging |
| GET /categorias continua funcionando | A validar em staging |
| Nenhum modulo critico alterado | OK — apenas categorias.routes.ts |
| Dados existentes preservados | OK — sem migracao |

---

## 6. Proxima fase sugerida — Fase 8.4

**Objetivo:** apos confirmar persistencia em categorias, avancar para entidades operacionais de risco baixo que ja enviam tenantId no payload frontend:
- `clientes` — ja envia tenantId no frontend, risco baixo, modulo completo com repository
- Diferente de marcas/categorias: clientes tem schema Zod, repository e service separados

**Mudancas necessarias para clientes:**
1. Adicionar `tenantId?: string` no type `ClienteInput`
2. Adicionar `tenantId` no schema Zod `clienteInputSchema`
3. No service/repository `create()`, usar `DEFAULT_TENANT_ID` — nao confiar no tenantId do frontend

**Criterio de entrada para Fase 8.4:**
- [ ] Validacao manual da Fase 8.3 aprovada (tenantId visivel no Firestore)
- [ ] GET /categorias continua funcionando apos a mudanca
- [ ] Nenhum erro em outros modulos
