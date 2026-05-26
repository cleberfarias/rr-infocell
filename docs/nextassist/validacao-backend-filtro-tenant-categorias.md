# Validacao Backend — Filtro por tenantId em Categorias (Fase 8.8.2)

## 1. O que foi alterado

A listagem de categorias customizadas passou a filtrar por `tenantId`, seguindo o padrao aplicado em marcas na Fase 8.8.1.

### Arquivo alterado

| Arquivo | Alteracao |
| --- | --- |
| `backend/src/modules/categorias/categorias.routes.ts` | GET /categorias agora usa `.where("tenantId", "==", DEFAULT_TENANT_ID)` para categorias customizadas; ordenacao movida para o cliente |

**O que NAO foi alterado:**
- `CATEGORIAS_PADRAO` (peca, produto, acessorio, servico, celular_novo, celular_seminovo, celular_restaurado) — sempre incluidas, sao constantes TypeScript
- POST /categorias — criacao intocada
- DELETE /categorias — delecao intocada
- Nenhuma outra entidade

---

## 2. Comportamento apos o filtro

| Tipo | Aparece? | Motivo |
| --- | --- | --- |
| Categorias padrao (`CATEGORIAS_PADRAO`) | Sim | Sao constantes TypeScript, nao vem do Firestore |
| Categorias customizadas criadas apos Fase 8.3 | Sim | Possuem `tenantId: "rr-infocell"` |
| Categorias customizadas criadas antes da Fase 8.3 | **Nao** | Nao possuem `tenantId` — ficam ocultas |

**Impacto:** categorias personalizadas criadas antes da Fase 8.3 deixam de aparecer. As 7 categorias padrao do sistema continuam sempre visiveis. Migracao de dados antigos sera tratada em fase separada.

---

## 3. Checklist de validacao em staging

### Criar categoria nova

```bash
curl -s -X POST http://localhost:3333/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome": "Categoria Validacao Filtro Tenant"}' | jq .
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| POST retorna 201 | | |
| Firestore → colecao `categorias` → documento contem `tenantId: "rr-infocell"` | | |

---

### Listar categorias

```bash
curl -s http://localhost:3333/api/categorias | jq '.data[] | {id, nome, padrao}'
```

| Teste | Resultado | Observacao |
| --- | --- | --- |
| GET retorna 200 | | |
| Categoria criada aparece | | |
| `CATEGORIAS_PADRAO` (peca, servico, celular...) aparecem | | |
| Categorias antigas sem `tenantId` NAO aparecem | | Esperado |
| Nenhum erro 400/422/500 | | |

---

## 4. Proxima fase — 8.8.3

**Objetivo:** aplicar filtro por tenantId em clientes.

**Criterio de entrada:**
- [ ] Categoria nova com tenantId aparece na listagem
- [ ] `CATEGORIAS_PADRAO` continuam visiveis
- [ ] GET /categorias retorna 200 sem erro
