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
            <a href="#planos" className="btn-primary">
              🚀 Testar grátis por 14 dias
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

        <div>
          <div className="mockup-frame">
            <div className="mockup-bar">
              <div className="dot dot-r" />
              <div className="dot dot-y" />
              <div className="dot dot-g" />
              <div className="mockup-url">nextassist.com.br/dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="dash-header">
                <div className="dash-title-label">Dashboard</div>
                <div className="dash-date-text">Segunda, 2 de junho · 2026</div>
              </div>
              <div className="dash-grid">
                <div className="dash-card">
                  <div className="dash-card-label">OS do mês</div>
                  <div className="dash-card-val c-blue">147</div>
                  <div className="dash-card-sub">↑ 12% vs mês anterior</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Receita</div>
                  <div className="dash-card-val c-green">R$ 18.420</div>
                  <div className="dash-card-sub">Faturamento líquido</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Em andamento</div>
                  <div className="dash-card-val c-yellow">23</div>
                  <div className="dash-card-sub">Aguardando peça: 8</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Concluídas hoje</div>
                  <div className="dash-card-val c-blue">9</div>
                  <div className="dash-card-sub">Ticket médio: R$ 124</div>
                </div>
              </div>
              <div className="os-section-label">Últimas ordens de serviço</div>
              <div className="os-list">
                <div className="os-item">
                  <div className="os-info">
                    <div className="os-id">#0391</div>
                    <div className="os-name">iPhone 13 Pro — Tela</div>
                  </div>
                  <span className="badge badge-blue">Em andamento</span>
                </div>
                <div className="os-item">
                  <div className="os-info">
                    <div className="os-id">#0390</div>
                    <div className="os-name">Samsung A54 — Bateria</div>
                  </div>
                  <span className="badge badge-yellow">Aguardando peça</span>
                </div>
                <div className="os-item">
                  <div className="os-info">
                    <div className="os-id">#0389</div>
                    <div className="os-name">Moto G84 — Conector</div>
                  </div>
                  <span className="badge badge-green">Concluída</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
