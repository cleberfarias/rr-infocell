import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { faturamentoSemanal, ordens, pecasEstoque, despesas, formatBRL } from "@/data/mock";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

const Financeiro = () => {
  const receitaServicos = ordens.reduce((s, o) => s + o.valorMaoObra, 0) * 4;
  const receitaProdutos = ordens.reduce((s, o) => s + o.valorPecas, 0) * 4;
  const custoPecas = ordens.reduce((s, o) => s + o.pecas.reduce((a, p) => a + p.custo * p.qtd, 0), 0) * 4;
  const lucroBruto = receitaServicos + receitaProdutos - custoPecas;
  const despesasFixas = despesas.reduce((s, d) => s + d.valor, 0);
  const lucroLiquido = lucroBruto - despesasFixas;

  const linhas = [
    { label: "Receita com serviços", valor: receitaServicos,  tipo: "in"  as const },
    { label: "Receita com produtos", valor: receitaProdutos,  tipo: "in"  as const },
    { label: "(–) Custo de peças",   valor: -custoPecas,      tipo: "out" as const },
    { label: "= Lucro bruto",        valor: lucroBruto,       tipo: "sum" as const },
    { label: "(–) Despesas fixas",   valor: -despesasFixas,   tipo: "out" as const },
    { label: "= Lucro líquido estimado", valor: lucroLiquido, tipo: "sum" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// DRE simplificado</p>
          <h2 className="font-display text-2xl font-bold">Visão financeira</h2>
          <p className="text-sm text-muted-foreground">Período atual: últimos 30 dias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4" /> 30 dias</Button>
          <Button variant="outline">Mensal</Button>
          <Button variant="outline">Trimestral</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Receita total</p>
          <p className="mt-2 font-display text-3xl font-bold">{formatBRL(receitaServicos + receitaProdutos)}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" /> +18% vs mês anterior</p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Custo de peças</p>
          <p className="mt-2 font-display text-3xl font-bold text-destructive">{formatBRL(custoPecas)}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-warning"><TrendingDown className="h-3 w-3" /> –4% vs mês anterior</p>
        </Card>
        <Card className="surface-panel p-5 border-primary/40 shadow-glow">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Lucro líquido</p>
          <p className="mt-2 font-display text-3xl font-bold text-primary glow-text">{formatBRL(lucroLiquido)}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" /> Margem {((lucroLiquido / (receitaServicos + receitaProdutos)) * 100).toFixed(0)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="surface-panel p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-semibold">Evolução de receita — últimos 7 dias</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={faturamentoSemanal}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                <Area type="monotone" dataKey="servicos" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="produtos" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-panel p-5">
          <h3 className="mb-4 font-display text-base font-semibold">DRE simplificado</h3>
          <ul className="space-y-2 text-sm">
            {linhas.map((l) => (
              <li key={l.label} className={
                "flex items-center justify-between rounded-md px-3 py-2 " +
                (l.tipo === "sum" ? "border border-primary/30 bg-primary/5 font-semibold" : "bg-secondary/30")
              }>
                <span className={l.tipo === "sum" ? "text-foreground" : "text-muted-foreground"}>{l.label}</span>
                <span className={
                  "font-mono tabular-nums " +
                  (l.tipo === "out" ? "text-destructive" : l.tipo === "sum" ? "text-primary" : "text-success")
                }>{formatBRL(Math.abs(l.valor)) }</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="surface-panel p-5">
        <h3 className="mb-4 font-display text-base font-semibold">Top peças — impacto no resultado</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Peça</th>
                <th className="px-3 py-2 text-right font-medium">Custo médio</th>
                <th className="px-3 py-2 text-right font-medium">Venda média</th>
                <th className="px-3 py-2 text-right font-medium">Margem</th>
                <th className="px-3 py-2 text-right font-medium">Lucro / un</th>
              </tr>
            </thead>
            <tbody>
              {pecasEstoque.slice(0, 5).map(p => {
                const lucro = p.venda - p.custo;
                const margem = (lucro / p.venda) * 100;
                return (
                  <tr key={p.sku} className="border-b border-border/40">
                    <td className="px-3 py-2 font-medium">{p.nome}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatBRL(p.custo)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatBRL(p.venda)}</td>
                    <td className="px-3 py-2 text-right font-mono text-success">{margem.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatBRL(lucro)}</td>
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

export default Financeiro;
