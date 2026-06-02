import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateShort } from "@/lib/formatters";
import { OS_STATUS_LABELS } from "@/constants/status";
import { STALE_TIME } from "@/constants/query";
import { ROUTES } from "@/constants/routes";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
} from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";

const activeStatuses = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
];

const finalStatuses: string[] = ["pronto_para_retirada", "entregue"];

const isOverdue = (ordem: OrdemServico) => {
  if (!ordem.previsaoEntregaEm || ["entregue", "sem_conserto", "cancelado"].includes(ordem.status)) {
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

const Dashboard = () => {
  const [mesOffset, setMesOffset] = useState(0);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico"],
    queryFn: () => listOrdensServico(),
    staleTime: STALE_TIME.short,
    refetchOnWindowFocus: false,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(""),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos"],
    queryFn: () => listAparelhos(),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutos({ ativo: true }),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
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

  const mesSelecionado = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + mesOffset);
    return d;
  }, [mesOffset]);

  const isMesAtual = mesOffset === 0;

  const relatorio = useMemo(() => {
    const anoSel = mesSelecionado.getFullYear();
    const mesSel = mesSelecionado.getMonth();

    const agora = new Date();
    const diaAtual = agora.getDate();

    const abertas = ordens.filter((ordem) => !["entregue", "sem_conserto", "cancelado"].includes(ordem.status));
    const emManutencao = ordens.filter((ordem) => activeStatuses.includes(ordem.status));
    const finalizadas = ordens.filter((ordem) => finalStatuses.includes(ordem.status));
    const atrasadas = ordens.filter(isOverdue);

    const ordensDoMes = ordens.filter((ordem) => {
      const d = new Date(ordem.entradaEm);
      return d.getFullYear() === anoSel && d.getMonth() === mesSel;
    });

    const ordensDoDia = ordens.filter((ordem) => {
      const d = new Date(ordem.entradaEm);
      return (
        d.getFullYear() === anoSel &&
        d.getMonth() === mesSel &&
        d.getDate() === diaAtual
      );
    });

    const valorMes = ordensDoMes.reduce((total, ordem) => total + ordem.valorTotal, 0);
    const valorDia = ordensDoDia.reduce((total, ordem) => total + ordem.valorTotal, 0);
    const ticketMedio = ordensDoMes.length > 0 ? valorMes / ordensDoMes.length : 0;

    return {
      abertas: abertas.length,
      atrasadas: atrasadas.length,
      emManutencao: emManutencao.length,
      finalizadas: finalizadas.length,
      ticketMedio,
      valorMes,
      valorDia,
      qtdMes: ordensDoMes.length,
      qtdDia: ordensDoDia.length,
    };
  }, [ordens, mesSelecionado]);

  const statusChart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ordem of ordens) {
      counts.set(ordem.status, (counts.get(ordem.status) ?? 0) + 1);
    }
    return Object.entries(OS_STATUS_LABELS).map(([status, label]) => ({
      label,
      total: counts.get(status) ?? 0,
    }));
  }, [ordens]);

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

  const estoqueInfo = useMemo(() => {
    const produtos = produtosQuery.data ?? [];
    const total = produtos.length;
    const baixos = produtos.filter(
      (p) => p.estoqueAtual <= p.estoqueMinimo && p.estoqueAtual >= 0,
    );
    const zerados = produtos.filter((p) => p.estoqueAtual <= 0);
    const pct = total > 0 ? Math.round((baixos.length / total) * 100) : 0;
    return { total, baixos: baixos.length, zerados: zerados.length, pct };
  }, [produtosQuery.data]);

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading;
  const isError =
    ordensQuery.isError || clientesQuery.isError || aparelhosQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="surface-panel p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-16" />
            </Card>
          ))}
        </div>
        <Card className="surface-panel p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={ClipboardList}
          title="Não foi possível carregar o dashboard"
          description="Verifique se o backend está rodando em http://localhost:3333."
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
        eyebrow="// Visão geral"
        title="Resumo do dia"
        description={new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMesOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize">
            {mesSelecionado.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMesOffset((o) => o + 1)}
            disabled={isMesAtual}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isMesAtual && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setMesOffset(0)}
            >
              Voltar ao mês atual
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={Smartphone}
          label="Em manutenção"
          value={relatorio.emManutencao}
          hint="aparelhos na bancada"
        />
        <MetricCard
          icon={ClipboardList}
          label="Ordens abertas"
          value={relatorio.abertas}
          hint="aguardando ação"
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
          hint="passaram da previsão"
          accentClassName="bg-destructive/10 text-destructive"
        />
        <MetricCard
          icon={TrendingUp}
          label={isMesAtual ? "Total do mês" : `Total de ${mesSelecionado.toLocaleDateString("pt-BR", { month: "short" })}`}
          value={formatBRL(relatorio.valorMes)}
          trend={`${relatorio.qtdMes} OS · ticket médio ${formatBRL(relatorio.ticketMedio)}`}
          accentClassName="bg-primary/10 text-primary"
        />
        {isMesAtual && (
          <MetricCard
            icon={TrendingUp}
            label="Total do dia"
            value={formatBRL(relatorio.valorDia)}
            trend={`${relatorio.qtdDia} OS abertas hoje`}
            accentClassName="bg-emerald-500/10 text-emerald-400"
          />
        )}
      </div>

      {estoqueInfo.baixos > 0 && (
        <Link to={ROUTES.estoqueBaixo}>
          <Card
            className={cn(
              "surface-panel p-4 border cursor-pointer hover:opacity-90 transition-opacity",
              estoqueInfo.pct > 50
                ? "border-red-500/50 bg-red-500/5"
                : estoqueInfo.pct > 20
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-orange-500/50 bg-orange-500/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Estoque baixo
                </p>
                <p
                  className={cn(
                    "font-display text-2xl font-bold mt-1",
                    estoqueInfo.pct > 50
                      ? "text-red-500"
                      : estoqueInfo.pct > 20
                        ? "text-amber-500"
                        : "text-orange-500",
                  )}
                >
                  {estoqueInfo.pct}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {estoqueInfo.baixos} iten
                  {estoqueInfo.baixos > 1 ? "s" : ""} abaixo do mínimo
                  {estoqueInfo.zerados > 0 &&
                    ` · ${estoqueInfo.zerados} zerado${estoqueInfo.zerados > 1 ? "s" : ""}`}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                  estoqueInfo.pct > 50
                    ? "bg-red-500/15"
                    : estoqueInfo.pct > 20
                      ? "bg-amber-500/15"
                      : "bg-orange-500/15",
                )}
              >
                ⚠️
              </div>
            </div>
            <p
              className={cn(
                "mt-2 text-[10px] font-bold uppercase tracking-widest",
                estoqueInfo.pct > 50
                  ? "text-red-500"
                  : estoqueInfo.pct > 20
                    ? "text-amber-500"
                    : "text-orange-500",
              )}
            >
              {estoqueInfo.pct > 50
                ? "Critico - repor urgente"
                : estoqueInfo.pct > 20
                  ? "Atencao - repor em breve"
                  : "Verificar estoque"}
            </p>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionPanel
          title="Relatório de OS"
          description="Distribuição por status no banco atual"
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

        <SectionPanel
          title="Resumo financeiro"
          description={`Valores de ${mesSelecionado.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total do mês</dt>
              <dd className="font-mono font-semibold text-primary">{formatBRL(relatorio.valorMes)}</dd>
            </div>
            {isMesAtual && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Total do dia</dt>
                <dd className="font-mono font-semibold text-emerald-400">{formatBRL(relatorio.valorDia)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Ticket médio</dt>
              <dd className="font-mono">{formatBRL(relatorio.ticketMedio)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">OS no mês</dt>
              <dd className="font-mono">{relatorio.qtdMes}</dd>
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
          description="Últimas OS atualizadas"
          className="col-span-1 lg:col-span-2"
          contentClassName="p-0"
          actions={
            <Link to={ROUTES.ordens} className="text-xs text-primary hover:underline">
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
                        <Link to={ROUTES.ordemDetalhe(ordem.id)}>OS-{ordem.numero}</Link>
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
          <h3 className="font-display text-base font-semibold">Atalhos rápidos</h3>
          <p className="mb-4 text-xs text-muted-foreground">Fluxos mais usados</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: ROUTES.novaOS, icon: Plus, label: "Nova OS", desc: "Cadastrar aparelho", primary: true },
              { to: ROUTES.clientes, icon: Users, label: "Clientes", desc: "Histórico e busca" },
              { to: ROUTES.estoque, icon: Package, label: "Estoque", desc: "Peças e custos" },
              { to: ROUTES.pdv, icon: ShoppingCart, label: "Caixa", desc: "Fechar OS / venda" },
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
