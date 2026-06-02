export default function Footer() {
  return (
    <footer>
      <div className="footer-logo">
        Next<span>Assist</span>
      </div>
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
