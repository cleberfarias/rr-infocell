import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME } from "@/constants/query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, Calendar, CreditCard, FileDown, Loader2, Plus, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/design-system";
import { toast } from "@/components/ui/sonner";
import { formatBRL } from "@/lib/formatters";
import { listDespesas } from "@/services/despesas";
import { listOrdensServico } from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";
import { listVendas } from "@/services/vendas";
import { createConta, deleteConta, listContas, updateConta, type ContaTipo } from "@/services/contas";

const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

const toDateKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const TIPO_LABEL: Record<ContaTipo, string> = {
  caixa: "Caixa",
  conta_corrente: "Conta Corrente",
  conta_poupanca: "Conta Poupança",
  pix: "PIX",
  outro: "Outro",
};

const ContaIcon = ({ tipo }: { tipo: ContaTipo }) => {
  switch (tipo) {
    case "caixa":
      return <Wallet className="h-5 w-5 text-success" />;
    case "conta_corrente":
      return <CreditCard className="h-5 w-5 text-blue-500" />;
    case "conta_poupanca":
      return <Building2 className="h-5 w-5 text-amber-500" />;
    case "pix":
      return <CreditCard className="h-5 w-5 text-primary" />;
    default:
      return <Wallet className="h-5 w-5 text-muted-foreground" />;
  }
};

