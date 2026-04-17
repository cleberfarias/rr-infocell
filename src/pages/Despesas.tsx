import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  despesas as despesasMock,
  categoriaLabels,
  formatBRL,
  type Despesa,
  type DespesaCategoria,
} from "@/data/mock";
import {
  Plus, Trash2, Pencil, Receipt, Repeat, AlertCircle, CheckCircle2, Filter,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categorias: DespesaCategoria[] = [
  "aluguel", "agua", "luz", "internet", "telefone",
  "salarios", "marketing", "impostos", "outros",
];

const emptyForm: Omit<Despesa, "id"> = {
  descricao: "",
  categoria: "aluguel",
  fornecedor: "",
  valor: 0,
  vencimento: "",
  recorrente: true,
  pago: false,
};

const Despesas = () => {
  const [lista, setLista] = useState<Despesa[]>(despesasMock);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Despesa, "id">>(emptyForm);
  const [filtro, setFiltro] = useState<DespesaCategoria | "todas">("todas");

  const filtrada = useMemo(
    () => (filtro === "todas" ? lista : lista.filter((d) => d.categoria === filtro)),
    [lista, filtro]
  );

  const total       = filtrada.reduce((s, d) => s + d.valor, 0);
  const totalPago   = filtrada.filter((d) => d.pago).reduce((s, d) => s + d.valor, 0);
  const totalAberto = total - totalPago;
  const recorrentes = filtrada.filter((d) => d.recorrente).length;

  const abrirNovo = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const abrirEdicao = (d: Despesa) => {
    setEditingId(d.id);
    const { id: _id, ...rest } = d;
    setForm(rest);
    setOpen(true);
  };
  const salvar = () => {
    if (!form.descricao || form.valor <= 0) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    if (editingId) {
      setLista((l) => l.map((d) => (d.id === editingId ? { ...d, ...form } : d)));
      toast({ title: "Despesa atualizada" });
    } else {
      const id = `DSP-${String(lista.length + 1).padStart(3, "0")}`;
      setLista((l) => [...l, { id, ...form }]);
      toast({ title: "Despesa cadastrada" });
    }
    setOpen(false);
  };
  const remover = (id: string) => {
    setLista((l) => l.filter((d) => d.id !== id));
    toast({ title: "Despesa removida" });
  };
  const alternarPago = (id: string) => {
    setLista((l) => l.map((d) => (d.id === id ? { ...d, pago: !d.pago } : d)));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// Custos fixos da loja</p>
          <h2 className="font-display text-2xl font-bold">Despesas</h2>
          <p className="text-sm text-muted-foreground">
            Aluguel, água, luz, internet e demais custos operacionais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={(v) => setFiltro(v as DespesaCategoria | "todas")}>
            <SelectTrigger className="w-44">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>{categoriaLabels[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={abrirNovo} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Plus className="h-4 w-4" /> Nova despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar despesa" : "Nova despesa"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex.: Aluguel da loja"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(v) => setForm({ ...form, categoria: v as DespesaCategoria })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c} value={c}>{categoriaLabels[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input
                      placeholder="Ex.: Sabesp"
                      value={form.fornecedor ?? ""}
                      onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number" min={0} step="0.01"
                      value={form.valor || ""}
                      onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      placeholder="dd/mm"
                      value={form.vencimento}
                      onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Repeat className="h-4 w-4 text-primary" /> Despesa recorrente (mensal)
                  </div>
                  <Switch
                    checked={form.recorrente}
                    onCheckedChange={(v) => setForm({ ...form, recorrente: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Já está paga
                  </div>
                  <Switch
                    checked={form.pago}
                    onCheckedChange={(v) => setForm({ ...form, pago: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={salvar} className="bg-gradient-primary text-primary-foreground">
                  {editingId ? "Salvar alterações" : "Cadastrar despesa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total no mês</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(total)}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Receipt className="h-3 w-3" /> {filtrada.length} lançamentos
          </p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Já pago</p>
          <p className="mt-2 font-display text-2xl font-bold text-success">{formatBRL(totalPago)}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" /> Quitado
          </p>
        </Card>
        <Card className="surface-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Em aberto</p>
          <p className="mt-2 font-display text-2xl font-bold text-warning">{formatBRL(totalAberto)}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
            <AlertCircle className="h-3 w-3" /> A vencer
          </p>
        </Card>
        <Card className="surface-panel p-5 border-primary/40 shadow-glow">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Recorrentes</p>
          <p className="mt-2 font-display text-2xl font-bold text-primary glow-text">{recorrentes}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat className="h-3 w-3" /> Repetem todo mês
          </p>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="surface-panel p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Categoria</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Fornecedor</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Vencimento</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider">Valor</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-32 text-right text-xs uppercase tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrada.map((d) => (
              <TableRow key={d.id} className="border-border/40">
                <TableCell>
                  <div className="font-medium">{d.descricao}</div>
                  <div className="font-mono text-xs text-muted-foreground">{d.id}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs">
                    {categoriaLabels[d.categoria]}
                    {d.recorrente && <Repeat className="h-3 w-3 text-primary" />}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.fornecedor || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{d.vencimento}</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatBRL(d.valor)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => alternarPago(d.id)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors " +
                      (d.pago
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-warning/10 text-warning hover:bg-warning/20")
                    }
                  >
                    {d.pago ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {d.pago ? "Pago" : "Em aberto"}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => abrirEdicao(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(d.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtrada.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
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
