import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bug, LogOut, Menu, Plus, Users, UserCog, Receipt, X } from "lucide-react";
import { MdDashboard, MdHandyman, MdInventory2, MdPointOfSale, MdAccountBalance, MdChecklist, MdPhoneAndroid } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import { TbFileCheck } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canAccessObservabilidade } from "@/lib/observabilidade";
import { canAccess, roleLabels } from "@/lib/roles";
import { Logo } from "@/components/Logo";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  end?: boolean;
};

const allNav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: MdDashboard, key: "", end: true },
  { to: "/app/ordens", label: "Ordens de Serviço", icon: HiWrenchScrewdriver, key: "ordens" },
  { to: "/app/checklist", label: "Checklist", icon: MdChecklist, key: "checklist" },
  { to: "/app/manutencao", label: "Manutenção", icon: MdHandyman, key: "manutencao" },
  { to: "/app/orcamento", label: "Orçamentos", icon: TbFileCheck, key: "orcamento" },
  { to: "/app/estoque", label: "Estoque", icon: MdInventory2, key: "estoque" },
  { to: "/app/pdv", label: "PDV / Caixa", icon: MdPointOfSale, key: "pdv" },
  { to: "/app/financeiro", label: "Financeiro", icon: MdAccountBalance, key: "financeiro" },
  { to: "/app/despesas", label: "Despesas", icon: Receipt, key: "despesas" },
  { to: "/app/clientes", label: "Clientes", icon: Users, key: "clientes" },
  { to: "/app/aparelhos", label: "Aparelhos", icon: MdPhoneAndroid, key: "aparelhos" },
  { to: "/app/atendimento", label: "Atendimento", icon: FaWhatsapp, key: "atendimento" },
  { to: "/app/usuarios", label: "Usuários", icon: UserCog, key: "usuarios" },
  { to: "/app/observabilidade", label: "Observabilidade", icon: Bug, key: "observabilidade" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "": MdDashboard,
  ordens: HiWrenchScrewdriver,
  checklist: MdChecklist,
  manutencao: MdHandyman,
  orcamento: TbFileCheck,
  estoque: MdInventory2,
  pdv: MdPointOfSale,
  financeiro: MdAccountBalance,
  despesas: Receipt,
  clientes: Users,
  aparelhos: MdPhoneAndroid,
  atendimento: FaWhatsapp,
  usuarios: UserCog,
  observabilidade: Bug,
};

const bottomNav = [
  { to: "/app", label: "Início", key: "", end: true },
  { to: "/app/ordens", label: "Ordens", key: "ordens" },
  { to: "/app/atendimento", label: "WhatsApp", key: "atendimento" },
  { to: "/app/manutencao", label: "Manutenção", key: "manutencao" },
];

interface MobileNavProps {
  badges?: Record<string, number | undefined>;
}

export const MobileNav = ({ badges = {} }: MobileNavProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { displayName: nome, isDevelopmentMode, role, logout, user } = useAuth();
  const navigate = useNavigate();
  const inicial = nome.trim().charAt(0).toUpperCase();
  const podeObservabilidade = canAccessObservabilidade(user, isDevelopmentMode);

  const filteredNav = allNav
    .filter((n) => canAccess(role, n.to))
    .filter((n) => n.key !== "observabilidade" || podeObservabilidade);

  const sair = async () => {
    setDrawerOpen(false);
    await logout();
  };

  return (
    <>
      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur md:hidden">
        {bottomNav.filter((n) => canAccess(role, n.to)).map(({ to, label, key, end }) => {
          const Icon = iconMap[key] ?? MdDashboard;
          const badge = badges[key];
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              {label}
            </NavLink>
          );
        })}

        {/* Nova OS — centro em destaque */}
        {canAccess(role, "/app/ordens/nova") && (
          <button
            onClick={() => navigate("/app/ordens/nova")}
            className="relative -top-4 mx-2 flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center self-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-105"
            title="Nova OS"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </button>
        )}

        {/* Menu */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </nav>

      {/* Drawer lateral com todos os itens */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <div className="flex h-20 items-center justify-between border-b border-border px-4">
            <Logo className="h-12" />
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Operação · {roleLabels[role]}
            </p>
            {filteredNav.map(({ to, label, key, end }) => {
              const Icon = iconMap[key] ?? MdDashboard;
              const badge = badges[key];
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 font-mono text-[10px] font-bold text-primary">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-md bg-accent/50 p-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary font-display font-bold text-primary-foreground">
                {inicial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nome}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabels[role]}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={sair} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
