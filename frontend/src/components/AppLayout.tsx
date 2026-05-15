import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  Bell,
  Search,
  Plus,
  Users,
  UserCog,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Moon,
  Sun,
  BookOpen,
} from "lucide-react";
import { MdDashboard, MdHandyman, MdInventory2, MdPointOfSale, MdAccountBalance, MdChecklist, MdPhoneAndroid } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import { TbFileCheck, TbReceipt } from "react-icons/tb";
import { AIAssistant } from "@/components/AIAssistant";
import { CommandPalette } from "@/components/CommandPalette";
import { MobileNav } from "@/components/MobileNav";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canAccess, roleLabels, roleHome } from "@/lib/roles";
import { listOrdensServico } from "@/services/ordens-servico";

const allNav = [
  { to: "/app", label: "Dashboard", icon: MdDashboard, key: "", hidden: false },
  { to: "/app/movimentacoes", label: "Movimentações de Estoque", icon: TbReceipt, key: "movimentacoes", hidden: true },
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
  { to: "/app/usuarios", label: "Usuários", icon: UserCog, key: "usuarios" },
  { to: "/app/atendimento", label: "Atendimento", icon: FaWhatsapp, key: "atendimento" },
  { to: "/app/treinamento", label: "Treinamento", icon: BookOpen, key: "treinamento" },
];

const navOrder: Record<string, number> = {
  "": 0,
  clientes: 1,
  aparelhos: 2,
  ordens: 3,
  checklist: 4,
  manutencao: 5,
  orcamento: 6,
  pdv: 7,
  atendimento: 8,
  estoque: 9,
  financeiro: 10,
  despesas: 11,
  usuarios: 12,
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const {
    displayName: nome,
    isAuthenticated,
    isLoading,
    logout,
    role,
  } = useAuth();

  const notifQuery = useQuery({
    queryKey: ["ordens-servico", "notif"],
    queryFn: () => listOrdensServico(),
    staleTime: 60_000,
  });

  const notifs = useMemo(() => {
    const ordens = notifQuery.data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prontas = ordens.filter((o) => o.status === "pronto_para_retirada");
    const aguardando = ordens.filter((o) => o.status === "aguardando_aprovacao");
    const atrasadas = ordens.filter((o) => {
      if (["entregue", "cancelado"].includes(o.status)) return false;
      const prazo = o.prazoPrometidoEm ?? o.previsaoEntregaEm;
      if (!prazo) return false;
      const data = new Date(prazo);
      data.setHours(0, 0, 0, 0);
      return data < today;
    });
    const ativas = ordens.filter((o) => !["entregue", "cancelado"].includes(o.status));
    const emManutencao = ordens.filter((o) => ["em_manutencao", "aguardando_peca"].includes(o.status));
    return {
      prontas, aguardando, atrasadas,
      total: prontas.length + aguardando.length + atrasadas.length,
      badges: {
        ordens: ativas.length || undefined,
        orcamento: aguardando.length || undefined,
        manutencao: emManutencao.length || undefined,
      } as Record<string, number | undefined>,
    };
  }, [notifQuery.data]);

  // Dark é o padrão (sem classe). Light = classe "light" no <html>.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && searchValue.trim()) {
      navigate(`/app/ordens?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando acesso...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  // Bloqueio de rota: se o perfil não tem acesso, manda pra home dele
  if (!canAccess(role, location.pathname)) {
    return <Navigate to={roleHome[role]} replace />;
  }

  const nav = allNav
    .filter((n) => canAccess(role, n.to) && !n.hidden)
    .sort((a, b) => navOrder[a.key] - navOrder[b.key]);
  const current = allNav.filter((n) => canAccess(role, n.to)).find((n) =>
    n.to === "/app"
      ? location.pathname === "/app"
      : location.pathname.startsWith(n.to),
  );

  const podeNovaOS = canAccess(role, "/app/ordens/nova");
  const inicial = nome.trim().charAt(0).toUpperCase();

  const sair = async () => {
    await logout();
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-28 items-center justify-center border-b border-sidebar-border px-4">
          <Logo className="h-20" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Operação · {roleLabels[role]}
          </p>
          {nav.map(({ to, label, icon: Icon, key }) => (
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
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {notifs.badges[key] !== undefined && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 font-mono text-[10px] font-bold text-primary">
                  {notifs.badges[key]! > 99 ? "99+" : notifs.badges[key]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary font-display font-bold text-primary-foreground">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {nome}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabels[role]}
              </p>
            </div>
            <NavLink
              to="/"
              onClick={sair}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Logo className="h-12" />
            <span className="font-display text-sm font-semibold">
              {current?.label ?? "RR Infocell"}
            </span>
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
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Buscar OS, cliente, IMEI... (Enter)"
                className="h-9 w-72 rounded-md border border-input bg-secondary/40 pl-9 pr-16 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:bg-secondary"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                Ctrl K
              </kbd>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notifs.total > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {notifs.total > 9 ? "9+" : notifs.total}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-border px-4 py-3">
                  <p className="font-display text-sm font-semibold">Notificações</p>
                  <p className="text-xs text-muted-foreground">OS que precisam de atenção</p>
                </div>
                {notifs.total === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma pendência no momento.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifs.prontas.length > 0 && (
                      <li>
                        <NavLink
                          to="/app/ordens?status=pronto_para_retirada"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Prontas para retirada</p>
                            <p className="text-xs text-muted-foreground">{notifs.prontas.length} aparelho{notifs.prontas.length > 1 ? "s" : ""} aguardando cliente</p>
                          </div>
                          <span className="ml-auto shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">{notifs.prontas.length}</span>
                        </NavLink>
                      </li>
                    )}
                    {notifs.aguardando.length > 0 && (
                      <li>
                        <NavLink
                          to="/app/ordens?status=aguardando_aprovacao"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                        >
                          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Aguardando aprovação</p>
                            <p className="text-xs text-muted-foreground">{notifs.aguardando.length} orçamento{notifs.aguardando.length > 1 ? "s" : ""} enviado{notifs.aguardando.length > 1 ? "s" : ""}</p>
                          </div>
                          <span className="ml-auto shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600">{notifs.aguardando.length}</span>
                        </NavLink>
                      </li>
                    )}
                    {notifs.atrasadas.length > 0 && (
                      <li>
                        <NavLink
                          to="/app/ordens?atraso=atrasadas"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">OS atrasadas</p>
                            <p className="text-xs text-muted-foreground">{notifs.atrasadas.length} OS fora do prazo</p>
                          </div>
                          <span className="ml-auto shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-600">{notifs.atrasadas.length}</span>
                        </NavLink>
                      </li>
                    )}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            {podeNovaOS && (
              <Button
                asChild
                className="hidden md:flex bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                <NavLink to="/app/ordens/nova">
                  <Plus className="h-4 w-4" /> Nova OS
                </NavLink>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 pb-20 md:p-8 md:pb-8 animate-fade-in">
          <Outlet />
        </main>
        <footer className="hidden md:flex justify-center border-t border-border px-4 py-3 md:px-8">
          <DeveloperCredit />
        </footer>
      </div>

      <MobileNav badges={notifs.badges} />
      <AIAssistant />
      <CommandPalette />
    </div>
  );
};

export default AppLayout;
