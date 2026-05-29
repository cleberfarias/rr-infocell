# resolveTenant Dinâmico

**Fase:** 9.4 — resolveTenant consulta `usuarios/{uid}`
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Arquivo:** `backend/src/middlewares/tenant.ts`

---

## 1. Fluxo de resolução

```
Request chega → requireAuth verifica token → resolveTenant resolve tenantId
                                                      ↓
                                          request.user.uid disponível?
                                          ├─ Não (dev bypass) → DEFAULT_TENANT_ID (silencioso)
                                          └─ Sim
                                               ↓
                                          db configurado?
                                          ├─ Não → DEFAULT_TENANT_ID + warn
                                          └─ Sim
                                               ↓
                                          busca usuarios/{uid} no Firestore
                                               ↓
                                          documento existe?
                                          ├─ Não → DEFAULT_TENANT_ID + warn
                                          └─ Sim
                                               ↓
                                          tem campo tenantId?
                                          ├─ Não → DEFAULT_TENANT_ID + warn
                                          └─ Sim
                                               ↓
                                          status === "ativo"?
                                          ├─ Não → DEFAULT_TENANT_ID + warn
                                          └─ Sim
                                               ↓
                                          request.tenantId = usuario.tenantId ✅
```

**Todos os desvios usam fallback `DEFAULT_TENANT_ID` e registram um `console.warn`.** Nesta fase, nenhuma desvio bloqueia a requisição.

---

## 2. Fallback transitório

O fallback para `DEFAULT_TENANT_ID` (`"rr-infocell"`) é **intencional e temporário**.

| Condição | Comportamento atual | Comportamento futuro (pós-9.7) |
|----------|--------------------|---------------------------------|
| `usuarios/{uid}` não existe | Fallback + warn | 403 Forbidden |
| `tenantId` ausente no doc | Fallback + warn | 403 Forbidden |
| `status !== "ativo"` | Fallback + warn | 403 Forbidden |
| Firestore indisponível | Fallback + error log | Depende da política de fallback |

**O fallback deve ser removido antes de ativar um segundo tenant real.** Enquanto só existe o tenant `rr-infocell`, o fallback não representa risco de vazamento de dados.

---

## 3. Logs esperados

### Situação normal (usuário com documento válido)

Nenhum log — resolução silenciosa. `request.tenantId` recebe o valor do Firestore.

### Situação de fallback

```
[resolveTenant] usuarios/<uid> nao encontrado — usando DEFAULT_TENANT_ID como fallback
[resolveTenant] usuarios/<uid> existe mas nao tem tenantId — usando DEFAULT_TENANT_ID como fallback
[resolveTenant] usuarios/<uid> status="inativo" — usando DEFAULT_TENANT_ID como fallback
[resolveTenant] Firestore nao configurado — usando DEFAULT_TENANT_ID
[resolveTenant] Erro ao resolver tenant — usando DEFAULT_TENANT_ID: <erro>
```

Se esses warnings aparecerem em produção após a Fase 9.3 ter criado todos os documentos, indica um usuário novo sem documento ou um documento inconsistente — deve ser investigado.

---

## 4. Como validar

### Validação local

1. Rodar o backend em modo desenvolvimento com Firebase configurado
2. Fazer uma chamada autenticada a qualquer endpoint
3. Verificar que **não aparecem warnings** de `[resolveTenant]` no console
4. Adicionar um `console.log` temporário em `resolveTenant` para confirmar o `uid` e o `tenantId` resolvido (remover antes de commitar)

### Validação via dry-run

Confirmar que todos os usuários têm documento válido:

```bash
cd backend
npx tsx src/scripts/audit-users-tenant-dry-run.ts
```

Esperado: 100% `manter-documento`, zero outras categorias.

### Validação de fallback

Para testar o fallback, temporariamente remover o documento `usuarios/{uid}` de um usuário de teste no Firestore e fazer uma requisição. O console deve mostrar o warning e a requisição deve continuar funcionando normalmente.

---

## 5. Por que `DEFAULT_TENANT_ID` ainda permanece nos repositories

O `resolveTenant` agora resolve o `tenantId` dinamicamente e o anexa ao `request.tenantId`. Porém, os **repositories ainda importam `DEFAULT_TENANT_ID` diretamente** para filtrar e escrever dados no Firestore.

Isso é intencional nesta fase:

```
Fase 9.4 → resolveTenant resolve tenantId → disponível em request.tenantId
              ↓
           repositories ainda leem DEFAULT_TENANT_ID diretamente
              ↓ (Fase 9.5+)
           repositories passam a receber tenantId como parâmetro
```

A migração dos repositories é incremental (Fase 9.5), começando pelos módulos de menor risco. Enquanto isso, o `request.tenantId` está disponível mas ainda não é consumido pelos repositories.

---

## 6. Estado atual do `resolveTenant` na cadeia de middlewares

**Fase 9.5 concluída:** `resolveTenant` está registrado nas rotas de marcas.

```typescript
// backend/src/modules/marcas/marcas.routes.ts
marcasRoutes.use(resolveTenant);
```

| Rota | resolveTenant ativo? | Handler usa tenantId resolvido? |
|------|:---:|:---:|
| `/api/marcas` | ✅ Fase 9.5 | ✅ Fase 9.6 |
| `/api/categorias` | ✅ Fase 9.7 | ✅ Fase 9.7 |
| Todas as demais | ❌ ainda não | ❌ ainda não |

Cadeia atual para `/api/marcas`:

```
requireAuth → requireRole → resolveTenant → [handler marcas]
```

Cadeia das demais rotas (sem alteração):

```
requireAuth → requireRole → [handler]
```

A migração das demais rotas é incremental — módulo a módulo nas fases seguintes.

---

## 7. Remoção do fallback

O fallback para `DEFAULT_TENANT_ID` só deve ser removido quando:

1. Todos os usuários do sistema tiverem documento `usuarios/{uid}` válido (já confirmado na Fase 9.3)
2. O processo de criação de novos usuários incluir a criação do documento automaticamente
3. Um segundo tenant real estiver prestes a ser ativado
4. O warning `[resolveTenant]` não aparecer nos logs de produção por N dias consecutivos

Após a remoção, usuários sem documento receberão `403 Forbidden` com mensagem clara.
