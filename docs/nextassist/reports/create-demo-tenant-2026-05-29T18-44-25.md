# Relatorio — Criacao do Tenant Demo

> **Escrita controlada — ALLOW_DEMO_TENANT_CREATION=true estava ativo.**
> Nenhum dado operacional foi criado.

| Campo | Valor |
| --- | --- |
| Data/hora | 2026-05-29T18:44:25.044Z |
| Projeto Firebase | rr-infocell |
| Tenant demo | `nextassist-demo` |
| Email demo | `demo@nextassist-demo.internal` |

---

## 1. Resultados

| Etapa | Status | Detalhe |
| --- | --- | --- |
| Documento `tenants/nextassist-demo` | ✅ criado | tenants/nextassist-demo criado |
| Usuario `demo@nextassist-demo.internal` no Firebase Auth | ✅ criado | UID: `H4Aw7VpFQugmtz1CY4FPCj2fTio1` |
| Documento `usuarios/H4Aw7VpFQugmtz1CY4FPCj2fTio1` | ✅ criado | tenantId: `nextassist-demo` |
| Custom claim `role: admin` | ⏭️  ja-existia | Custom claim role ja configurada — skipped |

---

## 3. Proximos passos

1. **Validar isolamento:** logar como usuario rr-infocell e confirmar que dados de nextassist-demo nao aparecem
2. **Criar dados minimos:** Fase 9.16 — criar 1 de cada entidade no tenant nextassist-demo via API
3. **Validar isolamento real:** logar como usuario demo e confirmar que dados de rr-infocell nao aparecem

---

## 4. Aviso

**Nenhum dado operacional foi criado (OS, produtos, clientes, vendas, etc.).**
Apenas documentos de infraestrutura (`tenants`, `usuarios`) foram escritos.
O fallback `DEFAULT_TENANT_ID` permanece ativo — nenhuma alteracao em producao.