# Regras de Negócio — RR Infocell

Documento de referência para todas as regras de negócio do sistema. Serve como base para desenvolvimento, testes e validação com o cliente.

---

## 1. Ordem de Serviço (OS)

### 1.1 Criação

- Toda OS deve ter um **cliente vinculado**.
- Toda OS deve ter um **aparelho vinculado**.
- O **defeito relatado pelo cliente** é obrigatório.
- O número da OS é **gerado automaticamente** de forma sequencial (OS-1, OS-2...).
- **Valores de peças e mão de obra NÃO são obrigatórios** na abertura — a OS pode ser criada com valores zerados para aparelhos que entram em análise ou orçamento.
- O status inicial padrão é `recebido`. Pode ser alterado para `em_analise` na abertura.
- O técnico responsável é **opcional** na abertura.
- A data de entrada é preenchida automaticamente com a data atual.
- A garantia padrão é de **90 dias** (configurável por OS).

### 1.2 Status e fluxo

Os status seguem a ordem lógica abaixo. Qualquer status pode ser definido manualmente na Manutenção:

```
recebido → em_analise → aguardando_aprovacao → aguardando_peca → em_manutencao → pronto_para_retirada → entregue
                                                                                                         ↓
                                                                                                      cancelado (qualquer etapa)
```

| Status                 | Significado                                       |
| ---------------------- | ------------------------------------------------- |
| `recebido`             | Aparelho chegou, ainda não analisado              |
| `em_analise`           | Técnico avaliando o defeito                       |
| `aguardando_aprovacao` | Orçamento enviado, aguardando resposta do cliente |
| `aguardando_peca`      | Serviço pausado aguardando peça                   |
| `em_manutencao`        | Técnico executando o serviço                      |
| `pronto_para_retirada` | Serviço concluído, avisar o cliente               |
| `entregue`             | Aparelho devolvido ao cliente                     |
| `cancelado`            | OS encerrada sem execução                         |

### 1.3 Navegação automática do sistema

O sistema navega automaticamente entre telas ao salvar:

- **Nova OS** → salva → vai para **Checklist de entrada**
- **Checklist de entrada** → salva → vai para **Manutenção**
- **Manutenção** (status `aguardando_aprovacao`) → salva → vai para **Orçamento**
- **Manutenção** (status `pronto_para_retirada`) → salva → vai para **Detalhe da OS**
- **Orçamento** → Aprovar → vai para **Manutenção**

### 1.4 Cálculo de valores

- `valorTotal = max(0, valorPecas + valorMaoObra - desconto)`
- `valorPecas` = soma dos preços de venda das peças vinculadas à OS
- `valorMaoObra` = informado manualmente na Manutenção
- `desconto` = valor opcional informado diretamente na OS ou no fechamento do PDV
- O custo real de peças (para DRE) é calculado pelo custo cadastrado no estoque, não pelo preço de venda

### 1.5 Garantia

- O prazo de garantia padrão é de **90 dias**.
- O prazo e a observação da garantia podem ser ajustados por OS no Termo de Garantia.
- A garantia começa a contar **a partir da retirada do aparelho pelo cliente**.
- Antes da retirada, o termo mostra início como "A partir da retirada" e validade como "Calculada na retirada".
- Quando o PDV finaliza uma OS, o status muda para `entregue`, a data de retirada fica registrada em `entregueEm` e a data de validade (`garantiaAte`) é calculada automaticamente.
- O Termo de Garantia pode ser impresso no Detalhe da OS e também aparece como ação logo após finalizar o pagamento no PDV.

---

## 2. Checklist Técnico

### 2.1 Tipos

- **Entrada** — feito quando o aparelho chega. Obrigatório antes de iniciar a manutenção.
- **Saída** — feito antes de devolver o aparelho ao cliente. Confirma que o serviço foi executado.

### 2.2 Itens padrão do checklist de entrada

Tela, Touch, Câmera, Microfone, Alto-falante, Botões, Conector de carga, Wi-Fi, Bluetooth, Bateria.

### 2.3 Itens padrão do checklist de saída

Aparelho testado, Carga funcionando, Biometria/Face ID, Câmera, Áudio, Chip/rede, Senha removida ou confirmada.

### 2.4 Status por item

Cada item pode ser marcado como:

- `funcionando` — testado e ok
- `com_defeito` — problema identificado
- `nao_testado` — não foi possível testar

### 2.5 Fotos

