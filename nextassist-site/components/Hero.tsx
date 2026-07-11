import OsFlowShowcase from "@/components/OsFlowShowcase";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          <div className="hero-tag">🔧 Sistema Operacional para Assistências Técnicas</div>
          <h1>
            Da entrada do aparelho ao <em>recibo final.</em>
          </h1>
          <p className="hero-sub">
            Centralize ordens de serviço, estoque, PDV e financeiro em uma única plataforma —
            pensada para a rotina real da assistência técnica de celular.
          </p>
          <div className="hero-actions">
            <a href="/demo" className="btn-primary">
              🚀 Testar grátis por 7 dias
            </a>
            <a
              href="https://nextassist.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              👁 Ver demonstração ao vivo
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Web — sem instalar</span>
            </div>
            <div className="stat">
              <span className="stat-num">3</span>
              <span className="stat-label">Perfis de acesso</span>
            </div>
            <div className="stat">
              <span className="stat-num">∞</span>
              <span className="stat-label">Ordens de serviço</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <OsFlowShowcase />
        </div>
      </div>
    </section>
  );
}
