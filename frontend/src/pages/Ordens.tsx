import {
  DataTable,
  DataTablePagination,
  EmptyState,
  FormField,
  type DataTableColumn,
} from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, ordens, type OrdemServico } from "@/data/mock";
import { ClipboardCheck, ClipboardList, Eye, Filter, Search, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const columns: DataTableColumn<OrdemServico>[] = [
  {
    key: "id",
    header: "OS",
    cell: (ordem) => <span className="font-mono text-xs text-primary">{ordem.id}</span>,
  },
  {
    key: "cliente",
    header: "Cliente",
    cell: (ordem) => (
      <div>
        <div className="font-medium">{ordem.cliente}</div>
        <div className="text-xs text-muted-foreground">{ordem.telefone}</div>
      </div>
    ),
  },
  {
    key: "aparelho",
    header: "Aparelho",
    cell: (ordem) => (
      <div>
        <div className="font-medium">
          {ordem.marca} {ordem.modelo}
        </div>
        <div className="text-xs text-muted-foreground">
          {ordem.cor} - IMEI {ordem.imei.slice(-6)}
        </div>
      </div>
    ),
  },
  {
    key: "defeito",
    header: "Defeito",
    className: "max-w-[220px] truncate text-muted-foreground",
    cell: (ordem) => <span title={ordem.defeito}>{ordem.defeito}</span>,
  },
  {
    key: "tecnico",
    header: "Tecnico",
    className: "text-muted-foreground",
    cell: (ordem) => ordem.tecnico,
  },
  {
    key: "entrada",
    header: "Entrada",
    className: "font-mono text-xs",
    cell: (ordem) => ordem.entrada,
  },
  {
    key: "previsao",
    header: "Previsao",
    className: "font-mono text-xs",
    cell: (ordem) => ordem.previsao,
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
    cell: (ordem) => formatBRL(ordem.valorPecas + ordem.valorMaoObra),
  },
  {
    key: "actions",
    header: "Acoes",
    headerClassName: "text-right",
    cell: () => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" asChild title="Detalhes">
          <Link to="/app/manutencao">
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Checklist">
          <Link to="/app/checklist">
            <ClipboardCheck className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Manutencao">
          <Link to="/app/manutencao">
            <Wrench className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ),
  },
];

const Ordens = () => {
  return (
    <div className="space-y-5">
      <div className="surface-panel flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <FormField id="ordens-search" label="Buscar ordem" className="min-w-[240px] flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ordens-search"
              className="pl-9"
              placeholder="Buscar por OS, cliente, IMEI ou aparelho..."
            />
          </div>
        </FormField>
        <Button variant="outline">
          <Filter className="h-4 w-4" /> Filtros
        </Button>
        <div className="flex gap-1 rounded-md border border-border bg-secondary/40 p-1 text-xs">
          {["Todas", "Abertas", "Em manutencao", "Finalizadas", "Atrasadas"].map((tab, index) => (
            <button
              key={tab}
              className={
                "rounded-sm px-3 py-1.5 font-medium " +
                (index === 0
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

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
          />
        }
        footer={
          <>
            <span>
              Mostrando {ordens.length} de {ordens.length} ordens
            </span>
            <DataTablePagination currentPage={1} totalPages={1} />
          </>
        }
      />
    </div>
  );
};

export default Ordens;
