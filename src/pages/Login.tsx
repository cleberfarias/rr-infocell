import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Wrench, Cpu } from "lucide-react";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"admin" | "atendente" | "tecnico">("admin");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
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
            Centralize ordens de serviço, checklist, peças, PDV e financeiro em
            uma única plataforma — pensada para a rotina da assistência técnica.
          </p>

          <div className="flex flex-wrap gap-2 pt-4">
            {[
              { icon: Wrench, label: "Ordem de Serviço" },
              { icon: Cpu,    label: "Estoque integrado" },
              { icon: ShieldCheck, label: "Checklist auditável" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-mono text-xs text-muted-foreground">
          v1.0 • build {new Date().toLocaleDateString("pt-BR")}
        </p>
      </aside>

      {/* Right — form */}
      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Logo className="h-12" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Bem-vindo de volta</p>
            <h1 className="font-display text-3xl font-bold">Acessar o painel</h1>
            <p className="text-sm text-muted-foreground">Use suas credenciais para entrar no sistema RR Infocell.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-secondary/40 p-1">
            {(["admin", "atendente", "tecnico"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  "rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors " +
                  (role === r
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" defaultValue="ricardo@rrinfocell.com.br" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button type="button" className="text-xs text-primary hover:underline">Esqueci a senha</button>
              </div>
              <Input id="senha" type="password" defaultValue="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Entrar no sistema
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
