import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Printer,
  QrCode,
  Receipt,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/formatters";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
  type OrdemServicoFormaPagamento,
} from "@/services/ordens-servico";
import { listProdutos, type Produto } from "@/services/produtos";
import { createVenda, listVendas, type Venda } from "@/services/vendas";

const paymentOptions: Array<{
  key: OrdemServicoFormaPagamento;
  label: string;
  icon: typeof QrCode;
}> = [
  { key: "pix", label: "PIX", icon: QrCode },
  { key: "cartao", label: "Cartão", icon: CreditCard },
  { key: "dinheiro", label: "Dinheiro", icon: Banknote },
];

const PDV = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [formaPagamento, setFormaPagamento] =
    useState<OrdemServicoFormaPagamento>("pix");
  const [valorRecebido, setValorRecebido] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [modoVenda, setModoVenda] = useState<"os" | "direta">("os");
  const [clienteVendaDireta, setClienteVendaDireta] = useState("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [carrinho, setCarrinho] = useState<Array<Produto & { quantidadeVenda: number }>>([]);
  const [ordemFinalizada, setOrdemFinalizada] = useState<OrdemServico | null>(null);
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "pdv"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "pdv"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "pdv"],
    queryFn: () => listAparelhos(),
  });

  const vendasQuery = useQuery({
    queryKey: ["vendas", "pdv"],
    queryFn: () => listVendas(),
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos", "pdv-direto"],
    queryFn: () => listProdutos({ ativo: true }),
  });

  const ordens = useMemo(
    () =>
      (ordensQuery.data ?? []).filter(
        (ordem) => ordem.status === "pronto_para_retirada",
      ),
    [ordensQuery.data],
  );

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
  const produtosVenda = useMemo(
    () => (produtosQuery.data ?? []).filter((produto) => produto.estoqueAtual > 0 || produto.categoria === "servico"),
    [produtosQuery.data],
  );
  const produtoSelecionado = produtosVenda.find((produto) => produto.id === produtoSelecionadoId);
  const totalDireto = carrinho.reduce(
    (total, item) => total + item.precoVenda * item.quantidadeVenda,
    0,
  );

  const selectedOrdemPronta = useMemo(() => {
    if (!selectedOrdemId) {
      return null;
    }

    return ordens.find((ordem) => ordem.id === selectedOrdemId) ?? null;
  }, [ordens, selectedOrdemId]);
  const selectedOrdem = selectedOrdemPronta ?? ordemFinalizada;

  useEffect(() => {
    if (!selectedOrdemId && ordens[0]) {
      setSelectedOrdemId(ordens[0].id);
    }
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (selectedOrdemPronta) {
      setValorRecebido(String(selectedOrdemPronta.valorTotal));
    }
  }, [selectedOrdemPronta]);

  useEffect(() => {
    if (modoVenda === "direta") {
      setValorRecebido(String(totalDireto));
    }
  }, [modoVenda, totalDireto]);

  const finalizarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrdemPronta) {
        throw new Error("Selecione uma OS.");
      }

      const recebido = Number(valorRecebido.replace(",", ".")) || 0;

      if (recebido < selectedOrdemPronta.valorTotal) {
        throw new Error("Valor recebido menor que o total da OS.");
      }

      const venda = await createVenda({
        ordemServicoId: selectedOrdemPronta.id,
        formaPagamento,
        valorRecebido: recebido,
      });

      return { ordem: selectedOrdemPronta, venda };
    },
    onSuccess: async ({ ordem, venda }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({
          queryKey: ["ordem-servico", venda.ordemServicoId],
        }),
        queryClient.invalidateQueries({ queryKey: ["vendas"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] }),
      ]);
      setOrdemFinalizada({
        ...ordem,
        status: "entregue",
        formaPagamento: venda.formaPagamento,
        valorRecebido: venda.valorRecebido,
        troco: venda.troco,
      });
      setVendaFinalizada(venda);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar a venda.",
      );
    },
  });

  const vendaDiretaMutation = useMutation({
    mutationFn: async () => {
      if (carrinho.length === 0) throw new Error("Adicione ao menos um item.");
      const recebido = Number(valorRecebido.replace(",", ".")) || 0;
      if (recebido < totalDireto) throw new Error("Valor recebido menor que o total da venda.");

      return createVenda({
        clienteNome: clienteVendaDireta || undefined,
        formaPagamento,
        valorRecebido: recebido,
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidadeVenda,
          valorUnitario: item.precoVenda,
          garantiaDias: item.garantiaDias,
        })),
      });
    },
    onSuccess: async (venda) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["produtos"] }),
        queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] }),
        queryClient.invalidateQueries({ queryKey: ["vendas"] }),
      ]);
      setVendaFinalizada(venda);
      setCarrinho([]);
      setProdutoSelecionadoId("");
      setClienteVendaDireta("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Não foi possível finalizar a venda.");
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
    setOrdemFinalizada(null);
    setVendaFinalizada(null);
    setFormError(null);
  };

  const handleNovaVenda = () => {
    if (modoVenda === "direta") {
      setVendaFinalizada(null);
      setCarrinho([]);
      setProdutoSelecionadoId("");
      setClienteVendaDireta("");
      setValorRecebido("");
      setFormError(null);
      return;
    }

    const proximaOrdem = ordens.find((ordem) => ordem.id !== ordemFinalizada?.id);
    setOrdemFinalizada(null);
    setVendaFinalizada(null);
    setFormError(null);

    if (proximaOrdem) {
      setSelectedOrdemId(proximaOrdem.id);
      setSearchParams({ ordemId: proximaOrdem.id });
      return;
    }

    setSelectedOrdemId("");
    setSearchParams({});
  };

  const adicionarProduto = () => {
    if (!produtoSelecionado) return;
    setCarrinho((current) => {
      if (produtoSelecionado.categoria.startsWith("celular_") && current.some((item) => item.id === produtoSelecionado.id)) {
        return current;
      }

      const existing = current.find((item) => item.id === produtoSelecionado.id);
      if (existing && !produtoSelecionado.categoria.startsWith("celular_")) {
        const limite =
          produtoSelecionado.categoria === "servico"
            ? existing.quantidadeVenda + 1
            : produtoSelecionado.estoqueAtual;

        return current.map((item) =>
          item.id === produtoSelecionado.id
            ? { ...item, quantidadeVenda: Math.min(item.quantidadeVenda + 1, limite) }
            : item,
        );
      }

      return [...current, { ...produtoSelecionado, quantidadeVenda: 1 }];
    });
  };

  const recebido = Number(valorRecebido.replace(",", ".")) || 0;
  const troco = selectedOrdem ? Math.max(0, recebido - selectedOrdem.valorTotal) : 0;
  const cliente = selectedOrdem
    ? clienteById.get(selectedOrdem.clienteId)
    : undefined;
  const aparelho = selectedOrdem
    ? aparelhoById.get(selectedOrdem.aparelhoId)
    : undefined;
  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading ||
    vendasQuery.isLoading;
  const isDirectLoading = produtosQuery.isLoading;
  const isError =
    ordensQuery.isError ||
    clientesQuery.isError ||
    aparelhosQuery.isError ||
    vendasQuery.isError;
  const historicoVendas = useMemo(
    () =>
      [...(vendasQuery.data ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [vendasQuery.data],
  );

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
          icon={Receipt}
          title="Não foi possível carregar o caixa"
          description="Verifique se o backend esta rodando e tente novamente."
          actions={
            <Button variant="outline" onClick={() => ordensQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
        <PageHeader
          eyebrow="PDV / Caixa"
          title={modoVenda === "os" ? "Fechamento de OS" : "Venda direta"}
          description="Registre pagamento de OS, celular, acessórios ou serviços avulsos."
        />

        <Card className="surface-panel flex gap-2 p-3">
          <Button
            type="button"
            variant={modoVenda === "os" ? "default" : "outline"}
            onClick={() => {
              setModoVenda("os");
              setVendaFinalizada(null);
            }}
          >
            Fechar OS
          </Button>
          <Button
            type="button"
            variant={modoVenda === "direta" ? "default" : "outline"}
            onClick={() => {
              setModoVenda("direta");
              setVendaFinalizada(null);
              setOrdemFinalizada(null);
              setSelectedOrdemId("");
              setSearchParams({});
            }}
          >
            Venda direta
          </Button>
        </Card>

        {modoVenda === "direta" ? (
          <Card className="surface-panel p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px_auto]">
              <FormField id="pdv-cliente-direto" label="Cliente">
                <Input
                  id="pdv-cliente-direto"
                  value={clienteVendaDireta}
                  onChange={(event) => setClienteVendaDireta(event.target.value)}
                  placeholder="Nome do cliente ou venda balcão"
                />
              </FormField>
              <FormField id="pdv-produto-direto" label="Item">
                <Select
                  value={produtoSelecionadoId}
                  onValueChange={setProdutoSelecionadoId}
                  disabled={isDirectLoading}
                >
                  <SelectTrigger id="pdv-produto-direto">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtosVenda.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                        {produto.imei ? ` - IMEI ${produto.imei}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <Button
                className="self-end"
                type="button"
                onClick={adicionarProduto}
                disabled={!produtoSelecionado}
              >
                Adicionar
              </Button>
            </div>
            <div className="mt-5 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Item</th>
                    <th className="px-4 py-3 text-center font-medium">Qtd.</th>
                    <th className="px-4 py-3 text-right font-medium">Unitário</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carrinho.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum item no carrinho.
                      </td>
                    </tr>
                  ) : (
                    carrinho.map((item) => (
                      <tr key={item.id} className="border-b border-border/40">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.nome}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.sku}
                            {item.imei ? ` - IMEI ${item.imei}` : ""}
                            {item.garantiaDias ? ` - garantia ${item.garantiaDias} dias` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{item.quantidadeVenda}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatBRL(item.precoVenda)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatBRL(item.precoVenda * item.quantidadeVenda)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setCarrinho((current) => current.filter((row) => row.id !== item.id))}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                Total da venda
              </span>
              <strong className="font-display text-4xl text-primary">{formatBRL(totalDireto)}</strong>
            </div>
          </Card>
        ) : ordens.length === 0 && !ordemFinalizada ? (
          <Card className="surface-panel">
            <EmptyState
              icon={Receipt}
              title="Nenhuma OS pronta para caixa"
              description="Finalize a manutenção de uma OS para liberar o fechamento no PDV."
              actions={
                <Button asChild>
                  <Link to="/app/manutencao">Ir para manutenção</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
            <FormField id="pdv-os" label="Ordem de serviço" className="flex-1">
              <Select value={selectedOrdemId} onValueChange={handleSelectOrdem}>
                <SelectTrigger id="pdv-os">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ordemFinalizada &&
                    !ordens.some((ordem) => ordem.id === ordemFinalizada.id) && (
                      <SelectItem value={ordemFinalizada.id}>
                        OS-{ordemFinalizada.numero} - venda finalizada
                      </SelectItem>
                    )}
                  {ordens.map((ordem) => {
                    const rowCliente = clienteById.get(ordem.clienteId);
                    const rowAparelho = aparelhoById.get(ordem.aparelhoId);

                    return (
                      <SelectItem key={ordem.id} value={ordem.id}>
                        OS-{ordem.numero} - {rowCliente?.nome ?? ordem.clienteId} -{" "}
                        {rowAparelho
                          ? `${rowAparelho.marca} ${rowAparelho.modelo}`
                          : ordem.aparelhoId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormField>
            {selectedOrdem && <StatusBadge status={selectedOrdem.status} />}
          </Card>
        )}

        {modoVenda === "os" && selectedOrdem && (
          <Card className="surface-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                  // Fechamento OS-{selectedOrdem.numero}
                </p>
                <h2 className="font-display text-2xl font-bold">
                  {cliente?.nome ?? selectedOrdem.clienteId}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {cliente?.telefone ?? "-"} -{" "}
                  {aparelho
                    ? `${aparelho.marca} ${aparelho.modelo}`
                    : selectedOrdem.aparelhoId}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {vendaFinalizada ? "Venda finalizada" : "OS pronta para entrega"}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {(selectedOrdem.pecasUsadas ?? []).map((peca) => (
                <div
                  key={peca.produtoId}
                  className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{peca.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Peça - {peca.quantidade}x
                    </p>
                  </div>
                  <p className="font-mono font-semibold">
                    {formatBRL(peca.valorTotal)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                <div>
                  <p className="font-medium">Mão de obra</p>
                  <p className="text-xs text-muted-foreground">Serviço técnico</p>
                </div>
                <p className="font-mono font-semibold">
                  {formatBRL(selectedOrdem.valorMaoObra)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
              <p className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                Total a pagar
              </p>
              <p className="font-display text-4xl font-bold text-primary glow-text">
                {formatBRL(selectedOrdem.valorTotal)}
              </p>
            </div>
          </Card>
        )}
        </div>

        {vendaFinalizada ? (
        <Card className="surface-panel p-6">
          <div className="mb-4 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display text-base font-semibold">
              Pagamento finalizado
            </h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Origem</span>
              <strong>{vendaFinalizada.numeroOs ? `OS-${vendaFinalizada.numeroOs}` : "Venda direta"}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Forma</span>
              <strong className="uppercase">{vendaFinalizada.formaPagamento}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <strong>{formatBRL(vendaFinalizada.valorTotal)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Recebido</span>
              <strong>{formatBRL(vendaFinalizada.valorRecebido)}</strong>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span className="text-muted-foreground">Troco</span>
              <strong className="text-success">{formatBRL(vendaFinalizada.troco)}</strong>
            </div>
          </div>
          {vendaFinalizada.itens.length > 0 && (
            <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-xs">
              <p className="mb-2 font-medium">Itens e garantia</p>
              <div className="space-y-2">
                {vendaFinalizada.itens.map((item) => (
                  <div key={`${item.produtoId}-${item.imei ?? item.nome}`} className="flex justify-between gap-3">
                    <span>
                      {item.nome}
                      {item.imei ? ` - IMEI ${item.imei}` : ""}
                    </span>
                    <strong>
                      {item.garantiaDias
                        ? `Garantia ate ${new Date(item.garantiaAte ?? "").toLocaleDateString("pt-BR")}`
                        : "Sem garantia registrada"}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 space-y-2">
            <Button className="w-full" type="button" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir comprovante
            </Button>
            <Button
              className="w-full"
              variant="outline"
              type="button"
              onClick={handleNovaVenda}
            >
              {modoVenda === "direta" ? "Nova venda direta" : "Fechar outra OS"}
            </Button>
          </div>
        </Card>
      ) : modoVenda === "direta" ? (
        <Card className="surface-panel p-6">
          <h3 className="mb-1 font-display text-base font-semibold">Pagamento</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Finalize a venda direta do carrinho.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {paymentOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={
                  "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
                  (formaPagamento === key
                    ? "border-primary bg-primary/10 text-primary shadow-glow"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
                }
                type="button"
                onClick={() => setFormaPagamento(key)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <FormField id="pdv-direto-recebido" label="Valor recebido">
              <Input
                id="pdv-direto-recebido"
                className="font-mono text-lg"
                min={totalDireto}
                step="0.01"
                type="number"
                value={valorRecebido}
                onChange={(event) => setValorRecebido(event.target.value)}
              />
            </FormField>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Troco</span>
              <span className="font-mono text-lg font-semibold text-success">
                {formatBRL(Math.max(0, (Number(valorRecebido.replace(",", ".")) || 0) - totalDireto))}
              </span>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              disabled={vendaDiretaMutation.isPending || carrinho.length === 0}
              onClick={() => vendaDiretaMutation.mutate()}
            >
              {vendaDiretaMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Finalizar venda direta
            </Button>
          </div>
        </Card>
      ) : selectedOrdemPronta ? (
        <Card className="surface-panel p-6">
          <h3 className="mb-1 font-display text-base font-semibold">Pagamento</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Selecione a forma e finalize a entrega.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {paymentOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={
                  "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
                  (formaPagamento === key
                    ? "border-primary bg-primary/10 text-primary shadow-glow"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
                }
                type="button"
                onClick={() => setFormaPagamento(key)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <FormField id="pdv-recebido" label="Valor recebido">
              <Input
                id="pdv-recebido"
                className="font-mono text-lg"
                min={selectedOrdemPronta.valorTotal}
                step="0.01"
                type="number"
                value={valorRecebido}
                onChange={(event) => setValorRecebido(event.target.value)}
              />
            </FormField>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Troco
              </span>
              <span className="font-mono text-lg font-semibold text-success">
                {formatBRL(troco)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-success">
                Status
              </span>
              <span className="text-xs font-semibold uppercase text-success">
                Pronto para finalizar
              </span>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              disabled={finalizarMutation.isPending}
              onClick={() => finalizarMutation.mutate()}
            >
              {finalizarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Finalizar venda
            </Button>
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Imprimir comprovante
            </Button>
          </div>
        </Card>
        ) : null}
      </div>

      <Card className="surface-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold">
              Histórico de pagamentos
            </h3>
            <p className="text-xs text-muted-foreground">
              Últimas OS fechadas no caixa.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/financeiro">Ver relatorio</Link>
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">OS</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Forma</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Recebido</th>
                <th className="px-4 py-3 text-right font-medium">Troco</th>
              </tr>
            </thead>
            <tbody>
              {historicoVendas.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    Nenhum pagamento finalizado ainda.
                  </td>
                </tr>
              ) : (
                historicoVendas.map((venda) => {
                  const rowCliente = venda.clienteId ? clienteById.get(venda.clienteId) : undefined;

                  return (
                    <tr key={venda.id} className="border-b border-border/40">
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
                      <td className="px-4 py-3">
                        {rowCliente?.nome ?? venda.clienteNome ?? venda.clienteId ?? "Balcao"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(venda.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 uppercase">
                        {venda.formaPagamento}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatBRL(venda.valorTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatBRL(venda.valorRecebido)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatBRL(venda.troco)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PDV;
