import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientes, formatBRL } from "@/data/mock";
import { Search, Plus, Phone, Smartphone, History } from "lucide-react";

const Clientes = () => {
  return (
    <div className="space-y-5">
      <Card className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone ou aparelho..." />
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Novo cliente</Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientes.map((c) => (
          <Card key={c.id} className="surface-panel group p-5 transition-all hover:border-primary/40 hover:shadow-glow">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-metal font-display text-lg font-bold">
                {c.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-semibold">{c.nome}</h3>
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {c.telefone}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aparelhos</p>
                <p className="font-display text-lg font-bold">{c.aparelhos}</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Visitas</p>
                <p className="font-display text-lg font-bold">{c.aparelhos + 1}</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="font-display text-lg font-bold text-primary">{formatBRL(c.total)}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Smartphone className="h-3 w-3" /> Último: <strong className="text-foreground">{c.ultimo}</strong></span>
              <Button variant="ghost" size="sm" className="text-primary"><History className="h-3 w-3" /> Histórico</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Clientes;
