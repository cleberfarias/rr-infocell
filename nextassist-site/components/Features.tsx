import ScrollReveal from "./ScrollReveal";
import FeatureShowcase from "./FeatureShowcase";

const FEATURES = [
  {
    icon: "📋",
    title: "Ordens de Serviço",
    desc: "Controle completo do ciclo: abertura, diagnóstico, aprovação, conserto e entrega. Histórico de eventos com foto e assinatura.",
  },
  {
    icon: "📦",
    title: "Controle de Estoque",
    desc: "Cadastro de peças e produtos com alerta de estoque mínimo, movimentação e rastreio de uso por OS.",
  },
  {
    icon: "🛒",
    title: "PDV — Ponto de Venda",
    desc: "Venda balcão com busca rápida, desconto, múltiplas formas de pagamento e impressão de cupom térmico 80mm.",
  },
  {
    icon: "💰",
    title: "Financeiro",
    desc: "Lançamentos de entradas e saídas, contas a receber, fluxo de caixa diário e relatório mensal.",
  },
  {
    icon: "👥",
    title: "Gestão de Clientes",
    desc: "Cadastro completo com histórico de OS, orçamentos e compras. Busca por nome, CPF ou telefone.",
  },
  {
    icon: "🔔",
    title: "Notificações WhatsApp",
    desc: "Avise o cliente automaticamente sobre cada etapa — OS recebida, aprovada, pronta para retirada.",
  },
  {
    icon: "🖨️",
    title: "Impressão Completa",
    desc: "Via cliente, via interna com senha, cupom térmico e nota de orçamento — tudo com logo e dados da empresa.",
  },
  {
    icon: "📊",
    title: "Dashboard e Relatórios",
    desc: "KPIs em tempo real: OS do mês, receita, ticket médio, peças mais usadas e desempenho por período.",
  },
];

export default function Features() {
  return (
    <section id="funcionalidades">
      <div className="section-center">
        <ScrollReveal>
          <span className="section-tag">Funcionalidades</span>
          <h2>
            Tudo que a sua assistência <em>precisa</em>
          </h2>
          <p className="section-sub">
            Do atendimento ao fechamento do caixa — uma plataforma integrada para não perder
            nenhum detalhe.
          </p>
        </ScrollReveal>
        <FeatureShowcase features={FEATURES} />
      </div>
    </section>
  );
}
