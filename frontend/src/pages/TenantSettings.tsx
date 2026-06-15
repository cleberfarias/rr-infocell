import { CheckCircle2, CircleSlash, Palette, ShieldCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { moduleKeys, planModules, type ModuleKey } from "@/config/planModules";
import { useTenant } from "@/contexts/TenantContext";
import { ROUTES } from "@/constants/routes";

const moduleLabels: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  ordensServico: "Ordens de servico",
  estoque: "Estoque",
  financeiro: "Financeiro",
  relatorios: "Relatorios",
  mensagensAutomaticas: "Mensagens automaticas",
  whiteLabel: "White Label",
  multiUsuarios: "Multiusuarios",
  multiUnidades: "Multiunidades",
};

const booleanLabel = (value: boolean) => (value ? "Ativo" : "Inativo");

const ColorPreview = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-secondary/30 p-3">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <div className="mt-3 flex items-center gap-3">
      <span
        className="h-9 w-9 rounded-md border border-border"
        style={{ backgroundColor: `hsl(${value})` }}
      />
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  </div>
);

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-secondary/20 p-3">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
  </div>
);

export default function TenantSettings() {
  const { tenant, plan, branding, canUseModule } = useTenant();
  const enabledModules = moduleKeys.filter((moduleKey) =>
    canUseModule(moduleKey),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            NextAssist White Label
          </p>
          <h1 className="font-display text-2xl font-semibold glow-text">
            Configuracoes da Empresa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados do tenant atual em modo somente leitura.
          </p>
        </div>
        <Badge className="w-fit border-primary/40 bg-primary/10 text-primary">
          Plano {plan}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tenant atual
          </div>
          <div className="mt-6 flex items-center justify-center rounded-md border border-border bg-background/40 p-6">
            <img
              src={branding.logo}
              alt={`${tenant.tenantName} logo`}
              className="h-28 w-auto object-contain"
            />
          </div>
          <div className="mt-5 space-y-2">
            <h2 className="font-display text-xl font-semibold">
              {tenant.tenantName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Produto base: {tenant.productName}
            </p>
          </div>
        </Card>

        <Card className="surface-panel p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoItem label="Product name" value={tenant.productName} />
            <InfoItem label="System name" value={tenant.systemName} />
            <InfoItem label="Tenant name" value={tenant.tenantName} />
            <InfoItem label="Plan" value={tenant.plan} />
            <InfoItem label="White label" value={booleanLabel(branding.whiteLabel)} />
            <InfoItem label="Show powered by" value={booleanLabel(branding.showPoweredBy)} />
          </div>
        </Card>
      </div>

      <Card className="surface-panel p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Palette className="h-4 w-4 text-primary" />
          Cores do tenant
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ColorPreview label="Primary color" value={branding.primaryColor} />
          <ColorPreview label="Secondary color" value={branding.secondaryColor} />
        </div>
      </Card>

      <Card className="surface-panel p-0 overflow-hidden">
        <Link
          to={ROUTES.configuracoesMensagens}
          className="flex items-center gap-4 p-5 hover:bg-secondary/40 transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
            <FaWhatsapp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-sm">Mensagens Automáticas do WhatsApp</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edite os textos enviados em cada etapa do atendimento e ative ou desative mensagens individuais.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </Link>
      </Card>

      <Card className="surface-panel p-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Modulos do plano
            </h2>
            <p className="text-sm text-muted-foreground">
              {enabledModules.length} de {moduleKeys.length} modulos disponiveis
              no plano {plan}.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {Object.keys(planModules).length} planos configurados
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {moduleKeys.map((moduleKey) => {
            const enabled = canUseModule(moduleKey);

            return (
              <div
                key={moduleKey}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <CircleSlash className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {moduleLabels[moduleKey]}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    enabled
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-border bg-secondary text-muted-foreground"
                  }
                >
                  {enabled ? "Disponivel" : "Indisponivel"}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
