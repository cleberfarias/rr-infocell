"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://rr-infocell-api-91248386036.southamerica-east1.run.app";

export default function Contact() {
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(`${API_URL}/contato/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.get("nome"),
          telefone: data.get("telefone"),
          email: data.get("email"),
          assunto: data.get("assunto"),
          mensagem: data.get("mensagem"),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Erro ao enviar mensagem.");
      }

      form.reset();
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section id="contato" className="contact-section immersive-section immersive-contact">
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
            <ScrollReveal variant="left">
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nome">Nome</label>
                    <input id="nome" name="nome" type="text" placeholder="Seu nome" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="telefone">WhatsApp / Telefone</label>
                    <input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="assunto">Assunto</label>
                  <select id="assunto" name="assunto" required defaultValue="">
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
                    name="mensagem"
                    placeholder="Descreva sua necessidade..."
                    required
                  />
                </div>
                {error && <p className="demo-error">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar mensagem →"}
                </button>
                <p className="form-note">
                  Respondemos em até 1 dia útil. Sem spam, prometemos.
                </p>
              </form>
            </ScrollReveal>

            <ScrollReveal variant="right" delay={120}>
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
                  <h4>✅ Teste gratuito de 7 dias</h4>
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
