import ScrollReveal from "./ScrollReveal";

const FAQS = [
  {
    q: "O NextAssist precisa ser instalado?",
    a: "Não. É 100% web. Funciona em qualquer navegador, no celular ou computador, sem instalação.",
  },
  {
    q: "Posso testar antes de contratar?",
    a: "Sim. Oferecemos 14 dias de teste gratuito sem necessidade de cartão de crédito.",
  },
  {
    q: "O que é o plano White Label?",
    a: "Entregamos o sistema com a sua marca, domínio e cores. Ideal para redes de franquias e revendedores.",
  },
  {
    q: "Quantos usuários posso cadastrar?",
    a: "Starter: 1 usuário. Profissional: até 5. Empresarial: ilimitados.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. O sistema é responsivo e funciona perfeitamente em smartphones e tablets.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem contrato de fidelidade. Cancele a qualquer momento sem multa.",
  },
];

export default function FAQ() {
  return (
    <section>
      <div className="section-center" style={{ textAlign: "center" }}>
        <ScrollReveal>
          <span className="section-tag">FAQ</span>
          <h2>
            Perguntas <em>frequentes</em>
          </h2>
          <p className="section-sub" style={{ margin: "0 auto" }}>
            Não encontrou o que procura? Entre em contato pelo chat ou e-mail.
          </p>
        </ScrollReveal>
      </div>
      <div className="faq-list">
        {FAQS.map((item) => (
          <ScrollReveal key={item.q}>
            <details>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
