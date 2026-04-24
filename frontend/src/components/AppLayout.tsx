import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Wrench, ClipboardCheck, Activity, FileCheck2,
  Package, ShoppingCart, LineChart, Receipt, Users, LogOut, Bell, Search, Plus,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRole, canAccess, roleLabels, roleHome, ROLE_KEY, NAME_KEY, roleNames } from "@/lib/roles";

const allNav = [
  { to: "/app",            label: "Dashboard",         icon: LayoutDashboard, key: "" },
  { to: "/app/ordens",     label: "Ordens de Serviço", icon: Wrench,          key: "ordens" },
  { to: "/app/checklist",  label: "Checklist",         icon: ClipboardCheck,  key: "checklist" },
  { to: "/app/manutencao", label: "Manutenção",        icon: Activity,        key: "manutencao" },
  { to: "/app/orcamento",  label: "Orçamentos",        icon: FileCheck2,      key: "orcamento" },
  { to: "/app/estoque",    label: "Estoque",           icon: Package,         key: "estoque" },
  { to: "/app/pdv",        label: "PDV / Caixa",       icon: ShoppingCart,    key: "pdv" },
  { to: "/app/financeiro", label: "Financeiro",        icon: LineChart,       key: "financeiro" },
  { to: "/app/despesas",   label: "Despesas",          icon: Receipt,         key: "despesas" },
  { to: "/app/clientes",   label: "Clientes",          icon: Users,           key: "clientes" },
];

export const AppLayout = () => {
  const location = useLocation();
  const role = getRole();
  const nome = (typeof window !== "undefined" && localStorage.getItem(NAME_KEY)) || roleNames[role];

  // Bloqueio de rota: se o perfil não tem acesso, manda pra home dele
  if (!canAccess(role, location.pathname)) {
    return <Navigate to={roleHome[role]} replace />;
  }

  const nav = allNav.filter((n) => canAccess(role, n.to));
  const current = nav.find((n) =>
    n.to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(n.to)
  );

  const podeNovaOS = canAccess(role, "/app/ordens/nova");
  const inicial = nome.trim().charAt(0).toUpperCase();

  const sair = () => {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-4">
          <Logo className="h-12" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Operação · {roleLabels[role]}
          </p>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary))]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary font-display font-bold text-primary-foreground">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{nome}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabels[role]}</p>
            </div>
            <NavLink to="/" onClick={sair} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Logo className="h-8" />
          </div>
          <div className="hidden md:flex flex-col">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              RR Infocell • {roleLabels[role]}
            </p>
            <h1 className="font-display text-lg font-semibold leading-none">
              {current?.label ?? "Painel"}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar OS, cliente, IMEI..."
                className="h-9 w-72 rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:bg-secondary"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            </Button>
            {podeNovaOS && (
              <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <NavLink to="/app/ordens/nova">
                  <Plus className="h-4 w-4" /> Nova OS
                </NavLink>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
