import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, MetricCard, PageHeader, SectionPanel } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/data/mock";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

const statusLabels: Record<OrdemServicoStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em analise",
  aguardando_aprovacao: "Aguardando aprovacao",
  aguardando_peca: "Aguardando peca",
  em_manutencao: "Em manutencao",
  pronto_para_retirada: "Pronto retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const activeStatuses: OrdemServicoStatus[] = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
];

const finalStatuses: OrdemServicoStatus[] = ["pronto_para_retirada", "entregue"];

const isOverdue = (ordem: OrdemServico) => {
  if (!ordem.previsaoEntregaEm || ["entregue", "cancelado"].includes(ordem.status)) {
    return false;
  }

  const previsao = new Date(ordem.previsaoEntregaEm);

  if (Number.isNaN(previsao.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  previsao.setHours(0, 0, 0, 0);

  return previsao < today;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const Dashboard = () => {
  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "dashboard"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "dashboard"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "dashboard"],
    queryFn: () => listAparelhos(),
  });

  const ordens = useMemo(() => ordensQuery.data ?? [], [ordensQuery.data]);

  const clienteById = useMemo(
    () =>
      new Map(
        (clientesQuery.data ?? []).map((cliente) => [cliente.id, cliente]),
      ),
    [clientesQuery.data],
  );

  const aparelhoById = useMemo(
    () =>
      new Map(
        (aparelhosQuery.data ?? []).map((aparelho) => [aparelho.id, aparelho]),
      ),
    [aparelhosQuery.data],
  );

  const relatorio = useMemo(() => {
    const abertas = ordens.filter((ordem) => ordem.status !== "entregue" && ordem.status !== "cancelado");
    const emManutencao = ordens.filter((ordem) => activeStatuses.includes(ordem.status));
    const finalizadas = ordens.filter((ordem) => finalStatuses.includes(ordem.status));
    const atrasadas = ordens.filter(isOverdue);
    const valorTotal = ordens.reduce((total, ordem) => total + ordem.valorTotal, 0);
    const ticketMedio = ordens.length > 0 ? valorTotal / ordens.length : 0;

    return {
      abertas: abertas.length,
      atrasadas: atrasadas.length,
      emManutencao: emManutencao.length,
      finalizadas: finalizadas.length,
      ticketMedio,
      valorTotal,
    };
  }, [ordens]);

  const statusChart = useMemo(
    () =>
      Object.entries(statusLabels).map(([status, label]) => ({
        label,
        total: ordens.filter((ordem) => ordem.status === status).length,
      })),
    [ordens],
  );

  const ordensRecentes = useMemo(
    () =>
      [...ordens]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6),
    [ordens],
  );

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading;
  const isError =
    ordensQuery.isError || clientesQuery.isError || aparelhosQuery.isError;

  if (isLoading) {
    return (
      <Card className="surface-panel flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={ClipboardList}
          title="Nao foi possivel carregar o dashboard"
          description="Verifique se o backend esta rodando em http://localhost:3333."
          actions={
            <Button
              variant="outline"
              onClick={() => {
                ordensQuery.refetch();
                clientesQuery.refetch();
                aparelhosQuery.refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

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
        <MetricCard
          icon={Smartphone}
          label="Em manutencao"
          value={relatorio.emManutencao}
          hint="aparelhos na bancada"
        />
        <MetricCard
          icon={ClipboardList}
          label="Ordens abertas"
          value={relatorio.abertas}
          hint="aguardando acao"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Finalizadas"
          value={relatorio.finalizadas}
          hint="prontas / entregues"
          accentClassName="bg-success/10 text-success"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Em atraso"
          value={relatorio.atrasadas}
          hint="passaram da previsao"
          accentClassName="bg-destructive/10 text-destructive"
        />
        <MetricCard
          icon={TrendingUp}
          label="Total em OS"
          value={formatBRL(relatorio.valorTotal)}
          trend={`Ticket medio ${formatBRL(relatorio.ticketMedio)}`}
          accentClassName="bg-primary/10 text-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionPanel
          title="Relatorio de OS"
          description="Distribuicao por status no banco atual"
          className="col-span-1 lg:col-span-2"
          contentClassName="pt-4"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={statusChart} barCategoryGap={18}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
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
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Resumo financeiro" description="Valores previstos em OS">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total previsto</dt>
              <dd className="font-mono font-semibold">{formatBRL(relatorio.valorTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Ticket medio</dt>
              <dd className="font-mono">{formatBRL(relatorio.ticketMedio)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Quantidade de OS</dt>
              <dd className="font-mono">{ordens.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Canceladas</dt>
              <dd className="font-mono">
                {ordens.filter((ordem) => ordem.status === "cancelado").length}
              </dd>
            </div>
          </dl>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionPanel
          title="Ordens recentes"
          description="Ultimas OS atualizadas"
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
                {ordensRecentes.map((ordem) => {
                  const cliente = clienteById.get(ordem.clienteId);
                  const aparelho = aparelhoById.get(ordem.aparelhoId);

                  return (
                    <tr
                      key={ordem.id}
                      className="border-b border-border/50 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-primary">
                        <Link to={`/app/ordens/${ordem.id}`}>OS-{ordem.numero}</Link>
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {cliente?.nome ?? ordem.clienteId}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {aparelho
                          ? `${aparelho.marca} ${aparelho.modelo}`
                          : ordem.aparelhoId}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={ordem.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {formatBRL(ordem.valorTotal)}
                      </td>
                    </tr>
                  );
                })}
                {ordensRecentes.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                      Nenhuma ordem cadastrada.
                    </td>
                  </tr>
                )}
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
