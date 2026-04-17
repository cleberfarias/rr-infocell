import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ordens, faturamentoSemanal, pecasMaisUsadas, formatBRL } from "@/data/mock";
import { Smartphone, ClipboardList, CheckCircle2, AlertTriangle, TrendingUp, Plus, Users, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const KPI = ({ icon: Icon, label, value, hint, trend, accent }: any) => (
  <Card className="surface-panel relative overflow-hidden p-5">
    <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-glow opacity-60" />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={"flex h-10 w-10 items-center justify-center rounded-md border border-border " + (accent ?? "bg-secondary text-primary")}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {trend && (
      <p className="relative mt-3 inline-flex items-center gap-1 font-mono text-xs text-success">
        <TrendingUp className="h-3 w-3" /> {trend}
      </p>
    )}
  </Card>
);

const Dashboard = () => {
  const emManutencao = ordens.filter(o => ["em_manutencao", "em_analise", "aguardando_aprovacao", "recebido"].includes(o.status)).length;
  const abertas = ordens.filter(o => o.status !== "entregue").length;
  const finalizadas = ordens.filter(o => ["finalizado", "entregue"].includes(o.status)).length;
  const atrasadas = ordens.filter(o => o.status === "atrasado").length;
  const faturamento = faturamentoSemanal.reduce((s, d) => s + d.servicos + d.produtos, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// Visão geral</p>
          <h2 className="font-display text-2xl font-bold">Resumo do dia</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPI icon={Smartphone}     label="Em manutenção" value={emManutencao}  hint="aparelhos na bancada" />
        <KPI icon={ClipboardList}  label="Ordens abertas" value={abertas}      hint="aguardando ação" />
        <KPI icon={CheckCircle2}   label="Finalizadas"   value={finalizadas}   hint="prontas / entregues" accent="bg-success/10 text-success" />
        <KPI icon={AlertTriangle}  label="Em atraso"     value={atrasadas}     hint="passaram da previsão" accent="bg-destructive/10 text-destructive" />
        <KPI icon={TrendingUp}     label="Faturamento 7d" value={formatBRL(faturamento)} trend="+12,4% vs semana anterior" accent="bg-primary/10 text-primary" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="surface-panel col-span-1 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Faturamento por dia</h3>
              <p className="text-xs text-muted-foreground">Serviços vs Produtos — últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" />Serviços</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/60" />Produtos</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={faturamentoSemanal} barCategoryGap={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Bar dataKey="servicos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="produtos" fill="hsl(var(--muted-foreground) / 0.6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-panel p-5">
          <h3 className="font-display text-base font-semibold">Peças mais utilizadas</h3>
          <p className="mb-4 text-xs text-muted-foreground">Últimos 30 dias</p>
          <ul className="space-y-3">
            {pecasMaisUsadas.map((p, i) => {
              const max = pecasMaisUsadas[0].qtd;
              const pct = (p.qtd / max) * 100;
              return (
                <li key={p.nome} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{i + 1}. {p.nome}</span>
                    <span className="font-mono text-muted-foreground">{p.qtd}x</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="surface-panel col-span-1 overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="font-display text-base font-semibold">Ordens recentes</h3>
              <p className="text-xs text-muted-foreground">Atualizadas nas últimas 24h</p>
            </div>
            <Link to="/app/ordens" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">OS</th>
                  <th className="px-5 py-2.5 text-left font-medium">Cliente</th>
                  <th className="px-5 py-2.5 text-left font-medium">Aparelho</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ordens.slice(0, 6).map((o) => (
                  <tr key={o.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                    <td className="px-5 py-3 font-mono text-xs text-primary">{o.id}</td>
                    <td className="px-5 py-3 font-medium">{o.cliente}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.marca} {o.modelo}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{formatBRL(o.valorPecas + o.valorMaoObra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="surface-panel p-5">
          <h3 className="font-display text-base font-semibold">Atalhos rápidos</h3>
          <p className="mb-4 text-xs text-muted-foreground">Fluxos mais usados</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/app/ordens/nova", icon: Plus, label: "Nova OS", desc: "Cadastrar aparelho", primary: true },
              { to: "/app/clientes",    icon: Users, label: "Clientes", desc: "Histórico e busca" },
              { to: "/app/estoque",     icon: Package, label: "Estoque", desc: "Peças e custos" },
              { to: "/app/pdv",         icon: ShoppingCart, label: "Caixa", desc: "Fechar OS / venda" },
            ].map(({ to, icon: Icon, label, desc, primary }) => (
              <Link
                key={to}
                to={to}
                className={
                  "group rounded-md border p-3 transition-all " +
                  (primary
                    ? "border-primary/40 bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary")
                }
              >
                <Icon className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">{label}</p>
                <p className={"text-xs " + (primary ? "text-primary-foreground/80" : "text-muted-foreground")}>{desc}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
