# WhatsApp - Central de Atendimento RR Infocell

Modulo de central de atendimento via WhatsApp integrado ao sistema RR Infocell.

## Status

- [x] Conexao WhatsApp via QR code usando Baileys.
- [x] Sessao local ignorada pelo Git em `backend/whatsapp-auth/`.
- [x] Backend `backend/src/modules/whatsapp/` com status, QR code, conversas, envio manual e acoes de OS.
- [x] Painel frontend `/app/atendimento` com lista de conversas, chat, contexto do cliente e OS ativas.
- [x] Envio de mensagens usando JID canonico retornado por `onWhatsApp()`.
- [x] Recebimento de mensagens `@lid` resolvido para telefone real via `signalRepository.lidMapping`.
- [x] Polling da tela de Atendimento a cada 1,5s.
- [x] Diagnostico em `/api/whatsapp/status` com ultimo evento, ultimo envio, recibos e motivos de descarte.
- [x] Chatbot basico para resposta de aprovacao/rejeicao de orcamento (`SIM`/`NAO`).
- [ ] Fila avancada de atendimento humano.
- [ ] WhatsApp automatico avancado e templates.

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
4. Enviar uma resposta pelo WhatsApp do cliente para o numero conectado.
5. Conferir se a mensagem aparece no chat em ate 1,5s.
6. Se nao aparecer, consultar `/api/whatsapp/status` e verificar `ultimaMensagemIgnoradaMotivo`.

## Cuidados

- Nunca versionar `backend/whatsapp-auth/`.
- O teste de recebimento precisa vir de outro WhatsApp, nao do mesmo numero conectado ao sistema.
- Baileys usa protocolo WhatsApp Web nao oficial; manter diagnostico ativo ajuda a investigar mudancas de comportamento do WhatsApp.

## Plano original

Leia o [PROMPT.md](./PROMPT.md) para o plano completo de implementacao e arquitetura.
