import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Play,
  Receipt,
  Search,
  Settings,
  UserCog,
  Users,
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
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
    key: "dashboard",
    titulo: "Dashboard",
    descricao:
      "Entenda os indicadores do mês, alertas operacionais e atalhos para as tarefas que exigem atenção.",
    icone: MdDashboard,
    gradiente: "from-indigo-600 via-blue-600 to-cyan-500",
    screenshot: "/screenshots/financeiro.jpg",
    rota: ROUTES.dashboard,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Visão mensal",
        descricao:
          "Os cards resumem o mês selecionado: faturamento, ordens, ticket médio e situação operacional. Use as setas para consultar outros meses.",
      },
      {
        titulo: "Alertas que exigem atenção",
        descricao:
          "Confira OS atrasadas, aparelhos prontos para retirada, orçamentos aguardando aprovação e produtos com estoque baixo.",
        dica: "Clique nos alertas para abrir a lista já filtrada.",
      },
      {
        titulo: "Atalhos e busca",
        descricao:
          "Use Nova OS para iniciar um atendimento e a busca do topo para localizar rapidamente uma OS, cliente ou IMEI.",
      },
    ],
  },
  {
    key: "clientes",
    titulo: "Clientes",
    descricao:
      "Cadastre clientes, mantenha os contatos atualizados e consulte aparelhos e atendimentos vinculados.",
    icone: Users,
    gradiente: "from-cyan-600 via-sky-500 to-blue-500",
    screenshot: "/screenshots/aparelhos.jpg",
    rota: ROUTES.clientes,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Cadastrando um cliente",
        descricao:
          "Clique em Novo cliente e informe pelo menos nome e telefone. CPF/CNPJ, e-mail e endereço podem ser adicionados quando disponíveis.",
      },
      {
        titulo: "Evitando duplicidades",
        descricao:
          "Antes de cadastrar, pesquise pelo nome, telefone ou documento. Na abertura de OS, prefira selecionar o cliente já existente.",
      },
      {
        titulo: "Histórico do cliente",
        descricao:
          "Abra o cadastro para atualizar seus dados e identificar os aparelhos e ordens relacionados.",
      },
    ],
  },
  {
    key: "os",
    titulo: "Ordens de Serviço",
    descricao:
      "Aprenda a abrir, acompanhar e fechar uma OS do início ao fim com cadastro rápido de cliente.",
    icone: HiWrenchScrewdriver,
    gradiente: "from-blue-600 via-blue-500 to-cyan-500",
    screenshot: "/screenshots/os.jpg",
    rota: ROUTES.novaOS,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Abrindo uma nova OS",
        descricao:
          'Clique em "+ Nova OS" no topo da tela. Você pode buscar um cliente existente ou usar o "Cadastro rápido" para criar cliente e aparelho sem sair da tela.',
        dica: "Atalho: Ctrl+K → digite 'nova OS'",
      },
      {
        titulo: "Cadastro rápido de cliente e aparelho",
        descricao:
          'Preencha nome e telefone do cliente, depois marca e modelo do aparelho. Clique em "Salvar cliente e aparelho" — ambos são criados ao mesmo tempo sem sair da OS.',
        dica: "Campos opcionais: CPF, e-mail, IMEI, cor, estado físico",
      },
      {
        titulo: "Descrevendo o defeito",
        descricao:
          "No campo 'Defeito relatado', escreva o que o cliente descreveu. Valores de peças e mão de obra são opcionais — podem ser preenchidos depois do diagnóstico.",
        dica: "Deixe os valores zerados para aparelhos que entram só para orçamento",
      },
      {
        titulo: "Salvando e indo ao Checklist",
        descricao:
          'Clique em "Salvar OS e ir ao checklist". O sistema navega automaticamente. O fluxo completo é: OS → Checklist → Manutenção → Orçamento → Entrega.',
        dica: "O número da OS é gerado automaticamente",
      },
    ],
  },
  {
    key: "checklist",
    titulo: "Checklist Técnico",
    descricao:
      "Registre o estado do aparelho na entrada e saída. Proteção para a loja e transparência para o cliente.",
    icone: MdChecklist,
    gradiente: "from-sky-600 via-sky-500 to-blue-400",
    screenshot: "/screenshots/checklist.jpg",
    rota: ROUTES.checklist,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "O que é o Checklist",
        descricao:
          "O checklist registra o estado físico e funcional do aparelho na entrada. Protege a loja de reclamações como 'a câmera não funcionava antes'.",
      },
      {
        titulo: "Preenchendo os itens",
        descricao:
          "Os itens iniciam como 'Não testado'. Para cada item (tela, touch, câmera, microfone, etc.), marque 'Funcionando', 'Com defeito' ou mantenha 'Não testado'. Adicione observações específicas por item.",
        dica: "Itens com defeito ficam destacados em vermelho automaticamente",
      },
      {
        titulo: "Fotos do aparelho",
        descricao:
          "Clique em 'Anexar fotos' para registrar o estado visual (arranhões, trincas). Recomendado: foto frontal, traseira e laterais.",
        dica: "As fotos ficam salvas junto ao checklist da OS",
      },
      {
        titulo: "Salvando e avançando",
        descricao:
          "Clique em 'Salvar checklist'. O sistema vai automaticamente para Manutenção com a OS já selecionada, pronta para o técnico.",
      },
    ],
  },
  {
    key: "manutencao",
    titulo: "Manutenção",
    descricao:
      "Gerencie o diagnóstico técnico, peças utilizadas e acompanhe o progresso da OS em tempo real.",
    icone: MdHandyman,
    gradiente: "from-violet-600 via-purple-500 to-fuchsia-500",
    screenshot: "/screenshots/manutencao.jpg",
    rota: ROUTES.manutencao,
    nivel: "intermediário",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Selecionando a OS",
        descricao:
          "Na tela de Manutenção, selecione a OS no seletor do topo. Veja a barra de progresso do status, o histórico de eventos e os dados do cliente.",
      },
      {
        titulo: "Preenchendo o diagnóstico",
        descricao:
          "No campo 'Diagnóstico', escreva o que foi encontrado tecnicamente. Ex: 'Tela quebrada internamente após queda, touch sem resposta'.",
        dica: "O diagnóstico aparece no orçamento enviado ao cliente via WhatsApp",
      },
      {
        titulo: "Adicionando peças usadas",
        descricao:
          "Clique em 'Adicionar peças'. Pesquise pelo código, nome ou valor, selecione a peça e informe a quantidade. A baixa no estoque acontece automaticamente.",
        dica: "A busca facilita localizar itens quando o estoque tiver muitas peças cadastradas.",
      },
      {
        titulo: "Enviando para orçamento",
        descricao:
          "Informe o valor de mão de obra quando ela for cobrada à parte. Se já estiver inclusa na peça, marque 'Inclusa na peça'. Depois mude o status para 'Aguardando aprovação' e salve.",
        dica: "Mão de obra zerada não aparece para o cliente como R$ 0,00.",
      },
      {
        titulo: "Concluindo o serviço",
        descricao:
          "Após aprovação e execução, informe o prazo/observação da garantia se necessário, mude para 'Pronto para retirada' e salve. O sistema vai para o Detalhe da OS para conferir o Termo de Garantia.",
        dica: "A validade real da garantia só é calculada quando o cliente retira o aparelho e a OS é finalizada no PDV.",
      },
    ],
  },
  {
    key: "orcamento",
    titulo: "Orçamentos",
    descricao:
      "Envie, aprove ou reprove orçamentos. Integração direta com WhatsApp para comunicação rápida.",
    icone: TbFileCheck,
    gradiente: "from-amber-500 via-orange-500 to-yellow-400",
    screenshot: "/screenshots/orcamento.jpg",
    rota: ROUTES.orcamento,
    nivel: "intermediário",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Revisando o orçamento",
        descricao:
          "A tela mostra peças usadas, mão de obra e total. Confira os valores antes de enviar ao cliente.",
      },
      {
        titulo: "Enviando ao cliente",
        descricao:
          "Clique em 'Enviado ao cliente'. Com WhatsApp conectado, a mensagem é enviada automaticamente com os valores.",
        dica: "Você pode enviar manualmente e depois registrar no sistema",
      },
      {
        titulo: "Registrando aprovação",
        descricao:
          "Quando o cliente aprovar, clique em 'Aprovar'. Preencha quem aprovou e o canal (WhatsApp, balcão, telefone). O sistema volta para Manutenção.",
        dica: "O canal de aprovação fica registrado no histórico",
      },
      {
        titulo: "Reprovando",
        descricao:
          "Se o cliente recusar, clique em 'Reprovar'. Um diálogo de confirmação aparece antes de cancelar a OS.",
      },
    ],
  },
  {
    key: "estoque",
    titulo: "Estoque",
    descricao:
      "Controle produtos, peças e acessórios. Monitore o nível de estoque e receba alertas automáticos.",
    icone: MdInventory2,
    gradiente: "from-emerald-600 via-green-500 to-teal-400",
    screenshot: "/screenshots/estoque.jpg",
    rota: ROUTES.estoque,
    nivel: "básico",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Dashboard de consulta",
        descricao:
          "A tela mostra SKUs ativos, itens com estoque baixo, investimento em custo e potencial de vendas. O gauge indica o nível geral do estoque.",
      },
      {
        titulo: "Cadastrando um produto",
        descricao:
          "Clique em '+ Novo produto'. Preencha SKU, categoria, nome, marca, custo e preço de venda. O custo aceita vírgula ou ponto e o estoque mínimo inicia em 0.",
        dica: "Marca e categoria podem ser criadas na hora com o campo de busca.",
      },
      {
        titulo: "Registrando movimentações",
        descricao:
          "Para dar entrada ou saída em produtos já cadastrados, clique em 'Movimentações'. Escolha o tipo, produto, quantidade e motivo.",
        dica: "Saída tem motivos pré-definidos: Venda, Uso interno, Perda/Avaria...",
      },
      {
        titulo: "Monitorando estoque baixo",
        descricao:
          "Use o filtro 'Estoque baixo' para ver produtos abaixo do mínimo. O Dashboard também mostra alertas com percentual crítico.",
        dica: "Consulte diariamente antes de abrir a loja",
      },
    ],
  },
  {
    key: "pdv",
    titulo: "PDV / Caixa",
    descricao:
      "Feche ordens de serviço com pagamento e realize vendas diretas de produtos e acessórios.",
    icone: MdPointOfSale,
    gradiente: "from-orange-600 via-red-500 to-pink-500",
    screenshot: "/screenshots/pdv.jpg",
    rota: ROUTES.pdv,
    nivel: "básico",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Fechamento de OS",
        descricao:
          "OS com status 'Pronto para retirada' aparecem na aba 'Fechar OS'. Selecione, escolha a forma de pagamento, aplique desconto se necessário e registre o valor recebido. Se o desconto já foi lançado na OS, o total já aparece abatido.",
        dica: "Ao finalizar, a OS vira 'Entregue' e a garantia passa a contar a partir da retirada do aparelho.",
      },
      {
        titulo: "Imprimindo o termo de garantia",
        descricao:
          "Depois de finalizar o pagamento, o painel 'Pagamento finalizado' mostra o botão 'Imprimir termo de garantia'. Clique nele para abrir a OS com a prévia do termo já pronta para impressão.",
        dica: "No termo aparecem a data da retirada e a validade calculada pelo prazo de garantia da OS.",
      },
      {
        titulo: "Venda direta",
        descricao:
          "Na aba 'Venda direta', busque produtos pelo nome ou SKU, adicione ao carrinho, aplique desconto se necessário e finalize.",
        dica: "A baixa no estoque é automática ao finalizar",
      },
      {
        titulo: "Histórico do caixa",
        descricao:
          "A parte inferior mostra as últimas OS fechadas com data, forma de pagamento, valor total e troco. Útil como conferência do dia.",
      },
    ],
  },
  {
    key: "financeiro",
    titulo: "Financeiro",
    descricao:
      "Acompanhe receitas, despesas por vencimento, lucro líquido e saldos bancários. Exporte o DRE em PDF.",
    icone: MdAccountBalance,
    gradiente: "from-blue-700 via-indigo-600 to-blue-500",
    screenshot: "/screenshots/financeiro.jpg",
    rota: ROUTES.financeiro,
    nivel: "intermediário",
    tempoMinutos: 4,
    passos: [
      {
        titulo: "DRE simplificado",
        descricao:
          "A tela mostra receita de serviços, receita de produtos, custo de peças, lucro bruto, despesas do período e lucro líquido estimado.",
      },
      {
        titulo: "Despesas por vencimento",
        descricao:
          "As despesas entram no DRE pelo mês do vencimento, mesmo quando são pagas em outra data. O pagamento não move a despesa entre competências.",
      },
      {
        titulo: "Gráfico semanal",
        descricao:
          "O gráfico mostra a evolução da receita nos últimos 7 dias, separando serviços (azul) e produtos (verde).",
      },
      {
        titulo: "Contas bancárias",
        descricao:
          "Cadastre suas contas (Caixa, Conta Corrente, PIX) e mantenha os saldos atualizados. Clique no valor de uma conta para editar inline.",
        dica: "O saldo total de todas as contas aparece no card principal",
      },
      {
        titulo: "Exportar DRE em PDF",
        descricao:
          "Clique em 'Exportar PDF' para gerar um relatório completo com receitas, custos e histórico de pagamentos. O arquivo abre em nova aba.",
      },
    ],
  },
  {
    key: "atendimento",
    titulo: "Atendimento WhatsApp",
    descricao:
      "Gerencie conversas, envie orçamentos e confirme pagamentos diretamente pelo WhatsApp integrado.",
    icone: FaWhatsapp,
    gradiente: "from-green-600 via-emerald-500 to-teal-500",
    screenshot: "/screenshots/atendimento.jpg",
    rota: ROUTES.atendimento,
    nivel: "avançado",
    tempoMinutos: 5,
    passos: [
      {
        titulo: "Conectando o WhatsApp",
        descricao:
          "Se aparecer 'Desconectado', clique em 'Escanear QR'. Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → Escaneie o QR.",
        dica: "A conexão fica ativa. Se cair, repita o processo",
      },
      {
        titulo: "Gerenciando conversas",
        descricao:
          "A coluna esquerda mostra todas as conversas. Use os filtros (Ativas, Não lidas, Arquivadas). Clique numa conversa para abrir o chat.",
        dica: "Números não cadastrados aparecem sem nome",
      },
      {
        titulo: "Enviando mensagens",
        descricao:
          "Digite e pressione Enter. Use ⚡ para respostas rápidas, 📎 para anexos e 🎤 para gravar áudio.",
        dica: "Shift+Enter para nova linha sem enviar",
      },
      {
        titulo: "Ações rápidas de OS",
        descricao:
          "No painel direito (ⓘ no mobile), veja as OS do cliente e use os botões: 'Enviar orçamento', 'Informar pronto', 'Confirmar pagamento', 'Enviar status'.",
        dica: "As ações enviam mensagens automáticas com dados da OS",
      },
    ],
  },
  {
    key: "aparelhos",
    titulo: "Aparelhos",
    descricao:
      "Consulte e gerencie o histórico de aparelhos por cliente. Útil para atendimentos recorrentes.",
    icone: MdPhoneAndroid,
    gradiente: "from-slate-600 via-gray-500 to-zinc-400",
    screenshot: "/screenshots/aparelhos.jpg",
    rota: ROUTES.aparelhos,
    nivel: "básico",
    tempoMinutos: 2,
    passos: [
      {
        titulo: "Lista de aparelhos",
        descricao:
          "Mostra todos os dispositivos cadastrados com marca, modelo, IMEI, cliente vinculado e quantas OS foram realizadas.",
      },
      {
        titulo: "Histórico por aparelho",
        descricao:
          "Clique num aparelho para ver todo o histórico de serviços realizados. Identifique aparelhos recorrentes ou consulte o que foi feito antes.",
      },
    ],
  },
  {
    key: "despesas",
    titulo: "Despesas",
    descricao:
      "Registre contas únicas, despesas fixas mensais e compras parceladas com pagamento independente por mês.",
    icone: Receipt,
    gradiente: "from-rose-600 via-pink-500 to-orange-400",
    screenshot: "/screenshots/financeiro.jpg",
    rota: ROUTES.despesas,
    nivel: "intermediário",
    tempoMinutos: 4,
    passos: [
      {
        titulo: "Escolhendo o tipo",
        descricao:
          "Use Única para uma conta isolada, Fixa mensal para aluguel e outras contas sem prazo final, ou Parcelada para uma quantidade definida de parcelas.",
      },
      {
        titulo: "Fixa mensal",
        descricao:
          "Informe somente o dia. Ao acessar uma nova competência, o sistema cria o lançamento daquele mês em aberto, sem duplicar os meses existentes.",
        dica: "O pagamento de um mês nunca marca os próximos como pagos.",
      },
      {
        titulo: "Despesa parcelada",
        descricao:
          "Informe o dia e a quantidade de parcelas. Cada parcela recebe seu próprio vencimento e sequência, como 1/12 e 2/12.",
      },
      {
        titulo: "Baixa e competência",
        descricao:
          "Clique em Em aberto para registrar o pagamento. O financeiro continua contabilizando a despesa no mês do vencimento.",
      },
    ],
  },
  {
    key: "usuarios",
    titulo: "Usuários e permissões",
    descricao:
      "Crie acessos para a equipe e defina o perfil adequado para cada função da operação.",
    icone: UserCog,
    gradiente: "from-slate-700 via-slate-600 to-blue-500",
    screenshot: "/screenshots/os.jpg",
    rota: ROUTES.usuarios,
    nivel: "avançado",
    tempoMinutos: 3,
    passos: [
      {
        titulo: "Criando um usuário",
        descricao:
          "Cadastre nome, e-mail e perfil. Use uma conta individual para cada colaborador; não compartilhe a senha do administrador.",
      },
      {
        titulo: "Escolhendo o perfil",
        descricao:
          "Administrador possui acesso amplo. Atendente trabalha com clientes, OS e caixa; técnico acompanha checklist, manutenção e estoque conforme suas permissões.",
      },
      {
        titulo: "Revisando acessos",
        descricao:
          "Desative usuários que saíram da equipe e revise periodicamente quem pode acessar financeiro e configurações.",
      },
    ],
  },
  {
    key: "configuracoes",
    titulo: "Configurações da empresa",
    descricao:
      "Atualize identidade, dados da empresa, mensagens e integrações específicas do seu ambiente.",
    icone: Settings,
    gradiente: "from-zinc-700 via-neutral-600 to-stone-500",
    screenshot: "/screenshots/atendimento.jpg",
    rota: "/app/configuracoes",
    nivel: "avançado",
    tempoMinutos: 4,
    passos: [
      {
        titulo: "Dados e identidade",
        descricao:
          "Confira nome, documento, endereço, contatos e identidade visual. Esses dados pertencem à empresa atual.",
      },
      {
        titulo: "Mensagens",
        descricao:
          "Personalize os textos usados no atendimento e nas comunicações com clientes.",
      },
      {
        titulo: "Integrações",
        descricao:
          "Conecte apenas as contas da própria empresa. Uma configuração salva não significa que uma nota fiscal já foi emitida ou autorizada.",
      },
    ],
  },
];

