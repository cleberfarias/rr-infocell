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
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  EmptyState,
  FormField,
  PageHeader,
  SectionPanel,
} from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, formatDateTimeShort } from "@/lib/formatters";
import { OS_STATUS_LABELS } from "@/constants/status";
import { STALE_TIME } from "@/constants/query";
import { GARANTIA_DIAS_PADRAO } from "@/constants/business";
import { ROUTES } from "@/constants/routes";
import { listAparelhos, type Aparelho } from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";
import {
  getOrdemServico,
  listOrdensServico,
  updateOrdemServico,
  type OrdemServico,
  type OrdemServicoStatus,
  type TipoSenhaAparelho,
} from "@/services/ordens-servico";
import { createOrdemEvento, listOrdemEventos } from "@/services/ordem-eventos";
import { toast } from "@/components/ui/sonner";
import { listTecnicos } from "@/services/usuarios";

type ManutencaoForm = {
  diagnostico: string;
  status: OrdemServicoStatus;
  prioridade: OrdemServico["prioridade"];
  tecnicoResponsavel: string;
  valorMaoObra: string;
  maoObraInclusa: string;
  garantiaDias: string;
  garantiaObservacoes: string;
  tipoSenha: TipoSenhaAparelho;
  senhaAparelho: string;
  padraoDeSenha: string;
};

const statusFlow: Array<{ key: OrdemServicoStatus; label: string }> = (
  Object.entries(OS_STATUS_LABELS) as Array<[OrdemServicoStatus, string]>
)
  .filter(([key]) => key !== "cancelado")
  .map(([key, label]) => ({ key, label }));

const maintenanceStatuses: OrdemServicoStatus[] = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

