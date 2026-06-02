export default function Navbar() {
  return (
    <nav>
      <div className="nav-logo">
        Next<span>Assist</span>
      </div>
      <div className="nav-links">
        <a href="#funcionalidades">Funcionalidades</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#planos">Planos</a>
        <a href="#depoimentos">Depoimentos</a>
        <a href="#contato">Contato</a>
      </div>
      <a href="#planos" className="nav-cta">
        Começar agora →
      </a>
    </nav>
  );
}
