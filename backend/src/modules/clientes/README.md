# Modulo Clientes

## Objetivo

Gerenciar a base de clientes do RR Infocell. Este modulo alimenta os cadastros de aparelhos, ordens de servico e historico de atendimento.

## Status atual

Implementado com API REST, validacao Zod, service, repository Firestore, fallback em memoria e testes de rotas.

Quando o Firebase Admin SDK estiver configurado, os dados sao persistidos na colecao `clientes` do Firestore. Com `FIRESTORE_EMULATOR_HOST`, o modulo usa o Firestore Emulator sem service account. Sem credenciais ou emulador, os dados ficam em memoria; cadastros criados durante a execucao local sao perdidos ao reiniciar o backend.

## Endpoints

```text
GET /api/clientes
GET /api/clientes?q=termo
GET /api/clientes/:id
POST /api/clientes
PUT /api/clientes/:id
DELETE /api/clientes/:id
```

## Campos

- `id`
- `nome`
- `telefone`
- `documento`
- `email`
- `endereco`
- `observacoes`
- `createdAt`
- `updatedAt`

## Payload de criacao/edicao

```json
{
  "nome": "Marcos Almeida",
  "telefone": "(11) 98432-1290",
  "documento": "123.456.789-00",
  "email": "marcos@example.com",
  "endereco": "Rua Exemplo, 123",
  "observacoes": "Cliente recorrente"
}
```

Campos obrigatorios:

- `nome`
- `telefone`

Campos opcionais:

- `documento`
- `email`
- `endereco`
- `observacoes`

## Busca

A busca em `GET /api/clientes?q=termo` consulta:

- nome
- telefone
- documento
- email

## Validacoes

- Nome deve ter pelo menos 2 caracteres.
- Telefone deve ter pelo menos 8 caracteres.
- E-mail, quando informado, deve ter formato valido.
- Campos opcionais vazios sao tratados como ausentes.

## Arquivos principais

- `clientes.routes.ts`: rotas HTTP.
- `clientes.schemas.ts`: validacao de entrada e busca.
- `clientes.service.ts`: regras de aplicacao.
- `clientes.repository.ts`: armazenamento Firestore e fallback em memoria.
- `clientes.types.ts`: tipos do modulo.
- `clientes.routes.test.ts`: testes de contrato das rotas.

## Testes

```bash
cd backend
npm test -- clientes
```

Cobertura atual:

- listagem
- busca
- criacao
- edicao
- exclusao
- erro de validacao

## Proximos passos

- Criar verificacao de duplicidade por telefone/documento.
- Adicionar paginacao quando houver volume real.
- Vincular aparelhos e ordens de servico ao cliente.
