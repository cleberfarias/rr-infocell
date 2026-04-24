import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ordens, formatBRL } from "@/data/mock";
import { Check, X, Send, Clock, CheckCircle2 } from "lucide-react";

const historico = [
  { data: "10/04 14:22", quem: "Cliente Carlos H.", acao: "Aprovou orçamento de R$ 190,00",  status: "ok" as const },
  { data: "08/04 09:10", quem: "Cliente Renata L.", acao: "Reprovou orçamento de R$ 480,00", status: "no" as const },
  { data: "07/04 16:48", quem: "Cliente Marcos A.", acao: "Aprovou orçamento de R$ 660,00",  status: "ok" as const },
];

const Orcamento = () => {
  const o = ordens[1];
  const subPecas = o.pecas.reduce((s, p) => s + p.qtd * p.venda, 0);
  const total = subPecas + o.valorMaoObra;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card className="surface-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">// Orçamento {o.id}</p>
              <h2 className="font-display text-2xl font-bold">{o.cliente}</h2>
              <p className="text-sm text-muted-foreground">{o.marca} {o.modelo} — IMEI <span className="font-mono">{o.imei}</span></p>
            </div>
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Aguardando resposta há 6h
            </div>
          </div>

          <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Defeito identificado</p>
            <p className="mt-1 text-sm">{o.defeito}. Diagnóstico técnico confirma necessidade de substituição do flex de carga.</p>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Peças</h3>
            <div className="space-y-2">
              {o.pecas.map(p => (
                <div key={p.nome} className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">Quantidade: {p.qtd}</p>
                  </div>
                  <p className="font-mono font-semibold">{formatBRL(p.qtd * p.venda)}</p>
                </div>
              ))}
            </div>

            <h3 className="mb-3 mt-6 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Serviços</h3>
            <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
              <div>
                <p className="font-medium">Mão de obra — substituição de flex</p>
                <p className="text-xs text-muted-foreground">Inclui teste funcional e garantia de 90 dias</p>
              </div>
              <p className="font-mono font-semibold">{formatBRL(o.valorMaoObra)}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total a aprovar</p>
              <p className="font-display text-3xl font-bold text-primary glow-text">{formatBRL(total)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /> Reprovar</Button>
              <Button className="bg-success text-success-foreground hover:bg-success/90"><Check className="h-4 w-4" /> Aprovar orçamento</Button>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Send className="h-4 w-4" /> Enviar via WhatsApp</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="surface-panel p-5">
        <h3 className="mb-1 font-display text-base font-semibold">Histórico de aprovações</h3>
        <p className="mb-4 text-xs text-muted-foreground">Últimas decisões de clientes</p>
        <ul className="space-y-3">
          {historico.map((h, i) => (
            <li key={i} className="flex gap-3 rounded-md border border-border bg-secondary/30 p-3">
              <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-md " + (h.status === "ok" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                {h.status === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h.data}</p>
                <p className="text-sm font-medium">{h.quem}</p>
                <p className="text-xs text-muted-foreground">{h.acao}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default Orcamento;
