import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/data/mock";
import { toast } from "@/hooks/use-toast";
import {
  categoriaLabels,
  createDespesa,
  deleteDespesa,
  despesaCategorias,
  listDespesas,
  updateDespesa,
  type Despesa,
  type DespesaCategoria,
  type DespesaInput,
} from "@/services/despesas";

const categorias: DespesaCategoria[] = [...despesaCategorias];

const emptyForm: DespesaInput = {
  descricao: "",
  categoria: "aluguel",
  fornecedor: "",
  valor: 0,
  vencimento: "",
  recorrente: true,
  pago: false,
};

const toInput = (despesa: Despesa): DespesaInput => ({
  descricao: despesa.descricao,
  categoria: despesa.categoria,
  fornecedor: despesa.fornecedor,
  valor: despesa.valor,
  vencimento: despesa.vencimento,
  recorrente: despesa.recorrente,
  pago: despesa.pago,
});

const Despesas = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DespesaInput>(emptyForm);
  const [filtro, setFiltro] = useState<DespesaCategoria | "todas">("todas");

  const despesasQuery = useQuery({
    queryKey: ["despesas"],
    queryFn: () => listDespesas(),
  });

  const lista = despesasQuery.data ?? [];
  const filtrada = useMemo(
    () =>
      filtro === "todas"
        ? lista
        : lista.filter((despesa) => despesa.categoria === filtro),
    [lista, filtro],
  );

  const invalidateDespesas = async () => {
    await queryClient.invalidateQueries({ queryKey: ["despesas"] });
  };

  const createMutation = useMutation({
    mutationFn: createDespesa,
    onSuccess: async () => {
      await invalidateDespesas();
      toast({ title: "Despesa cadastrada" });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Nao foi possivel cadastrar a despesa",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DespesaInput }) =>
      updateDespesa(id, input),
    onSuccess: async () => {
      await invalidateDespesas();
      toast({ title: "Despesa atualizada" });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar a despesa",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDespesa,
    onSuccess: async () => {
      await invalidateDespesas();
      toast({ title: "Despesa removida" });
    },
    onError: (error) => {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover a despesa",
        variant: "destructive",
      });
    },
  });

  const total = filtrada.reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalPago = filtrada
    .filter((despesa) => despesa.pago)
    .reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalAberto = total - totalPago;
  const recorrentes = filtrada.filter((despesa) => despesa.recorrente).length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const abrirNovo = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEdicao = (despesa: Despesa) => {
    setEditingId(despesa.id);
    setForm(toInput(despesa));
    setOpen(true);
  };

  const salvar = () => {
    if (!form.descricao || form.valor <= 0) {
      toast({ title: "Preencha descricao e valor", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
      return;
    }

    createMutation.mutate(form);
  };

  const remover = (id: string) => {
    deleteMutation.mutate(id);
  };

  const alternarPago = (id: string) => {
    const despesa = lista.find((item) => item.id === id);

    if (!despesa) {
      return;
    }

    updateMutation.mutate({
      id,
      input: {
        ...toInput(despesa),
        pago: !despesa.pago,
      },
    });
  };

  if (despesasQuery.isLoading) {
    return (
      <Card className="surface-panel flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (despesasQuery.isError) {
    return (
      <Card className="surface-panel p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="font-display text-xl font-semibold">
              Nao foi possivel carregar despesas
            </h2>
            <p className="text-sm text-muted-foreground">
              Verifique se o backend esta rodando e tente novamente.
            </p>
          </div>
          <Button variant="outline" onClick={() => despesasQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            // Custos fixos da loja
          </p>
          <h2 className="font-display text-2xl font-bold">Despesas</h2>
          <p className="text-sm text-muted-foreground">
            Aluguel, agua, luz, internet e demais custos operacionais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filtro}
            onValueChange={(value) =>
              setFiltro(value as DespesaCategoria | "todas")
            }
          >
            <SelectTrigger className="w-44">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoriaLabels[categoria]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={abrirNovo}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Nova despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar despesa" : "Nova despesa"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Descricao</Label>
                  <Input
                    placeholder="Ex.: Aluguel da loja"
                    value={form.descricao}
                    onChange={(event) =>
                      setForm({ ...form, descricao: event.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          categoria: value as DespesaCategoria,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria} value={categoria}>
                            {categoriaLabels[categoria]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input
                      placeholder="Ex.: Sabesp"
                      value={form.fornecedor ?? ""}
                      onChange={(event) =>
                        setForm({ ...form, fornecedor: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.valor || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          valor: parseFloat(event.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      placeholder="dd/mm"
                      value={form.vencimento}
                      onChange={(event) =>
                        setForm({ ...form, vencimento: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Repeat className="h-4 w-4 text-primary" /> Despesa
                    recorrente
                  </div>
                  <Switch
                    checked={form.recorrente}
                    onCheckedChange={(value) =>
                      setForm({ ...form, recorrente: value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Ja esta
                    paga
                  </div>
                  <Switch
                    checked={form.pago}
                    onCheckedChange={(value) =>
                      setForm({ ...form, pago: value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={salvar}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Salvar alteracoes" : "Cadastrar despesa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Total no mes
          </p>
          <p className="mt-2 font-display text-2xl font-bold">
            {formatBRL(total)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Receipt className="h-3 w-3" /> {filtrada.length} lancamentos
          </p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Ja pago
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-success">
            {formatBRL(totalPago)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" /> Quitado
          </p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Em aberto
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-warning">
            {formatBRL(totalAberto)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
            <AlertCircle className="h-3 w-3" /> A vencer
          </p>
        </Card>
        <Card className="surface-panel p-5 border-primary/40 shadow-glow">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Recorrentes
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary glow-text">
            {recorrentes}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat className="h-3 w-3" /> Repetem todo mes
          </p>
        </Card>
      </div>

      <Card className="surface-panel overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">
                Descricao
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider">
                Categoria
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider">
                Fornecedor
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider">
                Vencimento
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider">
                Valor
              </TableHead>
              <TableHead className="text-center text-xs uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="w-32 text-right text-xs uppercase tracking-wider">
                Acoes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrada.map((despesa) => (
              <TableRow key={despesa.id} className="border-border/40">
                <TableCell>
                  <div className="font-medium">{despesa.descricao}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {despesa.id}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs">
                    {categoriaLabels[despesa.categoria]}
                    {despesa.recorrente && (
                      <Repeat className="h-3 w-3 text-primary" />
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {despesa.fornecedor || "-"}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {despesa.vencimento}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatBRL(despesa.valor)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => alternarPago(despesa.id)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors " +
                      (despesa.pago
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-warning/10 text-warning hover:bg-warning/20")
                    }
                  >
                    {despesa.pago ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {despesa.pago ? "Pago" : "Em aberto"}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => abrirEdicao(despesa)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={deleteMutation.isPending}
                      onClick={() => remover(despesa.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtrada.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma despesa nesta categoria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Despesas;
