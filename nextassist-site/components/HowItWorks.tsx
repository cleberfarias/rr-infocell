import ScrollReveal from "./ScrollReveal";
import AnimatedStepper from "@/components/smoothui/animated-stepper";

const STEPS = [
  {
    icon: "✦",
    title: "Crie sua conta",
    short: "2 minutos",
    desc: "Cadastro em menos de 2 minutos. Nenhuma instalação necessária.",
  },
  {
    icon: "◫",
    title: "Configure sua loja",
    short: "Sua identidade",
    desc: "Adicione logo, dados da empresa, técnicos e produtos do estoque.",
  },
  {
    icon: "⌁",
    title: "Abra a primeira OS",
    short: "Fluxo real",
    desc: "Registre o aparelho, o defeito e gere o recibo para o cliente na hora.",
  },
  {
    icon: "✓",
    title: "Feche o caixa",
    short: "Visão completa",
    desc: "Acompanhe receitas, despesas e o desempenho do mês no dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="how-section immersive-section immersive-journey">
      <div className="section-center">
        <ScrollReveal>
          <span className="section-tag">Como funciona</span>
          <h2>
            Em funcionamento em <em>minutos</em>
          </h2>
          <p className="section-sub">
            Sem treinamento longo, sem suporte técnico de TI. Qualquer membro da equipe aprende
            no primeiro dia.
          </p>
        </ScrollReveal>
        <ScrollReveal className="journey-reveal">
          <div className="stepper-shell">
            <AnimatedStepper
              className="nextassist-stepper"
              allowClickNavigation
              steps={STEPS.map((step, index) => ({
                label: step.title,
                description: step.short,
                icon: <span aria-hidden="true">{step.icon}</span>,
                content: (
                  <article className="stepper-content">
                    <span className="stepper-content-number">
                      Etapa {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                    <span className="stepper-content-time">{step.short}</span>
                  </article>
                ),
              }))}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
