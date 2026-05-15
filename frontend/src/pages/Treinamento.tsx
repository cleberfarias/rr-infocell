import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Play,
  X,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  gradiente: string;
  screenshot: string;
  rota: string;
  nivel: "básico" | "intermediário" | "avançado";
  tempoMinutos: number;
  passos: Passo[];
};

const modulos: Modulo[] = [
  {
    key: "os",
    titulo: "Ordens de Serviço",
    descricao: "Aprenda a abrir, acompanhar e fechar uma OS do início ao fim com cadastro rápido de cliente.",
    icone: HiWrenchScrewdriver,
    gradiente: "from-blue-900/80 via-blue-800/60 to-transparent",
    screenshot: "/screenshots/os.jpg",
    rota: ROUTES.novaOS,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Abrindo uma nova OS",
        descricao: 'Clique em "+ Nova OS" no topo da tela. Você pode buscar um cliente existente ou usar o "Cadastro rápido" para criar cliente e aparelho sem sair da tela.',
        dica: "Atalho: Ctrl+K → digite 'nova OS'",
      },
      {
        titulo: "Cadastro rápido de cliente e aparelho",
        descricao: 'Preencha nome e telefone do cliente, depois marca e modelo do aparelho. Clique em "Salvar cliente e aparelho" — ambos são criados ao mesmo tempo sem sair da OS.',
        dica: "Campos opcionais: CPF, e-mail, IMEI, cor, estado físico",
      },
      {
        titulo: "Descrevendo o defeito",
        descricao: "No campo 'Defeito relatado', escreva o que o cliente descreveu. Valores de peças e mão de obra são opcionais — podem ser preenchidos depois do diagnóstico.",
        dica: "Deixe os valores zerados para aparelhos que entram só para orçamento",
      },
      {
        titulo: "Salvando e indo ao Checklist",
        descricao: 'Clique em "Salvar OS e ir ao checklist". O sistema navega automaticamente. O fluxo completo é: OS → Checklist → Manutenção → Orçamento → Entrega.',
        dica: "O número da OS é gerado automaticamente",
      },
    ],
  },
  {
    key: "checklist",
    titulo: "Checklist Técnico",
    descricao: "Registre o estado do aparelho na entrada e saída. Proteção para a loja e transparência para o cliente.",
    icone: MdChecklist,
    gradiente: "from-sky-900/80 via-sky-800/60 to-transparent",
    screenshot: "/screenshots/checklist.jpg",
    rota: ROUTES.checklist,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "O que é o Checklist",
        descricao: "O checklist registra o estado físico e funcional do aparelho na entrada. Protege a loja de reclamações como 'a câmera não funcionava antes'.",
      },
      {
        titulo: "Preenchendo os itens",
        descricao: "Para cada item (tela, touch, câmera, microfone, etc.), marque 'Funcionando', 'Com defeito' ou 'Não testado'. Adicione observações específicas por item.",
        dica: "Itens com defeito ficam destacados em vermelho automaticamente",
      },
      {
        titulo: "Fotos do aparelho",
        descricao: "Clique em 'Anexar fotos' para registrar o estado visual (arranhões, trincas). Recomendado: foto frontal, traseira e laterais.",
        dica: "As fotos ficam salvas junto ao checklist da OS",
      },
      {
        titulo: "Salvando e avançando",
        descricao: "Clique em 'Salvar checklist'. O sistema vai automaticamente para Manutenção com a OS já selecionada, pronta para o técnico.",
      },
    ],
  },
  {
    key: "manutencao",
    titulo: "Manutenção",
    descricao: "Gerencie o diagnóstico técnico, peças utilizadas e acompanhe o progresso da OS em tempo real.",
    icone: MdHandyman,
    gradiente: "from-violet-900/80 via-violet-800/60 to-transparent",
    screenshot: "/screenshots/manutencao.jpg",
    rota: ROUTES.manutencao,
    nivel: "intermediário",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Selecionando a OS",
        descricao: "Na tela de Manutenção, selecione a OS no seletor do topo. Veja a barra de progresso do status, o histórico de eventos e os dados do cliente.",
      },
      {
        titulo: "Preenchendo o diagnóstico",
        descricao: "No campo 'Diagnóstico', escreva o que foi encontrado tecnicamente. Ex: 'Tela quebrada internamente após queda, touch sem resposta'.",
        dica: "O diagnóstico aparece no orçamento enviado ao cliente via WhatsApp",
      },
      {
        titulo: "Adicionando peças usadas",
        descricao: "Clique em 'Adicionar peças'. Busque pelo nome ou SKU e informe a quantidade. A baixa no estoque acontece automaticamente.",
        dica: "Peças com estoque zerado aparecem com alerta",
      },
      {
        titulo: "Enviando para orçamento",
        descricao: "Informe o valor de mão de obra, mude o status para 'Aguardando aprovação' e salve. O sistema vai automaticamente para Orçamentos.",
        dica: "Você pode pausar em 'Aguardando peça' se precisar pedir material",
      },
      {
        titulo: "Concluindo o serviço",
        descricao: "Após aprovação e execução, mude para 'Pronto para retirada' e salve. O sistema vai para o Detalhe da OS para imprimir o Termo de Garantia.",
      },
    ],
  },
  {
    key: "orcamento",
    titulo: "Orçamentos",
    descricao: "Envie, aprove ou reprove orçamentos. Integração direta com WhatsApp para comunicação rápida.",
    icone: TbFileCheck,
    gradiente: "from-amber-900/80 via-amber-800/60 to-transparent",
    screenshot: "/screenshots/orcamento.jpg",
    rota: ROUTES.orcamento,
    nivel: "intermediário",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Revisando o orçamento",
        descricao: "A tela mostra peças usadas, mão de obra e total. Confira os valores antes de enviar ao cliente.",
      },
      {
        titulo: "Enviando ao cliente",
        descricao: "Clique em 'Enviado ao cliente'. Com WhatsApp conectado, a mensagem é enviada automaticamente com os valores.",
        dica: "Você pode enviar manualmente e depois registrar no sistema",
      },
      {
        titulo: "Registrando aprovação",
        descricao: "Quando o cliente aprovar, clique em 'Aprovar'. Preencha quem aprovou e o canal (WhatsApp, balcão, telefone). O sistema volta para Manutenção.",
        dica: "O canal de aprovação fica registrado no histórico",
      },
      {
        titulo: "Reprovando",
        descricao: "Se o cliente recusar, clique em 'Reprovar'. Um diálogo de confirmação aparece antes de cancelar a OS.",
      },
    ],
  },
  {
    key: "estoque",
    titulo: "Estoque",
    descricao: "Controle produtos, peças e acessórios. Monitore o nível de estoque e receba alertas automáticos.",
    icone: MdInventory2,
    gradiente: "from-emerald-900/80 via-emerald-800/60 to-transparent",
    screenshot: "/screenshots/estoque.jpg",
    rota: ROUTES.estoque,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Dashboard de consulta",
        descricao: "A tela mostra SKUs ativos, itens com estoque baixo, investimento em custo e potencial de vendas. O gauge indica o nível geral do estoque.",
      },
      {
        titulo: "Cadastrando um produto",
        descricao: "Clique em '+ Novo produto'. No painel lateral, preencha SKU, categoria, nome, marca, custo e preço de venda. Informe a quantidade inicial e dados da NF-e se tiver.",
        dica: "Marca e categoria podem ser criadas na hora com o campo de busca",
      },
      {
        titulo: "Registrando movimentações",
        descricao: "Para dar entrada ou saída em produtos já cadastrados, clique em 'Movimentações'. Escolha o tipo, produto, quantidade e motivo.",
        dica: "Saída tem motivos pré-definidos: Venda, Uso interno, Perda/Avaria...",
      },
      {
        titulo: "Monitorando estoque baixo",
        descricao: "Use o filtro 'Estoque baixo' para ver produtos abaixo do mínimo. O Dashboard também mostra alertas com percentual crítico.",
        dica: "Consulte diariamente antes de abrir a loja",
      },
    ],
  },
  {
    key: "pdv",
    titulo: "PDV / Caixa",
    descricao: "Feche ordens de serviço com pagamento e realize vendas diretas de produtos e acessórios.",
    icone: MdPointOfSale,
    gradiente: "from-orange-900/80 via-orange-800/60 to-transparent",
    screenshot: "/screenshots/pdv.jpg",
    rota: ROUTES.pdv,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Fechamento de OS",
        descricao: "OS com status 'Pronto para retirada' aparecem na aba 'Fechar OS'. Selecione, escolha a forma de pagamento e registre o valor recebido.",
        dica: "O troco é calculado automaticamente para pagamentos em dinheiro",
      },
      {
        titulo: "Venda direta",
        descricao: "Na aba 'Venda direta', busque produtos pelo nome ou SKU, adicione ao carrinho, aplique desconto se necessário e finalize.",
        dica: "A baixa no estoque é automática ao finalizar",
      },
      {
        titulo: "Histórico do caixa",
        descricao: "A parte inferior mostra as últimas OS fechadas com data, forma de pagamento, valor total e troco. Útil como conferência do dia.",
      },
    ],
  },
  {
    key: "financeiro",
    titulo: "Financeiro",
    descricao: "Acompanhe receitas, despesas, lucro líquido e saldos bancários. Exporte o DRE em PDF.",
    icone: MdAccountBalance,
    gradiente: "from-blue-900/80 via-indigo-900/60 to-transparent",
    screenshot: "/screenshots/financeiro.jpg",
    rota: ROUTES.financeiro,
    nivel: "intermediário",
    tempoMinutos: 4,
    passos: [
      {
        titulo: "DRE simplificado",
        descricao: "A tela mostra receita de serviços, receita de produtos, custo de peças, lucro bruto, despesas fixas e lucro líquido estimado.",
      },
      {
        titulo: "Gráfico semanal",
        descricao: "O gráfico mostra a evolução da receita nos últimos 7 dias, separando serviços (azul) e produtos (verde).",
      },
      {
        titulo: "Contas bancárias",
        descricao: "Cadastre suas contas (Caixa, Conta Corrente, PIX) e mantenha os saldos atualizados. Clique no valor de uma conta para editar inline.",
        dica: "O saldo total de todas as contas aparece no card principal",
      },
      {
        titulo: "Exportar DRE em PDF",
        descricao: "Clique em 'Exportar PDF' para gerar um relatório completo com receitas, custos e histórico de pagamentos. O arquivo abre em nova aba.",
      },
    ],
  },
  {
    key: "atendimento",
    titulo: "Atendimento WhatsApp",
    descricao: "Gerencie conversas, envie orçamentos e confirme pagamentos diretamente pelo WhatsApp integrado.",
    icone: FaWhatsapp,
    gradiente: "from-green-900/80 via-emerald-900/60 to-transparent",
    screenshot: "/screenshots/atendimento.jpg",
    rota: ROUTES.atendimento,
    nivel: "avançado",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Conectando o WhatsApp",
        descricao: "Se aparecer 'Desconectado', clique em 'Escanear QR'. Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → Escaneie o QR.",
        dica: "A conexão fica ativa. Se cair, repita o processo",
      },
      {
        titulo: "Gerenciando conversas",
        descricao: "A coluna esquerda mostra todas as conversas. Use os filtros (Ativas, Não lidas, Arquivadas). Clique numa conversa para abrir o chat.",
        dica: "Números não cadastrados aparecem sem nome",
      },
      {
        titulo: "Enviando mensagens",
        descricao: "Digite e pressione Enter. Use ⚡ para respostas rápidas, 📎 para anexos e 🎤 para gravar áudio.",
        dica: "Shift+Enter para nova linha sem enviar",
      },
      {
        titulo: "Ações rápidas de OS",
        descricao: "No painel direito (ⓘ no mobile), veja as OS do cliente e use os botões: 'Enviar orçamento', 'Informar pronto', 'Confirmar pagamento', 'Enviar status'.",
        dica: "As ações enviam mensagens automáticas com dados da OS",
      },
    ],
  },
  {
    key: "aparelhos",
    titulo: "Aparelhos",
    descricao: "Consulte e gerencie o histórico de aparelhos por cliente. Útil para atendimentos recorrentes.",
    icone: MdPhoneAndroid,
    gradiente: "from-slate-900/80 via-gray-900/60 to-transparent",
    screenshot: "/screenshots/aparelhos.jpg",
    rota: ROUTES.aparelhos,
    nivel: "básico",
    tempoMinutos: 2,
    passos: [
      {
        titulo: "Lista de aparelhos",
        descricao: "Mostra todos os dispositivos cadastrados com marca, modelo, IMEI, cliente vinculado e quantas OS foram realizadas.",
      },
      {
        titulo: "Histórico por aparelho",
        descricao: "Clique num aparelho para ver todo o histórico de serviços realizados. Identifique aparelhos recorrentes ou consulte o que foi feito antes.",
      },
    ],
  },
];

