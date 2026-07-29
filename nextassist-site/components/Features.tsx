import ScrollReveal from "./ScrollReveal";
import FeatureShowcase from "./FeatureShowcase";

const FEATURES = [
  {
    icon: "📋",
    title: "Ordens de Serviço",
    group: "Atendimento",
    desc: "Controle completo do ciclo: abertura, diagnóstico, aprovação, conserto e entrega. Histórico de eventos com foto e assinatura.",
  },
  {
    icon: "👥",
    title: "Gestão de Clientes",
    group: "Atendimento",
    desc: "Cadastro completo com histórico de OS, orçamentos e compras. Busca por nome, CPF ou telefone.",
  },
  {
    icon: "🔔",
    title: "Notificações WhatsApp",
    group: "Atendimento",
    desc: "Avise o cliente automaticamente sobre cada etapa — OS recebida, aprovada, pronta para retirada.",
  },
  {
    icon: "📦",
    title: "Controle de Estoque",
    group: "Operação técnica",
    desc: "Cadastro de peças e produtos com alerta de estoque mínimo, movimentação e rastreio de uso por OS.",
  },
  {
    icon: "🖨️",
    title: "Impressão Completa",
    group: "Operação técnica",
    desc: "Via cliente, via interna com senha, cupom térmico e nota de orçamento — tudo com logo e dados da empresa.",
  },
  {
    icon: "🛒",
    title: "PDV — Ponto de Venda",
    group: "Venda e entrega",
    desc: "Venda balcão com busca rápida, desconto, múltiplas formas de pagamento e impressão de cupom térmico 80mm.",
  },
  {
    icon: "💰",
    title: "Financeiro",
    group: "Gestão",
    desc: "Lançamentos de entradas e saídas, contas a receber, fluxo de caixa diário e relatório mensal.",
  },
  {
    icon: "📊",
    title: "Dashboard e Relatórios",
    group: "Gestão",
    desc: "KPIs em tempo real: OS do mês, receita, ticket médio, peças mais usadas e desempenho por período.",
  },
];

export default function Features() {
  return (
    <section id="funcionalidades" className="immersive-section immersive-product">
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
