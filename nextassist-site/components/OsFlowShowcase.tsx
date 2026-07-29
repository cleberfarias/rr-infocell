"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { key: "recebido", label: "RECEBIDO", color: "var(--accent)" },
  { key: "em_analise", label: "EM ANÁLISE", color: "var(--accent)" },
  { key: "aguardando_aprovacao", label: "AGUARDANDO APROVAÇÃO", color: "var(--yellow)" },
  { key: "em_manutencao", label: "EM MANUTENÇÃO", color: "var(--purple)" },
  { key: "pronto_para_retirada", label: "PRONTO PARA RETIRADA", color: "var(--green)" },
  { key: "entregue", label: "ENTREGUE", color: "var(--green)" },
];

const INTERVAL = 2400;

export default function OsFlowShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % STAGES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  const stage = STAGES[index];

  return (
    <div className="mockup-frame">
      <div className="mockup-bar">
        <span className="dot dot-r" />
        <span className="dot dot-y" />
        <span className="dot dot-g" />
        <div className="mockup-url">app.nextassist.com.br/app/ordens/1042</div>
      </div>

      <div className="mockup-body">
        <div className="os-flow-title">OS-1042 · Detalhes operacionais</div>

        <div className="os-flow-stats">
          <div className="os-flow-stat">
            <div className="os-flow-stat-label">Status</div>
            <div key={stage.key} className="os-flow-status">
              <span className="os-flow-status-dot" style={{ background: stage.color }} />
              <span className="os-flow-stat-value" style={{ color: stage.color, fontSize: ".68rem" }}>
                {stage.label}
              </span>
            </div>
          </div>
          <div className="os-flow-stat">
            <div className="os-flow-stat-label">Entrada</div>
            <div className="os-flow-stat-value">10/07/2026</div>
          </div>
          <div className="os-flow-stat">
            <div className="os-flow-stat-label">Prazo prometido</div>
            <div className="os-flow-stat-value">—</div>
          </div>
          <div className="os-flow-stat">
            <div className="os-flow-stat-label">Total</div>
            <div className="os-flow-stat-value">R$ 0,00</div>
          </div>
        </div>

        <div className="os-flow-columns">
          <div className="os-flow-col">
            <h4>Cliente</h4>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Nome</div>
              <div className="os-flow-field-value">Mariana Duarte</div>
            </div>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Documento</div>
              <div className="os-flow-field-value">-</div>
            </div>
          </div>

          <div className="os-flow-col">
            <h4>Aparelho</h4>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Modelo</div>
              <div className="os-flow-field-value">Apple iPhone 13 Pro</div>
            </div>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Cor</div>
              <div className="os-flow-field-value">-</div>
            </div>
            <div className="os-flow-pill">
              <div className="os-flow-field-label">Senha (uso interno)</div>
              <div className="os-flow-field-value">Cliente não informou</div>
            </div>
          </div>

          <div className="os-flow-col">
            <h4>Valores</h4>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Peças</div>
              <div className="os-flow-field-value">R$ 0,00</div>
            </div>
            <div className="os-flow-field">
              <div className="os-flow-field-label">Total</div>
              <div className="os-flow-field-value">R$ 0,00</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
