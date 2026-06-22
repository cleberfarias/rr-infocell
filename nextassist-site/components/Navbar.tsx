export default function Navbar() {
  return (
    <nav>
      <a href="#" className="nav-logo-img" aria-label="NextAssist">
        <img src="/logo-nextassist-white.svg" alt="NextAssist" height={36} />
      </a>
      <div className="nav-links">
        <a href="#funcionalidades">Funcionalidades</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#planos">Planos</a>
        <a href="#depoimentos">Depoimentos</a>
        <a href="#contato">Contato</a>
        <a href="/blog">Blog</a>
      </div>
      <a href="#planos" className="nav-cta">
        Começar agora →
      </a>
    </nav>
  );
}
