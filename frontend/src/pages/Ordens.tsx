import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ClipboardList,
  Eye,
  Loader2,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/data/mock";
import { listAparelhos, type Aparelho } from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

const statusOptions: Array<{
  value: OrdemServicoStatus | "todos";
  label: string;
}> = [
  { value: "todos", label: "Todos" },
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em analise" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovacao" },
  { value: "aguardando_peca", label: "Aguardando peca" },
  { value: "em_manutencao", label: "Em manutencao" },
  { value: "pronto_para_retirada", label: "Pronto para retirada" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

const formatDate = (value?: string) => {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

type OrdemRow = OrdemServico & {
  cliente?: Cliente;
  aparelho?: Aparelho;
};

const Ordens = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    OrdemServicoStatus | "todos"
  >("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState<"todos" | "baixa" | "normal" | "urgente">("todos");
  const [tecnicoFilter, setTecnicoFilter] = useState("todos");
  const [atrasoFilter, setAtrasoFilter] = useState<"todos" | "atrasadas">("todos");

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", statusFilter, prioridadeFilter],
    queryFn: () =>
      listOrdensServico({
        status: statusFilter === "todos" ? "" : statusFilter,
        prioridade: prioridadeFilter === "todos" ? "" : prioridadeFilter,
      }),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "ordens"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "ordens"],
    queryFn: () => listAparelhos(),
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
        if (tecnicoFilter !== "todos" && (ordem.tecnicoResponsavel ?? "nao_atribuido") !== tecnicoFilter) {
          return false;
        }

        if (atrasoFilter === "atrasadas") {
          const prazo = ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm;
          const dataPrazo = prazo ? new Date(prazo) : null;
          const atrasada =
            dataPrazo &&
            dataPrazo < today &&
            !["entregue", "cancelado"].includes(ordem.status);
          if (!atrasada) return false;
        }

        if (!normalizedSearch) {
          return true;
        }

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
  }, [aparelhoById, atrasoFilter, clienteById, ordensQuery.data, search, tecnicoFilter]);

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
            {ordem.cliente?.nome ?? "Cliente nao encontrado"}
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
              : "Aparelho nao encontrado"}
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
      header: "Tecnico",
      className: "text-muted-foreground",
      cell: (ordem) => ordem.tecnicoResponsavel ?? "Nao atribuido",
    },
    {
      key: "entrada",
      header: "Entrada",
      className: "font-mono text-xs",
      cell: (ordem) => formatDate(ordem.entradaEm),
    },
    {
      key: "previsao",
      header: "Previsao",
      className: "font-mono text-xs",
      cell: (ordem) => {
        const prazo = ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm;
        const atrasada =
          prazo &&
          new Date(prazo) < new Date(new Date().toDateString()) &&
          !["entregue", "cancelado"].includes(ordem.status);

        return (
          <span className={atrasada ? "text-destructive" : ""}>
            {formatDate(prazo)}
          </span>
        );
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
      header: "Acoes",
      headerClassName: "text-right",
      cell: (ordem) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" asChild title="Detalhes">
            <Link to={`/app/ordens/${ordem.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Checklist">
            <Link to={`/app/checklist?ordemId=${ordem.id}`}>
              <ClipboardCheck className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Manutencao">
            <Link to={`/app/manutencao?ordemId=${ordem.id}`}>
              <Wrench className="h-4 w-4" />
            </Link>
          </Button>
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
        eyebrow="Operacao"
        title="Ordens de servico"
        description="Listagem real das OS abertas, em manutencao, prontas e entregues."
        actions={
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Link to="/app/ordens/nova">
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
              {statusOptions.map((option) => (
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
        <FormField id="ordens-tecnico" label="Tecnico" className="min-w-[180px]">
          <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
            <SelectTrigger id="ordens-tecnico">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tecnicos.map((tecnico) => (
                <SelectItem key={tecnico} value={tecnico}>
                  {tecnico === "nao_atribuido" ? "Nao atribuido" : tecnico}
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
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={ClipboardList}
            title="Nao foi possivel carregar ordens"
            description="Verifique se o backend esta rodando em http://localhost:3333."
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
              description="Ajuste a busca ou crie uma nova ordem de servico."
              actions={
                <Button asChild>
                  <Link to="/app/ordens/nova">Nova OS</Link>
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
