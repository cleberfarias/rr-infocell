import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, type StatusKey } from "@/components/StatusBadge";
import { ordens, formatBRL } from "@/data/mock";
import { Wrench, Package, MessageSquare, Send, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const flow: { key: StatusKey; label: string }[] = [
  { key: "recebido", label: "Recebido" },
  { key: "em_analise", label: "Em análise" },
  { key: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { key: "em_manutencao", label: "Em manutenção" },
  { key: "finalizado", label: "Finalizado" },
  { key: "entregue", label: "Entregue" },
];

const timeline = [
  { time: "14/04 09:12", title: "Aparelho recebido na loja",        who: "Atendente Bruna",  desc: "Checklist concluído. Cliente assinou termo de entrada." },
  { time: "14/04 11:30", title: "Análise iniciada",                  who: "Técnico Rafael",   desc: "Diagnóstico: tela trincada com display funcional. Touch sem resposta." },
  { time: "14/04 14:08", title: "Orçamento enviado por WhatsApp",    who: "Sistema",          desc: "Cliente notificado — aguardando aprovação." },
  { time: "15/04 08:45", title: "Orçamento aprovado",                who: "Cliente",          desc: "Aprovação registrada via link seguro." },
  { time: "15/04 10:20", title: "Manutenção em execução",            who: "Técnico Rafael",   desc: "Substituição de tela OLED iniciada." },
];

const Manutencao = () => {
  const o = ordens[0];
  const total = o.valorPecas + o.valorMaoObra;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gradient-metal">
            <Smartphone className="h-7 w-7 text-foreground" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">// {o.id}</p>
            <h2 className="font-display text-2xl font-bold">{o.marca} {o.modelo} • {o.cliente}</h2>
            <p className="text-sm text-muted-foreground">IMEI <span className="font-mono">{o.imei}</span> • Cor {o.cor}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/app/orcamento"><Send className="h-4 w-4" /> Enviar orçamento</Link></Button>
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" asChild>
            <Link to="/app/pdv"><Package className="h-4 w-4" /> Finalizar e ir ao PDV</Link>
          </Button>
        </div>
      </div>

      {/* Status flow */}
      <Card className="surface-panel p-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {flow.map((s, i) => {
            const currentIdx = flow.findIndex(f => f.key === o.status);
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold " +
                    (active ? "border-primary bg-primary text-primary-foreground shadow-glow animate-pulse-glow"
                            : done ? "border-success bg-success/20 text-success"
                                   : "border-border bg-secondary text-muted-foreground")
                  }>{i + 1}</div>
                  <span className={"text-[10px] font-medium uppercase tracking-wide " + (active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </div>
                {i < flow.length - 1 && <div className={"h-0.5 flex-1 " + (i < currentIdx ? "bg-success" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="surface-panel p-6">
            <h3 className="mb-3 font-display text-base font-semibold">Diagnóstico técnico</h3>
            <Textarea rows={3} defaultValue="Tela trincada com display ainda operante. Touch sem resposta no quadrante superior. Recomenda-se substituição completa do conjunto OLED." />
          </Card>

          <Card className="surface-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="font-display text-base font-semibold">Peças e serviços</h3>
              <Button variant="outline" size="sm"><Package className="h-4 w-4" /> Adicionar do estoque</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Item</th>
                  <th className="px-5 py-2.5 text-center font-medium">Qtd</th>
                  <th className="px-5 py-2.5 text-right font-medium">Custo</th>
                  <th className="px-5 py-2.5 text-right font-medium">Venda</th>
                  <th className="px-5 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {o.pecas.map((p) => (
                  <tr key={p.nome} className="border-b border-border/40">
                    <td className="px-5 py-3"><div className="font-medium">{p.nome}</div><div className="text-xs text-muted-foreground">Peça • baixa automática no estoque</div></td>
                    <td className="px-5 py-3 text-center font-mono">{p.qtd}</td>
                    <td className="px-5 py-3 text-right font-mono text-muted-foreground">{formatBRL(p.custo)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatBRL(p.venda)}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">{formatBRL(p.qtd * p.venda)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border/40 bg-secondary/20">
                  <td className="px-5 py-3"><div className="font-medium">Mão de obra — troca de tela</div><div className="text-xs text-muted-foreground">Serviço executado por Rafael S.</div></td>
                  <td className="px-5 py-3 text-center font-mono">1</td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">—</td>
                  <td className="px-5 py-3 text-right font-mono">{formatBRL(o.valorMaoObra)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">{formatBRL(o.valorMaoObra)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gradient-surface">
                  <td colSpan={4} className="px-5 py-4 text-right text-sm uppercase tracking-wide text-muted-foreground">Total da OS</td>
                  <td className="px-5 py-4 text-right font-display text-xl font-bold text-primary">{formatBRL(total)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <Card className="surface-panel p-5">
          <h3 className="mb-1 font-display text-base font-semibold">Linha do tempo</h3>
          <p className="mb-4 text-xs text-muted-foreground">Histórico completo da ordem</p>
          <ol className="relative space-y-5 border-l border-border pl-5">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className={"absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 " + (i === timeline.length - 1 ? "border-primary bg-primary shadow-glow" : "border-border bg-card")} />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.time} • {t.who}</p>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1"><MessageSquare className="h-4 w-4" /> Comentar</Button>
            <Button size="sm" className="flex-1 bg-secondary text-foreground hover:bg-secondary/80"><Wrench className="h-4 w-4" /> Atualizar status</Button>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Status atual</p>
            <StatusBadge status={o.status} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Manutencao;
