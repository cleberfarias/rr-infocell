import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Play,
} from "lucide-react";
import {
  MdDashboard,
  MdHandyman,
  MdInventory2,
  MdPointOfSale,
  MdAccountBalance,
  MdChecklist,
  MdPhoneAndroid,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import { TbFileCheck } from "react-icons/tb";

import { PageHeader } from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";

type Passo = {
  titulo: string;
  descricao: string;
  dica?: string;
};

type Modulo = {
  key: string;
  titulo: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
  cor: string;
  corTexto: string;
  rota: string;
  nivel: "básico" | "intermediário" | "avançado";
  tempoMinutos: number;
  passos: Passo[];
};

const modulos: Modulo[] = [
  {
    key: "os",
    titulo: "Ordens de Serviço",
    descricao: "Aprenda a abrir, acompanhar e fechar uma OS do início ao fim.",
    icone: HiWrenchScrewdriver,
    cor: "bg-primary/10 border-primary/30",
    corTexto: "text-primary",
    rota: ROUTES.novaOS,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Abrindo uma nova OS",
        descricao:
          'Clique em "+ Nova OS" no topo da tela ou no botão circular no centro do menu mobile. Na tela que abrir, preencha o nome e telefone do cliente no painel "Cadastro rápido" — você não precisa sair da tela para cadastrar o cliente.',
        dica: "Atalho: Ctrl+K → digite 'nova OS'",
      },
      {
        titulo: "Cadastro rápido de cliente e aparelho",
        descricao:
          'Preencha os dados do cliente (nome e telefone são suficientes) e os dados do aparelho (marca e modelo) no mesmo painel. Clique em "Salvar cliente e aparelho" — ambos são criados ao mesmo tempo.',
        dica: "Campos opcionais: CPF, e-mail, IMEI, cor, estado físico",
      },
      {
        titulo: "Descrevendo o defeito",
        descricao:
          'No campo "Defeito relatado pelo cliente", escreva exatamente o que o cliente disse. Não precisa ser técnico — é o relato do cliente. Valores de peças e mão de obra são opcionais neste momento.',
        dica: "Deixe os valores zerados para aparelhos que entram só para orçamento",
      },
      {
        titulo: "Salvando e indo ao Checklist",
        descricao:
          'Clique em "Salvar OS e ir ao checklist". O sistema navega automaticamente para o checklist de entrada. Isso mantém o registro de entrada do aparelho.',
        dica: "O fluxo é automático: OS → Checklist → Manutenção → Orçamento → Entrega",
      },
    ],
  },
  {
    key: "checklist",
    titulo: "Checklist Técnico",
    descricao: "Registre o estado do aparelho na entrada e saída para proteção da loja.",
    icone: MdChecklist,
    cor: "bg-sky-500/10 border-sky-500/30",
    corTexto: "text-sky-500",
    rota: ROUTES.checklist,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "O que é o Checklist",
        descricao:
          "O checklist registra o estado físico e funcional do aparelho no momento da entrada. Isso protege a loja de reclamações posteriores do tipo 'a câmera não funcionava antes'.",
      },
      {
        titulo: "Preenchendo o Checklist de Entrada",
        descricao:
          "Para cada item (tela, touch, câmera, microfone, etc.), marque como 'Funcionando', 'Com defeito' ou 'Não testado'. Use o campo de observação para anotar detalhes específicos de cada item.",
        dica: "Itens com defeito ficam destacados em vermelho automaticamente",
      },
      {
        titulo: "Fotos do aparelho",
        descricao:
          "Clique em 'Anexar fotos' para registrar o estado físico visual do aparelho (arranhões, trincas, etc.). As fotos ficam salvas junto ao checklist da OS.",
        dica: "Recomendado: foto frontal, traseira e laterais",
      },
      {
        titulo: "Salvando e avançando",
        descricao:
          "Clique em 'Salvar checklist'. O sistema vai automaticamente para a tela de Manutenção com a OS já selecionada, pronta para o técnico trabalhar.",
      },
    ],
  },
  {
    key: "manutencao",
    titulo: "Manutenção",
    descricao: "Gerencie o diagnóstico técnico, peças e status da OS.",
    icone: MdHandyman,
    cor: "bg-violet-500/10 border-violet-500/30",
    corTexto: "text-violet-500",
    rota: ROUTES.manutencao,
    nivel: "intermediário",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Selecionando a OS",
        descricao:
          "Na tela de Manutenção, selecione a OS no seletor do topo. O sistema mostra o histórico de eventos, os dados do cliente e aparelho, e a barra de progresso do status.",
      },
      {
        titulo: "Preenchendo o diagnóstico",
        descricao:
          "No campo 'Diagnóstico', escreva o que foi encontrado tecnicamente. Exemplo: 'Tela quebrada internamente após queda, touch sem resposta, bateria com 85% de saúde'.",
        dica: "O diagnóstico aparece no orçamento enviado ao cliente",
      },
      {
        titulo: "Adicionando peças usadas",
        descricao:
          "Clique em 'Adicionar peças' na seção de Peças e Serviços. Busque a peça do estoque pelo nome ou SKU e informe a quantidade. A baixa no estoque é feita automaticamente.",
        dica: "Peças sem estoque aparecerão com alerta",
      },
      {
        titulo: "Enviando para orçamento",
        descricao:
          "Informe o valor de mão de obra, mude o status para 'Aguardando aprovação' e clique em Salvar. O sistema vai automaticamente para a tela de Orçamentos.",
        dica: "Você também pode mudar o status para 'Aguardando peça' se precisar pedir peça",
      },
      {
        titulo: "Concluindo o serviço",
        descricao:
          "Após o cliente aprovar e a manutenção ser realizada, mude o status para 'Pronto para retirada' e salve. O sistema vai para o Detalhe da OS para imprimir o Termo de Garantia.",
      },
    ],
  },
  {
    key: "orcamento",
    titulo: "Orçamentos",
    descricao: "Envie, aprove ou reprove orçamentos com o cliente via WhatsApp.",
    icone: TbFileCheck,
    cor: "bg-amber-500/10 border-amber-500/30",
    corTexto: "text-amber-500",
    rota: ROUTES.orcamento,
    nivel: "intermediário",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Revisando o orçamento",
        descricao:
          "A tela de Orçamentos mostra as peças usadas, o valor de mão de obra e o total a cobrar. Confira se os valores estão corretos antes de enviar ao cliente.",
      },
      {
        titulo: "Enviando ao cliente",
        descricao:
          "Clique em 'Enviado ao cliente' para registrar que o orçamento foi enviado e atualizar o status da OS. Se o WhatsApp estiver conectado, a mensagem é enviada automaticamente.",
        dica: "Você pode enviar manualmente pelo WhatsApp e depois clicar no botão para registrar",
      },
      {
        titulo: "Registrando a aprovação",
        descricao:
          "Quando o cliente aprovar, clique em 'Aprovar'. Preencha quem aprovou, o canal (WhatsApp, balcão ou telefone) e a mensagem de resposta. O sistema volta para Manutenção.",
        dica: "O canal de aprovação fica registrado no histórico da OS",
      },
      {
        titulo: "Reprovando o orçamento",
        descricao:
          "Se o cliente recusar, clique em 'Reprovar'. Um diálogo de confirmação aparece antes de cancelar a OS. Isso registra o motivo e encerra o atendimento.",
      },
    ],
  },
  {
    key: "estoque",
    titulo: "Estoque",
    descricao: "Gerencie produtos, peças e acessórios com controle de nível.",
    icone: MdInventory2,
    cor: "bg-emerald-500/10 border-emerald-500/30",
    corTexto: "text-emerald-600",
    rota: ROUTES.estoque,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Visão geral do estoque",
        descricao:
          "A tela de Estoque é um dashboard de consulta. Ela mostra SKUs ativos, itens com estoque baixo, o investimento em custo e o potencial de vendas. O gauge no painel direito indica o nível geral do estoque.",
      },
      {
        titulo: "Cadastrando um produto novo",
        descricao:
          "Clique em '+ Novo produto'. No painel lateral que abre, preencha: SKU, categoria, nome, marca, modelo, custo e preço de venda. Escolha o tipo de movimentação (Entrada) e a quantidade inicial. Se tiver nota fiscal, preencha os dados da NF-e.",
        dica: "Marca e categoria podem ser criadas na hora com o botão '+' nos campos",
      },
      {
        titulo: "Registrando movimentações",
        descricao:
          "Para dar entrada ou saída em produtos já cadastrados, clique em 'Movimentações'. Selecione o tipo (Entrada, Saída, Transferência ou Ajuste), o produto, a quantidade e o motivo.",
        dica: "Saída tem motivos pré-definidos: Venda, Uso interno, Perda/Avaria...",
      },
      {
        titulo: "Monitorando estoque baixo",
        descricao:
          "Clique em 'Estoque baixo' na barra de filtros para ver apenas os produtos abaixo do mínimo. O Dashboard também mostra um alerta com o percentual crítico. Use isso diariamente para repor o estoque.",
      },
    ],
  },
  {
    key: "pdv",
    titulo: "PDV / Caixa",
    descricao: "Feche OS com pagamento e realize vendas diretas de produtos.",
    icone: MdPointOfSale,
    cor: "bg-orange-500/10 border-orange-500/30",
    corTexto: "text-orange-500",
    rota: ROUTES.pdv,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Fechamento de OS",
        descricao:
          "Quando uma OS está 'Pronta para retirada', ela aparece na aba 'Fechar OS' do PDV. Selecione a OS, escolha a forma de pagamento (PIX, dinheiro, cartão) e registre o valor recebido.",
        dica: "O troco é calculado automaticamente para pagamentos em dinheiro",
      },
      {
        titulo: "Venda direta",
        descricao:
          "Na aba 'Venda direta', busque produtos do estoque pelo nome ou SKU, adicione ao carrinho, aplique desconto se necessário e finalize com a forma de pagamento.",
        dica: "A baixa no estoque é automática ao finalizar a venda",
      },
      {
        titulo: "Histórico de pagamentos",
        descricao:
          "A parte inferior do PDV mostra as últimas OS fechadas no caixa com data, forma de pagamento, valor total e troco. Isso serve como histórico do dia.",
      },
    ],
  },
  {
    key: "financeiro",
    titulo: "Financeiro",
    descricao: "Acompanhe receitas, despesas, lucro e contas bancárias.",
    icone: MdAccountBalance,
    cor: "bg-blue-500/10 border-blue-500/30",
    corTexto: "text-blue-500",
    rota: ROUTES.financeiro,
    nivel: "intermediário",
    tempoMinutos: 4,
    passos: [
      {
        titulo: "DRE simplificado",
        descricao:
          "A tela mostra o Demonstrativo de Resultado (DRE): receita de serviços, receita de produtos, custo de peças, lucro bruto, despesas fixas e lucro líquido estimado.",
      },
      {
        titulo: "Gráfico semanal",
        descricao:
          "O gráfico de área mostra a evolução da receita nos últimos 7 dias, separando serviços (azul) e produtos (verde). Use para identificar dias mais movimentados.",
      },
      {
        titulo: "Contas bancárias",
        descricao:
          "Na seção 'Contas e saldos', cadastre suas contas (Caixa, Conta Corrente, PIX, etc.) e mantenha os saldos atualizados. Clique no valor de uma conta para editar o saldo diretamente.",
        dica: "O saldo total de todas as contas aparece no card principal",
      },
      {
        titulo: "Exportar DRE em PDF",
        descricao:
          "Clique em 'Exportar PDF' para gerar um relatório completo com todas as receitas, custos e o histórico de pagamentos. O PDF abre em uma nova aba para impressão.",
      },
    ],
  },
  {
    key: "atendimento",
    titulo: "Atendimento WhatsApp",
    descricao: "Gerencie conversas, envie orçamentos e confirme pagamentos pelo WhatsApp.",
    icone: FaWhatsapp,
    cor: "bg-emerald-500/10 border-emerald-500/30",
    corTexto: "text-emerald-600",
    rota: ROUTES.atendimento,
    nivel: "avançado",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Conectando o WhatsApp",
        descricao:
          "Na tela de Atendimento, se aparecer 'Desconectado', clique em 'Escanear QR'. Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → Escaneie o QR code.",
        dica: "A conexão fica ativa. Se cair, repita o processo de QR code",
      },
      {
        titulo: "Gerenciando conversas",
        descricao:
          "A coluna esquerda mostra todas as conversas. Use os filtros (Ativas, Não lidas, Arquivadas) para organizar. Clique em uma conversa para abrir o chat.",
        dica: "Números não cadastrados aparecem sem nome — cadastre o cliente para vincular",
      },
      {
        titulo: "Enviando mensagens e mídia",
        descricao:
          "Digite no campo de texto e pressione Enter para enviar. Use ⚡ para respostas rápidas pré-definidas, 📎 para anexar arquivos e 🎤 para gravar áudio.",
        dica: "Shift+Enter para nova linha sem enviar",
      },
      {
        titulo: "Ações rápidas de OS",
        descricao:
          "No painel direito da conversa (clique em ⓘ no mobile), veja as OS ativas do cliente. Botões de ação: 'Enviar orçamento', 'Informar pronto', 'Confirmar pagamento' e 'Enviar status'.",
        dica: "As ações enviam mensagens automáticas com os dados da OS",
      },
    ],
  },
  {
    key: "aparelhos",
    titulo: "Aparelhos",
    descricao: "Consulte e gerencie o histórico de aparelhos por cliente.",
    icone: MdPhoneAndroid,
    cor: "bg-slate-500/10 border-slate-500/30",
    corTexto: "text-slate-500",
    rota: ROUTES.aparelhos,
    nivel: "básico",
    tempoMinutos: 2,
    passos: [
      {
        titulo: "Lista de aparelhos",
        descricao:
          "A tela de Aparelhos mostra todos os dispositivos cadastrados, com marca, modelo, IMEI, cliente vinculado e quantas OS já foram feitas naquele aparelho.",
      },
      {
        titulo: "Histórico por aparelho",
        descricao:
          "Clique em um aparelho para ver todo o histórico de serviços realizados. Útil para identificar aparelhos recorrentes ou consultar o que foi feito anteriormente.",
      },
    ],
  },
];

