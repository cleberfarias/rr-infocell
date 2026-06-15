"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

export default function Contact() {
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      (e.target as HTMLFormElement).reset();
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    }, 900);
  }

  return (
    <>
      <section id="contato" className="contact-section">
        <div className="section-center">
          <ScrollReveal>
            <span className="section-tag">Contato</span>
            <h2>
              Fale com a <em>nossa equipe</em>
            </h2>
            <p className="section-sub">
              Tem dúvidas, quer uma demonstração personalizada ou precisa do White Label? Entre
              em contato.
            </p>
          </ScrollReveal>

          <div className="contact-grid">
            <ScrollReveal>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nome">Nome</label>
                    <input id="nome" type="text" placeholder="Seu nome" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="telefone">WhatsApp / Telefone</label>
                    <input id="telefone" type="tel" placeholder="(11) 99999-9999" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="assunto">Assunto</label>
                  <select id="assunto" required>
                    <option value="">Selecione...</option>
                    <option>Quero testar o sistema</option>
                    <option>Dúvida sobre planos</option>
                    <option>White Label / Franquia</option>
                    <option>Suporte técnico</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mensagem">Mensagem</label>
                  <textarea
                    id="mensagem"
                    placeholder="Descreva sua necessidade..."
                    required
                  />
                </div>
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar mensagem →"}
                </button>
                <p className="form-note">
                  Respondemos em até 1 dia útil. Sem spam, prometemos.
                </p>
              </form>
            </ScrollReveal>

            <ScrollReveal>
              <div className="contact-info">
                <div className="contact-item">
                  <div className="contact-item-icon">📧</div>
                  <div>
                    <h4>E-mail</h4>
                    <p>
                      <a href="mailto:cleber.fdelgado@gmail.com">cleber.fdelgado@gmail.com</a>
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">💬</div>
                  <div>
                    <h4>WhatsApp</h4>
                    <p>
                      <a
                        href="https://wa.me/5548999019525"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        +55 (48) 99901-9525
                      </a>
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">🕐</div>
                  <div>
                    <h4>Horário de atendimento</h4>
                    <p>Seg–Sex: 9h às 18h (horário de Brasília)</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">🌐</div>
                  <div>
                    <h4>Demo ao vivo</h4>
                    <p>
                      <a
                        href="https://nextassist.web.app"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        nextassist.web.app
                      </a>
                    </p>
                  </div>
                </div>
                <div className="contact-guarantee">
                  <h4>✅ Garantia de 14 dias</h4>
                  <p>
                    Teste sem compromisso. Se não se adaptar, cancele dentro do período de teste
                    sem pagar nada.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <div className={`toast${toast ? " show" : ""}`}>
        ✅ Mensagem enviada! Entraremos em contato em breve.
      </div>
    </>
  );
}
