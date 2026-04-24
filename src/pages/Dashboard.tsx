import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetricCard, PageHeader, SectionPanel } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { formatBRL, faturamentoSemanal, ordens, pecasMaisUsadas } from "@/data/mock";

const Dashboard = () => {
  const emManutencao = ordens.filter((ordem) =>
    ["em_manutencao", "em_analise", "aguardando_aprovacao", "recebido"].includes(ordem.status),
  ).length;
  const abertas = ordens.filter((ordem) => ordem.status !== "entregue").length;
  const finalizadas = ordens.filter((ordem) => ["finalizado", "entregue"].includes(ordem.status)).length;
  const atrasadas = ordens.filter((ordem) => ordem.status === "atrasado").length;
  const faturamento = faturamentoSemanal.reduce((total, dia) => total + dia.servicos + dia.produtos, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// Visao geral"
        title="Resumo do dia"
        description={new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Smartphone} label="Em manutencao" value={emManutencao} hint="aparelhos na bancada" />
        <MetricCard icon={ClipboardList} label="Ordens abertas" value={abertas} hint="aguardando acao" />
        <MetricCard
          icon={CheckCircle2}
          label="Finalizadas"
          value={finalizadas}
          hint="prontas / entregues"
          accentClassName="bg-success/10 text-success"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Em atraso"
          value={atrasadas}
          hint="passaram da previsao"
          accentClassName="bg-destructive/10 text-destructive"
        />
        <MetricCard
          icon={TrendingUp}
          label="Faturamento 7d"
          value={formatBRL(faturamento)}
          trend="+12,4% vs semana anterior"
          accentClassName="bg-primary/10 text-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionPanel
          title="Faturamento por dia"
          description="Servicos vs produtos nos ultimos 7 dias"
          className="col-span-1 lg:col-span-2"
          contentClassName="pt-4"
          actions={
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-primary" />
                Servicos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-muted-foreground/60" />
                Produtos
              </span>
            </div>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={faturamentoSemanal} barCategoryGap={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatBRL(value)}
                />
                <Bar dataKey="servicos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="produtos" fill="hsl(var(--muted-foreground) / 0.6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Pecas mais utilizadas" description="Ultimos 30 dias">
          <ul className="space-y-3">
            {pecasMaisUsadas.map((peca, index) => {
              const max = pecasMaisUsadas[0].qtd;
              const percentage = (peca.qtd / max) * 100;

              return (
                <li key={peca.nome} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {index + 1}. {peca.nome}
                    </span>
                    <span className="font-mono text-muted-foreground">{peca.qtd}x</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${percentage}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionPanel
          title="Ordens recentes"
          description="Atualizadas nas ultimas 24h"
          className="col-span-1 lg:col-span-2"
          contentClassName="p-0"
          actions={
            <Link to="/app/ordens" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
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
                {ordens.slice(0, 6).map((ordem) => (
                  <tr key={ordem.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                    <td className="px-5 py-3 font-mono text-xs text-primary">{ordem.id}</td>
                    <td className="px-5 py-3 font-medium">{ordem.cliente}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {ordem.marca} {ordem.modelo}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={ordem.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatBRL(ordem.valorPecas + ordem.valorMaoObra)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <Card className="surface-panel p-5">
          <h3 className="font-display text-base font-semibold">Atalhos rapidos</h3>
          <p className="mb-4 text-xs text-muted-foreground">Fluxos mais usados</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/app/ordens/nova", icon: Plus, label: "Nova OS", desc: "Cadastrar aparelho", primary: true },
              { to: "/app/clientes", icon: Users, label: "Clientes", desc: "Historico e busca" },
              { to: "/app/estoque", icon: Package, label: "Estoque", desc: "Pecas e custos" },
              { to: "/app/pdv", icon: ShoppingCart, label: "Caixa", desc: "Fechar OS / venda" },
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
                <p className={"text-xs " + (primary ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
