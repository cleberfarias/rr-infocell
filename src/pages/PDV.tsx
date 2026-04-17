import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ordens, formatBRL } from "@/data/mock";
import { Receipt, CreditCard, Banknote, QrCode, CheckCircle2, Printer } from "lucide-react";
import { useState } from "react";

const PDV = () => {
  const o = ordens[2]; // finalizado
  const subPecas = o.pecas.reduce((s, p) => s + p.qtd * p.venda, 0);
  const total = subPecas + o.valorMaoObra;
  const [recebido, setRecebido] = useState(total);
  const [forma, setForma] = useState("pix");
  const troco = Math.max(0, recebido - total);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card className="surface-panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">// Fechamento {o.id}</p>
              <h2 className="font-display text-2xl font-bold">PDV / Caixa</h2>
              <p className="text-sm text-muted-foreground">Transformar OS finalizada em venda registrada.</p>
            </div>
            <div className="rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> OS pronta para entrega
            </div>
          </div>

          <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cliente</p>
            <p className="text-base font-semibold">{o.cliente}</p>
            <p className="text-xs text-muted-foreground">{o.telefone} • {o.marca} {o.modelo}</p>
          </div>

          <div className="mt-5 space-y-2">
            {o.pecas.map(p => (
              <div key={p.nome} className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">Peça • {p.qtd}x</p>
                </div>
                <p className="font-mono font-semibold">{formatBRL(p.qtd * p.venda)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
              <div>
                <p className="font-medium">Mão de obra</p>
                <p className="text-xs text-muted-foreground">Serviço técnico</p>
              </div>
              <p className="font-mono font-semibold">{formatBRL(o.valorMaoObra)}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <p className="font-display text-sm uppercase tracking-wide text-muted-foreground">Total a pagar</p>
            <p className="font-display text-4xl font-bold text-primary glow-text">{formatBRL(total)}</p>
          </div>
        </Card>
      </div>

      <Card className="surface-panel p-6">
        <h3 className="mb-1 font-display text-base font-semibold">Pagamento</h3>
        <p className="mb-4 text-xs text-muted-foreground">Selecione a forma e finalize</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "pix",     label: "PIX",         icon: QrCode },
            { k: "cartao",  label: "Cartão",      icon: CreditCard },
            { k: "dinheiro",label: "Dinheiro",    icon: Banknote },
          ].map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setForma(k)} className={
              "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
              (forma === k ? "border-primary bg-primary/10 text-primary shadow-glow" : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
            }>
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor recebido</Label>
            <Input type="number" value={recebido} onChange={(e) => setRecebido(Number(e.target.value))} className="mt-1.5 font-mono text-lg" />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Troco</span>
            <span className="font-mono text-lg font-semibold text-success">{formatBRL(troco)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-success">Status</span>
            <span className="text-xs font-semibold uppercase text-success">Confirmado</span>
          </div>

          <Select defaultValue="recibo">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recibo">Recibo simples (não fiscal)</SelectItem>
              <SelectItem value="orcamento">Orçamento</SelectItem>
            </SelectContent>
          </Select>

          <Button className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Receipt className="h-4 w-4" /> Finalizar venda</Button>
          <Button variant="outline" className="w-full"><Printer className="h-4 w-4" /> Imprimir comprovante</Button>
        </div>
      </Card>
    </div>
  );
};

export default PDV;
