"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Estado = "form" | "enviando" | "sucesso" | "erro" | "ja-existe";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://rr-infocell-api-91248386036.southamerica-east1.run.app";

export default function DemoPage() {
  const [estado, setEstado] = useState<Estado>("form");
  const [erroMsg, setErroMsg] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setErroMsg("");

    try {
      const res = await fetch(`${API_URL}/demo/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, empresa }),
      });

      if (res.status === 409) {
        setEstado("ja-existe");
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erro desconhecido");
      }

      setEstado("sucesso");
    } catch (err: unknown) {
      setErroMsg(err instanceof Error ? err.message : "Tente novamente.");
      setEstado("erro");
    }
  }

  if (estado === "sucesso") {
    return (
      <div className="demo-page">
        <div className="demo-card">
          <div className="demo-success-icon">✅</div>
          <h1>Conta criada!</h1>
          <p>
            Enviamos um e-mail para <strong>{email}</strong> com o link para você definir sua
            senha e acessar o sistema.
          </p>
          <p className="demo-trial-note">⏳ Seu teste gratuito dura 7 dias a partir de agora.</p>
          <a
            href="https://nextassist.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: "inline-block", marginTop: "1.5rem" }}
          >
            Ir para o NextAssist →
          </a>
          <p className="demo-help">
            Não recebeu o e-mail? Verifique a caixa de spam ou{" "}
            <a href="https://wa.me/5548999019525">fale conosco pelo WhatsApp</a>.
          </p>
        </div>
      </div>
    );
  }

  if (estado === "ja-existe") {
    return (
      <div className="demo-page">
        <div className="demo-card">
          <div className="demo-success-icon">ℹ️</div>
          <h1>Conta já existe</h1>
          <p>
            Já existe uma conta para o e-mail <strong>{email}</strong>.
            Acesse o sistema ou redefina sua senha.
          </p>
          <a
            href="https://nextassist.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: "inline-block", marginTop: "1.5rem" }}
          >
            Acessar o NextAssist →
          </a>
          <p className="demo-help" style={{ marginTop: "1rem" }}>
            <button
              onClick={() => { setEstado("form"); setEmail(""); }}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "inherit" }}
            >
              Usar outro e-mail
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-page">
      <div className="demo-card">
        <Link href="/" className="demo-back">← Voltar</Link>

        <div className="demo-header">
          <span className="section-tag">Teste gratuito</span>
          <h1>Comece em <em>30 segundos</em></h1>
          <p className="demo-sub">
            7 dias grátis, sem cartão de crédito. Acesso completo ao plano Profissional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="demo-form">
          <div className="demo-field">
            <label htmlFor="nome">Seu nome</label>
            <input
              id="nome"
              type="text"
              placeholder="João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              disabled={estado === "enviando"}
            />
          </div>

          <div className="demo-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="joao@suaassistencia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={estado === "enviando"}
            />
          </div>

          <div className="demo-field">
            <label htmlFor="empresa">Nome da assistência técnica</label>
            <input
              id="empresa"
              type="text"
              placeholder="Assistência do João"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
              minLength={2}
              disabled={estado === "enviando"}
            />
          </div>

          {estado === "erro" && (
            <p className="demo-error">{erroMsg}</p>
          )}

          <button type="submit" className="btn-primary demo-submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Criando sua conta..." : "🚀 Criar conta grátis →"}
          </button>
        </form>

        <div className="demo-trust">
          <span>✅ Sem cartão</span>
          <span>✅ 7 dias grátis</span>
          <span>✅ Cancele quando quiser</span>
        </div>

        <p className="demo-terms">
          Ao criar sua conta você concorda com nossos{" "}
          <a href="/termos">Termos de uso</a> e{" "}
          <a href="/privacidade">Política de privacidade</a>.
        </p>
      </div>
    </div>
  );
}