- Fotos são opcionais mas recomendadas (arranhões, trincas, danos físicos).
- Armazenadas no Firebase Storage.
- Apenas usuários com custom claim `role` = `admin`, `atendente` ou `tecnico` podem fazer upload.
- Limite de upload por arquivo: **16 MB**.
- Timeout de upload: **120 segundos**.

---

## 3. Estoque e Produtos

### 3.1 Categorias

- Categorias padrão do sistema: `peca`, `produto`, `acessorio`, `servico`, `celular_novo`, `celular_seminovo`, `celular_restaurado`.
- O usuário pode criar categorias customizadas que ficam salvas no Firestore (coleção `categorias`).
- Categorias customizadas aparecem junto com as padrão no campo de seleção.

### 3.2 Marcas

- Marcas pré-cadastradas: Apple, Samsung, Motorola, Xiaomi, LG, Positivo, Nokia, Huawei, Sony, Lenovo.
- O usuário pode adicionar novas marcas que ficam salvas no Firestore (coleção `marcas`).

### 3.3 Campos obrigatórios

- `sku` — código único do produto.
- `nome` — descrição do produto.
- `categoria` — categoria do produto.
- `custo` — valor de custo (pode ser zero).
- `precoVenda` — valor de venda (pode ser zero).
- `estoqueAtual` — quantidade em estoque (mínimo 0).
- `estoqueMinimo` — ponto de reposição (mínimo 0).

### 3.4 Alerta de estoque baixo

- O produto é considerado com **estoque baixo** quando `estoqueAtual <= estoqueMinimo`.
- O produto é considerado **zerado** quando `estoqueAtual <= 0`.
- O Dashboard exibe card de alerta quando há produtos com estoque baixo.
- O percentual crítico é: `(qtd com estoque baixo / total de produtos) * 100`.
- O gauge fica **verde** quando o nível está acima de 80%, **âmbar** entre 40–79%, **vermelho** abaixo de 40%.

### 3.5 Movimentações de estoque

- Tipos: `entrada`, `saida`, `ajuste`, `transferencia`.
- **Entrada** — aumenta `estoqueAtual` pela quantidade informada.
- **Saída** — diminui `estoqueAtual` pela quantidade informada.
- **Ajuste** — define `estoqueAtual` para o valor final informado (inventário).
- **Transferência** — registrada como saída no sistema (mesmo local de estoque).
- O estoque **não pode ficar negativo** em movimentações normais.
- A baixa automática ocorre quando uma peça é vinculada a uma OS ou vendida no PDV.
- Os dados da NF-e (número, série, data de emissão, valor adicional) são opcionais e salvos no campo `motivo`.

### 3.6 Motivos de movimentação

**Saída:** Venda, Uso interno, Perda / Avaria, Devolução ao fornecedor, Ajuste de estoque, Amostra.

**Entrada:** Compra, Devolução de cliente, Ajuste de estoque, Produção, Brinde / Amostra.

**Ajuste:** Inventário, Correção de estoque, Avaria descoberta, Contagem física.

---

## 4. Orçamento

### 4.1 Ciclo de vida

- Um orçamento é criado quando o status da OS muda para `aguardando_aprovacao`.
- O status do orçamento pode ser: `enviado`, `aprovado` ou `reprovado`.
- Ao aprovar: OS passa para `em_manutencao`, orçamento fica `aprovado`.
- Ao reprovar: OS passa para `cancelado`, orçamento fica `reprovado`.
- O canal de aprovação deve ser registrado: `whatsapp`, `balcao` ou `telefone`.

### 4.2 Envio via WhatsApp

- Com WhatsApp conectado, o envio do orçamento é automático ao clicar "Enviado ao cliente".
- Sem WhatsApp, o botão apenas registra o status — o envio deve ser feito manualmente.

---

## 5. PDV / Caixa

### 5.1 Fechamento de OS

- Apenas OS com status `pronto_para_retirada` aparecem no PDV.
- O fechamento registra: forma de pagamento, desconto, valor recebido, troco e data/hora.
- Formas de pagamento: `dinheiro`, `pix`, `cartao_debito`, `cartao_credito`, `parcelado`, `outro`.
- O troco é calculado automaticamente para pagamentos em dinheiro.
- Após o fechamento, o status da OS muda para `entregue`.
- Após finalizar, o painel de pagamento exibe ações para imprimir cupom térmico, Termo de Garantia e comprovante.
- O botão **Imprimir termo de garantia** abre a OS finalizada já com a pré-visualização do termo pronta para impressão.

### 5.2 Venda direta