const Financeiro = () => {
  const queryClient = useQueryClient();

  // --- período filter ---
  const [periodo, setPeriodo] = useState<"30d" | "mes" | "trimestre">("30d");

  const dataInicio = useMemo(() => {
    const hoje = new Date();
    if (periodo === "30d") {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - 30);
      return d;
    }
    if (periodo === "mes") {
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }
    // trimestre
    const trimestre = Math.floor(hoje.getMonth() / 3);
    return new Date(hoje.getFullYear(), trimestre * 3, 1);
  }, [periodo]);

  // --- state for contas dialog ---
  const [contaDialogOpen, setContaDialogOpen] = useState(false);
  const [contaForm, setContaForm] = useState({ nome: "", tipo: "caixa" as ContaTipo, saldo: "0" });
  // inline saldo editing: id -> draft string
  const [editingSaldo, setEditingSaldo] = useState<Record<string, string>>({});

  // --- queries ---
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

  const contasQuery = useQuery({
    queryKey: ["contas"],
    queryFn: () => listContas(),
    staleTime: STALE_TIME.medium,
  });

  // --- mutations ---
  const createContaMutation = useMutation({
    mutationFn: createConta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      toast.success("Conta criada com sucesso.");
      setContaDialogOpen(false);
      setContaForm({ nome: "", tipo: "caixa", saldo: "0" });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateContaMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateConta>[1] }) =>
      updateConta(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      toast.success("Saldo atualizado.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteContaMutation = useMutation({
    mutationFn: deleteConta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      toast.success("Conta removida.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
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
    const todasVendas = vendasQuery.data ?? [];

    // Filtrar por período selecionado
    const vendas = todasVendas.filter((v) => new Date(v.createdAt) >= dataInicio);
    const ordensFiltradas = ordens.filter((o) => {
      const data = o.pagoEm ?? o.entregueEm ?? o.updatedAt;
      return data && new Date(data) >= dataInicio;
    });

    const produtoById = new Map(produtos.map((produto) => [produto.id, produto]));
    const vendasOrdemIds = new Set(vendas.map((venda) => venda.ordemServicoId));
    const ordensFaturadasFallback = ordensFiltradas.filter(
      (ordem) => ordem.status === "entregue" && !vendasOrdemIds.has(ordem.id),
    );
    const receitaServicos =
      vendas.reduce((sum, venda) => sum + venda.valorMaoObra, 0) +
      ordensFaturadasFallback.reduce((sum, ordem) => sum + ordem.valorMaoObra, 0);
    const receitaProdutos =
      vendas.reduce((sum, venda) => sum + venda.valorPecas, 0) +
      ordensFaturadasFallback.reduce((sum, ordem) => sum + ordem.valorPecas, 0);
    const ordensFaturadas = [
      ...ordensFiltradas.filter((ordem) => vendasOrdemIds.has(ordem.id)),
      ...ordensFaturadasFallback,
    ];
    // CMV de peças usadas em OS
    const custoPecasOS = ordensFaturadas.reduce(
      (total, ordem) =>
        total +
        ordem.pecasUsadas.reduce((subtotal, peca) => {
          const produto = produtoById.get(peca.produtoId);
          const custo = produto?.custo ?? 0;
          return subtotal + custo * peca.quantidade;
        }, 0),
      0,
    );

    // CMV de produtos vendidos diretamente (sem OS)
    const custoPecasVendasDiretas = vendas
      .filter((v) => !v.ordemServicoId)
      .reduce(
        (total, venda) =>
          total +
          venda.itens.reduce((subtotal, item) => {
            const produto = produtoById.get(item.produtoId);
            const custo = produto?.custo ?? 0;
            return subtotal + custo * item.quantidade;
          }, 0),
        0,
      );

    const custoPecas = custoPecasOS + custoPecasVendasDiretas;
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

    const lucroEmProdutos = receitaProdutos - custoPecas;
    const lucroEmServicos = receitaServicos;

    return {
      custoPecas,
      despesasFixas,
      faturamentoSemanal: dias,
      historicoPagamentos: [...vendas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      lucroBruto,
      lucroEmProdutos,
      lucroEmServicos,
      lucroLiquido,
      produtos,
      receitaProdutos,
      receitaServicos,
      quantidadeVendas: vendas.length + ordensFaturadasFallback.length,
    };
  }, [despesasQuery.data, ordensQuery.data, produtosQuery.data, vendasQuery.data, dataInicio]);

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
              Não foi possível carregar o financeiro
            </h2>
            <p className="text-sm text-muted-foreground">
              Verifique se o backend está rodando e tente novamente.
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
    { label: "Receita com serviços (mão de obra)", valor: financeiro.receitaServicos, tipo: "in" as const },
    { label: "Lucro em serviços", valor: financeiro.lucroEmServicos, tipo: "in" as const, note: "100% lucro" },
    { label: "Receita com produtos/peças", valor: financeiro.receitaProdutos, tipo: "in" as const },
    { label: "(-) Custo de peças", valor: -financeiro.custoPecas, tipo: "out" as const },
    { label: "Lucro em produtos/peças", valor: financeiro.lucroEmProdutos, tipo: financeiro.lucroEmProdutos >= 0 ? "in" as const : "out" as const },
    { label: "= Lucro bruto", valor: financeiro.lucroBruto, tipo: "sum" as const },
    { label: "(-) Despesas fixas", valor: -financeiro.despesasFixas, tipo: "out" as const },
    { label: "= Lucro líquido total", valor: financeiro.lucroLiquido, tipo: "sum" as const },
  ];

  const contas = contasQuery.data ?? [];
  const saldoTotal = contas.reduce((sum, c) => sum + c.saldo, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            // DRE simplificado
          </p>
          <h2 className="font-display text-2xl font-bold">Visão financeira</h2>
          <p className="text-sm text-muted-foreground">
            Receita por vendas reais, custos estimados de peças e despesas cadastradas.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {periodo === "30d" && "Últimos 30 dias"}
            {periodo === "mes" && `${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
            {periodo === "trimestre" && `${Math.floor(new Date().getMonth() / 3) + 1}º trimestre de ${new Date().getFullYear()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={periodo === "30d" ? "default" : "outline"}
            onClick={() => setPeriodo("30d")}
          >
            <Calendar className="h-4 w-4" /> 30 dias
          </Button>
          <Button
            variant={periodo === "mes" ? "default" : "outline"}
            onClick={() => setPeriodo("mes")}
          >
            Mensal
          </Button>
          <Button
            variant={periodo === "trimestre" ? "default" : "outline"}
            onClick={() => setPeriodo("trimestre")}
          >
            Trimestral
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const conteudo = document.getElementById("dre-print-content")?.innerHTML;
              if (!conteudo) return;
              const win = window.open("", "_blank", "width=900,height=700");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
                <meta charset="UTF-8"/>
                <title>DRE — RR Infocell</title>
                <style>
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; padding: 24px; }
                  h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
                  h2 { font-size: 13px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin: 16px 0 8px; }
                  .kicker { font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
                  .sub { color: #6b7280; font-size: 11px; margin-top: 3px; }
                  .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
                  .cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
                  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
                  .card-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; font-weight: 700; }
                  .card-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
                  table { width: 100%; border-collapse: collapse; font-size: 10px; }
                  th, td { padding: 6px 8px; border: 1px solid #e5e7eb; }
                  th { background: #f3f4f6; font-weight: 700; }
                  .sum-row { background: #eff6ff; font-weight: 700; }
                  .text-right { text-align: right; }
                  .text-red { color: #ef4444; }
                  .text-green { color: #22c55e; }
                  .text-blue { color: #0284c7; }
                  .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; font-size: 9px; color: #9ca3af; }
                  @media print { body { padding: 12mm; } }
                </style>
              </head><body>${conteudo}
              <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
              </body></html>`);
              win.document.close();
            }}
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
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
            Custo de peças
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
            Lucro líquido
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-primary glow-text">
            {formatBRL(financeiro.lucroLiquido)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" /> Margem {margem.toFixed(0)}%
          </p>
        </Card>
      </div>

      {/* ── Contas e saldos ─────────────────────────────────────────── */}
      <Card className="surface-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Contas e saldos</h3>
          <Button size="sm" onClick={() => setContaDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        </div>

        {contasQuery.isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contas.map((conta) => (
              <div
                key={conta.id}
                className="relative flex flex-col gap-2 rounded-lg border border-border bg-secondary/20 p-4"
              >
                {/* delete button */}
                <button
                  aria-label="Remover conta"
                  className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Remover a conta "${conta.nome}"?`)) {
                      deleteContaMutation.mutate(conta.id);
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <ContaIcon tipo={conta.tipo} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{conta.nome}</p>
                    <p className="text-xs text-muted-foreground">{TIPO_LABEL[conta.tipo]}</p>
                  </div>
                </div>

                {/* inline saldo editing */}
                {editingSaldo[conta.id] !== undefined ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-7 text-sm"
                      value={editingSaldo[conta.id]}
                      onChange={(e) =>
                        setEditingSaldo((prev) => ({ ...prev, [conta.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseFloat(editingSaldo[conta.id] ?? "0");
                          updateContaMutation.mutate({ id: conta.id, input: { saldo: isNaN(val) ? 0 : val } });
                          setEditingSaldo((prev) => {
                            const next = { ...prev };
                            delete next[conta.id];
                            return next;
                          });
                        }
                        if (e.key === "Escape") {
                          setEditingSaldo((prev) => {
                            const next = { ...prev };
                            delete next[conta.id];
                            return next;
                          });
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const val = parseFloat(editingSaldo[conta.id] ?? "0");
                        updateContaMutation.mutate({ id: conta.id, input: { saldo: isNaN(val) ? 0 : val } });
                        setEditingSaldo((prev) => {
                          const next = { ...prev };
                          delete next[conta.id];
                          return next;
                        });
                      }}
                    >
                      OK
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setEditingSaldo((prev) => {
                          const next = { ...prev };
                          delete next[conta.id];
                          return next;
                        })
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    className="text-left"
                    title="Clique para editar o saldo"
                    onClick={() =>
                      setEditingSaldo((prev) => ({ ...prev, [conta.id]: String(conta.saldo) }))
                    }
                  >
                    <p className="font-mono text-lg font-bold tabular-nums">
                      {formatBRL(conta.saldo)}
                    </p>
                    <p className="text-xs text-muted-foreground">clique para editar</p>
                  </button>
                )}
              </div>
            ))}

            {/* total card */}
            <div className="flex flex-col justify-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Saldo total
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-primary">
                {formatBRL(saldoTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                {contas.length} conta{contas.length !== 1 ? "s" : ""}
              </p>
            </div>

            {contas.length === 0 && (
              <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
                Nenhuma conta cadastrada ainda.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── Dialog nova conta ───────────────────────────────────────── */}
      <Dialog open={contaDialogOpen} onOpenChange={setContaDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField id="conta-nome" label="Nome">
              <Input
                id="conta-nome"
                placeholder="Ex: Caixa principal"
                value={contaForm.nome}
                onChange={(e) => setContaForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </FormField>
            <FormField id="conta-tipo" label="Tipo">
              <Select
                value={contaForm.tipo}
                onValueChange={(v) => setContaForm((f) => ({ ...f, tipo: v as ContaTipo }))}
              >
                <SelectTrigger id="conta-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                  <SelectItem value="conta_poupanca">Conta Poupança</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="conta-saldo" label="Saldo inicial">
              <Input
                id="conta-saldo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={contaForm.saldo}
                onChange={(e) => setContaForm((f) => ({ ...f, saldo: e.target.value }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={createContaMutation.isPending || !contaForm.nome.trim()}
              onClick={() => {
                const saldoNum = parseFloat(contaForm.saldo);
                createContaMutation.mutate({
                  nome: contaForm.nome,
                  tipo: contaForm.tipo,
                  saldo: isNaN(saldoNum) ? 0 : saldoNum,
                });
              }}
            >
              {createContaMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Criar conta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="surface-panel p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-semibold">
            Evolução de receita - últimos 7 dias
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
          Histórico de pagamentos e OS
        </h3>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">OS</th>
                <th className="px-4 py-3 text-left font-medium">Forma</th>
                <th className="px-4 py-3 text-right font-medium">Peças</th>
                <th className="px-4 py-3 text-right font-medium">Mão de obra</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Recebido</th>
                <th className="px-4 py-3 text-right font-medium">Troco</th>
              </tr>
            </thead>
            <tbody>
              {financeiro.historicoPagamentos.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhum pagamento finalizado ainda.
                  </td>
                </tr>
              ) : (
                financeiro.historicoPagamentos.map((venda) => (
                  <tr key={venda.id} className="border-b border-border/40">
                    <td className="px-4 py-3 font-mono text-xs">
                      {new Date(venda.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {venda.ordemServicoId ? (
                        <Link
                          className="text-primary hover:underline"
                          to={`/app/ordens/${venda.ordemServicoId}`}
                        >
                          OS-{venda.numeroOs}
                        </Link>
                      ) : (
                        "Venda direta"
                      )}
                    </td>
                    <td className="px-4 py-3 uppercase">{venda.formaPagamento}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatBRL(venda.valorPecas)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatBRL(venda.valorMaoObra)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatBRL(venda.valorTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatBRL(venda.valorRecebido)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatBRL(venda.troco)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="surface-panel p-5">
        <h3 className="mb-4 font-display text-base font-semibold">
          Top peças - impacto no resultado
        </h3>
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

      {/* Área de impressão DRE — renderizada mas invisível na tela */}
      <section id="dre-print-content" style={{ display: "none" }}>
        <div className="dre-print-header">
          <div>
            <p style={{ fontSize: 10, color: "#0284c7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>RR Infocell</p>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Demonstrativo de Resultado (DRE)</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 11 }}>Relatório gerencial · Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, margin: "16px 0" }}>
          {[
            { label: "Receita total", valor: receitaTotal, cor: "#22c55e" },
            { label: "Custo de peças", valor: financeiro.custoPecas, cor: "#ef4444" },
            { label: "Lucro líquido", valor: financeiro.lucroLiquido, cor: "#0284c7" },
          ].map((item) => (
            <div key={item.label} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: 0, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700 }}>{item.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: item.cor }}>{formatBRL(item.valor)}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 8 }}>DRE Simplificado</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: "6px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Descrição</th>
              <th style={{ padding: "6px 10px", textAlign: "right", border: "1px solid #e5e7eb" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.label} style={{ background: linha.tipo === "sum" ? "#eff6ff" : "white" }}>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb", fontWeight: linha.tipo === "sum" ? 700 : 400 }}>{linha.label}</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb", textAlign: "right", fontFamily: "monospace", color: linha.tipo === "out" ? "#ef4444" : linha.tipo === "sum" ? "#0284c7" : "#22c55e", fontWeight: linha.tipo === "sum" ? 700 : 400 }}>
                  {formatBRL(Math.abs(linha.valor))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {financeiro.historicoPagamentos.length > 0 && (
          <>
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #e5e7eb", paddingBottom: 6, margin: "16px 0 8px" }}>Histórico de Pagamentos</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Data", "OS", "Forma", "Peças", "Mão de obra", "Total"].map((h) => (
                    <th key={h} style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: h === "Data" || h === "OS" || h === "Forma" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financeiro.historicoPagamentos.map((v) => (
                  <tr key={v.id}>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", fontFamily: "monospace" }}>{new Date(v.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb" }}>{v.ordemServicoId ? `OS-${v.numeroOs}` : "Venda direta"}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textTransform: "uppercase" }}>{v.formaPagamento}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "right", fontFamily: "monospace" }}>{formatBRL(v.valorPecas)}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "right", fontFamily: "monospace" }}>{formatBRL(v.valorMaoObra)}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{formatBRL(v.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 12, textAlign: "center", fontSize: 9, color: "#9ca3af" }}>
          RR Infocell — Documento gerado em {new Date().toLocaleString("pt-BR")} · Uso interno
        </div>
      </section>
    </div>
  );
};

export default Financeiro;
