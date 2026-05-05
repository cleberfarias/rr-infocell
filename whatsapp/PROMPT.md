# Prompt: Chat WhatsApp Integrado ao Sistema — RR Infocell

## Decisões de produto

| Decisão                        | Escolha                                      |
|--------------------------------|----------------------------------------------|
| Conexão WhatsApp               | QR code via Baileys (gratuito, sem serviço externo) |
| Quem pode atender              | Todos os perfis: admin, atendente, tecnico   |
| Mídia recebida                 | Imagem, áudio e vídeo (exibidos no chat)     |
| Armazenamento de mídia         | Firebase Storage (já em uso no projeto)      |
| Formato de telefone no banco   | Somente dígitos sem país: `11984321290`      |
| Migração de registros antigos  | Script de normalização nos clientes existentes |

---

## Objetivo

O atendente conversa com o cliente via WhatsApp dentro do sistema, com o contexto completo
do cliente e das ordens de serviço dele visíveis ao lado do chat.

O atendente pode, sem sair da conversa:
- Ver todas as OS ativas do cliente e seus status.
- Enviar orçamento via WhatsApp e registrar aprovação/rejeição automática (SIM/NÃO).
- Informar que o aparelho está pronto para retirada.
- Confirmar pagamento.
- Enviar status atual da OS.
- Ver imagens, ouvir áudios e assistir vídeos enviados pelo cliente.

---

## Solução técnica

**Baileys** dentro do backend Node.js existente — gratuito, sem serviço externo, sem mensalidade.
O número do WhatsApp da loja é conectado via QR code uma única vez.
A sessão é salva no Firestore para não precisar reconectar após restart do servidor.

---

## Normalização de telefone

### Problema
- Banco atual: `(11) 98432-1290`
- WhatsApp envia: `5511984321290@s.whatsapp.net`
- Precisam bater para vincular conversa ao cliente.

### Padrão adotado
Salvar sempre **somente dígitos, sem código de país**: `11984321290`

### Função de normalização (compartilhada)
```typescript
// backend/src/shared/normalizar-telefone.ts
export function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');
  // remove código do país 55 se o número tiver mais de 11 dígitos
  if (digitos.length > 11 && digitos.startsWith('55')) {
    return digitos.slice(2);
  }
  return digitos;
}
```

Exemplos:
```
"(11) 98432-1290"     → "11984321290"
"5511984321290"       → "11984321290"  (vindo do Baileys)
"11 9 8432-1290"      → "11984321290"
"+55 (11) 98432-1290" → "11984321290"
```

### Onde aplicar

1. **`clientes.service.ts`** — normalizar `telefone` no `create` e no `update` antes de salvar.
2. **`clientes.repository.ts`** — adicionar método `findByTelefone(telefoneNormalizado)`.
3. **`whatsapp/vinculo.service.ts`** — normalizar número vindo do Baileys antes de buscar no banco.
4. **Script de migração** — normalizar registros já existentes no Firestore.

### Script de migração
```
backend/src/scripts/normalizar-telefones.ts
```
```typescript
// Rodar uma vez: npm run script:normalizar-telefones
// Busca todos os clientes, normaliza o campo telefone, regrava no Firestore.
```

---

## Fluxo principal

```
Cliente envia mensagem (texto, imagem, áudio, vídeo)
         ↓
Baileys recebe evento de mensagem
         ↓
Se for mídia → baixar buffer → upload Firebase Storage → salvar URL
         ↓
normalizarTelefone(numero) → buscar cliente no Firestore
         ↓
Salvar em whatsapp_mensagens vinculado ao clienteId (ou null)
Atualizar whatsapp_conversas com ultimaMensagem + naoLidas++
         ↓
Atendente vê nova mensagem na tela /app/atendimento
Painel direito mostra cliente + OS ativas
         ↓
Atendente responde no chat OU clica em ação rápida
         ↓
Ação atualiza OS no Firestore + envia mensagem ao cliente via Baileys
```

---

## Tela `/app/atendimento` — layout 3 colunas

