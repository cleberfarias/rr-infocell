# WhatsApp - Central de Atendimento RR Infocell

Modulo de central de atendimento via WhatsApp integrado ao sistema RR Infocell.

## Status

- [x] Conexao WhatsApp via QR code usando Baileys.
- [x] Sessao local ignorada pelo Git em `backend/whatsapp-auth/`.
- [x] Backend `backend/src/modules/whatsapp/` com status, QR code, conversas, envio manual e acoes de OS.
- [x] Painel frontend `/app/atendimento` com lista de conversas, chat, contexto do cliente e OS ativas.
- [x] Envio de mensagens usando JID canonico retornado por `onWhatsApp()`.
- [x] Recebimento de mensagens `@lid` resolvido para telefone real via `signalRepository.lidMapping`.
- [x] Recebimento de imagem, audio, video, documento e sticker com upload para Firebase Storage.
- [x] Envio de imagem, audio, video, documento e sticker pela tela de Atendimento.
- [x] Gravacao de audio direto no navegador para envio pelo WhatsApp.
- [x] Emojis, respostas rapidas, busca e filtros de conversas na tela de Atendimento.
- [x] Controle de fila com status, responsavel, notas internas e arquivar/restaurar.
- [x] Recebimento de contato compartilhado e localizacao como link.
- [x] Status de mensagens enviadas quando o WhatsApp informa enviado, entregue ou lido.
- [x] Automacoes de OS: mensagem ao abrir OS, aviso por mudanca de status, lembrete de orcamento, lembrete de retirada e autoarquivamento.
- [x] Automacao de checklist: avisa o cliente quando o checklist de entrada da OS e criado.
- [x] Mensagem de aparelho pronto inclui valor, chave PIX opcional e pedido de confirmacao da forma de pagamento.
- [x] Polling da tela de Atendimento a cada 1,5s.
- [x] Diagnostico em `/api/whatsapp/status` com ultimo evento, ultimo envio, recibos e motivos de descarte.
- [x] Chatbot basico para resposta de aprovacao/rejeicao de orcamento (`SIM`/`NAO`).
- [ ] WhatsApp automatico avancado, campanhas e templates oficiais.

## Pontos tecnicos importantes

### Envio

O banco guarda telefones sem DDI, por exemplo `48999019525`.

No envio, o backend:

1. normaliza o telefone interno;
2. consulta o WhatsApp com `onWhatsApp()`;
3. usa o JID canonico retornado pelo proprio WhatsApp para chamar `sendMessage()`.

Isso evita falhas com a regra do nono digito. Exemplo real encontrado:

- JID montado manualmente: `5548999019525@s.whatsapp.net`
- JID canonico retornado pelo WhatsApp: `554899019525@s.whatsapp.net`

### Recebimento

O WhatsApp pode entregar mensagens novas como `@lid`, por exemplo:

```text
238181840617639@lid
```

Antes de salvar, o backend resolve esse LID para o telefone real usando:

```ts
socket.signalRepository.lidMapping.getPNForLID(lid)
```

Depois disso a mensagem e gravada em `whatsapp_mensagens` com `telefone` normalizado e atualiza `whatsapp_conversas`.

Midias recebidas sao baixadas com `downloadMediaMessage()` e gravadas no Firebase Storage em:

```text
whatsapp/{telefone}/{messageId}.{ext}
```

Tipos tratados:

- `imageMessage` -> `imagem`
- `audioMessage` -> `audio`
- `videoMessage` -> `video`
- `documentMessage` -> `documento`
- `stickerMessage` -> `sticker`
- `contactMessage` / `contactsArrayMessage` -> `contato`
- `locationMessage` / `liveLocationMessage` -> `localizacao`

O sistema tambem salva metadados quando disponiveis:

- `midiaUrl`
- `midiaMimeType`
- `midiaNome`
- `midiaTamanho`

### Envio de midia

Endpoint:

```http
POST /api/whatsapp/enviar-midia
```

Payload:

```json
{
  "telefone": "48999019525",
  "base64": "...",
  "mimeType": "audio/mp4",
  "nomeArquivo": "audio.m4a",
  "legenda": "opcional"
}
```

O backend detecta o tipo pelo `mimeType`:

- `image/*` -> imagem
- `audio/*` -> audio, incluindo formatos comuns de Android e iOS como `audio/ogg`, `audio/mpeg`, `audio/mp4`, `audio/aac`
- `video/*` -> video
- `image/webp` -> sticker
- demais tipos -> documento

Limite atual: 16 MB por arquivo.

### Automacoes de atendimento

Arquivo principal:

```text
backend/src/modules/whatsapp/automacoes.service.ts
```

Disparos automaticos:

- Ao criar OS: envia confirmacao de abertura para o cliente.
- Ao criar checklist de entrada: envia resumo do checklist para o cliente da OS.
- Ao mudar status para `em_analise`: avisa que entrou em analise tecnica.
- Ao mudar status para `aguardando_peca`: avisa que depende de peca.
- Ao mudar status para `em_manutencao`: avisa que o servico foi iniciado.
- Ao mudar status para `pronto_para_retirada`: avisa que esta pronto, informa valor e inclui chave PIX quando configurada.
- Ao mudar status para `entregue` ou `cancelado`: marca a conversa como `finalizado`.
- Rotina periodica: cobra orcamento pendente, lembra retirada pendente e arquiva conversas finalizadas antigas.

Endpoint manual para rodar pendencias:

```http
POST /api/whatsapp/automacoes/processar-pendencias
```

Variaveis opcionais:

```text
ATENDIMENTO_PIX_CHAVE=
ATENDIMENTO_PIX_NOME=
ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS=24
ATENDIMENTO_LEMBRETE_RETIRADA_DIAS=2
ATENDIMENTO_AUTOARQUIVAR_DIAS=7
```

As automacoes sao best effort: se o WhatsApp estiver desconectado, a criacao/alteracao da OS continua funcionando.

### Diagnostico

Use:

```http
GET /api/whatsapp/status
```

Campos uteis:

- `diagnostico.conectadoComo`: numero conectado no WhatsApp.
- `diagnostico.ultimoEventoTipo`: ultimo evento recebido do Baileys.
- `diagnostico.ultimaMensagemRecebidaDe`: JID/telefone resolvido da ultima mensagem recebida.
- `diagnostico.ultimaMensagemIgnoradaMotivo`: motivo de descarte, se houver.
- `diagnostico.ultimoEnvioPara`: JID canonico usado no ultimo envio.
- `diagnostico.ultimoUpdateStatus`: status de entrega retornado pelo WhatsApp.

## Como testar

1. Abrir `/app/atendimento`.
2. Confirmar que aparece `WhatsApp conectado`.
3. Enviar mensagem do sistema para um cliente.
4. Enviar imagem, audio, video ou documento pelo botao de anexo.
5. Gravar um audio pelo botao de microfone e enviar.
6. Usar emojis e respostas rapidas no campo de mensagem.
7. Enviar uma resposta pelo WhatsApp do cliente para o numero conectado.
8. Testar audio, contato, localizacao e midias vindos de Android e iOS.
9. Conferir se a mensagem aparece no chat em ate 1,5s.
10. Se nao aparecer, consultar `/api/whatsapp/status` e verificar `ultimaMensagemIgnoradaMotivo`.

## Cuidados

- Nunca versionar `backend/whatsapp-auth/`.
- O teste de recebimento precisa vir de outro WhatsApp, nao do mesmo numero conectado ao sistema.
- Baileys usa protocolo WhatsApp Web nao oficial; manter diagnostico ativo ajuda a investigar mudancas de comportamento do WhatsApp.

## Plano original

Leia o [PROMPT.md](./PROMPT.md) para o plano completo de implementacao e arquitetura.
