import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ClipboardList,
  Eye,
  MessageCircle,
  Plus,
  Search,
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatDateShort } from "@/lib/formatters";
import { OS_STATUS_OPTIONS } from "@/constants/status";
import { STALE_TIME } from "@/constants/query";
import { ROUTES } from "@/constants/routes";
import { listAparelhos, type Aparelho } from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

const formatPrazo = (valor?: string, status?: string) => {
  if (!valor || ["entregue", "cancelado"].includes(status ?? "")) return { label: "-", classe: "" };
  const prazo = new Date(valor);
  prazo.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((prazo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { label: `Atrasada ${Math.abs(diff)}d`, classe: "text-red-500 font-medium" };
  if (diff === 0) return { label: "Vence hoje", classe: "text-amber-500 font-medium" };
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
  const [search, setSearch] = useState(urlParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<OrdemServicoStatus | "todos">(
    (urlParams.get("status") as OrdemServicoStatus) ?? "todos",
  );
  const [prioridadeFilter, setPrioridadeFilter] = useState<"todos" | "baixa" | "normal" | "urgente">("todos");
  const [tecnicoFilter, setTecnicoFilter] = useState("todos");
  const [atrasoFilter, setAtrasoFilter] = useState<"todos" | "atrasadas">(
    urlParams.get("atraso") === "atrasadas" ? "atrasadas" : "todos",
  );

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
        if (statusFilter !== "todos" && ordem.status !== statusFilter) return false;
        if (prioridadeFilter !== "todos" && ordem.prioridade !== prioridadeFilter) return false;
        if (tecnicoFilter !== "todos" && (ordem.tecnicoResponsavel ?? "nao_atribuido") !== tecnicoFilter) return false;

        if (atrasoFilter === "atrasadas") {
          const prazo = ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm;
          const dataPrazo = prazo ? new Date(prazo) : null;
          const atrasada =
            dataPrazo &&
            dataPrazo < today &&
            !["entregue", "cancelado"].includes(ordem.status);
          if (!atrasada) return false;
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
          .some((value) => value?.toLowerCase().includes(normalizedSearch));
      });
  }, [aparelhoById, atrasoFilter, clienteById, ordensQuery.data, prioridadeFilter, search, statusFilter, tecnicoFilter]);

  const tecnicos = useMemo(
    () =>
      Array.from(
        new Set((ordensQuery.data ?? []).map((ordem) => ordem.tecnicoResponsavel ?? "nao_atribuido")),
      ),
    [ordensQuery.data],
  );

  const columns: DataTableColumn<OrdemRow>[] = [
    {
      key: "numero",
      header: "OS",
      cell: (ordem) => (
        <span className="font-mono text-xs text-primary">
          OS-{ordem.numero}
        </span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (ordem) => (
        <div>
          <div className="font-medium">
            {ordem.cliente?.nome ?? "Cliente não encontrado"}
          </div>
          <div className="text-xs text-muted-foreground">
            {ordem.cliente?.telefone ?? ordem.clienteId}
          </div>
        </div>
      ),
    },
    {
      key: "aparelho",
      header: "Aparelho",
      cell: (ordem) => (
        <div>
          <div className="font-medium">
            {ordem.aparelho
              ? `${ordem.aparelho.marca} ${ordem.aparelho.modelo}`
              : "Aparelho não encontrado"}
          </div>
          <div className="text-xs text-muted-foreground">
            {ordem.aparelho?.imeiSerial
              ? `IMEI ${ordem.aparelho.imeiSerial}`
              : ordem.aparelhoId}
          </div>
        </div>
      ),
    },
    {
      key: "defeito",
      header: "Defeito",
      className: "max-w-[220px] truncate text-muted-foreground",
      cell: (ordem) => (
        <span title={ordem.defeitoRelatado}>{ordem.defeitoRelatado}</span>
      ),
    },
    {
      key: "prioridade",
      header: "Prioridade",
      cell: (ordem) => (
        <span className={
          "rounded-md px-2 py-1 text-xs font-medium " +
          (ordem.prioridade === "urgente"
            ? "bg-destructive/10 text-destructive"
            : ordem.prioridade === "baixa"
              ? "bg-secondary text-muted-foreground"
              : "bg-primary/10 text-primary")
        }>
          {ordem.prioridade}
        </span>
      ),
    },
    {
      key: "tecnico",
      header: "Técnico",
      className: "text-muted-foreground",
      cell: (ordem) => ordem.tecnicoResponsavel ?? "Não atribuído",
    },
    {
      key: "entrada",
      header: "Entrada",
      className: "font-mono text-xs",
      cell: (ordem) => formatDateShort(ordem.entradaEm),
    },
    {
      key: "previsao",
      header: "Prazo",
      className: "text-xs",
      cell: (ordem) => {
        const prazo = ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm;
        const { label, classe } = formatPrazo(prazo, ordem.status);
        return <span className={cn("font-mono", classe)}>{label}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (ordem) => <StatusBadge status={ordem.status} />,
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (ordem) => formatBRL(ordem.valorTotal),
    },
    {
      key: "actions",
      header: "Ações",
      headerClassName: "text-right",
      cell: (ordem) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" asChild title="Detalhes">
            <Link to={ROUTES.ordemDetalhe(ordem.id)}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Checklist">
            <Link to={ROUTES.checklistOS(ordem.id)}>
              <ClipboardCheck className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Manutenção">
            <Link to={ROUTES.manutencaoOS(ordem.id)}>
              <Wrench className="h-4 w-4" />
            </Link>
          </Button>
          {ordem.cliente?.telefone && (
            <Button
              variant="ghost"
              size="icon"
              title={`WhatsApp — ${ordem.cliente.telefone}`}
              className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => {
                const tel = ordem.cliente!.telefone.replace(/\D/g, "");
                const fone = tel.startsWith("55") ? tel : `55${tel}`;
                window.open(`https://wa.me/${fone}`, "_blank");
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operação"
        title="Ordens de serviço"
        description="Listagem real das OS abertas, em manutenção, prontas e entregues."
        actions={
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Link to={ROUTES.novaOS}>
              <Plus className="h-4 w-4" /> Nova OS
            </Link>
          </Button>
        }
      />

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por OS, cliente, IMEI ou aparelho..."
            />
          </div>
        </FormField>
        <FormField id="ordens-status" label="Status" className="min-w-[220px]">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as OrdemServicoStatus | "todos")
            }
          >
            <SelectTrigger id="ordens-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OS_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="ordens-prioridade" label="Prioridade" className="min-w-[180px]">
          <Select
            value={prioridadeFilter}
            onValueChange={(value) =>
              setPrioridadeFilter(value as typeof prioridadeFilter)
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
        <FormField id="ordens-tecnico" label="Técnico" className="min-w-[180px]">
          <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
            <SelectTrigger id="ordens-tecnico">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tecnicos.map((tecnico) => (
                <SelectItem key={tecnico} value={tecnico}>
                  {tecnico === "nao_atribuido" ? "Não atribuído" : tecnico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="ordens-atraso" label="Atraso" className="min-w-[160px]">
          <Select
            value={atrasoFilter}
            onValueChange={(value) => setAtrasoFilter(value as typeof atrasoFilter)}
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
            description="Verifique se o backend está rodando em http://localhost:3333."
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
      ) : (
        <DataTable
          className="surface-panel rounded-lg border border-border"
          columns={columns}
          data={ordens}
          getRowKey={(ordem) => ordem.id}
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
      )}
    </div>
  );
};

export default Ordens;
