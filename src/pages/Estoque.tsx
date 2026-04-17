import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pecasEstoque, formatBRL } from "@/data/mock";
import { Search, Plus, AlertTriangle, Package, TrendingUp } from "lucide-react";

const Estoque = () => {
  const totalSku = pecasEstoque.length;
  const baixoEstoque = pecasEstoque.filter(p => p.estoque <= p.minimo).length;
  const valorEstoque = pecasEstoque.reduce((s, p) => s + p.estoque * p.custo, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">SKUs ativos</p><p className="font-display text-2xl font-bold">{totalSku}</p></div>
          </div>
        </Card>
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Estoque baixo</p><p className="font-display text-2xl font-bold">{baixoEstoque}</p></div>
          </div>
        </Card>
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Valor em estoque (custo)</p><p className="font-display text-2xl font-bold">{formatBRL(valorEstoque)}</p></div>
          </div>
        </Card>
      </div>

      <Card className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar peça por SKU ou nome..." />
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Nova peça</Button>
      </Card>

      <Card className="surface-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">SKU</th>
                <th className="px-5 py-3 text-left font-medium">Peça</th>
                <th className="px-5 py-3 text-center font-medium">Estoque</th>
                <th className="px-5 py-3 text-center font-medium">Mínimo</th>
                <th className="px-5 py-3 text-right font-medium">Custo</th>
                <th className="px-5 py-3 text-right font-medium">Venda</th>
                <th className="px-5 py-3 text-right font-medium">Margem</th>
                <th className="px-5 py-3 text-right font-medium">Lucro / un</th>
              </tr>
            </thead>
            <tbody>
              {pecasEstoque.map((p) => {
                const lucro = p.venda - p.custo;
                const margem = (lucro / p.venda) * 100;
                const baixo = p.estoque <= p.minimo;
                return (
                  <tr key={p.sku} className="border-b border-border/40 transition-colors hover:bg-secondary/30">
                    <td className="px-5 py-3 font-mono text-xs text-primary">{p.sku}</td>
                    <td className="px-5 py-3 font-medium">{p.nome}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono font-medium " + (baixo ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success")}>
                        {baixo && <AlertTriangle className="h-3 w-3" />} {p.estoque}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-muted-foreground">{p.minimo}</td>
                    <td className="px-5 py-3 text-right font-mono text-muted-foreground">{formatBRL(p.custo)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatBRL(p.venda)}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-success">{margem.toFixed(0)}%</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">{formatBRL(lucro)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Estoque;
