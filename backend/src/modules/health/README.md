# Modulo Health

## Objetivo

Expor um endpoint simples para verificar se a API esta no ar e se o Firebase Admin SDK foi configurado.

## Status atual

Implementado.

Endpoint disponivel:

```text
GET /api/health
```

## Resposta

```json
{
  "data": {
    "status": "ok",
    "service": "rr-infocell-backend",
    "firebaseAdmin": "configured",
    "timestamp": "2026-04-28T13:41:40.266Z"
  }
}
```

O campo `firebaseAdmin` pode retornar:

- `configured`: credenciais do Firebase Admin SDK foram carregadas.
- `not_configured`: a API esta rodando sem credenciais Firebase.

## Uso

Este endpoint deve ser usado para:

- testar se o backend subiu localmente;
- validar probes de deploy;
- confirmar rapidamente se o Firebase Admin esta disponivel.

## Proximos passos

- Adicionar checagem opcional de conectividade com Firestore.
- Adicionar informacao de versao/build quando o deploy estiver definido.
