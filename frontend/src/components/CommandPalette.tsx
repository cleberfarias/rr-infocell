import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Wrench,
  ClipboardCheck,
  Activity,
  FileCheck2,
  Package,
  ShoppingCart,
  LineChart,
  Receipt,
  Users,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { listOrdensServico } from "@/services/ordens-servico";
import { listClientes } from "@/services/clientes";

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  aguardando_aprovacao: "Aguard. aprovação",
  aguardando_peca: "Aguard. peça",
  em_manutencao: "Em manutenção",
  pronto_para_retirada: "Pronto p/ retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const navItems = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Nova OS", to: "/app/ordens/nova", icon: Plus },
  { label: "Ordens de Serviço", to: "/app/ordens", icon: Wrench },
  { label: "Checklist", to: "/app/checklist", icon: ClipboardCheck },
  { label: "Manutenção", to: "/app/manutencao", icon: Activity },
  { label: "Orçamentos", to: "/app/orcamento", icon: FileCheck2 },
  { label: "Estoque", to: "/app/estoque", icon: Package },
  { label: "PDV / Caixa", to: "/app/pdv", icon: ShoppingCart },
  { label: "Financeiro", to: "/app/financeiro", icon: LineChart },
  { label: "Despesas", to: "/app/despesas", icon: Receipt },
  { label: "Clientes", to: "/app/clientes", icon: Users },
  { label: "Atendimento", to: "/app/atendimento", icon: MessageSquare },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "palette"],
    queryFn: () => listOrdensServico(),
    staleTime: 60_000,
    enabled: open,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "palette"],
    queryFn: () => listClientes(""),
    staleTime: 60_000,
    enabled: open,
  });

  // Build a map of clienteId -> nome for quick lookup
  const clienteMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clientesQuery.data ?? []) {
      map[c.id] = c.nome;
    }
    return map;
  }, [clientesQuery.data]);

  // Filter OS by search term
  const filteredOrdens = useMemo(() => {
    const ordens = ordensQuery.data ?? [];
    const term = search.toLowerCase().trim();
    if (!term) return ordens.slice(0, 8);
    return ordens
      .filter((o) => {
        const numero = String(o.numero).toLowerCase();
        const clienteNome = clienteMap[o.clienteId]?.toLowerCase() ?? "";
        const status = statusLabels[o.status]?.toLowerCase() ?? "";
        return (
          numero.includes(term) ||
          clienteNome.includes(term) ||
          status.includes(term) ||
          o.defeitoRelatado.toLowerCase().includes(term)
        );
      })
      .slice(0, 8);
  }, [ordensQuery.data, clienteMap, search]);

  const handleSelect = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-lg">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar OS, cliente, módulo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            <CommandGroup heading="Navegação rápida">
              {navItems.map(({ label, to, icon: Icon }) => (
                <CommandItem
                  key={to}
                  value={`nav-${to}`}
                  onSelect={() => handleSelect(to)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>

            {filteredOrdens.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="OS recentes">
                  {filteredOrdens.map((os) => {
                    const clienteNome = clienteMap[os.clienteId];
                    const statusLabel = statusLabels[os.status] ?? os.status;
                    return (
                      <CommandItem
                        key={os.id}
                        value={`os-${os.id}`}
                        onSelect={() => handleSelect(`/app/ordens/${os.id}`)}
                      >
                        <Wrench className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">OS-{os.numero}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          {statusLabel}
                          {clienteNome ? ` · ${clienteNome}` : ""}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
