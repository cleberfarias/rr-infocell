import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  Save,
  Send,
  Smartphone,
  Wrench,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import {
  EmptyState,
  FormField,
  PageHeader,
  SectionPanel,
} from "@/components/design-system";
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
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/data/mock";
import { listAparelhos, type Aparelho } from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";
import {
  getOrdemServico,
  listOrdensServico,
  updateOrdemServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";
import {
  createOrdemEvento,
  listOrdemEventos,
} from "@/services/ordem-eventos";

type ManutencaoForm = {
  diagnostico: string;
  status: OrdemServicoStatus;
  prioridade: OrdemServico["prioridade"];
  tecnicoResponsavel: string;
  valorMaoObra: string;
  garantiaDias: string;
  garantiaObservacoes: string;
};

const statusFlow: Array<{ key: OrdemServicoStatus; label: string }> = [
  { key: "recebido", label: "Recebido" },
  { key: "em_analise", label: "Em analise" },
  { key: "aguardando_aprovacao", label: "Aguardando aprovacao" },
  { key: "aguardando_peca", label: "Aguardando peca" },
  { key: "em_manutencao", label: "Em manutencao" },
  { key: "pronto_para_retirada", label: "Pronto retirada" },
  { key: "entregue", label: "Entregue" },
];

const tecnicoOptions = ["Rafael S.", "Diego M.", "Bruno T."];

const maintenanceStatuses: OrdemServicoStatus[] = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

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

const buildForm = (ordem: OrdemServico): ManutencaoForm => ({
  diagnostico: ordem.diagnostico ?? "",
  status: ordem.status,
  prioridade: ordem.prioridade ?? "normal",
  tecnicoResponsavel: ordem.tecnicoResponsavel ?? "",
  valorMaoObra: String(ordem.valorMaoObra),
  garantiaDias: String(ordem.garantiaDias ?? 90),
  garantiaObservacoes: ordem.garantiaObservacoes ?? "",
});

const toPecasInput = (ordem: OrdemServico) =>
  (ordem.pecasUsadas ?? []).map((peca) => ({
    produtoId: peca.produtoId,
    quantidade: peca.quantidade,
    valorUnitario: peca.valorUnitario,
  }));

const Manutencao = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [form, setForm] = useState<ManutencaoForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [comentarioError, setComentarioError] = useState<string | null>(null);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "manutencao"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "manutencao"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "manutencao"],
    queryFn: () => listAparelhos(),
  });

  const eventosQuery = useQuery({
    queryKey: ["ordem-eventos", selectedOrdemId],
    queryFn: () => listOrdemEventos({ ordemServicoId: selectedOrdemId }),
    enabled: Boolean(selectedOrdemId),
  });

  const selectedOrdemQuery = useQuery({
    queryKey: ["ordem-servico", selectedOrdemId],
    queryFn: () => getOrdemServico(selectedOrdemId),
    enabled: Boolean(selectedOrdemId),
  });

  const ordens = useMemo(
    () =>
      (ordensQuery.data ?? []).filter((ordem) =>
        maintenanceStatuses.includes(ordem.status),
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

  const selectedOrdemFromList = useMemo(() => {
    if (!selectedOrdemId) {
      return null;
    }

    return ordens.find((ordem) => ordem.id === selectedOrdemId) ?? null;
  }, [ordens, selectedOrdemId]);

  const selectedOrdem = selectedOrdemQuery.data ?? selectedOrdemFromList;

  useEffect(() => {
    if (!selectedOrdemId && ordens[0]) {
      setSelectedOrdemId(ordens[0].id);
    }
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (!selectedOrdem) {
      setForm(null);
      return;
    }

    setForm(buildForm(selectedOrdem));
    setFormError(null);
    setComentario("");
    setComentarioError(null);
  }, [selectedOrdem]);

  const updateMutation = useMutation({
    mutationFn: (input: ManutencaoForm) => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      return updateOrdemServico(selectedOrdem.id, {
        clienteId: selectedOrdem.clienteId,
        aparelhoId: selectedOrdem.aparelhoId,
        checklistId: selectedOrdem.checklistId,
        defeitoRelatado: selectedOrdem.defeitoRelatado,
        diagnostico: input.diagnostico || undefined,
        status: input.status,
        prioridade: input.prioridade,
        tecnicoResponsavel: input.tecnicoResponsavel || undefined,
        pecasUsadas: toPecasInput(selectedOrdem),
        valorMaoObra: Number(input.valorMaoObra.replace(",", ".")) || 0,
        entradaEm: selectedOrdem.entradaEm,
        previsaoEntregaEm: selectedOrdem.previsaoEntregaEm,
        prazoPrometidoEm: selectedOrdem.prazoPrometidoEm,
        garantiaDias: Number(input.garantiaDias) || undefined,
        garantiaObservacoes: input.garantiaObservacoes || undefined,
      });
    },
    onSuccess: async (ordem, input) => {
      await createOrdemEvento({
        ordemServicoId: ordem.id,
        tipo: "diagnostico",
        titulo: "Manutencao atualizada",
        descricao: `Status: ${input.status}. Diagnostico: ${
          input.diagnostico || "nao informado"
        }`,
        criadoPor: input.tecnicoResponsavel || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordem.id] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] }),
      ]);
      setSelectedOrdemId(ordem.id);
      setForm(buildForm(ordem));
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar a manutencao.",
      );
    },
  });

  const comentarioMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      if (!comentario.trim()) {
        throw new Error("Informe o comentario.");
      }

      return createOrdemEvento({
        ordemServicoId: selectedOrdem.id,
        tipo: "comentario",
        titulo: "Comentario tecnico",
        descricao: comentario.trim(),
        criadoPor: form?.tecnicoResponsavel || selectedOrdem.tecnicoResponsavel,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] });
      setComentario("");
      setComentarioError(null);
    },
    onError: (error) => {
      setComentarioError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar o comentario.",
      );
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
  };

  const updateForm = <TKey extends keyof ManutencaoForm>(
    field: TKey,
    value: ManutencaoForm[TKey],
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (form) {
      updateMutation.mutate(form);
    }
  };

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading ||
    (Boolean(selectedOrdemId) && selectedOrdemQuery.isLoading);
  const isError =
    ordensQuery.isError ||
    clientesQuery.isError ||
    aparelhosQuery.isError ||
    selectedOrdemQuery.isError;
  const cliente = selectedOrdem
    ? clienteById.get(selectedOrdem.clienteId)
    : undefined;
  const aparelho = selectedOrdem
    ? aparelhoById.get(selectedOrdem.aparelhoId)
    : undefined;
  const currentIdx = selectedOrdem
    ? statusFlow.findIndex((status) => status.key === selectedOrdem.status)
    : -1;
  const valorMaoObraAtual = form
    ? Number(form.valorMaoObra.replace(",", ".")) || 0
    : selectedOrdem?.valorMaoObra ?? 0;
  const valorTotalAtual = (selectedOrdem?.valorPecas ?? 0) + valorMaoObraAtual;

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
          icon={Wrench}
          title="Nao foi possivel carregar manutencoes"
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

  if (ordens.length === 0 && !selectedOrdem) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma OS em manutencao"
          description="Abra uma OS ou mova uma ordem existente para o fluxo tecnico."
          actions={
            <Button asChild>
              <Link to="/app/ordens/nova">Nova OS</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Manutencao"
        title={
          selectedOrdem
            ? `OS-${selectedOrdem.numero}`
            : "Fluxo tecnico de OS"
        }
        description="Atualize diagnostico, responsavel, status tecnico e acompanhe as pecas usadas na OS."
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedOrdem && (
              <Button asChild variant="outline">
                <Link to={`/app/ordens/${selectedOrdem.id}`}>
                  <Eye className="h-4 w-4" /> Detalhe
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link
                to={
                  selectedOrdem
                    ? `/app/orcamento?ordemId=${selectedOrdem.id}`
                    : "/app/orcamento"
                }
              >
                <Send className="h-4 w-4" /> Orcamento
              </Link>
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={!form || updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        }
      />

      <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
        <FormField id="manutencao-os" label="Ordem de servico" className="flex-1">
          <Select value={selectedOrdemId} onValueChange={handleSelectOrdem}>
            <SelectTrigger id="manutencao-os">
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
        {selectedOrdem && (
          <div className="flex min-w-[190px] items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
            <StatusBadge status={selectedOrdem.status} />
          </div>
        )}
      </Card>

      {selectedOrdem && form && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="surface-panel p-4">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="mt-1 truncate font-medium">
                {cliente?.nome ?? selectedOrdem.clienteId}
              </p>
            </Card>
            <Card className="surface-panel p-4">
              <p className="text-xs text-muted-foreground">Aparelho</p>
              <p className="mt-1 truncate font-medium">
                {aparelho
                  ? `${aparelho.marca} ${aparelho.modelo}`
                  : selectedOrdem.aparelhoId}
              </p>
            </Card>
            <Card className="surface-panel p-4">
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="mt-1 font-mono text-sm">
                {formatDateTime(selectedOrdem.entradaEm)}
              </p>
            </Card>
            <Card className="surface-panel p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {formatBRL(valorTotalAtual)}
              </p>
            </Card>
          </div>

          <Card className="surface-panel p-5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {statusFlow.map((status, index) => {
                const done = currentIdx >= 0 && index <= currentIdx;
                const active = index === currentIdx;

                return (
                  <div key={status.key} className="flex flex-1 items-center gap-2">
                    <div className="flex min-w-[86px] flex-col items-center gap-1">
                      <div
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground shadow-glow"
                            : done
                              ? "border-success bg-success/20 text-success"
                              : "border-border bg-secondary text-muted-foreground")
                        }
                      >
                        {index + 1}
                      </div>
                      <span
                        className={
                          "text-center text-[10px] font-medium uppercase tracking-wide " +
                          (active
                            ? "text-primary"
                            : done
                              ? "text-foreground"
                              : "text-muted-foreground")
                        }
                      >
                        {status.label}
                      </span>
                    </div>
                    {index < statusFlow.length - 1 && (
                      <div
                        className={
                          "h-0.5 flex-1 " +
                          (index < currentIdx ? "bg-success" : "bg-border")
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <SectionPanel title="Diagnostico tecnico">
                <div className="space-y-4">
                  <FormField id="manutencao-diagnostico" label="Diagnostico">
                    <Textarea
                      id="manutencao-diagnostico"
                      rows={5}
                      value={form.diagnostico}
                      onChange={(event) =>
                        updateForm("diagnostico", event.target.value)
                      }
                      placeholder="Registre a avaliacao tecnica, testes realizados e recomendacao."
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <FormField id="manutencao-status" label="Status">
                      <Select
                        value={form.status}
                        onValueChange={(value) =>
                          updateForm("status", value as OrdemServicoStatus)
                        }
                      >
                        <SelectTrigger id="manutencao-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusFlow.find((item) => item.key === status)
                                ?.label ?? status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField id="manutencao-tecnico" label="Tecnico">
                      <Select
                        value={form.tecnicoResponsavel}
                        onValueChange={(value) =>
                          updateForm("tecnicoResponsavel", value)
                        }
                      >
                        <SelectTrigger id="manutencao-tecnico">
                          <SelectValue placeholder="Atribuir tecnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicoOptions.map((tecnico) => (
                            <SelectItem key={tecnico} value={tecnico}>
                              {tecnico}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField id="manutencao-prioridade" label="Prioridade">
                      <Select
                        value={form.prioridade}
                        onValueChange={(value) =>
                          updateForm("prioridade", value as OrdemServico["prioridade"])
                        }
                      >
                        <SelectTrigger id="manutencao-prioridade">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField id="manutencao-mao-obra" label="Mao de obra">
                      <Input
                        id="manutencao-mao-obra"
                        min="0"
                        step="0.01"
                        type="number"
                        value={form.valorMaoObra}
                        onChange={(event) =>
                          updateForm("valorMaoObra", event.target.value)
                        }
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
                    <FormField id="manutencao-garantia" label="Garantia (dias)">
                      <Input
                        id="manutencao-garantia"
                        min="0"
                        step="1"
                        type="number"
                        value={form.garantiaDias}
                        onChange={(event) =>
                          updateForm("garantiaDias", event.target.value)
                        }
                      />
                    </FormField>
                    <FormField id="manutencao-garantia-obs" label="Observacao da garantia">
                      <Input
                        id="manutencao-garantia-obs"
                        value={form.garantiaObservacoes}
                        onChange={(event) =>
                          updateForm("garantiaObservacoes", event.target.value)
                        }
                        placeholder="Ex.: garantia de 90 dias para tela e mao de obra"
                      />
                    </FormField>
                  </div>
                  {formError && (
                    <p className="text-sm text-destructive">{formError}</p>
                  )}
                </div>
              </SectionPanel>

              <SectionPanel
                title="Pecas e servicos"
                actions={
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/app/ordens/${selectedOrdem.id}`}>
                      <Package className="h-4 w-4" /> Adicionar pecas
                    </Link>
                  </Button>
                }
              >
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Item</th>
                        <th className="px-4 py-3 text-center font-medium">Qtd.</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unitario
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrdem.pecasUsadas ?? []).length === 0 ? (
                        <tr>
                          <td
                            className="px-4 py-5 text-center text-muted-foreground"
                            colSpan={4}
                          >
                            Nenhuma peca vinculada a esta OS.
                          </td>
                        </tr>
                      ) : (
                        selectedOrdem.pecasUsadas.map((peca) => (
                          <tr
                            key={peca.produtoId}
                            className="border-b border-border/40"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{peca.nome}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {peca.sku} - baixa automatica no estoque
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-mono">
                              {peca.quantidade}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatBRL(peca.valorUnitario)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              {formatBRL(peca.valorTotal)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="bg-secondary/20">
                        <td className="px-4 py-3">
                          <div className="font-medium">Mao de obra tecnica</div>
                          <div className="text-xs text-muted-foreground">
                            Servico executado por{" "}
                            {form.tecnicoResponsavel || "tecnico nao definido"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">1</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBRL(valorMaoObraAtual)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatBRL(valorMaoObraAtual)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </SectionPanel>
            </div>

            <SectionPanel title="Linha do tempo">
              <ol className="relative space-y-5 border-l border-border pl-5">
                <li className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-success bg-success" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatDateTime(selectedOrdem.createdAt)}
                  </p>
                  <p className="text-sm font-semibold">OS criada</p>
                  <p className="text-xs text-muted-foreground">
                    Defeito relatado: {selectedOrdem.defeitoRelatado}
                  </p>
                </li>
                {selectedOrdem.diagnostico && (
                  <li className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-primary shadow-glow" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateTime(selectedOrdem.updatedAt)}
                    </p>
                    <p className="text-sm font-semibold">Diagnostico atualizado</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedOrdem.diagnostico}
                    </p>
                  </li>
                )}
                {selectedOrdem.concluidaEm && (
                  <li className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-success bg-success" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateTime(selectedOrdem.concluidaEm)}
                    </p>
                    <p className="text-sm font-semibold">Pronta para retirada</p>
                    <p className="text-xs text-muted-foreground">
                      OS concluida tecnicamente.
                    </p>
                  </li>
                )}
                {(eventosQuery.data ?? []).map((evento) => (
                  <li key={evento.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-primary shadow-glow" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateTime(evento.createdAt)}
                    </p>
                    <p className="text-sm font-semibold">{evento.titulo}</p>
                    {evento.descricao && (
                      <p className="text-xs text-muted-foreground">
                        {evento.descricao}
                      </p>
                    )}
                    {evento.criadoPor && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {evento.criadoPor}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-5 space-y-3">
                <div className="rounded-md border border-border bg-secondary/30 p-3">
                  <FormField id="manutencao-comentario" label="Comentario">
                    <Textarea
                      id="manutencao-comentario"
                      rows={3}
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      placeholder="Registre uma observacao tecnica."
                    />
                  </FormField>
                  {comentarioError && (
                    <p className="mt-2 text-sm text-destructive">
                      {comentarioError}
                    </p>
                  )}
                  <Button
                    className="mt-3 w-full"
                    disabled={comentarioMutation.isPending}
                    type="button"
                    variant="outline"
                    onClick={() => comentarioMutation.mutate()}
                  >
                    {comentarioMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Registrar comentario
                  </Button>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Status atual
                  </p>
                  <StatusBadge status={selectedOrdem.status} />
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/app/checklist?ordemId=${selectedOrdem.id}`}>
                    Checklist da OS
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/app/checklist?ordemId=${selectedOrdem.id}&tipo=saida`}>
                    Checklist de saida
                  </Link>
                </Button>
              </div>
            </SectionPanel>
          </div>
        </>
      )}
    </form>
  );
};

export default Manutencao;