const buildForm = (ordem: OrdemServico): ManutencaoForm => ({
  diagnostico: ordem.diagnostico ?? "",
  status: ordem.status,
  prioridade: ordem.prioridade ?? "normal",
  tecnicoResponsavel: ordem.tecnicoResponsavel ?? "",
  valorMaoObra: String(ordem.valorMaoObra),
  maoObraInclusa: "",
  garantiaDias: String(ordem.garantiaDias ?? GARANTIA_DIAS_PADRAO),
  garantiaObservacoes: ordem.garantiaObservacoes ?? "",
  tipoSenha: ordem.tipoSenha ?? "nao_informou",
  senhaAparelho: ordem.senhaAparelho ?? "",
  padraoDeSenha: ordem.padraoDeSenha ?? "",
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
  const navigate = useNavigate();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [form, setForm] = useState<ManutencaoForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [comentarioError, setComentarioError] = useState<string | null>(null);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico"],
    queryFn: () => listOrdensServico(),
    staleTime: STALE_TIME.short,
    refetchOnWindowFocus: false,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(""),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos"],
    queryFn: () => listAparelhos(),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const tecnicosQuery = useQuery({
    queryKey: ["usuarios", "tecnicos"],
    queryFn: listTecnicos,
    staleTime: STALE_TIME.long,
    refetchOnWindowFocus: false,
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

  const tecnicoOptions = useMemo(() => {
    const tecnicos = (tecnicosQuery.data ?? [])
      .map((tecnico) => tecnico.displayName || tecnico.email)
      .filter((nome): nome is string => Boolean(nome));

    if (
      form?.tecnicoResponsavel &&
      !tecnicos.includes(form.tecnicoResponsavel)
    ) {
      return [...tecnicos, form.tecnicoResponsavel];
    }

    return tecnicos;
  }, [form?.tecnicoResponsavel, tecnicosQuery.data]);

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
        tipoSenha: input.tipoSenha,
        senhaAparelho: input.tipoSenha === "numerica" ? input.senhaAparelho || undefined : undefined,
        padraoDeSenha: input.tipoSenha === "padrao" ? input.padraoDeSenha || undefined : undefined,
      });
    },
    onSuccess: async (ordem, input) => {
      await createOrdemEvento({
        ordemServicoId: ordem.id,
        tipo: "diagnostico",
        titulo: "Manutenção atualizada",
        descricao: `Status: ${input.status}. Diagnóstico: ${
          input.diagnostico || "não informado"
        }`,
        criadoPor: input.tecnicoResponsavel || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({
          queryKey: ["ordem-servico", ordem.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] }),
      ]);

      if (input.status === "aguardando_aprovacao") {
        toast.success("OS enviada para orçamento. Aguardando aprovação do cliente.");
        navigate(ROUTES.orcamentoOS(ordem.id));
        return;
      }

      if (input.status === "pronto_para_retirada") {
        toast.success("Aparelho pronto para retirada! Imprima o Termo de Garantia.");
        navigate(ROUTES.ordemDetalhe(ordem.id));
        return;
      }

      toast.success("Manutenção atualizada.");
      setSelectedOrdemId(ordem.id);
      setForm(buildForm(ordem));
      setFormError(null);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Não foi possível atualizar a manutenção.";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const comentarioMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      if (!comentario.trim()) {
        throw new Error("Informe o comentário.");
      }

      return createOrdemEvento({
        ordemServicoId: selectedOrdem.id,
        tipo: "comentario",
        titulo: "Comentário técnico",
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
          : "Não foi possível registrar o comentário.",
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
    : (selectedOrdem?.valorMaoObra ?? 0);
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
          title="Não foi possível carregar manutenções"
          description="Verifique se o backend está rodando e tente novamente."
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
          title="Nenhuma OS em manutenção"
          description="Abra uma OS ou mova uma ordem existente para o fluxo técnico."
          actions={
            <Button asChild>
              <Link to={ROUTES.novaOS}>Nova OS</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Manutenção"
        title={
          selectedOrdem ? `OS-${selectedOrdem.numero}` : "Fluxo técnico de OS"
        }
        description="Atualize diagnóstico, responsável, status técnico e acompanhe as peças usadas na OS."
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedOrdem && (
              <Button asChild variant="outline">
                <Link to={ROUTES.ordemDetalhe(selectedOrdem.id)}>
                  <Eye className="h-4 w-4" /> Detalhe
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link
                to={
                  selectedOrdem
                    ? ROUTES.orcamentoOS(selectedOrdem.id)
                    : ROUTES.orcamento
                }
              >
                <Send className="h-4 w-4" /> Orçamento
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
        <FormField
          id="manutencao-os"
          label="Ordem de serviço"
          className="flex-1"
        >
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
                {formatDateTimeShort(selectedOrdem.entradaEm)}
              </p>
            </Card>
            <Card className="surface-panel p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {formatBRL(valorTotalAtual)}
              </p>
            </Card>
          </div>

          {selectedOrdem.tipoSenha && selectedOrdem.tipoSenha !== "sem_senha" && (
            <Card className="border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Senha do aparelho — uso interno
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-amber-400">
                {selectedOrdem.tipoSenha === "numerica"
                  ? (selectedOrdem.senhaAparelho ?? "—")
                  : selectedOrdem.tipoSenha === "padrao"
                    ? (selectedOrdem.padraoDeSenha ?? "—")
                    : "Cliente não informou"}
              </p>
            </Card>
          )}

          <Card className="surface-panel p-5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {statusFlow.map((status, index) => {
                const done = currentIdx >= 0 && index <= currentIdx;
                const active = index === currentIdx;

                return (
                  <div
                    key={status.key}
                    className="flex flex-1 items-center gap-2"
                  >
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
              <SectionPanel title="Diagnóstico técnico">
                <div className="space-y-4">
                  <FormField id="manutencao-diagnostico" label="Diagnóstico">
                    <Textarea
                      id="manutencao-diagnostico"
                      rows={5}
                      value={form.diagnostico}
                      onChange={(event) =>
                        updateForm("diagnostico", event.target.value)
                      }
                      placeholder="Registre a avaliação técnica, testes realizados e recomendação."
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
                    <FormField id="manutencao-tecnico" label="Técnico">
                      <Select
                        value={form.tecnicoResponsavel}
                        onValueChange={(value) =>
                          updateForm("tecnicoResponsavel", value)
                        }
                        disabled={
                          tecnicosQuery.isLoading || tecnicoOptions.length === 0
                        }
                      >
                        <SelectTrigger id="manutencao-tecnico">
                          <SelectValue
                            placeholder={
                              tecnicosQuery.isLoading
                                ? "Carregando técnicos"
                                : tecnicoOptions.length > 0
                                  ? "Atribuir técnico"
                                  : "Nenhum técnico cadastrado"
                            }
                          />
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
                          updateForm(
                            "prioridade",
                            value as OrdemServico["prioridade"],
                          )
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
                    <FormField id="manutencao-mao-obra" label="Mão de obra">
                      <Input
                        id="manutencao-mao-obra"
                        min="0"
                        step="0.01"
                        type="number"
                        value={form.valorMaoObra}
                        disabled={!!form.maoObraInclusa}
                        onChange={(event) =>
                          updateForm("valorMaoObra", event.target.value)
                        }
                      />
                      <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={!!form.maoObraInclusa}
                          onCheckedChange={(checked) => {
                            updateForm("maoObraInclusa", checked ? "1" : "");
                            if (checked) updateForm("valorMaoObra", "0");
                          }}
                        />
                        Inclusa na peça (não cobra à parte)
                      </label>
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
                    <FormField
                      id="manutencao-garantia-obs"
                      label="Observação da garantia"
                    >
                      <Input
                        id="manutencao-garantia-obs"
                        value={form.garantiaObservacoes}
                        onChange={(event) =>
                          updateForm("garantiaObservacoes", event.target.value)
                        }
                        placeholder="Ex.: garantia de 90 dias para tela e mão de obra"
                      />
                    </FormField>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Senha do aparelho
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["sem_senha", "numerica", "padrao", "nao_informou"] as TipoSenhaAparelho[]).map((tipo) => {
                        const labels: Record<TipoSenhaAparelho, string> = {
                          sem_senha: "Sem senha",
                          numerica: "Numérica",
                          padrao: "Padrão/desenho",
                          nao_informou: "Não informou",
                        };
                        return (
                          <label key={tipo} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${form.tipoSenha === tipo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            <input
                              type="radio"
                              className="hidden"
                              checked={form.tipoSenha === tipo}
                              onChange={() => updateForm("tipoSenha", tipo)}
                            />
                            {labels[tipo]}
                          </label>
                        );
                      })}
                    </div>
                    {form.tipoSenha === "numerica" && (
                      <Input
                        className="mt-2"
                        inputMode="numeric"
                        placeholder="Digite a senha numérica"
                        value={form.senhaAparelho}
                        onChange={(e) => updateForm("senhaAparelho", e.target.value)}
                      />
                    )}
                    {form.tipoSenha === "padrao" && (
                      <Input
                        className="mt-2"
                        placeholder="Ex.: 1 → 5 → 9"
                        value={form.padraoDeSenha}
                        onChange={(e) => updateForm("padraoDeSenha", e.target.value)}
                      />
                    )}
                  </div>

                  {formError && (
                    <p className="text-sm text-destructive">{formError}</p>
                  )}
                </div>
              </SectionPanel>

              <SectionPanel
                title="Peças e serviços"
                actions={
                  <Button asChild variant="outline" size="sm">
                    <Link to={ROUTES.ordemDetalhe(selectedOrdem.id)}>
                      <Package className="h-4 w-4" /> Adicionar peças
                    </Link>
                  </Button>
                }
              >
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          Qtd.
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unitário
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
                            Nenhuma peça vinculada a esta OS.
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
                                {peca.sku} - baixa automática no estoque
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
                          <div className="font-medium">Mão de obra técnica</div>
                          <div className="text-xs text-muted-foreground">
                            Serviço executado por{" "}
                            {form.tecnicoResponsavel || "técnico não definido"}
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
                    {formatDateTimeShort(selectedOrdem.createdAt)}
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
                      {formatDateTimeShort(selectedOrdem.updatedAt)}
                    </p>
                    <p className="text-sm font-semibold">
                      Diagnóstico atualizado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedOrdem.diagnostico}
                    </p>
                  </li>
                )}
                {selectedOrdem.concluidaEm && (
                  <li className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-success bg-success" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateTimeShort(selectedOrdem.concluidaEm)}
                    </p>
                    <p className="text-sm font-semibold">
                      Pronta para retirada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      OS concluída tecnicamente.
                    </p>
                  </li>
                )}
                {(eventosQuery.data ?? []).map((evento) => (
                  <li key={evento.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-primary shadow-glow" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateTimeShort(evento.createdAt)}
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
                  <FormField id="manutencao-comentario" label="Comentário">
                    <Textarea
                      id="manutencao-comentario"
                      rows={3}
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      placeholder="Registre uma observação técnica."
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
                    Registrar comentário
                  </Button>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Status atual
                  </p>
                  <StatusBadge status={selectedOrdem.status} />
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to={ROUTES.checklistOS(selectedOrdem.id)}>
                    Checklist da OS
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link
                    to={ROUTES.checklistSaida(selectedOrdem.id)}
                  >
                    Checklist de saída
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
