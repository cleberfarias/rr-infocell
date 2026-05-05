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
import { formatBRL } from "@/data/mock";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  updateOrdemServico,
  type OrdemServico,
  type OrdemServicoFormaPagamento,
} from "@/services/ordens-servico";

const paymentOptions: Array<{
  key: OrdemServicoFormaPagamento;
  label: string;
  icon: typeof QrCode;
}> = [
  { key: "pix", label: "PIX", icon: QrCode },
  { key: "cartao", label: "Cartao", icon: CreditCard },
  { key: "dinheiro", label: "Dinheiro", icon: Banknote },
];

const toPecasInput = (ordem: OrdemServico) =>
  (ordem.pecasUsadas ?? []).map((peca) => ({
    produtoId: peca.produtoId,
    quantidade: peca.quantidade,
    valorUnitario: peca.valorUnitario,
  }));

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

  const selectedOrdem = useMemo(() => {
    if (!selectedOrdemId) {
      return null;
    }

    return ordens.find((ordem) => ordem.id === selectedOrdemId) ?? null;
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (!selectedOrdemId && ordens[0]) {
      setSelectedOrdemId(ordens[0].id);
    }
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (selectedOrdem) {
      setValorRecebido(String(selectedOrdem.valorTotal));
    }
  }, [selectedOrdem]);

  const finalizarMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      const recebido = Number(valorRecebido.replace(",", ".")) || 0;

      if (recebido < selectedOrdem.valorTotal) {
        throw new Error("Valor recebido menor que o total da OS.");
      }

      return updateOrdemServico(selectedOrdem.id, {
        clienteId: selectedOrdem.clienteId,
        aparelhoId: selectedOrdem.aparelhoId,
        checklistId: selectedOrdem.checklistId,
        defeitoRelatado: selectedOrdem.defeitoRelatado,
        diagnostico: selectedOrdem.diagnostico,
        status: "entregue",
        tecnicoResponsavel: selectedOrdem.tecnicoResponsavel,
        pecasUsadas: toPecasInput(selectedOrdem),
        valorMaoObra: selectedOrdem.valorMaoObra,
        entradaEm: selectedOrdem.entradaEm,
        previsaoEntregaEm: selectedOrdem.previsaoEntregaEm,
        formaPagamento,
        valorRecebido: recebido,
      });
    },
    onSuccess: async (ordem) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordem.id] }),
      ]);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel finalizar a venda.",
      );
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
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
    ordensQuery.isLoading || clientesQuery.isLoading || aparelhosQuery.isLoading;
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
          icon={Receipt}
          title="Nao foi possivel carregar o caixa"
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

  if (ordens.length === 0) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={Receipt}
          title="Nenhuma OS pronta para caixa"
          description="Finalize a manutencao de uma OS para liberar o fechamento no PDV."
          actions={
            <Button asChild>
              <Link to="/app/manutencao">Ir para manutencao</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <PageHeader
          eyebrow="PDV / Caixa"
          title="Fechamento de OS"
          description="Registre o pagamento, entregue a OS e gere comprovante simples."
        />

        <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
          <FormField id="pdv-os" label="Ordem de servico" className="flex-1">
            <Select value={selectedOrdemId} onValueChange={handleSelectOrdem}>
              <SelectTrigger id="pdv-os">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

        {selectedOrdem && (
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
                <CheckCircle2 className="h-3.5 w-3.5" /> OS pronta para entrega
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
                      Peca - {peca.quantidade}x
                    </p>
                  </div>
                  <p className="font-mono font-semibold">
                    {formatBRL(peca.valorTotal)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                <div>
                  <p className="font-medium">Mao de obra</p>
                  <p className="text-xs text-muted-foreground">Servico tecnico</p>
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

      {selectedOrdem && (
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
                min={selectedOrdem.valorTotal}
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
      )}
    </div>
  );
};

export default PDV;
