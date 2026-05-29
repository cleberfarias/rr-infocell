# Fase 9.3.1 — Resultado da Criação `usuarios/{uid}`

**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ✅ Aprovado para Fase 9.4 — resolveTenant dinâmico

---

## Script executado

```
backend/src/scripts/create-user-tenant-documents.ts
```

Guard ativo: `ALLOW_USER_TENANT_CREATION=true`

## Relatório gerado

```
docs/nextassist/reports/create-user-tenant-documents-2026-05-29T14-20-02.md
```

---

## Resultado

| Métrica | Valor |
|---------|-------|
| Total no Firebase Auth | 4 |
| Documentos criados | 4 |
| Documentos pulados (já existiam) | 0 |
| Desativados ignorados | 0 |
| Roles por fallback | 0 |
| Erros | 0 |

## Roles encontradas

| Role | Quantidade |
|------|-----------|
| admin | 3 |
| tecnico | 1 |

Todas as roles vieram de custom claim — zero fallbacks aplicados.

---

## Validação pós-script

Dry-run reexecutado com sucesso após a criação:

| Ação | Quantidade |
|------|-----------|
| ✅ manter-documento | 4 |
| ⬜ criar-documento | 0 |
| ⚠️ revisar-manualmente | 0 |
| 🔕 ignorar-desativado | 0 |

Relatório de confirmação:

```
docs/nextassist/reports/audit-users-tenant-dry-run-2026-05-29T14-20-14.md
```

---

## Estrutura dos documentos criados

Cada documento `usuarios/{uid}` foi criado com:

```json
{
  "uid": "<firebase-uid>",
  "email": "<email>",
  "nome": "<displayName>",
  "tenantId": "rr-infocell",
  "role": "<admin|tecnico>",
  "status": "ativo",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

## Critérios atingidos para a Fase 9.4

- [x] 4 usuários no Firebase Auth
- [x] 4 documentos `usuarios/{uid}` criados
- [x] `tenantId: "rr-infocell"` em todos os documentos
- [x] Roles via custom claim — zero fallbacks
- [x] Dry-run reexecutado: 4 `manter-documento`, 0 demais
- [x] Nenhum código funcional alterado
- [x] Custom claims não foram alteradas
- [x] `resolveTenant` ainda usa `DEFAULT_TENANT_ID` — pronto para evolução na 9.4
