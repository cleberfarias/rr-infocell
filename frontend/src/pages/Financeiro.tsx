import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/data/mock";
import { listDespesas } from "@/services/despesas";
import { listOrdensServico } from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";
import { listVendas } from "@/services/vendas";

const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

const toDateKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const Financeiro = () => {
  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "financeiro"],
    queryFn: () => listOrdensServico(),
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos", "financeiro"],
    queryFn: () => listProdutos(),
  });

  const despesasQuery = useQuery({
    queryKey: ["despesas", "financeiro"],
    queryFn: () => listDespesas(),
  });

  const vendasQuery = useQuery({
    queryKey: ["vendas", "financeiro"],
    queryFn: () => listVendas(),
  });

  const isLoading =
    ordensQuery.isLoading ||
    produtosQuery.isLoading ||
    despesasQuery.isLoading ||
    vendasQuery.isLoading;
  const isError =
    ordensQuery.isError ||
    produtosQuery.isError ||
    despesasQuery.isError ||
    vendasQuery.isError;

  const financeiro = useMemo(() => {
    const ordens = ordensQuery.data ?? [];
    const produtos = produtosQuery.data ?? [];
    const despesas = despesasQuery.data ?? [];
    const vendas = vendasQuery.data ?? [];
    const produtoById = new Map(produtos.map((produto) => [produto.id, produto]));
    const vendasOrdemIds = new Set(vendas.map((venda) => venda.ordemServicoId));
    const ordensFaturadasFallback = ordens.filter(
      (ordem) => ordem.status === "entregue" && !vendasOrdemIds.has(ordem.id),
    );
    const receitaServicos =
      vendas.reduce((sum, venda) => sum + venda.valorMaoObra, 0) +
      ordensFaturadasFallback.reduce((sum, ordem) => sum + ordem.valorMaoObra, 0);
    const receitaProdutos =
      vendas.reduce((sum, venda) => sum + venda.valorPecas, 0) +
      ordensFaturadasFallback.reduce((sum, ordem) => sum + ordem.valorPecas, 0);
    const ordensFaturadas = [
      ...ordens.filter((ordem) => vendasOrdemIds.has(ordem.id)),
      ...ordensFaturadasFallback,
    ];
    const custoPecas = ordensFaturadas.reduce(
      (total, ordem) =>
        total +
        ordem.pecasUsadas.reduce((subtotal, peca) => {
          const produto = produtoById.get(peca.produtoId);
          const custo = produto?.custo ?? peca.valorUnitario;

          return subtotal + custo * peca.quantidade;
        }, 0),
      0,
    );
    const despesasFixas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
    const lucroBruto = receitaServicos + receitaProdutos - custoPecas;
    const lucroLiquido = lucroBruto - despesasFixas;

    const today = new Date();
    const dias = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      return {
        dia: shortDay.format(date).replace(".", ""),
        key: date.toISOString().slice(0, 10),
        produtos: 0,
        servicos: 0,
      };
    });
    const diaByKey = new Map(dias.map((dia) => [dia.key, dia]));

    vendas.forEach((venda) => {
      const dia = diaByKey.get(toDateKey(venda.createdAt));

      if (dia) {
        dia.produtos += venda.valorPecas;
        dia.servicos += venda.valorMaoObra;
      }
    });

    ordensFaturadasFallback.forEach((ordem) => {
      const dia = diaByKey.get(toDateKey(ordem.pagoEm ?? ordem.entregueEm));

      if (dia) {
        dia.produtos += ordem.valorPecas;
        dia.servicos += ordem.valorMaoObra;
      }
    });

    return {
      custoPecas,
      despesasFixas,
      faturamentoSemanal: dias,
      lucroBruto,
      lucroLiquido,
      produtos,
      receitaProdutos,
      receitaServicos,
    };
  }, [despesasQuery.data, ordensQuery.data, produtosQuery.data, vendasQuery.data]);

  if (isLoading) {
    return (
      <Card className="surface-panel flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="surface-panel p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="font-display text-xl font-semibold">
              Nao foi possivel carregar o financeiro
            </h2>
            <p className="text-sm text-muted-foreground">
              Verifique se o backend esta rodando e tente novamente.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              ordensQuery.refetch();
              produtosQuery.refetch();
              despesasQuery.refetch();
              vendasQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  const receitaTotal = financeiro.receitaServicos + financeiro.receitaProdutos;
  const margem =
    receitaTotal > 0 ? (financeiro.lucroLiquido / receitaTotal) * 100 : 0;
  const linhas = [
    { label: "Receita com servicos", valor: financeiro.receitaServicos, tipo: "in" as const },
    { label: "Receita com produtos", valor: financeiro.receitaProdutos, tipo: "in" as const },
    { label: "(-) Custo de pecas", valor: -financeiro.custoPecas, tipo: "out" as const },
    { label: "= Lucro bruto", valor: financeiro.lucroBruto, tipo: "sum" as const },
    { label: "(-) Despesas fixas", valor: -financeiro.despesasFixas, tipo: "out" as const },
    { label: "= Lucro liquido estimado", valor: financeiro.lucroLiquido, tipo: "sum" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            // DRE simplificado
          </p>
          <h2 className="font-display text-2xl font-bold">Visao financeira</h2>
          <p className="text-sm text-muted-foreground">
            Receita por vendas reais, custos estimados de pecas e despesas cadastradas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4" /> 30 dias
          </Button>
          <Button variant="outline">Mensal</Button>
          <Button variant="outline">Trimestral</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Receita total
          </p>
          <p className="mt-2 font-display text-3xl font-bold">
            {formatBRL(receitaTotal)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" /> vendas finalizadas
          </p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Custo de pecas
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-destructive">
            {formatBRL(financeiro.custoPecas)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-warning">
            <TrendingDown className="h-3 w-3" /> estimado pelo estoque
          </p>
        </Card>
        <Card className="surface-panel border-primary/40 p-5 shadow-glow">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Lucro liquido
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-primary glow-text">
            {formatBRL(financeiro.lucroLiquido)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" /> Margem {margem.toFixed(0)}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="surface-panel p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-semibold">
            Evolucao de receita - ultimos 7 dias
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={financeiro.faturamentoSemanal}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatBRL(value)}
                />
                <Area type="monotone" dataKey="servicos" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="produtos" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-panel p-5">
          <h3 className="mb-4 font-display text-base font-semibold">
            DRE simplificado
          </h3>
          <ul className="space-y-2 text-sm">
            {linhas.map((linha) => (
              <li
                key={linha.label}
                className={
                  "flex items-center justify-between rounded-md px-3 py-2 " +
                  (linha.tipo === "sum"
                    ? "border border-primary/30 bg-primary/5 font-semibold"
                    : "bg-secondary/30")
                }
              >
                <span
                  className={
                    linha.tipo === "sum"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {linha.label}
                </span>
                <span
                  className={
                    "font-mono tabular-nums " +
                    (linha.tipo === "out"
                      ? "text-destructive"
                      : linha.tipo === "sum"
                        ? "text-primary"
                        : "text-success")
                  }
                >
                  {formatBRL(Math.abs(linha.valor))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="surface-panel p-5">
        <h3 className="mb-4 font-display text-base font-semibold">
          Top pecas - impacto no resultado
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Peca</th>
                <th className="px-3 py-2 text-right font-medium">Custo medio</th>
                <th className="px-3 py-2 text-right font-medium">Venda media</th>
                <th className="px-3 py-2 text-right font-medium">Margem</th>
                <th className="px-3 py-2 text-right font-medium">Lucro / un</th>
              </tr>
            </thead>
            <tbody>
              {financeiro.produtos.slice(0, 5).map((produto) => {
                const lucro = produto.precoVenda - produto.custo;
                const margemProduto =
                  produto.precoVenda > 0 ? (lucro / produto.precoVenda) * 100 : 0;

                return (
                  <tr key={produto.id} className="border-b border-border/40">
                    <td className="px-3 py-2 font-medium">{produto.nome}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {formatBRL(produto.custo)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatBRL(produto.precoVenda)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-success">
                      {margemProduto.toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {formatBRL(lucro)}
                    </td>
                  </tr>
                );
              })}
              {financeiro.produtos.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Financeiro;
