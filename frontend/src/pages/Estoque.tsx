import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  History,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/data/mock";
import {
  createMovimentacaoEstoque,
  listMovimentacoesEstoque,
  type MovimentacaoEstoque,
  type MovimentacaoEstoqueTipo,
} from "@/services/movimentacoes-estoque";
import {
  createProduto,
  deleteProduto,
  listProdutos,
  updateProduto,
  type Produto,
  type ProdutoCategoria,
} from "@/services/produtos";

type ProdutoForm = {
  ativo: boolean;
  categoria: ProdutoCategoria;
  custo: string;
  estoqueAtual: string;
  estoqueMinimo: string;
  nome: string;
  observacoes: string;
  precoVenda: string;
  sku: string;
};

type MovimentacaoForm = {
  tipo: MovimentacaoEstoqueTipo;
  quantidade: string;
  estoqueFinal: string;
  motivo: string;
};

const emptyForm: ProdutoForm = {
  ativo: true,
  categoria: "peca",
  custo: "0",
  estoqueAtual: "0",
  estoqueMinimo: "0",
  nome: "",
  observacoes: "",
  precoVenda: "0",
  sku: "",
};

const emptyMovimentacaoForm: MovimentacaoForm = {
  tipo: "entrada",
  quantidade: "1",
  estoqueFinal: "0",
  motivo: "",
};

const categoriaLabels: Record<ProdutoCategoria, string> = {
  acessorio: "Acessorio",
  peca: "Peca",
  produto: "Produto",
  servico: "Servico",
};

const categoriaOptions: Array<ProdutoCategoria | "todos"> = [
  "todos",
  "peca",
  "produto",
  "acessorio",
  "servico",
];

const movimentacaoLabels: Record<MovimentacaoEstoqueTipo, string> = {
  ajuste: "Ajuste",
  entrada: "Entrada",
  saida: "Saida",
};

const parseNumber = (value: string) => Number(value.replace(",", ".")) || 0;

