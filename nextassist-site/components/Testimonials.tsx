import ScrollReveal from "./ScrollReveal";

const TESTIMONIALS = [
  {
    initials: "RS",
    name: "Roberto Souza",
    role: "Dono — Assistência TecMaster, São Paulo",
    text: "Antes eu controlava tudo em planilha e ficava perdido com 20 OS ao mesmo tempo. Com o NextAssist, consigo ver em 5 segundos o que está pronto e o que está parado. Dobrei minha capacidade de atendimento.",
  },
  {
    initials: "FM",
    name: "Fernanda Moura",
    role: "Técnica autônoma, Rio de Janeiro",
    text: "Trabalho sozinha e precisava de algo simples. O NextAssist é exatamente isso: abro a OS no celular, mando o WhatsApp pro cliente automaticamente e imprimo o recibo direto do sistema. Perfeito.",
  },
  {
    initials: "DA",
    name: "Diego Alves",
    role: "Gerente — Rede CellFix (3 unidades), Minas Gerais",
    text: "Tenho 3 lojas e precisava de visibilidade centralizada. O dashboard consolida tudo. O plano Empresarial com white label nos permite revender para outras assistências com nossa própria marca.",
  },
];

export default function Testimonials() {
  return (
    <section id="depoimentos" className="testi-section">
      <div className="section-center">
        <ScrollReveal>
          <span className="section-tag">Depoimentos</span>
          <h2>
            Assistências que já <em>transformaram</em> sua gestão
          </h2>
          <p className="section-sub">
            Veja o que nossos clientes dizem após usar o NextAssist no dia a dia.
          </p>
        </ScrollReveal>
        <div className="testi-grid">
          {TESTIMONIALS.map((t) => (
            <ScrollReveal key={t.name}>
              <div className="testi-card">
                <div className="stars">★★★★★</div>
                <p className="testi-text">&ldquo;{t.text}&rdquo;</p>
                <div className="testi-author">
                  <div className="author-av">{t.initials}</div>
                  <div>
                    <div className="author-name">{t.name}</div>
                    <div className="author-role">{t.role}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
