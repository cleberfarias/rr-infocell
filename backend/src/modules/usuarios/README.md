# Modulo Usuarios

## Objetivo

Gerenciar usuarios internos do Firebase Auth e seus niveis de acesso dentro da aplicacao.

## Status atual

Endpoints administrativos implementados usando Firebase Admin SDK. Todas as rotas exigem token Firebase Auth de um usuario com custom claim `role=admin`.

Endpoints disponiveis:

```text
GET /api/usuarios
POST /api/usuarios
PUT /api/usuarios/:uid
```

Roles permitidas:

- `admin`
- `atendente`
- `tecnico`

## Regras

- O frontend nunca recebe credenciais administrativas do Firebase.
- A criacao e atualizacao de usuarios passa pelo backend.
- Apenas `admin` pode listar, criar ou alterar usuarios.
- Depois de mudar a claim `role`, o usuario afetado precisa sair e entrar novamente para receber token novo.