- Venda de produtos sem OS vinculada.
- Busca produtos do estoque por nome, SKU, marca, fornecedor e código.
- Suporta múltiplos itens no carrinho, desconto e formas de pagamento.
- A baixa no estoque é automática ao finalizar a venda.

---

## 5.3 Horário de atendimento

- Segunda a sexta: 8:00 às 12:00 e 13:30 às 18:00.
- Sábado: 8:00 às 12:00.

---

## 6. Financeiro

### 6.1 DRE simplificado

```
Receita de serviços       = soma de valorMaoObra das vendas/OS entregues
Receita de produtos       = soma de valorPecas das vendas/OS entregues
(-) Custo de peças        = soma do custo real das peças usadas (pelo custo do estoque)
= Lucro bruto
(-) Despesas fixas        = soma das despesas cadastradas
= Lucro líquido estimado
```

### 6.2 Contas bancárias

- Tipos disponíveis: `caixa`, `conta_corrente`, `conta_poupanca`, `pix`, `outro`.
- O saldo é atualizado manualmente — não há integração automática com bancos.
- Armazenadas na coleção `contas` do Firestore.

### 6.3 Exportação DRE em PDF

- Gera relatório em nova janela com DRE + histórico de pagamentos.
- Formato pronto para impressão.

---

## 7. Atendimento WhatsApp

### 7.1 Conexão

- Baseado em Baileys (conexão via QR code, não requer API oficial do WhatsApp).
- A conexão persiste até ser desconectada manualmente ou expirar.
- Status da conexão: `conectando`, `conectado`, `qr_pendente`, `desconectado`.

### 7.2 Vinculação com cliente

- Mensagens de números cadastrados são automaticamente vinculadas ao cliente.
- O JID canônico retornado por `onWhatsApp()` é usado para evitar problemas com o nono dígito.
- Mensagens `@lid` são resolvidas via `signalRepository.lidMapping.getPNForLID()`.

### 7.3 Automações operacionais

- **Lembrete de orçamento**: enviado automaticamente após X horas sem resposta (padrão: 24h).
- **Lembrete de retirada**: enviado automaticamente após X dias da OS pronta (padrão: 2 dias).
- **Autoarquivar**: conversas inativas por X dias são arquivadas automaticamente (padrão: 7 dias).

### 7.4 Mídias

- Tipos suportados: imagem, áudio, vídeo, documento, sticker.
- Armazenadas no Firebase Storage.
- Limite de envio: **16 MB** por arquivo.

---

## 8. Usuários e Permissões

### 8.1 Perfis

| Perfil      | Acesso                                                                                 |
| ----------- | -------------------------------------------------------------------------------------- |
| `admin`     | Todas as telas do sistema                                                              |
| `atendente` | OS, Checklist, Orçamento, PDV, Clientes, Aparelhos, Atendimento, Treinamento           |
| `tecnico`   | OS, Checklist, Manutenção, Orçamento, Estoque, Movimentações, Atendimento, Treinamento |

### 8.2 Regras de acesso

- Usuários sem token válido são redirecionados para o login.
- Usuários com perfil sem permissão para a rota são redirecionados para a home do seu perfil.
- Admin → home: `/app` (Dashboard).
- Atendente → home: `/app/ordens`.
- Técnico → home: `/app/manutencao`.

---

## 9. Assistente IA

- Powered by GPT-4o-mini via OpenAI API.
- Endpoint: `POST /api/ajuda/perguntar`.
- Requer `OPENAI_API_KEY` configurada no `.env` do backend.
- O prompt do sistema contém o conhecimento completo do sistema (fluxos, módulos, dicas, status).
- Responde em português, máximo 200 palavras por resposta.

---

## 10. Centro de Treinamento

- Disponível em `/app/treinamento` para todos os perfis.
- 9 módulos com guias passo a passo e screenshots reais das telas.
- Progresso por módulo salvo na sessão (não persistido no banco).
- Screenshots atualizáveis em `frontend/public/screenshots/`.

---

## 11. Regras gerais do sistema

- Datas são armazenadas no formato **ISO 8601** (UTC).
- Valores monetários são armazenados como **números em reais** (float, não centavos).
- IDs são gerados pelo Firestore (strings aleatórias).
- Campos opcionais não enviados no payload são omitidos (não salvos como `null`).
- O cache do React Query usa: 60s para OS/operacional, 5min para cadastrais, 10min para configurações.
- Polling do WhatsApp: 5s para lista de conversas, 3s para conversa ativa.
