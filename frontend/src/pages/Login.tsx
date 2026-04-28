import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Wrench, Cpu, UserCog, Headset, Settings2, Check } from "lucide-react";
import { useState } from "react";

type Role = "admin" | "atendente" | "tecnico";

const roles: Record<Role, {
  titulo: string;
  descricao: string;
  email: string;
  badge: string;
  icon: typeof UserCog;
  acesso: string[];
}> = {
  admin: {
    titulo: "Administrador",
    descricao: "Acesso total: financeiro, despesas, relatorios e gestao da loja.",
    email: "ricardo@rrinfocell.com.br",
    badge: "Acesso total",
    icon: UserCog,
    acesso: ["Dashboard completo", "Financeiro & DRE", "Despesas", "Usuarios"],
  },
  atendente: {
    titulo: "Atendente / Balcao",
    descricao: "Cadastro de OS, checklist, clientes e PDV. Sem acesso financeiro.",
    email: "atendente@rrinfocell.com.br",
    badge: "Operacional",
    icon: Headset,
    acesso: ["Nova OS", "Checklist", "Clientes", "PDV / Caixa"],
  },
  tecnico: {
    titulo: "Tecnico de bancada",
    descricao: "Foco em manutencao, diagnostico e baixa de pecas no estoque.",
    email: "tecnico@rrinfocell.com.br",
    badge: "Bancada",
    icon: Settings2,
    acesso: ["Manutencao", "Diagnostico", "Estoque (consulta)", "Orcamento tecnico"],
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { isDevelopmentMode, login } = useAuth();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(roles.admin.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = roles[role];
  const RoleIcon = config.icon;

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    setEmail(roles[nextRole].email);
    setError(null);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const nextPath = await login({ email, password, role });
      navigate(nextPath);
    } catch {
      setError("Nao foi possivel entrar. Verifique e-mail, senha e usuario no Firebase Auth.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border bg-gradient-surface lg:flex lg:flex-col lg:justify-between p-12">
        <div className="absolute inset-0 bg-gradient-glow opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_50%)]" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10">
          <Logo className="h-16" />
        </div>

        <div className="relative z-10 space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            // Sistema operacional
          </p>
          <h2 className="font-display text-4xl font-bold leading-tight text-foreground">
            Da entrada do aparelho<br />
            ao <span className="bg-gradient-primary bg-clip-text text-transparent">recibo final</span>.
          </h2>
          <p className="max-w-md text-base text-muted-foreground">
            Centralize ordens de servico, checklist, pecas, PDV e financeiro em
            uma unica plataforma pensada para a rotina da assistencia tecnica.
          </p>

          <div className="flex flex-wrap gap-2 pt-4">
            {[
              { icon: Wrench, label: "Ordem de Servico" },
              { icon: Cpu, label: "Estoque integrado" },
              { icon: ShieldCheck, label: "Checklist auditavel" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-mono text-xs text-muted-foreground">
          v1.0 - build {new Date().toLocaleDateString("pt-BR")}
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Logo className="h-12" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Bem-vindo de volta</p>
            <h1 className="font-display text-3xl font-bold">Acessar o painel</h1>
            <p className="text-sm text-muted-foreground">Selecione seu perfil de acesso e entre no sistema RR Infocell.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(roles) as Role[]).map((r) => {
              const Icon = roles[r].icon;
              const ativo = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={
                    "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
                    (ativo
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-glow"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground")
                  }
                >
                  <Icon className={"h-4 w-4 " + (ativo ? "text-primary" : "")} />
                  <span className="capitalize">{r}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-md border border-border bg-card/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
                <RoleIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-semibold">{config.titulo}</p>
                  <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {config.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{config.descricao}</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {config.acesso.map((a) => (
                    <li key={a} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Check className="h-3 w-3 text-success" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button type="button" className="text-xs text-primary hover:underline">Esqueci a senha</button>
              </div>
              <Input
                id="senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isDevelopmentMode ? "Modo desenvolvimento: senha opcional" : "Digite sua senha"}
              />
            </div>
            {isDevelopmentMode && (
              <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Modo desenvolvimento ativo. O perfil selecionado libera o acesso local sem usuario real do Firebase Auth.
              </p>
            )}
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              {isSubmitting ? "Entrando..." : `Entrar como ${config.titulo}`}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Problemas de acesso?{" "}
            <Link to="/app" className="text-primary hover:underline">Falar com administrador</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
