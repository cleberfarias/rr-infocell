# Modelo Usuário x Tenant

**Fase:** 9.1 — Modelo usuário x tenant (somente documentação)
**Data:** 2026-05-29
**Branch:** nextassist-saas
**Status:** ✅ Modelo definido — nenhum código foi alterado

---

## 1. Objetivo

Este documento define como o NextAssist vinculará usuários autenticados a tenants.

O objetivo é substituir o `DEFAULT_TENANT_ID` fixo (`"rr-infocell"`) por um `tenantId` resolvido dinamicamente a partir da identidade do usuário autenticado — de forma segura, incremental e compatível com a evolução para SaaS/white-label com múltiplos tenants.

---

## 2. Decisão de arquitetura

| Componente | Decisão |
|-----------|---------|
| **Autenticação** | Firebase Auth continua como mecanismo de autenticação |
| **Chave confiável do usuário** | `request.user.uid` (UID do Firebase, validado via ID Token) |
| **Fonte do `tenantId`** | Firestore `usuarios/{uid}` — campo `tenantId` |
| **Fonte da role** | Custom claim do Firebase Auth (mantida como está por ora) |
| **Frontend** | Não é fonte de verdade do tenant — apenas consome dados |

### Princípios

- O backend é a única fonte de verdade do `tenantId` por request
- O `uid` do token Firebase é a âncora de identidade — não pode ser forjado pelo cliente
- O `tenantId` nunca virá do body ou query string do request como dado confiável
- O fallback para `rr-infocell` é transitório e será removido antes de múltiplos tenants reais

---

## 3. Modelo proposto da coleção `usuarios`

### Estrutura do documento

```
Firestore
└── usuarios/
    └── {uid}               ← UID do Firebase Auth (chave)
        ├── uid             string   — espelho do ID, facilita queries
        ├── email           string   — e-mail do usuário
        ├── nome            string   — nome de exibição
        ├── tenantId        string   — tenant ao qual o usuário pertence
        ├── role            string   — "admin" | "atendente" | "tecnico"
        ├── status          string   — "ativo" | "inativo"
        ├── createdAt       timestamp
        └── updatedAt       timestamp
```

### Notas sobre os campos

| Campo | Observação |
|-------|-----------|
| `uid` | Mesmo valor da chave do documento — facilita busca sem precisar do caminho completo |
| `tenantId` | Campo central desta fase. Determina qual tenant o usuário pertence |
| `role` | Redundante com o custom claim por ora. No futuro pode substituir o claim como fonte de verdade |
| `status` | Permite desativar um usuário sem remover do Firebase Auth |
| `createdAt` / `updatedAt` | Gerados pelo backend. `updatedAt` atualiza a cada modificação |

---

## 4. Tenant inicial

Todos os usuários existentes no Firebase Auth do tenant `rr-infocell` devem receber um documento `usuarios/{uid}` com:

```json
{
  "tenantId": "rr-infocell",
  "status": "ativo"
}
```

Os demais campos (`uid`, `email`, `nome`, `role`) serão extraídos do Firebase Auth durante o script de criação (Fase 9.2).

O tenant `rr-infocell` permanece como padrão único até que múltiplos tenants reais sejam ativados.

---

## 5. Comparação entre opções

| Critério | Custom claim `tenantId` | Firestore `usuarios/{uid}` |
|----------|:-----------------------:|:--------------------------:|
| **Flexibilidade** | Baixa — requer reemissão de token para alterar | Alta — alterável a qualquer momento |
| **Performance** | Alta — sem query extra (claim vem no token) | Média — requer leitura no Firestore por request |
| **Facilidade de alteração** | Baixa — Admin SDK obrigatório, propagação lenta | Alta — write direto no Firestore |
| **Risco operacional** | Médio — erro de claim pode bloquear usuário | Baixo — fallback controlado possível |
| **Propagação** | Demorada — token pode ser cacheado até 1h | Imediata — leitura reflete estado atual |
| **Custo de leitura** | Zero | 1 leitura Firestore por request (cacheável) |
| **Complexidade de implementação** | Baixa | Média (+ lógica de cache opcional) |
| **Escalabilidade para SaaS** | Baixa — claims ficam acoplados ao token | Alta — documento extensível sem limite |
| **Suporte a painel admin** | Difícil — não há listagem de usuários por tenant | Fácil — query por `tenantId` |

