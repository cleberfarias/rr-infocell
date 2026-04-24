import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { ordens, formatBRL } from "@/data/mock";
import { Filter, Search, Eye, ClipboardCheck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const Ordens = () => {
  return (
    <div className="space-y-5">
      <Card className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por OS, cliente, IMEI ou aparelho..." />
        </div>
        <Button variant="outline"><Filter className="h-4 w-4" /> Filtros</Button>
        <div className="flex gap-1 rounded-md border border-border bg-secondary/40 p-1 text-xs">
          {["Todas", "Abertas", "Em manutenção", "Finalizadas", "Atrasadas"].map((t, i) => (
            <button key={t} className={"rounded-sm px-3 py-1.5 font-medium " + (i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{t}</button>
          ))}
        </div>
      </Card>

      <Card className="surface-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">OS</th>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">Aparelho</th>
                <th className="px-5 py-3 text-left font-medium">Defeito</th>
                <th className="px-5 py-3 text-left font-medium">Técnico</th>
                <th className="px-5 py-3 text-left font-medium">Entrada</th>
                <th className="px-5 py-3 text-left font-medium">Previsão</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordens.map((o) => (
                <tr key={o.id} className="border-b border-border/40 transition-colors hover:bg-secondary/30">
                  <td className="px-5 py-3 font-mono text-xs text-primary">{o.id}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{o.cliente}</div>
                    <div className="text-xs text-muted-foreground">{o.telefone}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{o.marca} {o.modelo}</div>
                    <div className="text-xs text-muted-foreground">{o.cor} • IMEI {o.imei.slice(-6)}</div>
                  </td>
                  <td className="px-5 py-3 max-w-[220px] truncate text-muted-foreground" title={o.defeito}>{o.defeito}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.tecnico}</td>
                  <td className="px-5 py-3 font-mono text-xs">{o.entrada}</td>
                  <td className="px-5 py-3 font-mono text-xs">{o.previsao}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{formatBRL(o.valorPecas + o.valorMaoObra)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Detalhes"><Link to="/app/manutencao"><Eye className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="icon" asChild title="Checklist"><Link to="/app/checklist"><ClipboardCheck className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="icon" asChild title="Manutenção"><Link to="/app/manutencao"><Wrench className="h-4 w-4" /></Link></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>Mostrando {ordens.length} de {ordens.length} ordens</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>Anterior</Button>
            <Button variant="outline" size="sm">1</Button>
            <Button variant="ghost" size="sm" disabled>Próxima</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Ordens;
