import ScrollReveal from "./ScrollReveal";

const PLANS = [
  {
    name: "Starter",
    desc: "Para quem está começando sozinho.",
    amount: "89",
    popular: false,
    checkoutUrl: "https://pay.kiwify.com.br/GXfaAPz",
    items: [
      { text: "1 usuário", ok: true },
      { text: "OS ilimitadas", ok: true },
      { text: "Estoque e PDV", ok: true },
      { text: "Impressão de recibos", ok: true },
      { text: "Dashboard básico", ok: true },
      { text: "Notificações WhatsApp", ok: false },
      { text: "Múltiplos usuários", ok: false },
      { text: "Relatórios avançados", ok: false },
    ],
  },
  {
    name: "Profissional",
    desc: "Para lojas com equipe e maior volume.",
    amount: "149",
    popular: true,
    checkoutUrl: "https://pay.kiwify.com.br/rZsfReN",
    items: [
      { text: "Até 5 usuários", ok: true },
      { text: "OS ilimitadas", ok: true },
      { text: "Estoque e PDV", ok: true },
      { text: "Impressão de recibos", ok: true },
      { text: "Dashboard completo", ok: true },
      { text: "Notificações WhatsApp", ok: true },
      { text: "Perfis de acesso", ok: true },
      { text: "Relatórios avançados", ok: false },
    ],
  },
  {
    name: "Empresarial",
    desc: "Para redes com alto volume e múltiplas unidades.",
    amount: "249",
    popular: false,
    checkoutUrl: "https://pay.kiwify.com.br/DLAAS9J",
    items: [
      { text: "Usuários ilimitados", ok: true },
      { text: "OS ilimitadas", ok: true },
      { text: "Estoque e PDV", ok: true },
      { text: "Impressão de recibos", ok: true },
      { text: "Dashboard consolidado", ok: true },
      { text: "Notificações WhatsApp", ok: true },
      { text: "Perfis de acesso", ok: true },
      { text: "Relatórios avançados", ok: true },
    ],
  },
];

export default function Pricing() {
  return (
    <section id="planos">
      <div className="section-center">
        <ScrollReveal>
          <span className="section-tag">Planos</span>
          <h2>
            Preço justo, sem <em>surpresas</em>
          </h2>
          <p className="section-sub">
            14 dias de teste gratuito em qualquer plano. Sem cartão de crédito. Cancele quando
            quiser.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`plan-card${plan.popular ? " popular" : ""}`}>
                {plan.popular && <span className="plan-badge">Mais popular</span>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">{plan.desc}</div>
                <div className="plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">{plan.amount}</span>
                  <span className="period">/mês</span>
                </div>
                <ul className="plan-list">
                  {plan.items.map((item) => (
                    <li key={item.text} className={item.ok ? "" : "na"}>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`plan-btn ${plan.popular ? "p-primary" : "p-outline"}`}
                >
                  Contratar agora →
                </a>
              </div>
            ))}
          </div>

          <div className="wl-card">
            <div>
              <h3>🏷️ White Label</h3>
              <p>
                Entregamos o sistema com a sua marca, domínio e cores. Ideal para redes de
                franquias e revendedores que querem oferecer o produto como próprio.
              </p>
            </div>
            <a
              href="https://wa.me/5548999019525?text=Ol%C3%A1!%20Tenho%20interesse%20no%20NextAssist%20White%20Label."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Falar com vendas →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
