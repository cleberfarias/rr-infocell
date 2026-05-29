# Relatorio Dry-Run — Auditoria Usuarios x Tenant

> **SOMENTE LEITURA — nenhuma escrita foi feita no Firestore. Nenhuma custom claim foi alterada.**

| Campo | Valor |
| --- | --- |
| Data/hora | 2026-05-29T14:13:30.571Z |
| Ambiente | development |
| Projeto Firebase | rr-infocell |
| Colecao auditada | `usuarios` |
| Tenant padrao esperado | `rr-infocell` |
| DRY_RUN | true |

---

## 1. Resumo

| Metrica | Quantidade |
| --- | --- |
| Total de usuarios no Firebase Auth | 4 |
| Com documento `usuarios/{uid}` | 0 |
| Sem documento (acao: criar) | 4 |
| Usuarios desativados (ignorados) | 0 |
| Usuarios desativados (total) | 0 |
| Requerem revisao manual | 0 |

### Roles encontradas (custom claims)

| Role | Quantidade |
| --- | --- |
| admin | 3 |
| tecnico | 1 |

---

## 2. Detalhe por usuario

### ⬜ criar documento (4)

| UID | Email | Role | Status doc | tenantId doc | Motivo |
| --- | --- | --- | --- | --- | --- |
| `OzGPH0oTUocfMPidR1BqkGTa5AY2` | robison@rrinfocell.com | tecnico | — | — | — |
| `p8wSHs0MIBWnwpYAwX9cHaWxKeD2` | cleber.super@rrinfocell.com.br | admin | — | — | — |
| `yzRvhAUVE3bkMDcRDNiR8oFPk6O2` | admin@rrinfocell.com | admin | — | — | — |
| `zAEZHCqq70Xyq8YiccmRr1qK0e03` | rrinfocellanita@gmail.com | admin | — | — | — |

---

## 3. Proximos passos

- **4 usuario(s)** precisam de documento `usuarios/{uid}` com `tenantId: "rr-infocell"`.
  → Serao criados na **Fase 9.3** via script separado, somente apos revisao deste relatorio.

---

## 4. Aviso

**Nenhuma escrita foi feita no Firestore durante esta auditoria.**
Nenhum documento foi criado, alterado ou removido.
Nenhuma custom claim foi alterada.

Para prosseguir com a criacao dos documentos, consulte:
- `docs/nextassist/dry-run-usuarios-tenant.md`
- `docs/nextassist/modelo-usuario-tenant.md`