```
┌─────────────────┬──────────────────────────┬─────────────────────────┐
│  CONVERSAS      │       CHAT               │  CLIENTE + OS           │
│                 │                          │                         │
│ 🟢 João Silva   │ ● Conectado              │ João Silva              │
│  "Quando fica   │ ─────────────────────    │ 📱 11984321290          │
│   pronto?"      │ 🧑 Quando fica pronto    │ 📄 CPF: 123.456.789-00  │
│  [3 não lidas]  │ meu celular?             │                         │
│                 │                          │ ── OS ativas ──         │
│ 🔴 Maria Souza  │ 🖼️ [imagem enviada]      │                         │
│  "Foto do       │                          │ OS #0042                │
│   defeito"      │ 🎵 [áudio 0:23] ▶        │ iPhone 13               │
│                 │                          │ Em manutenção 🔧        │
│ ○ Desconhecido  │ 🎬 [vídeo enviado] ▶     │ R$ 350,00               │
│  "Oi"           │                          │ Previsão: amanhã        │
│                 │ Atendente: Seu aparelho  │                         │
│                 │ fica pronto amanhã!      │ [Enviar orçamento]      │
│                 │                          │ [Informar pronto]       │
│                 │ [campo de texto]  [📤]   │ [Confirmar pagamento]   │
│                 │                          │ [Enviar status]         │
│                 │                          │ [Ver OS completa ↗]     │
└─────────────────┴──────────────────────────┴─────────────────────────┘
```

Legenda da lista de conversas:
- 🟢 Cliente cadastrado no sistema
- ○  Número desconhecido (não cadastrado)

---

## Mídia no chat

### Backend — ao receber mensagem com mídia
```typescript
// mensagem.service.ts
async function processarMidia(msg: BaileysMessage): Promise<string | null> {
  if (!msg.message?.imageMessage && !msg.message?.audioMessage && !msg.message?.videoMessage) {
    return null;
  }

  const buffer = await downloadMediaMessage(msg, 'buffer', {});
  const tipo = msg.message.imageMessage ? 'image'
             : msg.message.audioMessage ? 'audio'
             : 'video';
  const ext = tipo === 'image' ? 'jpg' : tipo === 'audio' ? 'ogg' : 'mp4';
  const path = `whatsapp/${telefone}/${msg.key.id}.${ext}`;

  // upload para Firebase Storage (já configurado no projeto)
  const bucket = admin.storage().bucket();
  await bucket.file(path).save(buffer);
  const [url] = await bucket.file(path).getSignedUrl({ action: 'read', expires: '2099-01-01' });

  return url;
}
```

### Frontend — exibir por tipo
```typescript
// ChatConversa.tsx
function MensagemMidia({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.tipo === 'imagem') return <img src={mensagem.midiaUrl} className="max-w-xs rounded" />;
  if (mensagem.tipo === 'audio')  return <audio controls src={mensagem.midiaUrl} />;
  if (mensagem.tipo === 'video')  return <video controls src={mensagem.midiaUrl} className="max-w-xs" />;
  return null;
}
```

### Storage rules — adicionar caminho whatsapp
```
// infra/firebase/storage.rules — adicionar:
match /whatsapp/{telefone}/{fileName} {
  allow read, write: if isOperationalUser();
}
```

---

## Ações rápidas

### Enviar orçamento
- Disponível quando OS está em `aguardando_aprovacao`.
- Monta mensagem com número da OS, aparelho, defeito, valor total.
- Salva `aguardandoAprovacao: true` e `osIdPendente: osId` na conversa.
- Se cliente responder **SIM** → OS muda para `em_manutencao`.
- Se cliente responder **NÃO** → OS muda para `cancelado`.

```
RR Infocell — Orçamento OS #0042
Aparelho: iPhone 13
Defeito: Tela quebrada
Serviço: Troca de display
Valor: R$ 350,00

Para AUTORIZAR responda: SIM
Para RECUSAR responda: NÃO
```

### Informar pronto para retirada
- Disponível quando OS está em `pronto_para_retirada` ou ao clicar manualmente.
- Atualiza status OS para `pronto_para_retirada`.