const nivelCor: Record<string, string> = {
  básico: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  intermediário: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  avançado: "bg-red-500/15 text-red-500 border-red-500/30",
};

export default function Treinamento() {
  const [moduloAberto, setModuloAberto] = useState<Modulo | null>(null);
  const [passoAtivo, setPassoAtivo] = useState(0);
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());

  const abrirModulo = (modulo: Modulo) => {
    setModuloAberto(modulo);
    setPassoAtivo(0);
  };

  const marcarConcluido = (key: string) => {
    setConcluidos((prev) => new Set([...prev, key]));
    setModuloAberto(null);
  };

  const totalConcluidos = concluidos.size;
  const progressoPct = Math.round((totalConcluidos / modulos.length) * 100);
  const passoAtual = moduloAberto?.passos[passoAtivo];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aprendizado"
        title="Centro de treinamento"
        description="Aprenda a usar cada módulo do sistema com guias passo a passo."
      />

      {/* Progresso */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
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
          <p className="font-display text-2xl font-bold text-primary">{progressoPct}%</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progressoPct}%` }}
          />
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((modulo) => {
          const Icon = modulo.icone;
          const concluido = concluidos.has(modulo.key);

          return (
            <div
              key={modulo.key}
              className={cn(
                "group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5",
                concluido ? "border-emerald-500/40" : "border-border",
              )}
            >
              {/* Screenshot com overlay */}
              <div className="relative h-40 overflow-hidden bg-secondary">
                {/* Screenshot real da tela */}
                <img
                  src={modulo.screenshot}
                  alt={modulo.titulo}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay gradiente para legibilidade */}
                <div className={cn("absolute inset-0 bg-gradient-to-t", modulo.gradiente)} />
                {/* Ícone no canto */}
                <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {concluido && (
                  <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/80 backdrop-blur-sm">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <Badge variant="outline" className="text-[10px] border bg-black/30 text-white border-white/20 backdrop-blur-sm">
                    {modulo.nivel}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] text-white/80 drop-shadow">
                  ~{modulo.tempoMinutos} min · {modulo.passos.length} passos
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-base font-semibold">{modulo.titulo}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground leading-relaxed">
                  {modulo.descricao}
                </p>
              </div>

              {/* Botão */}
              <div className="border-t border-border p-4">
                <Button
                  className={cn(
                    "w-full font-semibold",
                    concluido
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90",
                  )}
                  onClick={() => abrirModulo(modulo)}
                >
                  {concluido ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Módulo concluído
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar treinamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Parabéns */}
      {totalConcluidos === modulos.length && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-display text-lg font-bold text-emerald-500">
            Parabéns! Você completou todos os módulos.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Em caso de dúvida, use o assistente ✨ no canto inferior direito.
          </p>
        </div>
      )}

      {/* Sheet com o guia passo a passo */}
      <Sheet open={!!moduloAberto} onOpenChange={(open) => !open && setModuloAberto(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {moduloAberto && passoAtual && (() => {
            const Icon = moduloAberto.icone;
            return (
              <>
                {/* Header com screenshot + overlay */}
                <div className="relative flex items-center gap-4 p-6 overflow-hidden">
                  <img src={moduloAberto.screenshot} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-40" />
                  <div className={cn("absolute inset-0 bg-gradient-to-r", moduloAberto.gradiente, "opacity-90")} />
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-white">{moduloAberto.titulo}</p>
                    <p className="text-xs text-white/70">
                      Passo {passoAtivo + 1} de {moduloAberto.passos.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setModuloAberto(null)}
                    className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Índice de passos */}
                <div className="flex gap-1.5 border-b border-border bg-secondary/20 px-6 py-3">
                  {moduloAberto.passos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPassoAtivo(idx)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                        idx === passoAtivo
                          ? "bg-primary text-primary-foreground"
                          : idx < passoAtivo
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-secondary text-muted-foreground hover:bg-accent",
                      )}
                      title={moduloAberto.passos[idx].titulo}
                    >
                      {idx < passoAtivo ? "✓" : idx + 1}
                    </button>
                  ))}
                </div>

                {/* Conteúdo do passo */}
                <div className="flex-1 overflow-y-auto p-6">
                  <h3 className="font-display text-lg font-semibold mb-3">{passoAtual.titulo}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{passoAtual.descricao}</p>

                  {passoAtual.dica && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <span className="shrink-0 text-base">💡</span>
                      <p className="text-sm text-primary/80">{passoAtual.dica}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 space-y-3">
                  {/* Navegação */}
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={passoAtivo === 0}
                      onClick={() => setPassoAtivo((p) => p - 1)}
                    >
                      ← Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {passoAtivo + 1} / {moduloAberto.passos.length}
                    </span>
                    {passoAtivo < moduloAberto.passos.length - 1 ? (
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                        onClick={() => setPassoAtivo((p) => p + 1)}
                      >
                        Próximo <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => marcarConcluido(moduloAberto.key)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    )}
                  </div>

                  {/* Link para praticar */}
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
                    <Link to={moduloAberto.rota} onClick={() => setModuloAberto(null)}>
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Praticar no módulo
                    </Link>
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
