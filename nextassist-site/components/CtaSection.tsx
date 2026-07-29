import ScrollReveal from "./ScrollReveal";

export default function CtaSection() {
  return (
    <section className="cta-section immersive-section immersive-cta">
      <div className="cta-orbit" aria-hidden="true" />
      <ScrollReveal variant="scale">
      <div className="cta-content">
      <h2>
        Pronto para organizar sua <em>assistência técnica?</em>
      </h2>
      <p>
        Junte-se a centenas de técnicos que já trocaram planilha e caderno pelo NextAssist.
        7 dias grátis, sem cartão.
      </p>
      <div className="cta-actions">
        <a href="/demo" className="btn-primary">
          🚀 Começar teste gratuito
        </a>
        <a href="https://nextassist.web.app" target="_blank" rel="noopener noreferrer" className="btn-secondary">
          👁 Ver demonstração
        </a>
      </div>
      <div className="cta-trust">
        <span className="trust-item">✅ Sem cartão de crédito</span>
        <span className="trust-item">✅ Cancele quando quiser</span>
        <span className="trust-item">✅ 100% web — sem instalar</span>
        <span className="trust-item">✅ Suporte incluso</span>
      </div>
      </div>
      </ScrollReveal>
    </section>
  );
}