---

## 6. Justificativa da escolha

**Firestore `usuarios/{uid}` foi escolhido** pelos seguintes motivos:

1. **Alteração sem reemitir token** — mudar o `tenantId` de um usuário (ex: migração entre tenants) é imediato, sem esperar expiração de custom claim
2. **Dados adicionais do usuário** — o documento pode crescer com novos campos (`plano`, `cargo`, `permissõesExtras`, etc.) sem tocar no Firebase Auth
3. **Múltiplos usuários por tenant** — query simples: `where("tenantId", "==", tenantId)` lista todos os usuários do tenant
4. **Painel admin SaaS futuro** — o admin de plataforma poderá gerenciar usuários por tenant via Firestore sem depender de scripts de custom claims
5. **Sem risco de propagação** — custom claims têm delay de até 1h em tokens cacheados; Firestore reflete o estado atual imediatamente
6. **Desacoplamento** — a autenticação (Firebase Auth) e a autorização de tenant (Firestore) ficam separadas, facilitando evolução independente

O custo de 1 leitura Firestore por request é aceitável neste momento e pode ser mitigado com cache em memória (TTL curto) se necessário em fases futuras.

---

## 7. Estratégia de fallback

Durante a fase de transição (Fases 9.1 a 9.3), o middleware `resolveTenant` usará o seguinte fallback:

```
1. Busca usuarios/{uid} no Firestore
2. Se documento existe e tem tenantId válido → usa esse tenantId ✅
3. Se documento não existe ou tenantId ausente → usa "rr-infocell" como fallback ⚠️
4. Loga o caso de fallback (warn) para monitoramento
5. Nunca retorna erro nesta fase — compatibilidade garantida
```

**Condições para remover o fallback:**

- Todos os usuários existentes tiverem documento `usuarios/{uid}` criado
- Nenhum usuário ativo acionar o fallback por N dias consecutivos
- Múltiplos tenants reais ainda não estiverem ativos

Após a remoção do fallback, um usuário sem `usuarios/{uid}` válido receberá `403 Forbidden` com mensagem clara.

---

## 8. Impacto no middleware `resolveTenant`

O arquivo `backend/src/middlewares/tenant.ts` deverá evoluir para:

```
resolveTenant() — fluxo futuro:

1. Verificar que request.user existe (requireAuth já garantiu)
2. Extrair uid = request.user.uid
3. Buscar Firestore: usuarios/{uid}
4. Se não encontrado:
   a. Logar warning: "Usuario sem documento usuarios/{uid}: <uid>"
   b. Usar DEFAULT_TENANT_ID como fallback transitório
5. Se encontrado:
   a. Ler tenantId do documento
   b. Verificar status === "ativo"
   c. Se inativo: retornar 403 com mensagem clara
6. Definir request.tenantId = tenantId resolvido
7. Continuar para o próximo middleware/handler
```

**Ponto de atenção:** `resolveTenant` deve rodar **após** `requireAuth`, pois depende de `request.user.uid`. A ordem atual `requireAuth → resolveTenant` já está correta.

**Repositories:** Após o middleware evoluir, os repositories devem parar de importar `DEFAULT_TENANT_ID` diretamente e passar a receber o `tenantId` como parâmetro do service/handler. Isso será feito na Fase 9.3.

---

