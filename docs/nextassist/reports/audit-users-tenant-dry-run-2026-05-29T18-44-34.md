# Relatorio Dry-Run — Auditoria Usuarios x Tenant

> **SOMENTE LEITURA — nenhuma escrita foi feita no Firestore. Nenhuma custom claim foi alterada.**

| Campo | Valor |
| --- | --- |
| Data/hora | 2026-05-29T18:44:34.430Z |
| Ambiente | production |
| Projeto Firebase | rr-infocell |
| Colecao auditada | `usuarios` |
| Tenant padrao esperado | `rr-infocell` |
| DRY_RUN | true |

---

## 1. Resumo

| Metrica | Quantidade |
| --- | --- |
| Total de usuarios no Firebase Auth | 5 |
| Com documento `usuarios/{uid}` | 5 |
| Sem documento (acao: criar) | 0 |
| Usuarios desativados (ignorados) | 0 |
| Usuarios desativados (total) | 0 |
| Requerem revisao manual | 1 |

### Roles encontradas (custom claims)

| Role | Quantidade |
| --- | --- |
| admin | 4 |
| tecnico | 1 |

---

## 2. Detalhe por usuario

### ⚠️  revisar manualmente (1)

| UID | Email | Role | Status doc | tenantId doc | Motivo |
| --- | --- | --- | --- | --- | --- |
| `H4Aw7VpFQugmtz1CY4FPCj2fTio1` | demo@nextassist-demo.internal | admin | ativo | nextassist-demo | tenantId inesperado: "nextassist-demo" (esperado "rr-infocell") |

### ✅ manter documento (4)

| UID | Email | Role | Status doc | tenantId doc | Motivo |
| --- | --- | --- | --- | --- | --- |
| `OzGPH0oTUocfMPidR1BqkGTa5AY2` | robison@rrinfocell.com | tecnico | ativo | rr-infocell | — |
| `p8wSHs0MIBWnwpYAwX9cHaWxKeD2` | cleber.super@rrinfocell.com.br | admin | ativo | rr-infocell | — |
| `yzRvhAUVE3bkMDcRDNiR8oFPk6O2` | admin@rrinfocell.com | admin | ativo | rr-infocell | — |
| `zAEZHCqq70Xyq8YiccmRr1qK0e03` | rrinfocellanita@gmail.com | admin | ativo | rr-infocell | — |

---

## 3. Proximos passos

> ⚠️  **1 usuario(s) requerem revisao manual antes de prosseguir para a Fase 9.3.**
> Verifique cada caso na secao "revisar manualmente" acima.

- ✅ Todos os usuarios ativos ja possuem documento `usuarios/{uid}` valido.

---

## 4. Aviso

**Nenhuma escrita foi feita no Firestore durante esta auditoria.**
Nenhum documento foi criado, alterado ou removido.
Nenhuma custom claim foi alterada.

Para prosseguir com a criacao dos documentos, consulte:
- `docs/nextassist/dry-run-usuarios-tenant.md`
- `docs/nextassist/modelo-usuario-tenant.md`