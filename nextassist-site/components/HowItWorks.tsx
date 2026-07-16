import ScrollReveal from "./ScrollReveal";

const STEPS = [
  {
    num: "1",
    title: "Crie sua conta",
    desc: "Cadastro em menos de 2 minutos. Nenhuma instalação necessária.",
  },
  {
    num: "2",
    title: "Configure sua loja",
    desc: "Adicione logo, dados da empresa, técnicos e produtos do estoque.",
  },
  {
    num: "3",
    title: "Abra a primeira OS",
    desc: "Registre o aparelho, o defeito e gere o recibo para o cliente na hora.",
  },
  {
    num: "4",
    title: "Feche o caixa",
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
          <div className="steps-grid">
            {STEPS.map((s, index) => (
              <ScrollReveal key={s.num} variant="scale" delay={index * 110}>
              <div key={s.num} className="step">
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
