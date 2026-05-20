import { FormEvent, useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateTime } from "@/lib/formatters";
import { DatePicker } from "@/components/ui/date-picker";
import { MOVIMENTACAO_TIPO_LABELS } from "@/constants/status";
import {
  MOTIVOS_SAIDA,
  MOTIVOS_ENTRADA,
  MOTIVOS_AJUSTE,
} from "@/constants/business";
import { STALE_TIME, POLL_INTERVAL } from "@/constants/query";
import {
  createMovimentacaoEstoque,
  listMovimentacoesEstoque,
  type MovimentacaoEstoqueTipo,
} from "@/services/movimentacoes-estoque";
import {
  createProduto,
  listProdutos,
  type Produto,
  type ProdutoCategoria,
} from "@/services/produtos";
import { listCategorias } from "@/services/categorias";
import { listMarcas } from "@/services/marcas";

type CartItem = {
  tempId: string;
  produto: Produto;
  quantidade: number;
  estoqueFinal: number;
};

type Tipo = MovimentacaoEstoqueTipo | "transferencia";

const today = new Date().toISOString().slice(0, 10);

const tipoLabel = MOVIMENTACAO_TIPO_LABELS;
const parseMoney = (value: string | number | undefined) =>
  Number(String(value ?? "").replace(",", ".")) || 0;