```
RR Infocell — Aparelho pronto! ✅
OS #0042 | iPhone 13
Seu aparelho já pode ser retirado.
Horário: seg-sex 9h-18h, sáb 9h-13h.
```

### Confirmar pagamento
- Atendente preenche modal: forma de pagamento + valor recebido.
- Atualiza OS: `formaPagamento`, `valorRecebido`, `pagoEm`.
- Muda status para `entregue`.

```
RR Infocell — Pagamento confirmado ✅
OS #0042 | iPhone 13
Valor: R$ 350,00 | PIX
Obrigado pela preferência!
```

### Enviar status
```
RR Infocell — Status da OS #0042
Aparelho: iPhone 13
Status: Em manutenção 🔧
Previsão: amanhã até 18h
```

---

## Detecção de SIM/NÃO

```typescript
// bot.service.ts
async function processarRespostaCliente(telefone: string, texto: string) {
  const conversa = await getConversa(telefone);
  if (!conversa.aguardandoAprovacao || !conversa.osIdPendente) return;

  const resposta = texto.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (resposta === 'SIM') {
    await atualizarStatusOS(conversa.osIdPendente, 'em_manutencao');
    await enviarMensagem(telefone, 'Ótimo! Serviço autorizado ✅ Entraremos em contato quando ficar pronto.');
    await salvarConversa(telefone, { aguardandoAprovacao: false, osIdPendente: null });
  }

  if (resposta === 'NAO' || resposta === 'NÃO') {
    await atualizarStatusOS(conversa.osIdPendente, 'cancelado');
    await enviarMensagem(telefone, 'Entendido. Serviço cancelado. O aparelho pode ser retirado sem custo.');
    await salvarConversa(telefone, { aguardandoAprovacao: false, osIdPendente: null });
  }
  // qualquer outra coisa → só salvar a mensagem, atendente responde
}
```

---

## Backend — módulo `whatsapp/`

```
backend/src/modules/whatsapp/
├── whatsapp.router.ts
├── conexao.service.ts       ← Baileys: QR, sessão no Firestore, eventos
├── mensagem.service.ts      ← receber/enviar, processar mídia
├── vinculo.service.ts       ← normalizar telefone, buscar cliente + OS
├── acoes.service.ts         ← enviar orçamento, pronto, pagamento, status
└── bot.service.ts           ← detectar SIM/NÃO, atualizar OS

backend/src/shared/
└── normalizar-telefone.ts   ← função compartilhada com clientes

backend/src/scripts/
└── normalizar-telefones.ts  ← migração dos registros existentes
```

### Endpoints

| Método | Rota                                      | Descrição                              |
|--------|-------------------------------------------|----------------------------------------|
| GET    | `/api/whatsapp/status`                    | Status da conexão (conectado/QR/erro)  |
| GET    | `/api/whatsapp/qrcode`                    | QR code atual em base64                |
| GET    | `/api/whatsapp/conversas`                 | Lista conversas com cliente vinculado  |
| GET    | `/api/whatsapp/conversas/:telefone`       | Mensagens + cliente + OS da conversa   |
| POST   | `/api/whatsapp/enviar`                    | `{ telefone, texto }` envio manual     |
| POST   | `/api/whatsapp/acoes/enviar-orcamento`    | Enviar orçamento da OS                 |
| POST   | `/api/whatsapp/acoes/informar-pronto`     | Informar OS pronta                     |
| POST   | `/api/whatsapp/acoes/confirmar-pagamento` | Registrar pagamento + notificar        |
| POST   | `/api/whatsapp/acoes/enviar-status`       | Enviar status atual da OS              |

---

## Firestore — coleções

```
whatsapp_sessao/principal
  creds: object              ← credenciais Baileys (nunca expor via API)

whatsapp_conversas/{telefone}   ← telefone normalizado como chave
  clienteId: string | null
  nome: string               ← nome do cliente ou número se desconhecido
  ultimaMensagem: string
  ultimaInteracao: timestamp
  naoLidas: number
  aguardandoAprovacao: boolean
  osIdPendente: string | null

whatsapp_mensagens/{id}
  telefone: string           ← normalizado
  clienteId: string | null
  de: 'cliente' | 'atendente' | 'sistema'
  texto: string
  tipo: 'texto' | 'imagem' | 'audio' | 'video' | 'orcamento' | 'status' | 'pagamento'
  midiaUrl?: string          ← URL Firebase Storage (se for mídia)
  timestamp: timestamp
  lida: boolean
```

