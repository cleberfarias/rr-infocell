export default function Footer() {
  return (
    <footer>
      <a href="#" className="footer-logo-img" aria-label="NextAssist">
        <img src="/logo-nextassist-white.svg" alt="NextAssist" height={48} />
      </a>
      <div className="footer-links">
        <a href="#funcionalidades">Funcionalidades</a>
        <a href="#planos">Planos</a>
        <a href="#contato">Contato</a>
        <a href="/privacidade">Privacidade</a>
        <a href="/termos">Termos de uso</a>
      </div>
      <span>© {new Date().getFullYear()} NextAssist. Todos os direitos reservados.</span>
    </footer>
  );
}