export default function Movimentacoes() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"list" | "form">("list");
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [data, setData] = useState(today);
  const [obs, setObs] = useState("");
  const [motivo, setMotivo] = useState("");
  const [descricaoMotivo, setDescricaoMotivo] = useState("");
  const [perdasAvarias, setPerdasAvarias] = useState(false);
  const [nfe, setNfe] = useState({
    numero: "",
    serie: "",
    dataEmissao: "",
    valorAdicional: "",
  });

  const motivosAtivos =
    tipo === "saida"
      ? MOTIVOS_SAIDA
      : tipo === "entrada"
        ? MOTIVOS_ENTRADA
        : MOTIVOS_AJUSTE;

  // Novo produto inline
  const [novoProdutoOpen, setNovoProdutoOpen] = useState(false);
  const [novoProdutoForm, setNovoProdutoForm] = useState({
    sku: "",
    nome: "",
    categoria: "peca" as ProdutoCategoria | string,
    marca: "",
    modelo: "",
    custo: "0",
    precoVenda: "0",
    estoqueMinimo: "0",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Item search
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [qtdInput, setQtdInput] = useState("1");
  const [finalInput, setFinalInput] = useState("");

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
    mutationFn: () =>
      createProduto({
        sku: novoProdutoForm.sku.trim(),
        nome: novoProdutoForm.nome.trim(),
        categoria: novoProdutoForm.categoria as ProdutoCategoria,
        marca: novoProdutoForm.marca.trim() || undefined,
        modelo: novoProdutoForm.modelo.trim() || undefined,
        custo: parseMoney(novoProdutoForm.custo),
        precoVenda: parseMoney(novoProdutoForm.precoVenda),
        estoqueAtual: 0,
        estoqueMinimo: Number(novoProdutoForm.estoqueMinimo) || 0,
      }),
    onSuccess: async (produto) => {
      await queryClient.invalidateQueries({ queryKey: ["produtos"] });
      setSelectedProduto(produto);
      setQtdInput("1");
      setFinalInput("0");
      setNovoProdutoOpen(false);
      setNovoProdutoForm({
        sku: "",
        nome: "",
        categoria: "peca",
        marca: "",
        modelo: "",
        custo: "0",
        precoVenda: "0",
        estoqueMinimo: "0",
      });
      setProdutoOpen(false);
      toast.success(`Produto "${produto.nome}" criado.`);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Erro ao criar produto.",
      ),
  });

  const movQuery = useQuery({
    queryKey: ["movimentacoes-estoque"],
    queryFn: () => listMovimentacoesEstoque(),
    staleTime: STALE_TIME.realtime,
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutos({ ativo: true }),
    staleTime: STALE_TIME.medium,
  });

  const produtosFiltrados = useMemo(() => {
    const q = produtoSearch.trim().toLowerCase();
    const lista = produtosQuery.data ?? [];
    if (!q) return lista.slice(0, 20);
    return lista
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [produtosQuery.data, produtoSearch]);

  const handleAddItem = () => {
    if (!selectedProduto) return;
    const qtd = Math.max(1, parseInt(qtdInput) || 1);
    const final =
      parseInt(finalInput) >= 0
        ? parseInt(finalInput)
        : selectedProduto.estoqueAtual;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === selectedProduto.id);
      if (idx >= 0) {
        return prev.map((i, j) =>
          j === idx
            ? { ...i, quantidade: i.quantidade + qtd, estoqueFinal: final }
            : i,
        );
      }
      return [
        ...prev,
        {
          tempId: `${selectedProduto.id}-${Date.now()}`,
          produto: selectedProduto,
          quantidade: qtd,
          estoqueFinal: final,
        },
      ];
    });
    setSelectedProduto(null);
    setProdutoSearch("");
    setQtdInput("1");
    setFinalInput("");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    setSaving(true);
    try {
      const notaInfo = nfe.numero
        ? `NF-e: ${nfe.numero}${nfe.serie ? `/S${nfe.serie}` : ""}${nfe.valorAdicional ? ` (R$ ${nfe.valorAdicional})` : ""}`
        : "";
      const motivoParts = [
        motivo,
        descricaoMotivo,
        perdasAvarias ? "Perdas/Avarias" : "",
        notaInfo,
        obs,
      ].filter(Boolean);
      const motivoFinal = motivoParts.join(" | ") || undefined;
      const tipoBackend: MovimentacaoEstoqueTipo =
        tipo === "transferencia" ? "saida" : (tipo as MovimentacaoEstoqueTipo);

      for (const item of cart) {
        if (tipoBackend === "ajuste") {
          await createMovimentacaoEstoque({
            produtoId: item.produto.id,
            tipo: "ajuste",
            estoqueFinal: item.estoqueFinal,
            motivo: motivoFinal,
          });
        } else {
          await createMovimentacaoEstoque({
            produtoId: item.produto.id,
            tipo: tipoBackend,
            quantidade: item.quantidade,
            motivo: motivoFinal,
          });
        }
      }
      await queryClient.invalidateQueries({
        queryKey: ["movimentacoes-estoque"],
      });
      await queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(
        `${cart.length} movimentação${cart.length > 1 ? "ões" : ""} salva${cart.length > 1 ? "s" : ""}.`,
      );
      setCart([]);
      setObs("");
      setMotivo("");
      setDescricaoMotivo("");
      setPerdasAvarias(false);
      setTipo("entrada");
      setNfe({ numero: "", serie: "", dataEmissao: "", valorAdicional: "" });
      setMode("list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const movimentacoes = movQuery.data ?? [];

  return (
    <div className="space-y-0">
      {/* ── Cabeçalho ────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Estoque
          </p>
          <h1 className="font-display text-2xl font-bold">
            {mode === "form" ? "Nova movimentação" : "Movimentações de estoque"}
          </h1>
        </div>
        {mode === "list" ? (
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={() => setMode("form")}
          >
            <Plus className="h-4 w-4" /> Adicionar novo
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setMode("list");
              setCart([]);
            }}
          >
            Cancelar
          </Button>
        )}
      </div>

      {mode === "form" ? (
        <form onSubmit={handleSave}>
          {/* ── Seção 1: tipo / data / destino ──────────────── */}
          <div className="border-b border-border pb-6 mb-6">
            <h2 className="mb-4 text-xl font-semibold">
              Movimentação de Estoque
            </h2>
            {/* Tipo + Data + Estoque */}
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Qual é o tipo de movimentação?
                </p>
                <div className="flex items-center gap-4">
                  {(
                    ["entrada", "saida", "transferencia", "ajuste"] as Tipo[]
                  ).map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t}
                        checked={tipo === t}
                        onChange={() => {
                          setTipo(t);
                          setMotivo("");
                          setDescricaoMotivo("");
                          setPerdasAvarias(false);
                        }}
                        className="accent-primary h-4 w-4"
                      />
                      {tipoLabel[t]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Data
                </p>
                <DatePicker value={data} onChange={setData} />
              </div>
              {/* Estoque de Origem (saída e transferência) */}
              {(tipo === "saida" || tipo === "transferencia") && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Estoque de origem
                  </p>
                  <div className="flex h-10 w-44 items-center rounded-md border border-input bg-secondary/30 px-3 text-sm text-muted-foreground">
                    Estoque Padrão
                  </div>
                </div>
              )}
              {/* Estoque de Destino (entrada e transferência) */}
              {(tipo === "entrada" || tipo === "transferencia") && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tipo === "transferencia"
                      ? "Estoque de destino"
                      : "Estoque de destino"}
                  </p>
                  <div className="flex h-10 w-44 items-center rounded-md border border-input bg-secondary/30 px-3 text-sm text-muted-foreground">
                    Estoque Padrão
                  </div>
                </div>
              )}
            </div>

            {/* Motivo (saída e ajuste) */}
            {(tipo === "saida" || tipo === "ajuste") && (
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className="min-w-[220px]">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Motivo
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary/60"
                    >
                      <option value="">Selecione</option>
                      {motivosAtivos.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Descrição do motivo
                  </p>
                  <Input
                    value={descricaoMotivo}
                    onChange={(e) => setDescricaoMotivo(e.target.value)}
                    placeholder="Detalhe opcional..."
                  />
                </div>
                {tipo === "saida" && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Perdas e avarias
                    </p>
                    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={perdasAvarias}
                        onChange={(e) => setPerdasAvarias(e.target.checked)}
                        className="accent-primary h-4 w-4"
                      />
                      Marcar como perda
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observações
              </p>
              <Textarea
                rows={2}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Observações opcionais..."
                className="max-w-2xl"
              />
            </div>
          </div>

          {/* ── Seção 2: Dados da NF-e (opcional) ───────────── */}
          <div className="border-b border-border pb-6 mb-6">
            <h2 className="mb-4 text-xl font-semibold">Dados da NF-e</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nº NF-e/RPS
                </p>
                <Input
                  value={nfe.numero}
                  onChange={(e) =>
                    setNfe((n) => ({ ...n, numero: e.target.value }))
                  }
                  placeholder="Ex.: 001234"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Série
                </p>
                <Input
                  value={nfe.serie}
                  onChange={(e) =>
                    setNfe((n) => ({ ...n, serie: e.target.value }))
                  }
                  placeholder="Ex.: 1"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Data de emissão
                </p>
                <DatePicker
                  value={nfe.dataEmissao}
                  onChange={(v) => setNfe((n) => ({ ...n, dataEmissao: v }))}
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valor adicional
                </p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nfe.valorAdicional}
                  onChange={(e) =>
                    setNfe((n) => ({ ...n, valorAdicional: e.target.value }))
                  }
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </div>

          {/* ── Seção 3: Itens Movimentados ──────────────────── */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Itens Movimentados</h2>

            {/* Linha de busca e adição — igual ao MarketUP */}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium w-full">
                      Item
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                      {tipo === "ajuste" ? "Estoque final" : "Qtde"}
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                      Valor un.
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                      Atual
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                      Resultado
                    </th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Linha de adição */}
                  <tr className="border-b border-border bg-secondary/10">
                    <td className="px-3 py-2">
                      <Popover open={produtoOpen} onOpenChange={setProdutoOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal text-sm h-9"
                          >
                            {selectedProduto ? (
                              <span className="truncate">
                                {selectedProduto.nome}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Procurar por...
                              </span>
                            )}
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[380px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Nome ou SKU..."
                              value={produtoSearch}
                              onValueChange={setProdutoSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-2 text-center">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Nenhum produto encontrado.
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setNovoProdutoForm((f) => ({
                                        ...f,
                                        nome: produtoSearch,
                                      }));
                                      setNovoProdutoOpen(true);
                                      setProdutoOpen(false);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Criar "{produtoSearch || "novo produto"}"
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {produtosFiltrados.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.nome}
                                    onSelect={() => {
                                      setSelectedProduto(p);
                                      setFinalInput(String(p.estoqueAtual));
                                      setProdutoOpen(false);
                                      setProdutoSearch("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedProduto?.id === p.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div>
                                      <p className="font-medium">{p.nome}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {p.sku} · Estoque: {p.estoqueAtual}
                                      </p>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={tipo === "ajuste" ? "0" : "1"}
                        step="1"
                        value={tipo === "ajuste" ? finalInput : qtdInput}
                        onChange={(e) =>
                          tipo === "ajuste"
                            ? setFinalInput(e.target.value)
                            : setQtdInput(e.target.value)
                        }
                        className="h-9 w-20 text-center"
                        placeholder={tipo === "ajuste" ? "Final" : "Qtde"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex h-9 w-24 items-center justify-center rounded-md border border-input bg-secondary/20 text-sm font-mono text-muted-foreground">
                        {selectedProduto
                          ? formatBRL(selectedProduto.custo)
                          : "R$ 0,00"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                      {selectedProduto?.estoqueAtual ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">—</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!selectedProduto}
                        onClick={handleAddItem}
                        className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        OK
                      </Button>
                    </td>
                  </tr>

                  {/* Itens adicionados */}
                  {cart.map((item) => {
                    const resultado =
                      tipo === "entrada"
                        ? item.produto.estoqueAtual + item.quantidade
                        : tipo === "saida"
                          ? item.produto.estoqueAtual - item.quantidade
                          : item.estoqueFinal;
                    const diff = resultado - item.produto.estoqueAtual;
                    return (
                      <tr
                        key={item.tempId}
                        className="border-b border-border/40 hover:bg-secondary/20"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium">{item.produto.nome}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.produto.sku}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold">
                          {tipo === "ajuste"
                            ? item.estoqueFinal
                            : item.quantidade}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                          {formatBRL(item.produto.custo)}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                          {item.produto.estoqueAtual}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              "font-mono text-sm font-semibold",
                              diff > 0
                                ? "text-emerald-600"
                                : diff < 0
                                  ? "text-red-500"
                                  : "text-muted-foreground",
                            )}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff} → {resultado}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() =>
                              setCart((p) =>
                                p.filter((i) => i.tempId !== item.tempId),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {cart.length === 0 && (
              <p className="mt-3 text-center text-sm text-destructive/70">
                Nenhum item associado a esta movimentação
              </p>
            )}
          </div>

          {/* ── Dialog: Novo produto ─────────────────────────── */}
          <Dialog open={novoProdutoOpen} onOpenChange={setNovoProdutoOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar novo produto</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                <FormField id="np-sku" label="SKU / Código">
                  <Input
                    id="np-sku"
                    value={novoProdutoForm.sku}
                    onChange={(e) =>
                      setNovoProdutoForm((f) => ({ ...f, sku: e.target.value }))
                    }
                    placeholder="Ex.: BAT-IP13"
                    required
                  />
                </FormField>
                <FormField id="np-categoria" label="Categoria">
                  <Select
                    value={novoProdutoForm.categoria}
                    onValueChange={(v) =>
                      setNovoProdutoForm((f) => ({ ...f, categoria: v }))
                    }
                  >
                    <SelectTrigger id="np-categoria">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriasQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField id="np-nome" label="Nome" className="col-span-2">
                  <Input
                    id="np-nome"
                    value={novoProdutoForm.nome}
                    onChange={(e) =>
                      setNovoProdutoForm((f) => ({
                        ...f,
                        nome: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Bateria iPhone 13"
                    required
                  />
                </FormField>
                <FormField id="np-marca" label="Marca">
                  <Select
                    value={novoProdutoForm.marca || "__none__"}
                    onValueChange={(v) =>
                      setNovoProdutoForm((f) => ({
                        ...f,
                        marca: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger id="np-marca">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem marca</SelectItem>
                      {(marcasQuery.data ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField id="np-modelo" label="Modelo">
                  <Input
                    id="np-modelo"
                    value={novoProdutoForm.modelo}
                    onChange={(e) =>
                      setNovoProdutoForm((f) => ({
                        ...f,
                        modelo: e.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </FormField>
                <FormField id="np-custo" label="Custo (R$)">
                  <MoneyInput
                    id="np-custo"
                    value={novoProdutoForm.custo}
                    onChange={(value) =>
                      setNovoProdutoForm((f) => ({ ...f, custo: value }))
                    }
                  />
                </FormField>
                <FormField id="np-venda" label="Preço de venda (R$)">
                  <MoneyInput
                    id="np-venda"
                    value={novoProdutoForm.precoVenda}
                    onChange={(value) =>
                      setNovoProdutoForm((f) => ({ ...f, precoVenda: value }))
                    }
                  />
                </FormField>
                <FormField id="np-minimo" label="Estoque mínimo">
                  <Input
                    id="np-minimo"
                    type="number"
                    min="0"
                    step="1"
                    value={novoProdutoForm.estoqueMinimo}
                    onChange={(e) =>
                      setNovoProdutoForm((f) => ({
                        ...f,
                        estoqueMinimo: e.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNovoProdutoOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={
                    !novoProdutoForm.sku.trim() ||
                    !novoProdutoForm.nome.trim() ||
                    criarProdutoMutation.isPending
                  }
                  onClick={() => criarProdutoMutation.mutate()}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {criarProdutoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Criar e selecionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Rodapé ───────────────────────────────────────── */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {cart.length} item{cart.length !== 1 ? "s" : ""} adicionado
              {cart.length !== 1 ? "s" : ""}
            </p>
            <Button
              type="submit"
              disabled={saving || cart.length === 0}
              className="min-w-[140px] bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </form>
      ) : (
        /* ── Lista de histórico ───────────────────────────────── */
        <>
          {movQuery.isLoading ? (
            <Card className="surface-panel flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ) : movimentacoes.length === 0 ? (
            <Card className="surface-panel">
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma movimentação registrada"
                description="Entradas e saídas de estoque aparecerão aqui."
                actions={
                  <Button onClick={() => setMode("form")}>
                    <Plus className="h-4 w-4" /> Nova movimentação
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card className="surface-panel overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 text-left font-medium">Data</th>
                      <th className="px-5 py-3 text-left font-medium">Tipo</th>
                      <th className="px-5 py-3 text-left font-medium">Item</th>
                      <th className="px-5 py-3 text-center font-medium">Qtd</th>
                      <th className="px-5 py-3 text-center font-medium">
                        Anterior
                      </th>
                      <th className="px-5 py-3 text-center font-medium">
                        Posterior
                      </th>
                      <th className="px-5 py-3 text-left font-medium">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((mov) => {
                      const isEntrada = mov.tipo === "entrada";
                      const isSaida = mov.tipo === "saida";
                      return (
                        <tr
                          key={mov.id}
                          className="border-b border-border/40 hover:bg-secondary/20"
                        >
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(mov.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {isEntrada && (
                                <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                              {isSaida && (
                                <ArrowDown className="h-3.5 w-3.5 text-red-500" />
                              )}
                              {!isEntrada && !isSaida && (
                                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                              )}
                              <span
                                className={cn(
                                  "font-medium text-xs",
                                  isEntrada
                                    ? "text-emerald-600"
                                    : isSaida
                                      ? "text-red-500"
                                      : "text-primary",
                                )}
                              >
                                {tipoLabel[mov.tipo]}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="mt-0.5 text-[9px] px-1 py-0 capitalize"
                            >
                              {mov.origem === "manual" ? "Manual" : "OS"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium">{mov.produtoNome}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {mov.produtoSku}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-semibold">
                            {isEntrada ? "+" : isSaida ? "-" : ""}
                            {mov.quantidade ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-center font-mono text-muted-foreground">
                            {mov.estoqueAnterior}
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-semibold">
                            <span
                              className={
                                mov.estoquePosterior > mov.estoqueAnterior
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }
                            >
                              {mov.estoquePosterior}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {mov.motivo ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
