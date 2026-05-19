import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ClipboardList,
  Eye,
  Kanban,
  LayoutList,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

import {
  DataTable,
  DataTablePagination,
  EmptyState,
  FormField,
  PageHeader,
  type DataTableColumn,
} from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { formatBRL, formatDateShort } from "@/lib/formatters";
import { OS_STATUS_OPTIONS } from "@/constants/status";
import { STALE_TIME } from "@/constants/query";
import { ROUTES } from "@/constants/routes";
import { listAparelhos, type Aparelho } from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";
import {
  deleteOrdemServico,
  listOrdensServico,
  updateOrdemServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

const STATUS_KANBAN: OrdemServicoStatus[] = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

const STATUS_KANBAN_LABELS: Record<OrdemServicoStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  aguardando_aprovacao: "Ag. aprovação",
  aguardando_peca: "Ag. peça",
  em_manutencao: "Em manutenção",
  pronto_para_retirada: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_KANBAN_COLORS: Record<OrdemServicoStatus, string> = {
  recebido: "border-t-blue-500",
  em_analise: "border-t-violet-500",
  aguardando_aprovacao: "border-t-amber-500",
  aguardando_peca: "border-t-orange-500",
  em_manutencao: "border-t-primary",
  pronto_para_retirada: "border-t-emerald-500",
  entregue: "border-t-success",
  cancelado: "border-t-destructive",
};

const STATUS_NEXT: Partial<Record<OrdemServicoStatus, OrdemServicoStatus[]>> = {
  recebido: ["em_analise", "cancelado"],
  em_analise: [
    "aguardando_aprovacao",
    "aguardando_peca",
    "em_manutencao",
    "cancelado",
  ],
  aguardando_aprovacao: ["em_manutencao", "cancelado"],
  aguardando_peca: ["em_manutencao", "cancelado"],
  em_manutencao: ["pronto_para_retirada", "cancelado"],
  pronto_para_retirada: ["entregue"],
};

const formatPrazo = (valor?: string, status?: string) => {
  if (!valor || ["entregue", "cancelado"].includes(status ?? ""))
    return { label: "-", classe: "" };
  const prazo = new Date(valor);
  prazo.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((prazo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0)
    return {
      label: `Atrasada ${Math.abs(diff)}d`,
      classe: "text-red-500 font-medium",
    };
  if (diff === 0)
    return { label: "Vence hoje", classe: "text-amber-500 font-medium" };
  if (diff === 1) return { label: "Amanhã", classe: "text-amber-400" };
  if (diff <= 3) return { label: `${diff} dias`, classe: "text-amber-400" };
  return { label: `${diff} dias`, classe: "text-muted-foreground" };
};

type OrdemRow = OrdemServico & {
  cliente?: Cliente;
  aparelho?: Aparelho;
};

const Ordens = () => {
  const [urlParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(urlParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<
    OrdemServicoStatus | "todos"
  >((urlParams.get("status") as OrdemServicoStatus) ?? "todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState<
    "todos" | "baixa" | "normal" | "urgente"
  >("todos");
  const [tecnicoFilter, setTecnicoFilter] = useState("todos");
  const [atrasoFilter, setAtrasoFilter] = useState<"todos" | "atrasadas">(
    urlParams.get("atraso") === "atrasadas" ? "atrasadas" : "todos",
  );
  const [viewMode, setViewMode] = useState<"tabela" | "kanban">(
    () =>
      (localStorage.getItem("rr-ordens-view") as "tabela" | "kanban") ??
      "tabela",
  );
  const [density, setDensity] = useState<"default" | "compact">(
    () =>
      (localStorage.getItem("rr-ordens-density") as "default" | "compact") ??
      "default",
  );
  const [deleteTarget, setDeleteTarget] = useState<OrdemServico | null>(null);

  const changeView = (v: "tabela" | "kanban") => {
    setViewMode(v);
    localStorage.setItem("rr-ordens-view", v);
  };

  const changeDensity = (d: "default" | "compact") => {
    setDensity(d);
    localStorage.setItem("rr-ordens-density", d);
  };

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

  const mudarStatusMutation = useMutation({
    mutationFn: ({
      ordem,
      novoStatus,
    }: {
      ordem: OrdemServico;
      novoStatus: OrdemServicoStatus;
    }) =>
      updateOrdemServico(ordem.id, {
        clienteId: ordem.clienteId,
        aparelhoId: ordem.aparelhoId,
        defeitoRelatado: ordem.defeitoRelatado,
        diagnostico: ordem.diagnostico,
        status: novoStatus,
        prioridade: ordem.prioridade,
        tecnicoResponsavel: ordem.tecnicoResponsavel,
        pecasUsadas: ordem.pecasUsadas?.map((p) => ({
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
        })),
        valorMaoObra: ordem.valorMaoObra,
        entradaEm: ordem.entradaEm,
        previsaoEntregaEm: ordem.previsaoEntregaEm,
      }),
    onSuccess: (_, { novoStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success(
        `Status atualizado para "${STATUS_KANBAN_LABELS[novoStatus]}".`,
      );
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const excluirOsMutation = useMutation({
    mutationFn: (id: string) => deleteOrdemServico(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success(`OS-${deleteTarget?.numero} excluída.`);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Não foi possível excluir a OS."),
  });

  const clienteById = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c])),
    [clientesQuery.data],
  );

  const aparelhoById = useMemo(
    () => new Map((aparelhosQuery.data ?? []).map((a) => [a.id, a])),
    [aparelhosQuery.data],
  );

  const ordens = useMemo<OrdemRow[]>(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (ordensQuery.data ?? [])
      .map((ordem) => ({
        ...ordem,
        cliente: clienteById.get(ordem.clienteId),
        aparelho: aparelhoById.get(ordem.aparelhoId),
      }))
      .filter((ordem) => {
        if (statusFilter !== "todos" && ordem.status !== statusFilter)
          return false;
        if (
          prioridadeFilter !== "todos" &&
          ordem.prioridade !== prioridadeFilter
        )
          return false;
        if (
          tecnicoFilter !== "todos" &&
          (ordem.tecnicoResponsavel ?? "nao_atribuido") !== tecnicoFilter
        )
          return false;
        if (atrasoFilter === "atrasadas") {
          const prazo = ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm;
          const dataPrazo = prazo ? new Date(prazo) : null;
          if (
            !dataPrazo ||
            dataPrazo >= today ||
            ["entregue", "cancelado"].includes(ordem.status)
          )
            return false;
        }
        if (!normalizedSearch) return true;
        return [
          String(ordem.numero),
          ordem.defeitoRelatado,
          ordem.diagnostico,
          ordem.tecnicoResponsavel,
          ordem.cliente?.nome,
          ordem.cliente?.telefone,
          ordem.aparelho?.marca,
          ordem.aparelho?.modelo,
          ordem.aparelho?.imeiSerial,
        ]
          .filter(Boolean)
          .some((v) => v?.toLowerCase().includes(normalizedSearch));
      });
  }, [
    aparelhoById,
    atrasoFilter,
    clienteById,
    ordensQuery.data,
    prioridadeFilter,
    search,
    statusFilter,
    tecnicoFilter,
  ]);

  const tecnicos = useMemo(
    () =>
      Array.from(
        new Set(
          (ordensQuery.data ?? []).map(
            (o) => o.tecnicoResponsavel ?? "nao_atribuido",
          ),
        ),
      ),
    [ordensQuery.data],
  );

  const StatusDropdown = ({ ordem }: { ordem: OrdemServico }) => {
    const proximos = STATUS_NEXT[ordem.status] ?? [];
    if (proximos.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Mudar status"
            disabled={mudarStatusMutation.isPending}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">
            Mudar status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {proximos.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() =>
                mudarStatusMutation.mutate({ ordem, novoStatus: s })
              }
            >
              {STATUS_KANBAN_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns: DataTableColumn<OrdemRow>[] = [
    {
      key: "numero",
      header: "OS",
      cell: (o) => (
        <span className="font-mono text-xs text-primary">OS-{o.numero}</span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (o) => (
        <div>
          <div className="font-medium">{o.cliente?.nome ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {o.cliente?.telefone ?? o.clienteId}
          </div>
        </div>
      ),
    },
    {
      key: "aparelho",
      header: "Aparelho",
      cell: (o) => (
        <div>
          <div className="font-medium">
            {o.aparelho ? `${o.aparelho.marca} ${o.aparelho.modelo}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {o.aparelho?.imeiSerial
              ? `IMEI ${o.aparelho.imeiSerial}`
              : o.aparelhoId}
          </div>
        </div>
      ),
    },
    {
      key: "defeito",
      header: "Defeito",
      className: "max-w-[220px] truncate text-muted-foreground",
      cell: (o) => <span title={o.defeitoRelatado}>{o.defeitoRelatado}</span>,
    },
    {
      key: "prioridade",
      header: "Prioridade",
      cell: (o) => (
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium",
            o.prioridade === "urgente"
              ? "bg-destructive/10 text-destructive"
              : o.prioridade === "baixa"
                ? "bg-secondary text-muted-foreground"
                : "bg-primary/10 text-primary",
          )}
        >
          {o.prioridade}
        </span>
      ),
    },
    {
      key: "tecnico",
      header: "Técnico",
      className: "text-muted-foreground",
      cell: (o) => o.tecnicoResponsavel ?? "Não atribuído",
    },
    {
      key: "entrada",
      header: "Entrada",
      className: "font-mono text-xs",
      cell: (o) => formatDateShort(o.entradaEm),
    },
    {
      key: "previsao",
      header: "Prazo",
      className: "text-xs",
      cell: (o) => {
        const { label, classe } = formatPrazo(
          o.prazoPrometidoEm ?? o.previsaoEntregaEm,
          o.status,
        );
        return <span className={cn("font-mono", classe)}>{label}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (o) => formatBRL(o.valorTotal),
    },
    {
      key: "actions",
      header: "Ações",
      headerClassName: "text-right",
      cell: (o) => (
        <div className="flex justify-end gap-1">
          <StatusDropdown ordem={o} />
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="Detalhes"
            className="h-7 w-7"
          >
            <Link to={ROUTES.ordemDetalhe(o.id)}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="Checklist"
            className="h-7 w-7"
          >
            <Link to={ROUTES.checklistOS(o.id)}>
              <ClipboardCheck className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="Manutenção"
            className="h-7 w-7"
          >
            <Link to={ROUTES.manutencaoOS(o.id)}>
              <Wrench className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Excluir OS"
            onClick={() => setDeleteTarget(o)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {o.cliente?.telefone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              title={`WhatsApp — ${o.cliente.telefone}`}
              onClick={() => {
                const tel = o.cliente!.telefone.replace(/\D/g, "");
                window.open(
                  `https://wa.me/${tel.startsWith("55") ? tel : `55${tel}`}`,
                  "_blank",
                );
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading;
  const isError =
    ordensQuery.isError || clientesQuery.isError || aparelhosQuery.isError;

  const rowClass = density === "compact" ? "[&_td]:py-1.5 [&_th]:py-2" : "";

  return (
    <>
      {/* Dialog: confirmar exclusão de OS */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir ordem de serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a{" "}
              <span className="font-semibold text-foreground">
                OS-{deleteTarget?.numero}
              </span>
              ?
              {deleteTarget?.clienteId &&
                clienteById.get(deleteTarget.clienteId)?.nome && (
                  <> — {clienteById.get(deleteTarget.clienteId)?.nome}</>
                )}
              <br />
              <span className="text-destructive">
                Essa ação não poderá ser desfeita.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={excluirOsMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={excluirOsMutation.isPending}
                onClick={() =>
                  deleteTarget && excluirOsMutation.mutate(deleteTarget.id)
                }
              >
                {excluirOsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir OS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <PageHeader
          eyebrow="Operação"
          title="Ordens de serviço"
          description="Listagem real das OS abertas, em manutenção, prontas e entregues."
          actions={
            <div className="flex items-center gap-2">
              {/* Toggle compacto */}
              <div className="hidden md:flex items-center rounded-md border border-border bg-secondary/40 p-0.5">
                <button
                  type="button"
                  title="Modo padrão"
                  onClick={() => changeDensity("default")}
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    density === "default"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Padrão
                </button>
                <button
                  type="button"
                  title="Modo compacto"
                  onClick={() => changeDensity("compact")}
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    density === "compact"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Compacto
                </button>
              </div>
              {/* Toggle tabela/kanban */}
              <div className="flex items-center rounded-md border border-border bg-secondary/40 p-0.5">
                <button
                  type="button"
                  onClick={() => changeView("tabela")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors",
                    viewMode === "tabela"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" /> Tabela
                </button>
                <button
                  type="button"
                  onClick={() => changeView("kanban")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors",
                    viewMode === "kanban"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Kanban className="h-3.5 w-3.5" /> Kanban
                </button>
              </div>
              <Button
                asChild
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <Link to={ROUTES.novaOS}>
                  <Plus className="h-4 w-4" /> Nova OS
                </Link>
              </Button>
            </div>
          }
        />

        {/* Filtros */}
        <div className="surface-panel flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
          <FormField
            id="ordens-search"
            label="Buscar ordem"
            className="min-w-[240px] flex-1"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ordens-search"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por OS, cliente, IMEI ou aparelho..."
              />
            </div>
          </FormField>
          <FormField
            id="ordens-status"
            label="Status"
            className="min-w-[220px]"
          >
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as OrdemServicoStatus | "todos")
              }
            >
              <SelectTrigger id="ordens-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OS_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="ordens-prioridade"
            label="Prioridade"
            className="min-w-[160px]"
          >
            <Select
              value={prioridadeFilter}
              onValueChange={(v) =>
                setPrioridadeFilter(v as typeof prioridadeFilter)
              }
            >
              <SelectTrigger id="ordens-prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="ordens-tecnico"
            label="Técnico"
            className="min-w-[160px]"
          >
            <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
              <SelectTrigger id="ordens-tecnico">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "nao_atribuido" ? "Não atribuído" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="ordens-atraso"
            label="Atraso"
            className="min-w-[140px]"
          >
            <Select
              value={atrasoFilter}
              onValueChange={(v) => setAtrasoFilter(v as typeof atrasoFilter)}
            >
              <SelectTrigger id="ordens-atraso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <Card className="surface-panel p-4">
              <div className="flex gap-3">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-36" />
              </div>
            </Card>
            <Card className="surface-panel p-2">
              <div className="space-y-1">
                <Skeleton className="h-10 w-full rounded-md" />
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            </Card>
          </div>
        ) : isError ? (
          <Card className="surface-panel">
            <EmptyState
              icon={ClipboardList}
              title="Não foi possível carregar ordens"
              description="Verifique se o backend está rodando."
              actions={
                <Button
                  variant="outline"
                  onClick={() => {
                    ordensQuery.refetch();
                    clientesQuery.refetch();
                    aparelhosQuery.refetch();
                  }}
                >
                  Tentar novamente
                </Button>
              }
            />
          </Card>
        ) : viewMode === "tabela" ? (
          <DataTable
            className={cn(
              "surface-panel rounded-lg border border-border",
              rowClass,
            )}
            columns={columns}
            data={ordens}
            getRowKey={(o) => o.id}
            emptyState={
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma ordem encontrada"
                description="Ajuste a busca ou crie uma nova ordem de serviço."
                actions={
                  <Button asChild>
                    <Link to={ROUTES.novaOS}>Nova OS</Link>
                  </Button>
                }
              />
            }
            footer={
              <>
                <span>
                  Mostrando {ordens.length} de {ordensQuery.data?.length ?? 0}{" "}
                  ordens
                </span>
                <DataTablePagination currentPage={1} totalPages={1} />
              </>
            }
          />
        ) : (
          /* ── Kanban ───────────────────────────────────────────────── */
          <div className="overflow-x-auto pb-4">
            <div
              className="flex gap-4"
              style={{ minWidth: `${STATUS_KANBAN.length * 280}px` }}
            >
              {STATUS_KANBAN.map((status) => {
                const colOrdens = ordens.filter((o) => o.status === status);
                return (
                  <div
                    key={status}
                    className="flex w-[268px] shrink-0 flex-col gap-2"
                  >
                    {/* Cabeçalho da coluna */}
                    <div
                      className={cn(
                        "surface-panel rounded-lg border-t-2 px-3 py-2",
                        STATUS_KANBAN_COLORS[status],
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {STATUS_KANBAN_LABELS[status]}
                        </span>
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-secondary px-1.5 font-mono text-[10px] font-bold text-muted-foreground">
                          {colOrdens.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {colOrdens.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                          Nenhuma OS
                        </div>
                      ) : (
                        colOrdens.map((ordem) => {
                          const prazoInfo = formatPrazo(
                            ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm,
                            ordem.status,
                          );
                          const proximos = STATUS_NEXT[status] ?? [];
                          return (
                            <Card
                              key={ordem.id}
                              className="surface-panel overflow-hidden p-0 hover:shadow-lg transition-shadow"
                            >
                              <div className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <Link
                                      to={ROUTES.ordemDetalhe(ordem.id)}
                                      className="font-mono text-xs font-bold text-primary hover:underline"
                                    >
                                      OS-{ordem.numero}
                                    </Link>
                                    <p className="text-sm font-medium leading-tight mt-0.5">
                                      {ordem.cliente?.nome ?? "—"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {ordem.aparelho
                                        ? `${ordem.aparelho.marca} ${ordem.aparelho.modelo}`
                                        : "—"}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                      ordem.prioridade === "urgente"
                                        ? "bg-destructive/10 text-destructive"
                                        : ordem.prioridade === "baixa"
                                          ? "bg-secondary text-muted-foreground"
                                          : "bg-primary/10 text-primary",
                                    )}
                                  >
                                    {ordem.prioridade}
                                  </span>
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {ordem.defeitoRelatado}
                                </p>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                                  <span
                                    className={cn(
                                      "font-mono text-[10px]",
                                      prazoInfo.classe,
                                    )}
                                  >
                                    {prazoInfo.label}
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    {proximos.length > 0 && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            disabled={
                                              mudarStatusMutation.isPending
                                            }
                                          >
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel className="text-xs">
                                            Mover para
                                          </DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          {proximos.map((s) => (
                                            <DropdownMenuItem
                                              key={s}
                                              onClick={() =>
                                                mudarStatusMutation.mutate({
                                                  ordem,
                                                  novoStatus: s,
                                                })
                                              }
                                            >
                                              {STATUS_KANBAN_LABELS[s]}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      asChild
                                      title="Detalhes"
                                    >
                                      <Link to={ROUTES.ordemDetalhe(ordem.id)}>
                                        <Eye className="h-3 w-3" />
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      asChild
                                      title="Manutenção"
                                    >
                                      <Link to={ROUTES.manutencaoOS(ordem.id)}>
                                        <Wrench className="h-3 w-3" />
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Ordens;
