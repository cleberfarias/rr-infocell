export default function CtaSection() {
  return (
    <section className="cta-section">
      <h2>
        Pronto para organizar sua <em>assistência técnica?</em>
      </h2>
      <p>
        Junte-se a centenas de técnicos que já trocaram planilha e caderno pelo NextAssist.
        14 dias grátis, sem cartão.
      </p>
      <div className="cta-actions">
        <a
          href="https://wa.me/5548999019525?text=Ol%C3%A1!%20Quero%20conhecer%20o%20NextAssist."
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          🚀 Começar teste gratuito
        </a>
        <a href="https://rr-infocell.web.app" target="_blank" rel="noopener noreferrer" className="btn-secondary">
          👁 Ver demonstração
        </a>
      </div>
      <div className="cta-trust">
        <span className="trust-item">✅ Sem cartão de crédito</span>
        <span className="trust-item">✅ Cancele quando quiser</span>
        <span className="trust-item">✅ 100% web — sem instalar</span>
        <span className="trust-item">✅ Suporte incluso</span>
      </div>
    </section>
  );
}