const nivelCor: Record<string, string> = {
  básico: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  intermediário: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  avançado: "bg-red-500/10 text-red-500 border-red-500/30",
};

export default function Treinamento() {
  const [aberto, setAberto] = useState<string | null>(null);
  const [passoAtivo, setPassoAtivo] = useState<number>(0);
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());

  const toggleModulo = (key: string) => {
    if (aberto === key) {
      setAberto(null);
    } else {
      setAberto(key);
      setPassoAtivo(0);
    }
  };

  const marcarConcluido = (key: string) => {
    setConcluidos((prev) => new Set([...prev, key]));
    setAberto(null);
  };

  const totalConcluidos = concluidos.size;
  const progressoPct = Math.round((totalConcluidos / modulos.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aprendizado"
        title="Centro de treinamento"
        description="Aprenda a usar cada módulo do sistema com guias passo a passo."
      />

      {/* Progresso geral */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Seu progresso</p>
              <p className="text-sm text-muted-foreground">
                {totalConcluidos} de {modulos.length} módulos concluídos
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold text-primary">{progressoPct}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progressoPct}%` }}
          />
        </div>
      </div>

      {/* Módulos */}
      <div className="space-y-3">
        {modulos.map((modulo) => {
          const Icon = modulo.icone;
          const estaAberto = aberto === modulo.key;
          const concluido = concluidos.has(modulo.key);
          const passoAtual = modulo.passos[passoAtivo];

          return (
            <Card
              key={modulo.key}
              className={cn(
                "surface-panel overflow-hidden border transition-all",
                concluido && "border-emerald-500/30",
                estaAberto && "ring-1 ring-primary/30",
              )}
            >
              {/* Cabeçalho do módulo */}
              <button
                className="flex w-full items-center gap-4 p-5 text-left hover:bg-accent/30 transition-colors"
                onClick={() => toggleModulo(modulo.key)}
              >
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border", modulo.cor)}>
                  <Icon className={cn("h-5 w-5", modulo.corTexto)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-semibold">{modulo.titulo}</p>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5", nivelCor[modulo.nivel])}>
                      {modulo.nivel}
                    </Badge>
                    {concluido && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] px-1.5">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{modulo.descricao}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    ~{modulo.tempoMinutos} min · {modulo.passos.length} passos
                  </span>
                  {estaAberto ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Conteúdo expandido */}
              {estaAberto && (
                <div className="border-t border-border">
                  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[200px_1fr]">
                    {/* Índice de passos */}
                    <div className="border-b border-border lg:border-b-0 lg:border-r bg-secondary/20 p-4">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Passos
                      </p>
                      <ol className="space-y-1">
                        {modulo.passos.map((passo, idx) => (
                          <li key={idx}>
                            <button
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors",
                                passoAtivo === idx
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                              onClick={() => setPassoAtivo(idx)}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                  passoAtivo === idx
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground",
                                )}
                              >
                                {idx + 1}
                              </span>
                              <span className="truncate">{passo.titulo}</span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Conteúdo do passo */}
                    <div className="p-6">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {passoAtivo + 1}
                        </span>
                        <h3 className="font-display text-base font-semibold">{passoAtual.titulo}</h3>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                        {passoAtual.descricao}
                      </p>

                      {passoAtual.dica && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                          <span className="text-sm font-semibold text-primary shrink-0">💡</span>
                          <p className="text-sm text-primary/80">{passoAtual.dica}</p>
                        </div>
                      )}

                      {/* Navegação entre passos */}
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={passoAtivo === 0}
                          onClick={() => setPassoAtivo((p) => p - 1)}
                        >
                          ← Anterior
                        </Button>

                        <span className="text-xs text-muted-foreground">
                          {passoAtivo + 1} / {modulo.passos.length}
                        </span>

                        {passoAtivo < modulo.passos.length - 1 ? (
                          <Button
                            size="sm"
                            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                            onClick={() => setPassoAtivo((p) => p + 1)}
                          >
                            Próximo <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link to={modulo.rota}>
                                <Play className="h-3.5 w-3.5 mr-1" /> Praticar
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => marcarConcluido(modulo.key)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer motivacional */}
      {totalConcluidos === modulos.length && (
        <Card className="surface-panel border-emerald-500/30 p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-display text-lg font-bold text-emerald-500">
            Parabéns! Você completou todos os módulos.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Você já sabe usar o sistema completo. Em caso de dúvida, use o assistente ✨ no canto inferior direito.
          </p>
        </Card>
      )}
    </div>
  );
}