---

## Mudanças em módulos existentes

### `clientes.service.ts`
- Normalizar `telefone` no `create` e `update` antes de salvar.

### `clientes.repository.ts`
- Adicionar à interface `ClientesRepository`:
  ```typescript
  findByTelefone(telefone: string): Promise<Cliente | null>;
  ```
- Implementar em `FirestoreClientesRepository` com query `where('telefone', '==', telefone)`.
- Implementar em `MemoryClientesRepository` com `Array.find`.

### `infra/firebase/storage.rules`
- Adicionar path para mídia do WhatsApp:
  ```
  match /whatsapp/{telefone}/{fileName} {
    allow read, write: if isOperationalUser();
  }
  ```

---

## Frontend — componentes

```
frontend/src/pages/Atendimento.tsx
frontend/src/components/whatsapp/
├── ListaConversas.tsx    ← lista com badge de não lidas, ícone cliente/desconhecido
├── ChatConversa.tsx      ← histórico com suporte a texto, imagem, áudio, vídeo
├── PainelCliente.tsx     ← dados do cliente + lista de OS ativas
├── AcoesRapidas.tsx      ← botões contextuais por status da OS
├── CardOS.tsx            ← card resumido de cada OS
├── StatusConexao.tsx     ← barra de status + QR code quando desconectado
└── ModalPagamento.tsx    ← form de confirmação de pagamento
```

Atualização: polling a cada 3 segundos nos endpoints de conversas e mensagens.

---

## Permissões

Todos os perfis (`admin`, `atendente`, `tecnico`) podem acessar `/app/atendimento`.
Nenhuma restrição entre perfis — qualquer um pode responder qualquer conversa.

---

## Ordem de implementação

1. `normalizar-telefone.ts` — função compartilhada
2. Atualizar `clientes.service.ts` para normalizar ao salvar
3. Adicionar `findByTelefone` no `clientes.repository.ts`
4. Script `normalizar-telefones.ts` — migrar registros existentes
5. Atualizar `storage.rules` — adicionar path `whatsapp/`
6. `conexao.service.ts` — Baileys: QR code, sessão no Firestore
7. `mensagem.service.ts` — receber mensagens, processar mídia, upload Storage
8. `vinculo.service.ts` — normalizar + buscar cliente + OS ativas
9. `bot.service.ts` — detectar SIM/NÃO, atualizar OS
10. `acoes.service.ts` — 4 ações rápidas
11. `whatsapp.router.ts` — todos os endpoints, registrar em `server.ts`
12. `Atendimento.tsx` + componentes — layout 3 colunas, mídia, polling
13. Menu lateral — item "Atendimento"
14. Teste completo: QR → mensagem → imagem → orçamento → SIM → OS atualizada

---

## Limitações

- Baileys usa protocolo WhatsApp Web não oficial. Risco baixo para uso de loja pequena.
- O número conectado não pode ser usado no celular ao mesmo tempo (igual WhatsApp Web).
- Sessão no Firestore evita novo QR a cada restart do servidor.
- Clientes não cadastrados aparecem como "Desconhecido" — atendente pode cadastrá-los normalmente depois.

---

## Dependências a instalar

```bash
cd backend
npm install @whiskeysockets/baileys qrcode
npm install --save-dev @types/qrcode
```

---

## Referências

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Baileys — Download de mídia](https://whiskeysockets.github.io/Baileys/#downloading-media)
- [`clientes.repository.ts`](../backend/src/modules/clientes/clientes.repository.ts)
- [`clientes.types.ts`](../backend/src/modules/clientes/clientes.types.ts)
- [`ordens-servico.types.ts`](../backend/src/modules/ordens-servico/ordens-servico.types.ts)
- [`storage.rules`](../infra/firebase/storage.rules)
