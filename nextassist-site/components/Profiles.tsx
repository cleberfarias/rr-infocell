import ScrollReveal from "./ScrollReveal";

const PROFILES = [
  {
    icon: "🔧",
    title: "Técnico Solo",
    highlight: false,
    items: [
      "1 usuário incluído",
      "OS ilimitadas",
      "PDV e estoque",
      "Impressão de recibos",
      "Dashboard pessoal",
      "Suporte via chat",
    ],
  },
  {
    icon: "🏪",
    title: "Loja com Equipe",
    highlight: true,
    items: [
      "Até 5 usuários",
      "Perfis de acesso por função",
      "Controle financeiro completo",
      "Notificações WhatsApp",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
  },
  {
    icon: "🏢",
    title: "Rede / Franquia",
    highlight: false,
    items: [
      "Usuários ilimitados",
      "Múltiplas unidades",
      "Dashboard consolidado",
      "White label disponível",
      "API para integrações",
      "Gerente de conta dedicado",
    ],
  },
];

export default function Profiles() {
  return (
    <section>
      <div className="section-center">
        <ScrollReveal>
          <span className="section-tag">Para quem é</span>
          <h2>
            Do técnico solo à <em>rede de lojas</em>
          </h2>
          <p className="section-sub">
            O NextAssist cresce com o seu negócio. Escolha o perfil que se encaixa na sua
            operação hoje.
          </p>
        </ScrollReveal>
        <div className="profiles-grid">
          {PROFILES.map((p) => (
            <ScrollReveal key={p.title}>
              <div className={`profile-card${p.highlight ? " highlight" : ""}`}>
                <div style={{ fontSize: "2rem" }}>{p.icon}</div>
                <div className="profile-title">{p.title}</div>
                <ul className="profile-list">
                  {p.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
