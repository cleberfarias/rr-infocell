import OsFlowShowcase from "@/components/OsFlowShowcase";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmeringText } from "@/components/unlumen-ui/shimmering-text";
import { Tilt } from "@/components/unlumen-ui/tilt";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <BlurFade className="hero-blur-fade" duration={0.55}>
            <div className="hero-tag">
              <ShimmeringText
                text="🔧 Sistema Operacional para Assistências Técnicas"
                className="hero-shimmer"
                color="var(--accent)"
                shimmerColor="#ffffff"
                duration={2.8}
                repeatDelay={1.4}
                startOnView={false}
              />
            </div>
          </BlurFade>
          <BlurFade className="hero-blur-fade" delay={0.08} duration={0.6}>
            <h1>
              Sistema de gestão para <em>assistência técnica</em>
            </h1>
          </BlurFade>
          <BlurFade className="hero-blur-fade" delay={0.16} duration={0.6}>
            <p className="hero-sub">
              Centralize ordens de serviço, estoque, PDV e financeiro em uma única plataforma —
              pensada para a rotina real da assistência técnica de celular.
            </p>
          </BlurFade>
          <BlurFade className="hero-blur-fade" delay={0.24} duration={0.6}>
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
          </BlurFade>
          <BlurFade className="hero-blur-fade" delay={0.32} duration={0.6}>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-num">
                  <NumberTicker className="stat-number-ticker" value={100} />%
                </span>
                <span className="stat-label">Web — sem instalar</span>
              </div>
              <div className="stat">
                <NumberTicker className="stat-num stat-number-ticker" value={3} delay={0.2} />
                <span className="stat-label">Perfis de acesso</span>
              </div>
              <div className="stat">
                <span className="stat-num">∞</span>
                <span className="stat-label">Ordens de serviço</span>
              </div>
            </div>
          </BlurFade>
        </div>

        <Tilt
          className="hero-visual hero-visual-enter hero-tilt"
          rotationFactor={4}
          springOptions={{ stiffness: 120, damping: 18, mass: 0.6 }}
        >
          <OsFlowShowcase />
          <BorderBeam
            size={150}
            duration={9}
            colorFrom="#00b4f5"
            colorTo="#a78bfa"
            borderWidth={1.5}
          />
          <BorderBeam
            size={90}
            duration={12}
            delay={5}
            colorFrom="#22c55e"
            colorTo="#00b4f5"
            borderWidth={1}
            reverse
          />
        </Tilt>
      </div>
    </section>
  );
}
