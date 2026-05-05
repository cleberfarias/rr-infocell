import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

const budgetStatuses: OrdemServicoStatus[] = [
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

const statusLabels: Record<OrdemServicoStatus, string> = {
  aguardando_aprovacao: "Aguardando aprovacao",
  aguardando_peca: "Aguardando peca",
  cancelado: "Cancelado",
  em_analise: "Em analise",
  em_manutencao: "Em manutencao",
  entregue: "Entregue",
  pronto_para_retirada: "Pronto para retirada",
  recebido: "Recebido",
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
};

const toPecasInput = (ordem: OrdemServico) =>
  (ordem.pecasUsadas ?? []).map((peca) => ({
    produtoId: peca.produtoId,
    quantidade: peca.quantidade,
    valorUnitario: peca.valorUnitario,
  }));

const Orcamento = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "orcamento"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "orcamento"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "orcamento"],
    queryFn: () => listAparelhos(),
  });

  const ordens = useMemo(
    () =>
      (ordensQuery.data ?? []).filter((ordem) =>
        budgetStatuses.includes(ordem.status),
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

  const statusMutation = useMutation({
    mutationFn: (status: OrdemServicoStatus) => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      return updateOrdemServico(selectedOrdem.id, {
        clienteId: selectedOrdem.clienteId,
        aparelhoId: selectedOrdem.aparelhoId,
        checklistId: selectedOrdem.checklistId,
        defeitoRelatado: selectedOrdem.defeitoRelatado,
        diagnostico: selectedOrdem.diagnostico,
        status,
        tecnicoResponsavel: selectedOrdem.tecnicoResponsavel,
        pecasUsadas: toPecasInput(selectedOrdem),
        valorMaoObra: selectedOrdem.valorMaoObra,
        entradaEm: selectedOrdem.entradaEm,
        previsaoEntregaEm: selectedOrdem.previsaoEntregaEm,
      });
    },
    onSuccess: async (ordem) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordem.id] }),
      ]);
      setSelectedOrdemId(ordem.id);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o orcamento.",
      );
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
  };

  const cliente = selectedOrdem
    ? clienteById.get(selectedOrdem.clienteId)
    : undefined;
  const aparelho = selectedOrdem
    ? aparelhoById.get(selectedOrdem.aparelhoId)
    : undefined;
  const historico = useMemo(
    () =>
      (ordensQuery.data ?? [])
        .filter((ordem) =>
          ["em_manutencao", "pronto_para_retirada", "cancelado"].includes(
            ordem.status,
          ),
        )
        .slice(0, 5),
    [ordensQuery.data],
  );
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
          icon={FileCheck2}
          title="Nao foi possivel carregar orcamentos"
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
          icon={FileCheck2}
          title="Nenhuma OS disponivel para orcamento"
          description="Atualize uma OS para analise, aguardando aprovacao ou manutencao."
          actions={
            <Button asChild>
              <Link to="/app/ordens">Ver ordens</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Orcamentos"
        title={selectedOrdem ? `OS-${selectedOrdem.numero}` : "Orcamento"}
        description="Revise valores reais da OS e registre envio, aprovacao ou reprovacao do cliente."
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedOrdem && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/app/ordens/${selectedOrdem.id}`}>
                    <Eye className="h-4 w-4" /> Detalhe
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/app/manutencao?ordemId=${selectedOrdem.id}`}>
                    Manutencao
                  </Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
        <FormField id="orcamento-os" label="Ordem de servico" className="flex-1">
          <Select value={selectedOrdemId} onValueChange={handleSelectOrdem}>
            <SelectTrigger id="orcamento-os">
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card className="surface-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">
                    // Orcamento OS-{selectedOrdem.numero}
                  </p>
                  <h2 className="font-display text-2xl font-bold">
                    {cliente?.nome ?? selectedOrdem.clienteId}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {aparelho
                      ? `${aparelho.marca} ${aparelho.modelo}`
                      : selectedOrdem.aparelhoId}
                    {aparelho?.imeiSerial ? (
                      <>
                        {" "}
                        - IMEI{" "}
                        <span className="font-mono">{aparelho.imeiSerial}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                  <Clock className="h-3.5 w-3.5" />
                  {statusLabels[selectedOrdem.status]}
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Defeito e diagnostico
                </p>
                <p className="mt-1 text-sm">{selectedOrdem.defeitoRelatado}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedOrdem.diagnostico ?? "Diagnostico ainda nao informado."}
                </p>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Pecas
                </h3>
                <div className="space-y-2">
                  {(selectedOrdem.pecasUsadas ?? []).length === 0 ? (
                    <div className="rounded-md border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                      Nenhuma peca vinculada a esta OS.
                    </div>
                  ) : (
                    selectedOrdem.pecasUsadas.map((peca) => (
                      <div
                        key={peca.produtoId}
                        className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{peca.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {peca.quantidade} x {formatBRL(peca.valorUnitario)}
                          </p>
                        </div>
                        <p className="font-mono font-semibold">
                          {formatBRL(peca.valorTotal)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <h3 className="mb-3 mt-6 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Servicos
                </h3>
                <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                  <div>
                    <p className="font-medium">Mao de obra tecnica</p>
                    <p className="text-xs text-muted-foreground">
                      Responsavel:{" "}
                      {selectedOrdem.tecnicoResponsavel ?? "nao definido"}
                    </p>
                  </div>
                  <p className="font-mono font-semibold">
                    {formatBRL(selectedOrdem.valorMaoObra)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Total a aprovar
                  </p>
                  <p className="font-display text-3xl font-bold text-primary glow-text">
                    {formatBRL(selectedOrdem.valorTotal)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("cancelado")}
                  >
                    <X className="h-4 w-4" /> Reprovar
                  </Button>
                  <Button
                    className="bg-success text-success-foreground hover:bg-success/90"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("em_manutencao")}
                  >
                    <Check className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button
                    className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("aguardando_aprovacao")}
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviado ao cliente
                  </Button>
                </div>
              </div>
              {actionError && (
                <p className="mt-3 text-sm text-destructive">{actionError}</p>
              )}
            </Card>
          </div>

          <Card className="surface-panel p-5">
            <h3 className="mb-1 font-display text-base font-semibold">
              Historico recente
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Ultimas decisoes registradas por status da OS.
            </p>
            <ul className="space-y-3">
              {historico.length === 0 ? (
                <li className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                  Nenhuma decisao registrada ainda.
                </li>
              ) : (
                historico.map((ordem) => {
                  const rowCliente = clienteById.get(ordem.clienteId);
                  const approved = ordem.status !== "cancelado";

                  return (
                    <li
                      key={ordem.id}
                      className="flex gap-3 rounded-md border border-border bg-secondary/30 p-3"
                    >
                      <div
                        className={
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md " +
                          (approved
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive")
                        }
                      >
                        {approved ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          OS-{ordem.numero} - {formatDateTime(ordem.updatedAt)}
                        </p>
                        <p className="truncate text-sm font-medium">
                          {rowCliente?.nome ?? ordem.clienteId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {statusLabels[ordem.status]} -{" "}
                          {formatBRL(ordem.valorTotal)}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Orcamento;
