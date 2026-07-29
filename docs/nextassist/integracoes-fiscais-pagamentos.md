# Integrações Fiscais e de Pagamentos

## Estado da implementação

Em 15 de julho de 2026, a primeira base multiempresa de integrações entrou em produção no NextAssist.

Entregue:

- Configuração fiscal por tenant para NFC-e e NFS-e.
- Configuração de certificado A1, CSC, ambiente, município e provedor de NFS-e.
- Contratos extensíveis `FiscalProvider` e `PaymentProvider`.
- OAuth do Mercado Pago com PKCE e credenciais globais da plataforma.
- Seleção de terminal Point por tenant.
- Criação, consulta e cancelamento de ordens de pagamento presencial.
- Validação do pagamento aprovado no backend antes de registrar a venda.
- Criptografia AES-256-GCM para credenciais e tokens persistidos.

Ainda não entregue:

- Emissão real de NFC-e e NFS-e nos ambientes fiscais.
- Adaptadores fiscais para SEFAZ e prefeituras.
- Webhook assinado do Mercado Pago; o fluxo atual consulta o status por polling.
- Estorno, chargeback e recuperação de pagamentos pendentes pela interface.
- Adaptadores de pagamento para Stone e PagBank.
- SmartPOS Stone e TEF.

## Separação entre plataforma e tenant

As credenciais OAuth da aplicação Mercado Pago pertencem à plataforma NextAssist e ficam no ambiente seguro do backend:

- `MERCADO_PAGO_CLIENT_ID`
- `MERCADO_PAGO_CLIENT_SECRET`
- `MERCADO_PAGO_OAUTH_REDIRECT_URI`
- `INTEGRATIONS_ENCRYPTION_KEY`
- `APP_URL`

Cada cliente conecta a própria conta pelo painel. Os tokens OAuth, terminal escolhido e configurações fiscais pertencem ao tenant e são salvos de forma isolada. O cliente não informa o Client ID ou Client Secret global do NextAssist.

Nunca salvar credenciais, senhas de certificado ou tokens em texto puro, no frontend, no Git ou em logs.

## Arquitetura

Frontend:

- `frontend/src/pages/Integracoes.tsx`: assistente de configuração fiscal e de pagamentos.
- `frontend/src/services/integracoes.ts`: cliente REST das integrações.
- Rota: `/app/configuracoes/integracoes`.

Backend:

- `backend/src/modules/integracoes/integracoes.routes.ts`: rotas autenticadas e tenant-aware.
- `backend/src/modules/integracoes/integracoes.public.routes.ts`: retorno público do OAuth.
- `backend/src/modules/integracoes/mercado-pago.service.ts`: PKCE, renovação de token, terminais e Orders.
- `backend/src/modules/integracoes/payment-transactions.service.ts`: normalização, aprovação, valor e consumo único do pagamento.
- `backend/src/modules/integracoes/integracoes.crypto.ts`: criptografia AES-256-GCM.
- `backend/src/modules/integracoes/providers.types.ts`: contratos de provedores.

Coleções Firestore:

- `tenantIntegrations`: configuração não secreta por tenant.
- `tenantIntegrationSecrets`: segredos criptografados por tenant.
- `integrationOAuthStates`: estados OAuth temporários e PKCE.
- `paymentTransactions`: transações integradas e vínculo com a venda.

## Fluxo Mercado Pago Point

1. O administrador conecta a conta Mercado Pago em Configurações > Integrações.
2. O backend cria o estado OAuth e o desafio PKCE.
3. O Mercado Pago retorna ao callback do backend.
4. O backend troca o código por tokens, criptografa-os e associa-os ao tenant.
5. O administrador seleciona um terminal Point.
6. No PDV, ao escolher cartão, o backend cria uma Order com chave de idempotência.
7. O frontend acompanha o status da Order.
8. Somente o status aprovado permite criar a venda.
9. O backend revalida tenant, status, valor e consumo único, registra a venda e marca a transação como consumida.

Callback de produção:

`https://rr-infocell-api-91248386036.southamerica-east1.run.app/api/integracoes/mercado-pago/oauth/callback`

Frontend de retorno atual:

`https://nextassist.web.app`

Domínios White Label personalizados exigirão uma origem de retorno permitida e registrada no estado OAuth; não se deve aceitar URL arbitrária enviada pelo navegador.

## Regras obrigatórias do PDV

- Nunca confiar apenas no status exibido pelo frontend.
- A venda integrada só pode ser criada após validação do pagamento pelo backend.
- Uma transação aprovada pode ser consumida por uma única venda.
- O valor aprovado deve cobrir o total exigido pela venda.
- A transação e a venda precisam pertencer ao mesmo tenant.
- Dinheiro, PIX não integrado, terceirizado e cartão sem integração mantêm o fluxo legado enquanto forem suportados pelo produto.

## Configuração fiscal por tenant

O assistente coleta UF, ambiente, regime tributário, certificado A1, CSC, série, numeração, município e provedor de NFS-e. Essa configuração prepara os adaptadores, mas não equivale a emissão fiscal ativa.

Antes de liberar emissão real, cada adaptador deve implementar:

- validação do certificado e de sua validade;
- montagem, assinatura e transmissão do documento;
- tratamento de rejeições e contingência;
- armazenamento seguro de XML, protocolo e DANFE/DANFSe;
- idempotência, auditoria e isolamento por tenant;
- homologação específica por UF ou município.

## Operação e secrets

Produção usa Secret Manager para valores sensíveis e GitHub Actions apenas para referências necessárias ao deploy. A chave de criptografia deve permanecer estável: trocá-la sem migração torna os segredos persistidos ilegíveis.

Não expor valores reais em documentação, screenshots, issues, PRs ou logs. Em caso de exposição, revogar/rotacionar imediatamente.

## Próximas etapas recomendadas

1. Adicionar webhook assinado e reconciliação de Orders do Mercado Pago.
2. Criar recuperação de pagamento pendente, cancelamento e estorno no PDV.
3. Implementar o primeiro adaptador fiscal em homologação.
4. Implementar Stone API e PagBank usando `PaymentProvider`.
5. Adicionar conciliação e relatórios por adquirente.
6. Somente depois evoluir para SmartPOS Stone e TEF.

## Referências externas

- [OAuth com PKCE do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation)
- [Orders para pagamentos presenciais Point](https://www.mercadopago.com.br/developers/pt/reference/in-person-payments/point/orders/create-order/post)
- [Visão geral do Mercado Pago Point](https://www.mercadopago.com.br/developers/pt/reference/in-person-payments/point/overview)
- [Documentação técnica da NFS-e Nacional](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual)
- [Produção restrita da NFS-e Nacional](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita)

## Histórico da entrega

- Pull request: [#12](https://github.com/cleberfarias/rr-infocell/pull/12)
- Merge em `main`: `d2f5f3f1ce3c8cdfd2762977122325c1cee8f2ce`
- Workflow de produção: [CI/CD 29446933300](https://github.com/cleberfarias/rr-infocell/actions/runs/29446933300)
