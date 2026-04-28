# Modulo Ordens de Servico

## Objetivo

Gerenciar o fluxo central do sistema: abertura, acompanhamento, manutencao, conclusao e entrega das ordens de servico.

## Status atual

Scaffold inicial.

Endpoint disponivel:

```text
GET /api/ordens-servico
```

Resposta atual:

```json
{
  "data": [],
  "meta": {
    "module": "ordens-servico",
    "status": "scaffold"
  }
}
```

## Campos previstos

- `id`
- `numero`
- `clienteId`
- `aparelhoId`
- `checklistId`
- `defeitoRelatado`
- `diagnostico`
- `status`
- `tecnicoResponsavel`
- `valorPecas`
- `valorMaoObra`
- `valorTotal`
- `entradaEm`
- `previsaoEntregaEm`
- `concluidaEm`
- `entregueEm`
- `createdAt`
- `updatedAt`

## Status previstos

- `recebido`
- `em_analise`
- `aguardando_aprovacao`
- `aguardando_peca`
- `em_manutencao`
- `pronto_para_retirada`
- `entregue`
- `cancelado`

## Regras previstas

- Toda OS deve estar vinculada a um cliente e a um aparelho.
- Numero da OS deve ser sequencial e gerado pelo backend.
- Mudancas relevantes de status devem gerar historico.
- OS entregue ou cancelada nao deve aceitar edicoes operacionais sem regra explicita.

## Proximos passos

- Criar schema de validacao.
- Criar service e repository.
- Implementar geracao de numero sequencial.
- Integrar com clientes, aparelhos e checklists.
- Integrar com Firestore.
- Criar testes de rotas.