const Estoque = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<
    ProdutoCategoria | "todos"
  >("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [form, setForm] = useState<ProdutoForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [movimentacaoDialogOpen, setMovimentacaoDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [movimentacaoForm, setMovimentacaoForm] =
    useState<MovimentacaoForm>(emptyMovimentacaoForm);
  const [movimentacaoError, setMovimentacaoError] = useState<string | null>(null);

  const produtosQuery = useQuery({
    queryKey: ["produtos", search, categoriaFilter],
    queryFn: () =>
      listProdutos({
        ativo: true,
        categoria: categoriaFilter === "todos" ? "" : categoriaFilter,
        query: search,
      }),
  });

  const produtos = useMemo(
    () => produtosQuery.data ?? [],
    [produtosQuery.data],
  );

  const movimentacoesQuery = useQuery({
    queryKey: ["movimentacoes-estoque", selectedProduto?.id],
    queryFn: () =>
      listMovimentacoesEstoque({ produtoId: selectedProduto?.id ?? "" }),
    enabled: Boolean(selectedProduto?.id && movimentacaoDialogOpen),
  });

  const stats = useMemo(
    () => ({
      baixoEstoque: produtos.filter(
        (produto) => produto.estoqueAtual <= produto.estoqueMinimo,
      ).length,
      totalSku: produtos.length,
      valorEstoque: produtos.reduce(
        (total, produto) => total + produto.estoqueAtual * produto.custo,
        0,
      ),
    }),
    [produtos],
  );

  const invalidateProdutos = async () => {
    await queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };

  const invalidateEstoque = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["produtos"] }),
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (input: ProdutoForm) => {
      const payload = {
        ativo: input.ativo,
        categoria: input.categoria,
        custo: parseNumber(input.custo),
        estoqueAtual: Math.max(0, Math.trunc(parseNumber(input.estoqueAtual))),
        estoqueMinimo: Math.max(0, Math.trunc(parseNumber(input.estoqueMinimo))),
        nome: input.nome,
        observacoes: input.observacoes || undefined,
        precoVenda: parseNumber(input.precoVenda),
        sku: input.sku,
      };

      return editingProduto
        ? updateProduto(editingProduto.id, payload)
        : createProduto(payload);
    },
    onSuccess: async () => {
      await invalidateProdutos();
      setDialogOpen(false);
      setEditingProduto(null);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o produto.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduto,
    onSuccess: invalidateProdutos,
  });

  const movimentacaoMutation = useMutation({
    mutationFn: (input: MovimentacaoForm) => {
      if (!selectedProduto) {
        throw new Error("Selecione um produto para movimentar.");
      }

      if (input.tipo === "ajuste") {
        return createMovimentacaoEstoque({
          produtoId: selectedProduto.id,
          tipo: "ajuste",
          estoqueFinal: Math.max(
            0,
            Math.trunc(parseNumber(input.estoqueFinal)),
          ),
          motivo: input.motivo || undefined,
        });
      }

      return createMovimentacaoEstoque({
        produtoId: selectedProduto.id,
        tipo: input.tipo,
        quantidade: Math.max(1, Math.trunc(parseNumber(input.quantidade))),
        motivo: input.motivo || undefined,
      });
    },
    onSuccess: async (movimentacao) => {
      await invalidateEstoque();
      setSelectedProduto((current) =>
        current
          ? { ...current, estoqueAtual: movimentacao.estoquePosterior }
          : current,
      );
      setMovimentacaoError(null);
    },
    onError: (error) => {
      setMovimentacaoError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a movimentacao.",
      );
    },
  });

  const openCreateDialog = () => {
    setEditingProduto(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (produto: Produto) => {
    setEditingProduto(produto);
    setForm({
      ativo: produto.ativo,
      categoria: produto.categoria,
      custo: String(produto.custo),
      estoqueAtual: String(produto.estoqueAtual),
      estoqueMinimo: String(produto.estoqueMinimo),
      nome: produto.nome,
      observacoes: produto.observacoes ?? "",
      precoVenda: String(produto.precoVenda),
      sku: produto.sku,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openMovimentacaoDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setMovimentacaoForm({
      ...emptyMovimentacaoForm,
      estoqueFinal: String(produto.estoqueAtual),
    });
    setMovimentacaoError(null);
    setMovimentacaoDialogOpen(true);
  };

  const updateForm = <TKey extends keyof ProdutoForm>(
    field: TKey,
    value: ProdutoForm[TKey],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateMovimentacaoForm = <TKey extends keyof MovimentacaoForm>(
    field: TKey,
    value: MovimentacaoForm[TKey],
  ) => {
    setMovimentacaoForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    saveMutation.mutate(form);
  };

  const handleMovimentacaoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMovimentacaoError(null);
    movimentacaoMutation.mutate(movimentacaoForm);
  };

  const handleDelete = (produto: Produto) => {
    const confirmed = window.confirm(`Excluir ${produto.nome} do estoque?`);

    if (confirmed) {
      deleteMutation.mutate(produto.id);
    }
  };

  const renderMovimentacaoIcon = (tipo: MovimentacaoEstoqueTipo) => {
    if (tipo === "entrada") {
      return <ArrowUp className="h-3.5 w-3.5 text-success" />;
    }

    if (tipo === "saida") {
      return <ArrowDown className="h-3.5 w-3.5 text-destructive" />;
    }

    return <ArrowUpDown className="h-3.5 w-3.5 text-primary" />;
  };

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));

  const movimentacoes = (movimentacoesQuery.data ?? []).slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Estoque"
        title="Pecas e produtos"
        description="Controle basico de itens, custo, preco de venda e ponto minimo."
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" /> Novo item
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SKUs ativos</p>
              <p className="font-display text-2xl font-bold">
                {stats.totalSku}
              </p>
            </div>
          </div>
        </Card>
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estoque baixo</p>
              <p className="font-display text-2xl font-bold">
                {stats.baixoEstoque}
              </p>
            </div>
          </div>
        </Card>
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Valor em estoque
              </p>
              <p className="font-display text-2xl font-bold">
                {formatBRL(stats.valorEstoque)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="surface-panel flex flex-wrap items-end gap-3 p-3">
        <FormField
          id="estoque-search"
          label="Buscar item"
          className="min-w-[240px] flex-1"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="estoque-search"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por SKU, nome ou observacao..."
            />
          </div>
        </FormField>
        <FormField id="estoque-categoria" label="Categoria" className="min-w-[190px]">
          <Select
            value={categoriaFilter}
            onValueChange={(value) =>
              setCategoriaFilter(value as ProdutoCategoria | "todos")
            }
          >
            <SelectTrigger id="estoque-categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoriaOptions.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria === "todos"
                    ? "Todas"
                    : categoriaLabels[categoria]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </Card>

      {produtosQuery.isLoading ? (
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : produtosQuery.isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={Package}
            title="Nao foi possivel carregar estoque"
            description="Verifique se o backend esta rodando em http://localhost:3333."
            actions={
              <Button variant="outline" onClick={() => produtosQuery.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </Card>
      ) : produtos.length === 0 ? (
        <Card className="surface-panel">
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            description="Ajuste os filtros ou cadastre o primeiro produto."
            actions={<Button onClick={openCreateDialog}>Novo item</Button>}
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
                  <th className="px-5 py-3 text-left font-medium">Categoria</th>
                  <th className="px-5 py-3 text-center font-medium">Estoque</th>
                  <th className="px-5 py-3 text-center font-medium">Minimo</th>
                  <th className="px-5 py-3 text-right font-medium">Custo</th>
                  <th className="px-5 py-3 text-right font-medium">Venda</th>
                  <th className="px-5 py-3 text-right font-medium">Margem</th>
                  <th className="px-5 py-3 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const lucro = produto.precoVenda - produto.custo;
                  const margem =
                    produto.precoVenda > 0 ? (lucro / produto.precoVenda) * 100 : 0;
                  const baixo = produto.estoqueAtual <= produto.estoqueMinimo;

                  return (
                    <tr
                      key={produto.id}
                      className="border-b border-border/40 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-primary">
                        {produto.sku}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{produto.nome}</p>
                        {produto.observacoes && (
                          <p className="text-xs text-muted-foreground">
                            {produto.observacoes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {categoriaLabels[produto.categoria]}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium " +
                            (baixo
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : "border-success/30 bg-success/10 text-success")
                          }
                        >
                          {baixo && <AlertTriangle className="h-3 w-3" />}
                          {produto.estoqueAtual}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-mono text-muted-foreground">
                        {produto.estoqueMinimo}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                        {formatBRL(produto.custo)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {formatBRL(produto.precoVenda)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-success">
                        {margem.toFixed(0)}%
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Movimentar estoque"
                            onClick={() => openMovimentacaoDialog(produto)}
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => openEditDialog(produto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(produto)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? "Editar item" : "Novo item"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="produto-sku" label="SKU">
                <Input
                  id="produto-sku"
                  value={form.sku}
                  onChange={(event) => updateForm("sku", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="produto-categoria" label="Categoria">
                <Select
                  value={form.categoria}
                  onValueChange={(value) =>
                    updateForm("categoria", value as ProdutoCategoria)
                  }
                >
                  <SelectTrigger id="produto-categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoriaLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="produto-nome" label="Nome" className="sm:col-span-2">
                <Input
                  id="produto-nome"
                  value={form.nome}
                  onChange={(event) => updateForm("nome", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="produto-estoque" label="Estoque atual">
                <Input
                  id="produto-estoque"
                  min="0"
                  step="1"
                  type="number"
                  value={form.estoqueAtual}
                  onChange={(event) =>
                    updateForm("estoqueAtual", event.target.value)
                  }
                  required
                />
              </FormField>
              <FormField id="produto-minimo" label="Estoque minimo">
                <Input
                  id="produto-minimo"
                  min="0"
                  step="1"
                  type="number"
                  value={form.estoqueMinimo}
                  onChange={(event) =>
                    updateForm("estoqueMinimo", event.target.value)
                  }
                  required
                />
              </FormField>
              <FormField id="produto-custo" label="Custo">
                <Input
                  id="produto-custo"
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.custo}
                  onChange={(event) => updateForm("custo", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="produto-venda" label="Preco de venda">
                <Input
                  id="produto-venda"
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.precoVenda}
                  onChange={(event) =>
                    updateForm("precoVenda", event.target.value)
                  }
                  required
                />
              </FormField>
              <FormField
                id="produto-observacoes"
                label="Observacoes"
                className="sm:col-span-2"
              >
                <Textarea
                  id="produto-observacoes"
                  value={form.observacoes}
                  onChange={(event) =>
                    updateForm("observacoes", event.target.value)
                  }
                />
              </FormField>
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Item ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Itens inativos ficam fora da listagem principal.
                  </p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(checked) => updateForm("ativo", checked)}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={movimentacaoDialogOpen}
        onOpenChange={setMovimentacaoDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-secondary/30 p-3">
                <p className="text-sm font-medium">{selectedProduto.nome}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedProduto.sku} - estoque atual:{" "}
                  {selectedProduto.estoqueAtual}
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleMovimentacaoSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="movimentacao-tipo" label="Tipo">
                    <Select
                      value={movimentacaoForm.tipo}
                      onValueChange={(value) =>
                        updateMovimentacaoForm(
                          "tipo",
                          value as MovimentacaoEstoqueTipo,
                        )
                      }
                    >
                      <SelectTrigger id="movimentacao-tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(movimentacaoLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormField>
                  {movimentacaoForm.tipo === "ajuste" ? (
                    <FormField
                      id="movimentacao-estoque-final"
                      label="Estoque final"
                    >
                      <Input
                        id="movimentacao-estoque-final"
                        min="0"
                        step="1"
                        type="number"
                        value={movimentacaoForm.estoqueFinal}
                        onChange={(event) =>
                          updateMovimentacaoForm(
                            "estoqueFinal",
                            event.target.value,
                          )
                        }
                        required
                      />
                    </FormField>
                  ) : (
                    <FormField id="movimentacao-quantidade" label="Quantidade">
                      <Input
                        id="movimentacao-quantidade"
                        min="1"
                        step="1"
                        type="number"
                        value={movimentacaoForm.quantidade}
                        onChange={(event) =>
                          updateMovimentacaoForm(
                            "quantidade",
                            event.target.value,
                          )
                        }
                        required
                      />
                    </FormField>
                  )}
                  <FormField
                    id="movimentacao-motivo"
                    label="Motivo"
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="movimentacao-motivo"
                      value={movimentacaoForm.motivo}
                      onChange={(event) =>
                        updateMovimentacaoForm("motivo", event.target.value)
                      }
                      placeholder="Ex.: compra, uso em OS, contagem fisica..."
                    />
                  </FormField>
                </div>
                {movimentacaoError && (
                  <p className="text-sm text-destructive">
                    {movimentacaoError}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMovimentacaoDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button type="submit" disabled={movimentacaoMutation.isPending}>
                    {movimentacaoMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Registrar
                  </Button>
                </DialogFooter>
              </form>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Historico recente
                </div>
                {movimentacoesQuery.isLoading ? (
                  <div className="flex min-h-[88px] items-center justify-center rounded-md border border-border">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : movimentacoes.length === 0 ? (
                  <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                    Nenhuma movimentacao registrada para este item.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                    {movimentacoes.map((movimentacao: MovimentacaoEstoque) => (
                      <div
                        key={movimentacao.id}
                        className="flex items-start justify-between gap-3 border-b border-border/50 p-3 last:border-b-0"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          {renderMovimentacaoIcon(movimentacao.tipo)}
                          <div>
                            <p className="text-sm font-medium">
                              {movimentacaoLabels[movimentacao.tipo]} de{" "}
                              {movimentacao.quantidade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {movimentacao.estoqueAnterior} -&gt;{" "}
                              {movimentacao.estoquePosterior}
                              {movimentacao.motivo
                                ? ` - ${movimentacao.motivo}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(movimentacao.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estoque;
