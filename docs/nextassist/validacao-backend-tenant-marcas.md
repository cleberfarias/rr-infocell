# Validacao Backend — Persistencia tenantId em Marcas (Fase 8.2)

## 1. O que foi alterado

O modulo `marcas` foi o primeiro modulo de backend a persistir `tenantId` no Firestore.

A alteracao foi minima e cirurgica:

```typescript
// backend/src/modules/marcas/marcas.routes.ts — POST /marcas

// Antes:
.add({ nome: nome.trim(), criadoEm: new Date().toISOString() })

// Depois:
.add({ nome: nome.trim(), criadoEm: new Date().toISOString(), tenantId: DEFAULT_TENANT_ID })
```

O valor de `DEFAULT_TENANT_ID` e `"rr-infocell"`, definido em `backend/src/modules/tenants/tenant.config.ts`.

**O que NAO foi alterado:**
- Listagem GET /marcas — continua global, sem filtro por tenant
- DELETE /marcas/:id — sem alteracao
- Nenhum outro modulo foi tocado

---

## 2. Por que marcas foi escolhida

| Criterio | Marcas | Categorias |
| --- | --- | --- |
| Acoplamento com OS/estoque/vendas | Nenhum | Nenhum |
| Acoplamento com outros modulos | `marca` e string em produtos/aparelhos — nao e lookup Firestore | `categoria` em despesas e enum local — nao e lookup Firestore |
| GET mescla defaults hardcoded + Firestore | Nao — somente Firestore | Sim — mescla CATEGORIAS_PADRAO + Firestore |
| Complexidade do arquivo de rotas | Minima | Minima, mas com mais logica no GET |
| Risco da alteracao | Minimo | Minimo, mas preferimos o mais simples |

---

## 3. Checklist de validacao em staging

Execute este checklist com o backend rodando em modo dev (porta 3333).

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase ou Admin SDK |
| Colecao `marcas` acessivel no Firestore | | |

---

### Criar marca nova via API

| Item | Resultado | Observacao |
| --- | --- | --- |
| POST /api/marcas com `{ "nome": "Teste Tenant" }` retorna 201 | | |
| Response contem `id` e `nome` | | |
| Nenhum erro 400/422/500 | | |

**Comando de teste:**
```bash
curl -s -X POST http://localhost:3333/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste Tenant"}' | jq .
```

**Response esperada:**
```json
{
  "data": {
    "id": "<id-gerado>",
    "nome": "Teste Tenant",
    "padrao": false
  }
}
```

---

### Verificar campo tenantId no Firestore

| Item | Resultado | Observacao |
| --- | --- | --- |
| Abrir console Firebase → Firestore → colecao `marcas` | | |
| Localizar o documento recém-criado pelo `id` retornado na API | | |
| Documento contem campo `tenantId` | | |
| Valor do campo e `"rr-infocell"` | | |
| Documento contem `nome`, `criadoEm` e `tenantId` | | |

**Estrutura esperada no Firestore:**
```
marcas/
  <id-gerado>/
    nome: "Teste Tenant"
    criadoEm: "2026-05-26T..."
    tenantId: "rr-infocell"   ← novo campo
```

---

### Verificar listagem continua funcionando

| Item | Resultado | Observacao |
| --- | --- | --- |
| GET /api/marcas retorna 200 | | |
| Listagem inclui marcas padrao (Apple, Samsung...) | | |
| Listagem inclui a marca recem-criada | | |
| Nenhum erro 500 | | |

**Comando de teste:**
```bash
curl -s http://localhost:3333/api/marcas | jq '.data | length'
```

---

### Verificar que marcas existentes nao foram afetadas

| Item | Resultado | Observacao |
| --- | --- | --- |
| Marcas criadas antes desta fase NAO possuem `tenantId` no Firestore | | Esperado — sem migracao |
| Sistema continua funcionando normalmente para essas marcas | | |
| Nenhum erro em outros modulos (aparelhos, produtos) | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Listagem filtrada por tenantId | Nao — GET /marcas retorna todas as marcas |
| Marcas existentes migradas | Nao — apenas novos registros tem tenantId |
| Outros modulos com tenantId | Nao — somente marcas nesta fase |
| Isolamento real entre empresas | Nao — ainda e um unico tenant "rr-infocell" |
| Middleware resolveTenant registrado globalmente | Nao — tenant vem diretamente de DEFAULT_TENANT_ID |

---

## 5. Resultado esperado

| Item | Status |
| --- | --- |
| Build do backend passa | OK — `npm run build` sem erros |
| POST /marcas persiste tenantId no Firestore | A validar em staging |
| GET /marcas continua funcionando | A validar em staging |
| Nenhum modulo critico alterado | OK — apenas marcas.routes.ts |
| Dados existentes preservados | OK — sem migracao |

---

## 6. Proxima fase sugerida — Fase 8.3

**Objetivo:** apos confirmar persistencia no Firestore, aplicar o mesmo padrao em outra entidade simples:
- `categorias` — mesmo padrao, mesma abordagem
- ou `clientes` — entidade ja com tenantId no frontend, risco medio

**Criterio de entrada para Fase 8.3:**
- [ ] Validacao manual da Fase 8.2 aprovada (tenantId visivel no Firestore)
- [ ] GET /marcas continua funcionando apos a mudanca
- [ ] Nenhum erro em outros modulos
