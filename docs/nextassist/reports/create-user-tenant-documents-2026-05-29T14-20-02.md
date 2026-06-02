# Relatorio — Criacao de Documentos usuarios/{uid}

> **Escrita controlada — ALLOW_USER_TENANT_CREATION=true estava ativo.**
> Nenhuma custom claim foi alterada.

| Campo | Valor |
| --- | --- |
| Data/hora | 2026-05-29T14:20:02.507Z |
| Ambiente | development |
| Projeto Firebase | rr-infocell |
| Colecao | `usuarios` |
| Tenant aplicado | `rr-infocell` |
| Role fallback | `atendente` (quando sem custom claim) |

---

## 1. Resumo

| Metrica | Quantidade |
| --- | --- |
| Total de usuarios no Firebase Auth | 4 |
| Documentos criados | 4 |
| Documentos pulados (ja existiam) | 0 |
| Usuarios desativados ignorados | 0 |
| Roles via custom claim | 4 |
| Roles via fallback "atendente" | 0 |

### Roles aplicadas nos documentos criados

| Role | Quantidade |
| --- | --- |
| admin | 3 |
| tecnico | 1 |

---

## 2. Documentos criados

| UID | Email | Role | Fonte da role |
| --- | --- | --- | --- |
| `OzGPH0oTUocfMPidR1BqkGTa5AY2` | robison@rrinfocell.com | tecnico | custom claim |
| `p8wSHs0MIBWnwpYAwX9cHaWxKeD2` | cleber.super@rrinfocell.com.br | admin | custom claim |
| `yzRvhAUVE3bkMDcRDNiR8oFPk6O2` | admin@rrinfocell.com | admin | custom claim |
| `zAEZHCqq70Xyq8YiccmRr1qK0e03` | rrinfocellanita@gmail.com | admin | custom claim |

---

## 6. Validacao pos-execucao

Para confirmar que os documentos foram criados corretamente:

1. Acesse o **Firebase Console → Firestore → colecao `usuarios`**
2. Verifique que cada UID listado acima tem um documento
3. Confirme que cada documento tem `tenantId: "rr-infocell"` e `status: "ativo"`
4. Se houver usuarios com role por fallback, corrija via:
   ```
   npm run auth:set-role -- --uid <uid> --role <role-correta>
   ```
   Depois atualize o campo `role` no documento Firestore correspondente.

---

## 7. Aviso

**Nenhuma custom claim foi alterada.**
O middleware `resolveTenant` ainda usa `DEFAULT_TENANT_ID` fixo — nao foi ativado.
Os documentos criados serao usados na Fase 9.4, quando `resolveTenant` for atualizado.