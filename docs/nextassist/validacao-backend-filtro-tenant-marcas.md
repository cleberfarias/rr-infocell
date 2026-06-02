# Validacao Backend — Filtro por tenantId em Marcas (Fase 8.8.1)

## 1. O que foi alterado

A listagem de marcas personalizada passou a filtrar por `tenantId`. Esta e a primeira listagem do sistema que implementa isolamento real por tenant.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/marcas/marcas.routes.ts` | GET /marcas agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` antes de retornar marcas customizadas do Firestore |

**O que NAO foi alterado:**
- `MARCAS_PADRAO` (Apple, Samsung, Motorola...) — sempre incluidas, sao constantes TypeScript
- POST /marcas — criacao intocada
- DELETE /marcas — delecao intocada
- Nenhuma outra entidade

---

## 2. Comportamento apos o filtro

### Marcas que aparecem na listagem

| Tipo | Aparece? | Motivo |
| --- | --- | --- |
| Marcas padrao hardcoded (`MARCAS_PADRAO`) | Sim | Sao constantes TypeScript, nao vem do Firestore |
| Marcas customizadas criadas apos Fase 8.2 | Sim | Possuem `tenantId: "rr-infocell"` |
| Marcas customizadas criadas antes da Fase 8.2 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

### Impacto de marcas sem tenantId

Marcas personalizadas criadas antes da Fase 8.2 nao possuem o campo `tenantId` no Firestore. Com o filtro ativo, elas deixam de aparecer na listagem.

**Isso e esperado:** e o comportamento correto do isolamento por tenant. Marcas antigas sem `tenantId` sao "orfas" de tenant — nao pertencem explicitamente a nenhuma empresa.

**O que fazer com marcas antigas sem tenantId:**
- Nao criar migracao massiva nesta fase
- Avaliar em fase separada (migracao controlada) se necessario
- Se existirem poucas marcas antigas relevantes, adicionar `tenantId` manualmente via Console Firebase

### Nota sobre ordenacao

A query Firestore anterior usava `.orderBy("nome")`. Com o filtro `.where("tenantId", "==", ...)` em campo diferente do orderBy, o Firestore exigiria um indice composto. Para evitar dependencia de indice em staging, a ordenacao foi movida para o cliente (`.sort()`). Para colecoes pequenas como `marcas`, nao ha impacto de performance.

---

## 3. Checklist de validacao em staging

### Pre-requisitos

| Item | Resultado | Observacao |
| --- | --- | --- |
| Backend rodando (`NODE_ENV=development`) | | `cd backend && npm run dev` |
| Acesso ao Firestore do projeto staging | | Console Firebase |

---

### Criar marca nova e confirmar tenantId

```bash
curl -s -X POST http://localhost:3333/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nome": "Marca Validacao Filtro Tenant"}' | jq .
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| Abrir Firestore → colecao `marcas` → documento criado | | |
| Documento contem `tenantId: "rr-infocell"` | | |

---

### Listar marcas e confirmar que marca criada aparece

```bash
curl -s http://localhost:3333/api/marcas | jq '.data[] | select(.nome == "Marca Validacao Filtro Tenant")'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Marca criada aparece na listagem | | |
| Marcas padrao (Apple, Samsung...) ainda aparecem | | |

---

### Confirmar comportamento de marcas antigas sem tenantId (se existirem)

```bash
# Total de marcas custom visiveis apos o filtro
curl -s http://localhost:3333/api/marcas | jq '[.data[] | select(.padrao != true)] | length'
```

Se existiam marcas customizadas antes da Fase 8.2, elas nao aparecerao mais.
Documentar quantas marcas custom eram visiveis antes e quantas aparecem agora.

| Teste | Resultado | Observacao |
| --- | --- | --- |
| Marcas custom com `tenantId` aparecem | | |
| Marcas custom sem `tenantId` (antigas) NAO aparecem | | Esperado |
| Marcas padrao hardcoded continuam visiveis | | |
| GET nao retorna 500 | | |

---

### Confirmar ausencia de erros

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/marcas
# Esperado: 200
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| Nenhum erro 400/422/500 | | |
| Nenhuma outra entidade afetada | | |

---

## 4. O que esta fase NAO faz

| Aspecto | Estado |
| --- | --- |
| Filtro em categorias | Nao — Fase 8.8.2 |
| Filtro em clientes | Nao — Fase 8.8.3 |
| Filtro em produtos | Nao — Fase 8.8.4 |
| Filtro em OS, estoque, vendas | Nao — Fase 8.8.6+ |
| Migracao de marcas antigas sem tenantId | Nao — fase separada |
| Indice composto no Firestore | Nao necessario — sort no cliente |

---

## 5. Proxima fase — 8.8.2

**Objetivo:** aplicar o mesmo filtro em categorias.

**Criterio de entrada para Fase 8.8.2:**
- [ ] Validacao manual desta fase aprovada
- [ ] Marca nova com tenantId aparece na listagem
- [ ] Marcas padrao continuam visiveis
- [ ] GET /marcas retorna 200 sem erro
- [ ] Impacto de marcas antigas documentado