const nivelCor: Record<string, string> = {
  básico: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  intermediário: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  avançado: "bg-red-500/15 text-red-500 border-red-500/30",
};

const progressoStorageKey = "nextassist-treinamento-concluidos";
type NivelFiltro = "todos" | Modulo["nivel"];

export default function Treinamento() {
  const { role } = useAuth();
  const [moduloAberto, setModuloAberto] = useState<Modulo | null>(null);
  const [passoAtivo, setPassoAtivo] = useState(0);
  const [concluidos, setConcluidos] = useState<Set<string>>(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem(progressoStorageKey) ?? "[]");
      return new Set(Array.isArray(salvos) ? salvos : []);
    } catch {
      return new Set();
    }
  });
  const [busca, setBusca] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState<NivelFiltro>("todos");

  useEffect(() => {
    localStorage.setItem(progressoStorageKey, JSON.stringify([...concluidos]));
  }, [concluidos]);

  const modulosDisponiveis = useMemo(
    () => modulos.filter((modulo) => canAccess(role, modulo.rota)),
    [role],
  );

  const modulosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return modulosDisponiveis.filter((modulo) => {
      const correspondeNivel =
        nivelFiltro === "todos" || modulo.nivel === nivelFiltro;
      const correspondeBusca =
        !termo ||
        [modulo.titulo, modulo.descricao, ...modulo.passos.map((passo) => passo.titulo)]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(termo);
      return correspondeNivel && correspondeBusca;
    });
  }, [busca, modulosDisponiveis, nivelFiltro]);

  const abrirModulo = (modulo: Modulo) => {
    setModuloAberto(modulo);
    setPassoAtivo(0);
  };

  const marcarConcluido = (key: string) => {
    setConcluidos((prev) => new Set([...prev, key]));
    setModuloAberto(null);
  };

  const totalDisponiveis = modulosDisponiveis.length;
  const totalConcluidos = modulosDisponiveis.filter((modulo) =>
    concluidos.has(modulo.key),
  ).length;
  const progressoPct = totalDisponiveis
    ? Math.round((totalConcluidos / totalDisponiveis) * 100)
    : 0;
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
                {totalConcluidos} de {totalDisponiveis} módulos concluídos
              </p>
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-primary">
            {progressoPct}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progressoPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar treinamento, módulo ou assunto..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["todos", "básico", "intermediário", "avançado"] as NivelFiltro[]).map(
            (nivel) => (
              <Button
                key={nivel}
                type="button"
                size="sm"
                variant={nivelFiltro === nivel ? "default" : "outline"}
                onClick={() => setNivelFiltro(nivel)}
                className={nivelFiltro === nivel ? "bg-gradient-primary text-primary-foreground" : ""}
              >
                {nivel === "todos" ? "Todos" : nivel}
              </Button>
            ),
          )}
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modulosFiltrados.map((modulo) => {
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
              {/* Cabeçalho do card com gradiente */}
              <div
                className={cn(
                  "relative flex h-36 items-center justify-center bg-gradient-to-br",
                  modulo.gradiente,
                )}
              >
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <Icon className="relative h-14 w-14 text-white/90 drop-shadow-lg" />
                {concluido && (
                  <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] border bg-black/20 text-white border-white/20 backdrop-blur-sm"
                  >
                    {modulo.nivel}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] text-white/70">
                  ~{modulo.tempoMinutos} min · {modulo.passos.length} passos
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-base font-semibold">
                  {modulo.titulo}
                </h3>
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
      {modulosFiltrados.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum treinamento encontrado para os filtros selecionados.
        </div>
      )}

      {/* Parabéns */}
      {totalDisponiveis > 0 && totalConcluidos === totalDisponiveis && (
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
      <Sheet
        open={!!moduloAberto}
        onOpenChange={(open) => !open && setModuloAberto(null)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {moduloAberto ? `Treinamento: ${moduloAberto.titulo}` : "Treinamento"}
            </SheetTitle>
          </SheetHeader>
          {moduloAberto &&
            passoAtual &&
            (() => {
              const Icon = moduloAberto.icone;
              return (
                <>
                  {/* Header com screenshot + overlay */}
                  <div className="relative flex items-center gap-4 p-6 overflow-hidden">
                    <img
                      src={moduloAberto.screenshot}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-top opacity-40"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-r",
                        moduloAberto.gradiente,
                        "opacity-90",
                      )}
                    />
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-white">
                        {moduloAberto.titulo}
                      </p>
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
                  <div className="flex-1 overflow-y-auto">
                    {/* Screenshot da tela */}
                    <div className="relative mx-4 mt-4 overflow-hidden rounded-xl border border-border shadow-lg">
                      <img
                        src={moduloAberto.screenshot}
                        alt={`Tela de ${moduloAberto.titulo}`}
                        className="w-full object-cover object-top"
                        style={{ maxHeight: 220 }}
                      />
                      {/* Gradiente embaixo da imagem */}
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                    </div>

                    <div className="p-5">
                      <h3 className="font-display text-lg font-semibold mb-3">
                        {passoAtual.titulo}
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {passoAtual.descricao}
                      </p>

                      {passoAtual.dica && (
                        <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                          <span className="shrink-0 text-base">💡</span>
                          <p className="text-sm text-primary/80">
                            {passoAtual.dica}
                          </p>
                        </div>
                      )}
                    </div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      asChild
                    >
                      <Link
                        to={moduloAberto.rota}
                        onClick={() => setModuloAberto(null)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Praticar no
                        módulo
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