## 9. Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Usuário sem documento `usuarios/{uid}`** | Fallback para `rr-infocell` mascarar estado inconsistente | Log de warning; script de auditoria periódico |
| **`tenantId` incorreto no documento** | Usuário acessa dados do tenant errado | Validar `tenantId` contra lista de tenants ativos antes de aceitar |
| **Fallback `rr-infocell` mascarar erro** | Usuário de outro tenant acessa dados de rr-infocell | Remover fallback antes de ativar segundo tenant real |
| **Custo de leitura por request** | Latência adicional em cada chamada API | Cache em memória (Map com TTL 60s) — implementar se necessário |
| **Cache mal invalidado** | Usuário usa tenantId stale após alteração | TTL curto (60s) ou invalidação explícita na atualização do usuário |
| **Role no Firestore divergente do custom claim** | Autorização inconsistente | Definir fonte de verdade única antes de duplicar o campo (Fase futura) |
| **Documento `usuarios/{uid}` com status `inativo`** | Usuário autenticado no Firebase mas bloqueado na aplicação | Retornar 403 com mensagem clara; não depender só do Firebase disabled |

---

## 10. Ordem segura de implementação

```
Fase 9.1 — Este documento ✅ (modelo definido)
    ↓
Fase 9.2 — Criar plano/script dry-run
    - Listar todos os usuários do Firebase Auth
    - Mapear quais já têm documento usuarios/{uid}
    - Gerar relatório sem alterar nada
    ↓
Fase 9.3 — Criar documentos usuarios/{uid}
    - Script que cria o documento para cada usuário sem ele
    - tenantId: "rr-infocell" para todos os atuais
    - Executar em staging primeiro, depois produção
    ↓
Fase 9.4 — Atualizar resolveTenant
    - Implementar leitura de usuarios/{uid}
    - Manter fallback rr-infocell
    - Ativar apenas em rota de menor risco primeiro
    ↓
Fase 9.5 — Validar em staging
    - Criar usuário de teste com tenant fake
    - Garantir isolamento de dados
    - Confirmar que fallback não é acionado para usuários reais
    ↓
Fase 9.6 — Migrar repositories
    - Substituir DEFAULT_TENANT_ID por tenantId do request
    - Módulo a módulo, começando por categorias/marcas
    - Ordens e vendas por último
    ↓
Fase 9.7 — Remover fallback
    - Somente após todos os usuários terem documento válido
    - Somente antes de ativar segundo tenant real
```

---

## 11. Critérios para avançar para 9.2

A Fase 9.2 só deve começar quando todos os itens abaixo estiverem confirmados:

- [x] Modelo `usuarios/{uid}` aprovado (este documento)
- [x] Fallback transitório `rr-infocell` definido e documentado
- [x] Campos obrigatórios do documento definidos (`uid`, `email`, `nome`, `tenantId`, `role`, `status`, `createdAt`, `updatedAt`)
- [x] Fonte da role definida (custom claim mantido por ora)
- [x] Estratégia de criação para usuários existentes definida (script na Fase 9.2)
- [ ] **Plano de dry-run criado** — mapear usuários atuais sem criar documentos (Fase 9.2)
- [ ] **Script de criação de documentos revisado e aprovado** — executar apenas após dry-run

---

## 12. Próxima fase

**Fase 9.2 — Dry-run e criação dos documentos `usuarios/{uid}`**

Objetivo: mapear os usuários atuais do Firebase Auth, verificar quais já têm documento no Firestore, e criar os documentos ausentes com `tenantId: "rr-infocell"`.

Entregas esperadas:
- Script dry-run (leitura apenas) que lista usuários e seu estado
- Relatório gerado pelo dry-run
- Script de criação dos documentos `usuarios/{uid}` (a executar após revisão)
- Critérios de validação pós-criação

---

## Apêndice — Relação com documentos existentes

| Documento | Relação |
|-----------|---------|
| [`auditoria-autenticacao-tenant-dinamico.md`](auditoria-autenticacao-tenant-dinamico.md) | Fase 9.0 — mapeamento que originou este modelo |
| [`tenant-context.md`](tenant-context.md) | TenantContext no frontend — não muda nesta fase |
| [`isolamento-tenant.md`](isolamento-tenant.md) | Estratégia de isolamento de dados por tenant |
| [`backend-tenant-estrutura.md`](backend-tenant-estrutura.md) | Estrutura backend multi-tenant — `resolveTenant` evoluirá nesta direção |
| [`revisao-final-multiempresa-pos-migracao.md`](revisao-final-multiempresa-pos-migracao.md) | Estado pós-Fase 8 — contexto do que já está feito |
