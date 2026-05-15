import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  Loader2,
  Package,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/formatters";
import { listCategorias } from "@/services/categorias";
import { listMarcas } from "@/services/marcas";
import { createMovimentacaoEstoque } from "@/services/movimentacoes-estoque";
import { createProduto, listProdutos, type ProdutoCategoria } from "@/services/produtos";

const parseNumber = (v: string) => Number(v.replace(",", ".")) || 0;

const today = new Date().toISOString().slice(0, 10);

const emptyNovoProduto = {
  // produto
  sku: "", nome: "", categoria: "peca" as string,
  marca: "", modelo: "", custo: "", precoVenda: "", estoqueMinimo: "1",
  // movimentação
  tipo: "entrada" as "entrada" | "saida",
  quantidade: "1",
  data: today,
  nfeNumero: "", nfeSerie: "", nfeDataEmissao: "", nfeValorAdicional: "",
  observacoes: "",
};

const Estoque = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const filtroInicial = searchParams.get("filtro") === "baixo" ? "baixo" : "todos";
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<ProdutoCategoria | "todos">("todos");
  const [marcaFilter, setMarcaFilter] = useState("todos");
  const [estoqueFiltro, setEstoqueFiltro] = useState<"todos" | "baixo">(filtroInicial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [novoProduto, setNovoProduto] = useState(emptyNovoProduto);

  const produtosQuery = useQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutos({ ativo: true }),
    staleTime: STALE_TIME.short,
    refetchOnWindowFocus: false,
  });

  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: listCategorias,
    staleTime: STALE_TIME.long,
  });

  const marcasQuery = useQuery({
    queryKey: ["marcas"],
    queryFn: listMarcas,
    staleTime: STALE_TIME.long,
  });

  const criarProdutoMutation = useMutation({
    mutationFn: async () => {
      const qtd = Math.max(0, parseInt(novoProduto.quantidade) || 0);
      const nfeInfo = novoProduto.nfeNumero
        ? `NF-e: ${novoProduto.nfeNumero}${novoProduto.nfeSerie ? `/S${novoProduto.nfeSerie}` : ""}${novoProduto.nfeValorAdicional ? ` (R$ ${novoProduto.nfeValorAdicional})` : ""}`
        : "";
      const motivoFinal = [nfeInfo, novoProduto.observacoes].filter(Boolean).join(" | ") || undefined;

      const produto = await createProduto({
        sku: novoProduto.sku.trim(),
        nome: novoProduto.nome.trim(),
        categoria: novoProduto.categoria as ProdutoCategoria,
        marca: novoProduto.marca || undefined,
        modelo: novoProduto.modelo || undefined,
        custo: Number(novoProduto.custo) || 0,
        precoVenda: Number(novoProduto.precoVenda) || 0,
        estoqueAtual: 0,
        estoqueMinimo: Number(novoProduto.estoqueMinimo) || 1,
        ativo: true,
      });

      if (qtd > 0) {
        await createMovimentacaoEstoque({
          produtoId: produto.id,
          tipo: novoProduto.tipo,
          quantidade: qtd,
          motivo: motivoFinal,
        });
      }

      return produto;
    },
    onSuccess: async (produto) => {
      await queryClient.invalidateQueries({ queryKey: ["produtos"] });
      await queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] });
      toast.success(`"${produto.nome}" cadastrado com sucesso.`);
      setNovoProduto(emptyNovoProduto);
      setSheetOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao cadastrar produto."),
  });

  const produtos = useMemo(() => produtosQuery.data ?? [], [produtosQuery.data]);

  const stats = useMemo(() => ({
    totalSku: produtos.length,
    baixoEstoque: produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length,
    zerados: produtos.filter((p) => p.estoqueAtual <= 0).length,
    valorEstoque: produtos.reduce((t, p) => t + p.estoqueAtual * p.custo, 0),
    potencialVendas: produtos.reduce((t, p) => t + Math.max(0, p.estoqueAtual) * p.precoVenda, 0),
    nivelEstoque: produtos.length > 0
      ? Math.round(((produtos.length - produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length) / produtos.length) * 100)
      : 100,
  }), [produtos]);

  const produtosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    let lista = produtos.filter((p) => {
      if (categoriaFilter !== "todos" && p.categoria !== categoriaFilter) return false;
      if (marcaFilter !== "todos" && (p.marca ?? "") !== marcaFilter) return false;
      if (estoqueFiltro === "baixo" && p.estoqueAtual > p.estoqueMinimo) return false;
      if (!q) return true;
      return [p.nome, p.sku, p.marca, p.modelo, p.observacoes]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
    if (estoqueFiltro === "baixo") {
      lista = lista.sort((a, b) => {
        const az = a.estoqueAtual <= 0 ? 0 : 1;
        const bz = b.estoqueAtual <= 0 ? 0 : 1;
        return az !== bz ? az - bz : a.estoqueAtual - b.estoqueAtual;
      });
    }
    return lista;
  }, [produtos, search, categoriaFilter, marcaFilter, estoqueFiltro]);

  const getCategoriaLabel = (id: string) => {
    const found = categoriasQuery.data?.find((c) => c.id === id);
    return found?.nome ?? id;
  };

  const gaugeColor = stats.nivelEstoque >= 80 ? "#22c55e" : stats.nivelEstoque >= 40 ? "#f59e0b" : "#ef4444";
  const gaugeLabel = stats.nivelEstoque >= 80 ? "Satisfatório" : stats.nivelEstoque >= 40 ? "Baixo" : "Crítico";
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - stats.nivelEstoque / 100);

  const upd = (field: string, value: string) =>
    setNovoProduto((p) => ({ ...p, [field]: value }));

  const margemCalc = () => {
    const c = Number(novoProduto.custo) || 0;
    const v = Number(novoProduto.precoVenda) || 0;
    if (!v) return null;
    return Math.round(((v - c) / v) * 100);
  };

  return (
    <>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent side="right" className="flex w-[420px] flex-col gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Novo produto</SheetTitle>
          <p className="text-xs text-muted-foreground">Cadastre o produto e registre a movimentação de entrada em um só passo.</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Dados do produto ─────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1.5">Produto</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="e-sku" label="SKU / Código *">
                <Input id="e-sku" value={novoProduto.sku} onChange={(e) => upd("sku", e.target.value)} placeholder="Ex.: BAT-IP13" />
              </FormField>
              <FormField id="e-categoria" label="Categoria *">
                <Select value={novoProduto.categoria} onValueChange={(v) => upd("categoria", v)}>
                  <SelectTrigger id="e-categoria"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(categoriasQuery.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField id="e-nome" label="Nome do produto *">
              <Input id="e-nome" value={novoProduto.nome} onChange={(e) => upd("nome", e.target.value)} placeholder="Ex.: Bateria iPhone 13 Pro" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="e-marca" label="Marca">
                <Select value={novoProduto.marca || "__none__"} onValueChange={(v) => upd("marca", v === "__none__" ? "" : v)}>
                  <SelectTrigger id="e-marca"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem marca</SelectItem>
                    {(marcasQuery.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="e-modelo" label="Modelo">
                <Input id="e-modelo" value={novoProduto.modelo} onChange={(e) => upd("modelo", e.target.value)} placeholder="Opcional" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="e-custo" label="Custo (R$)">
                <Input id="e-custo" type="number" min="0" step="0.01" value={novoProduto.custo}
                  onChange={(e) => upd("custo", e.target.value)} placeholder="0,00" />
              </FormField>
              <FormField id="e-venda" label="Preço de venda (R$)">
                <Input id="e-venda" type="number" min="0" step="0.01" value={novoProduto.precoVenda}
                  onChange={(e) => upd("precoVenda", e.target.value)} placeholder="0,00" />
              </FormField>
            </div>
            {margemCalc() !== null && (
              <p className="text-xs text-muted-foreground -mt-1">
                Margem: <span className={`font-semibold ${margemCalc()! > 0 ? "text-emerald-500" : "text-destructive"}`}>{margemCalc()}%</span>
              </p>
            )}
            <FormField id="e-minimo" label="Estoque mínimo">
              <Input id="e-minimo" type="number" min="0" step="1" value={novoProduto.estoqueMinimo}
                onChange={(e) => upd("estoqueMinimo", e.target.value)} />
            </FormField>
          </div>

          {/* ── Movimentação de entrada ───── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1.5">Movimentação de estoque</p>
            <div className="flex items-center gap-4">
              {(["entrada", "saida"] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="np-tipo" value={t} checked={novoProduto.tipo === t}
                    onChange={() => upd("tipo", t)} className="accent-primary h-4 w-4" />
                  {t === "entrada" ? "Entrada" : "Saída"}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="e-qtd" label="Quantidade">
                <Input id="e-qtd" type="number" min="0" step="1" value={novoProduto.quantidade}
                  onChange={(e) => upd("quantidade", e.target.value)} />
              </FormField>
              <FormField id="e-data" label="Data">
                <DatePicker value={novoProduto.data} onChange={(v) => upd("data", v)} />
              </FormField>
            </div>
          </div>

          {/* ── Dados NF-e ───────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1.5">Dados da NF-e <span className="font-normal normal-case">(opcional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="e-nfe" label="Nº NF-e/RPS">
                <Input id="e-nfe" value={novoProduto.nfeNumero} onChange={(e) => upd("nfeNumero", e.target.value)} placeholder="Ex.: 001234" />
              </FormField>
              <FormField id="e-serie" label="Série">
                <Input id="e-serie" value={novoProduto.nfeSerie} onChange={(e) => upd("nfeSerie", e.target.value)} placeholder="Ex.: 1" />
              </FormField>
              <FormField id="e-nfe-data" label="Data de emissão">
                <DatePicker
                  value={novoProduto.nfeDataEmissao}
                  onChange={(v) => upd("nfeDataEmissao", v)}
                  placeholder="dd/mm/aaaa"
                />
              </FormField>
              <FormField id="e-nfe-valor" label="Valor adicional (R$)">
                <Input id="e-nfe-valor" type="number" min="0" step="0.01" value={novoProduto.nfeValorAdicional}
                  onChange={(e) => upd("nfeValorAdicional", e.target.value)} placeholder="0,00" />
              </FormField>
            </div>
            <FormField id="e-obs" label="Observações">
              <Textarea id="e-obs" rows={2} value={novoProduto.observacoes}
                onChange={(e) => upd("observacoes", e.target.value)} placeholder="Notas opcionais..." />
            </FormField>
          </div>
        </div>
        <div className="border-t border-border px-5 py-4">
          <Button
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            disabled={!novoProduto.sku.trim() || !novoProduto.nome.trim() || criarProdutoMutation.isPending}
            onClick={() => criarProdutoMutation.mutate()}
          >
            {criarProdutoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Cadastrar produto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    <div className="space-y-5">
      <PageHeader
        eyebrow="Estoque"
        title="Peças e produtos"
        description="Consulta de itens, custo, preço de venda e nível de estoque."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/movimentacoes">
                <ArrowUpDown className="h-4 w-4" /> Movimentações
              </Link>
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
        <div className="space-y-5">

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="surface-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SKUs ativos</p>
                  <p className="font-display text-2xl font-bold">{stats.totalSku}</p>
                </div>
              </div>
            </Card>
            <Card className={cn("surface-panel p-4", stats.baixoEstoque > 0 && "border-destructive/30")}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", stats.baixoEstoque > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estoque baixo</p>
                  <p className={cn("font-display text-2xl font-bold", stats.baixoEstoque > 0 && "text-destructive")}>{stats.baixoEstoque}</p>
                  {stats.zerados > 0 && <p className="text-[10px] text-destructive">{stats.zerados} zerado{stats.zerados > 1 ? "s" : ""}</p>}
                </div>
              </div>
            </Card>
            <Card className="surface-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Investimento</p>
                  <p className="font-display text-lg font-bold">{formatBRL(stats.valorEstoque)}</p>
                  <p className="text-[10px] text-muted-foreground">ao custo</p>
                </div>
              </div>
            </Card>
            <Card className="surface-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Potencial vendas</p>
                  <p className="font-display text-lg font-bold">{formatBRL(stats.potencialVendas)}</p>
                  <p className={cn("text-[10px] font-medium", stats.nivelEstoque < 50 ? "text-destructive" : stats.nivelEstoque < 80 ? "text-amber-500" : "text-success")}>
                    {stats.nivelEstoque}% do nível ideal
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="surface-panel flex flex-wrap items-end gap-3 p-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por SKU, nome ou marca..."
              />
            </div>
            <Select value={marcaFilter} onValueChange={setMarcaFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas marcas</SelectItem>
                {Array.from(new Set(produtos.map((p) => p.marca).filter(Boolean))).sort().map((m) => (
                  <SelectItem key={m} value={m!}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoriaFilter} onValueChange={(v) => setCategoriaFilter(v as ProdutoCategoria | "todos")}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                {(categoriasQuery.data ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={estoqueFiltro === "baixo" ? "default" : "outline"}
              size="sm"
              className={estoqueFiltro === "baixo" ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive" : ""}
              onClick={() => setEstoqueFiltro((p) => p === "baixo" ? "todos" : "baixo")}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Estoque baixo
              {stats.baixoEstoque > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[10px] leading-none">
                  {stats.baixoEstoque}
                </Badge>
              )}
            </Button>
          </Card>

          {/* Tabela */}
          {produtosQuery.isLoading ? (
            <div className="space-y-2">
              <Card className="surface-panel p-4"><div className="flex gap-3"><Skeleton className="h-9 flex-1" /><Skeleton className="h-9 w-36" /></div></Card>
              <Card className="surface-panel p-2 space-y-1">
                <Skeleton className="h-10 w-full rounded-md" />
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
              </Card>
            </div>
          ) : produtosQuery.isError ? (
            <Card className="surface-panel">
              <EmptyState icon={Package} title="Não foi possível carregar estoque"
                description="Verifique se o backend está rodando."
                actions={<Button variant="outline" onClick={() => produtosQuery.refetch()}>Tentar novamente</Button>} />
            </Card>
          ) : produtosFiltrados.length === 0 ? (
            <Card className="surface-panel">
              <EmptyState icon={Package}
                title={estoqueFiltro === "baixo" ? "Nenhum item com estoque baixo" : "Nenhum item encontrado"}
                description={estoqueFiltro === "baixo" ? "Todos os produtos estão acima do mínimo." : "Ajuste os filtros ou cadastre produtos via Movimentações."}
                actions={
                  estoqueFiltro === "baixo"
                    ? <Button variant="outline" onClick={() => setEstoqueFiltro("todos")}>Ver todos</Button>
                    : <Button asChild><Link to="/app/movimentacoes">Ir para Movimentações</Link></Button>
                }
              />
            </Card>
          ) : (
            <Card className="surface-panel overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 text-left font-medium">SKU</th>
                      <th className="px-5 py-3 text-left font-medium">Item</th>
                      <th className="px-5 py-3 text-left font-medium">Marca</th>
                      <th className="px-5 py-3 text-left font-medium">Categoria</th>
                      <th className="px-5 py-3 text-center font-medium">Qtd.</th>
                      <th className="px-5 py-3 text-center font-medium">Mín.</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Custo</th>
                      <th className="px-5 py-3 text-right font-medium">Venda</th>
                      <th className="px-5 py-3 text-right font-medium">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map((produto) => {
                      const baixo = produto.estoqueAtual <= produto.estoqueMinimo;
                      const zerado = produto.estoqueAtual <= 0;
                      const lucro = produto.precoVenda - produto.custo;
                      const margem = produto.precoVenda > 0 ? (lucro / produto.precoVenda) * 100 : 0;
                      return (
                        <tr key={produto.id} className="border-b border-border/40 transition-colors hover:bg-secondary/30">
                          <td className="px-5 py-3 font-mono text-xs text-primary">{produto.sku}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium">{produto.nome}</p>
                            {produto.modelo && <p className="text-xs text-muted-foreground">{produto.modelo}</p>}
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">{produto.marca ?? "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{getCategoriaLabel(produto.categoria)}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
                              baixo ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success",
                            )}>
                              {baixo && <AlertTriangle className="h-3 w-3" />}
                              {produto.estoqueAtual}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center font-mono text-muted-foreground">{produto.estoqueMinimo}</td>
                          <td className="px-5 py-3">
                            {zerado ? (
                              <Badge variant="destructive" className="text-[10px] font-bold uppercase">Zerado</Badge>
                            ) : baixo ? (
                              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase">Baixo</Badge>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-muted-foreground">{formatBRL(produto.custo)}</td>
                          <td className="px-5 py-3 text-right font-mono">{formatBRL(produto.precoVenda)}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-success">{margem.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Painel lateral */}
        <aside className="space-y-4">
          <Card className="surface-panel overflow-hidden p-0">
            <div className="bg-gradient-to-b from-primary/10 to-transparent px-4 py-3 border-b border-border">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estoque</p>
              <p className="font-display text-sm font-semibold">Visão geral</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Potencial máximo em vendas</p>
                <p className="font-display text-xl font-bold text-primary">{formatBRL(stats.potencialVendas)}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Investimento em estoque</p>
                <p className="font-display text-lg font-bold">{formatBRL(stats.valorEstoque)}</p>
                <p className="text-[10px] text-muted-foreground">ao custo atual</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-3 text-xs text-muted-foreground">Nível do estoque</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <svg width={100} height={100} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-secondary" strokeWidth={8} />
                      <circle cx="50" cy="50" r={r} fill="none" stroke={gaugeColor} strokeWidth={8}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-lg font-bold" style={{ color: gaugeColor }}>{stats.nivelEstoque}%</span>
                      <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color: gaugeColor }}>{gaugeLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {stats.baixoEstoque > 0 && (
            <Card className="surface-panel border-destructive/30 p-0 overflow-hidden">
              <Link to="/app/estoque?filtro=baixo" className="block p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">Atenção</p>
                    <p className="mt-1 font-display text-2xl font-bold text-destructive">{stats.baixoEstoque}</p>
                    <p className="text-xs text-muted-foreground">
                      iten{stats.baixoEstoque > 1 ? "s" : ""} com estoque baixo
                      {stats.zerados > 0 && <> · <span className="text-destructive font-medium">{stats.zerados} zerado{stats.zerados > 1 ? "s" : ""}</span></>}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 shrink-0 text-destructive mt-1" />
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-destructive">Ver lista →</p>
              </Link>
            </Card>
          )}

          <Card className="surface-panel p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações rápidas</p>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/app/movimentacoes">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Movimentações
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground" asChild>
              <Link to="/app/estoque?filtro=baixo">
                <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Estoque baixo
              </Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
    </>
  );
};

export default Estoque;
