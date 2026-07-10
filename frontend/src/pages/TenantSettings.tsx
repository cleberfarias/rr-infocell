import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Palette, ShieldCheck, ChevronRight, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/design-system/FormField";
import { moduleKeys, planModules, type ModuleKey } from "@/config/planModules";
import { useTenant } from "@/contexts/TenantContext";
import { ROUTES } from "@/constants/routes";
import { capitalizeFirst, formatDocument, formatPhone } from "@/lib/formatters";
import { updateCurrentTenant, type TenantSettingsInput } from "@/services/tenants";

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
  const { tenant, plan, branding, company, canUseModule, refreshTenant } = useTenant();
  const enabledModules = moduleKeys.filter((moduleKey) =>
    canUseModule(moduleKey),
  );
  const [form, setForm] = useState<TenantSettingsInput>({
    name: company.nome,
    branding: {
      logoUrl: branding.logo.startsWith("http") ? branding.logo : "",
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
    },
    company: { ...company },
  });

  useEffect(() => {
    setForm({
      name: company.nome,
      branding: {
        logoUrl: branding.logo.startsWith("http") ? branding.logo : "",
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      },
      company: { ...company },
    });
  }, [branding, company]);

  const saveMutation = useMutation({
    mutationFn: updateCurrentTenant,
    onSuccess: async () => {
      await refreshTenant();
      toast.success("Configuracoes da empresa atualizadas.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.");
    },
  });

  const updateCompany = (field: keyof TenantSettingsInput["company"], value: string) => {
    setForm((current) => ({
      ...current,
      company: { ...current.company, [field]: value },
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({
      ...form,
      name: capitalizeFirst(form.name.trim()),
      branding: {
        ...form.branding,
        logoUrl: form.branding.logoUrl?.trim() || undefined,
      },
      company: {
        ...form.company,
        endereco: capitalizeFirst(form.company.endereco?.trim() ?? ""),
        bairro: capitalizeFirst(form.company.bairro?.trim() ?? ""),
        cidade: capitalizeFirst(form.company.cidade?.trim() ?? ""),
        tecnicoPadrao: capitalizeFirst(form.company.tecnicoPadrao?.trim() ?? ""),
        uf: form.company.uf?.trim().toUpperCase(),
      },
    });
  };

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
            Identidade e dados operacionais exclusivos deste tenant.
          </p>
        </div>
        <Badge className="w-fit border-primary/40 bg-primary/10 text-primary">
          Plano {plan}
        </Badge>
      </div>

      <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="surface-panel p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tenant atual
          </div>
          <div className="mt-6 flex items-center justify-center rounded-md border border-border bg-background/40 p-6">
            <img
              src={form.branding.logoUrl || branding.logo}
              alt={`${tenant.tenantName} logo`}
              className="h-28 w-auto object-contain"
            />
          </div>
          <div className="mt-5 space-y-2">
            <h2 className="font-display text-xl font-semibold">
              {form.name || tenant.tenantName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Produto base: {tenant.productName}
            </p>
          </div>
        </Card>

        <Card className="surface-panel p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="tenant-name" label="Nome da empresa">
              <Input id="tenant-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </FormField>
            <FormField id="tenant-logo" label="URL publica da logo" hint="Use uma imagem HTTPS. Deixe vazio para usar a logo padrao da RR Infocell.">
              <Input id="tenant-logo" type="url" value={form.branding.logoUrl ?? ""} onChange={(event) => setForm((current) => ({ ...current, branding: { ...current.branding, logoUrl: event.target.value } }))} placeholder="https://.../logo.png" />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoItem label="Produto base" value={tenant.productName} />
            <InfoItem label="Plano" value={tenant.plan} />
            <InfoItem label="White label" value={booleanLabel(branding.whiteLabel)} />
          </div>
          <p className="text-xs text-muted-foreground">Produto, plano e permissoes sao administrados pela plataforma.</p>
        </Card>
      </div>

      <Card className="surface-panel p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Palette className="h-4 w-4 text-primary" />
          Cores do tenant
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="primary-color" label="Cor primaria (HSL)" hint="Exemplo: 205 95% 55%">
            <Input id="primary-color" value={form.branding.primaryColor} onChange={(event) => setForm((current) => ({ ...current, branding: { ...current.branding, primaryColor: event.target.value } }))} required />
          </FormField>
          <FormField id="secondary-color" label="Cor secundaria (HSL)" hint="Exemplo: 220 12% 14%">
            <Input id="secondary-color" value={form.branding.secondaryColor} onChange={(event) => setForm((current) => ({ ...current, branding: { ...current.branding, secondaryColor: event.target.value } }))} required />
          </FormField>
          <ColorPreview label="Previa primaria" value={form.branding.primaryColor} />
          <ColorPreview label="Previa secundaria" value={form.branding.secondaryColor} />
        </div>
      </Card>

      <Card className="surface-panel p-5 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Dados empresariais e impressao</h2>
          <p className="text-sm text-muted-foreground">Usados em OS, recibos, orcamentos e cupons do tenant.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField id="company-cnpj" label="CNPJ"><Input id="company-cnpj" value={form.company.cnpj ?? ""} onChange={(event) => updateCompany("cnpj", formatDocument(event.target.value))} /></FormField>
          <FormField id="company-phone" label="Telefone"><Input id="company-phone" value={form.company.telefone ?? ""} onChange={(event) => updateCompany("telefone", formatPhone(event.target.value))} /></FormField>
          <FormField id="company-whatsapp" label="WhatsApp"><Input id="company-whatsapp" value={form.company.whatsapp ?? ""} onChange={(event) => updateCompany("whatsapp", formatPhone(event.target.value))} /></FormField>
          <FormField id="company-address" label="Endereco" className="xl:col-span-2"><Input id="company-address" value={form.company.endereco ?? ""} onChange={(event) => updateCompany("endereco", event.target.value)} /></FormField>
          <FormField id="company-neighborhood" label="Bairro"><Input id="company-neighborhood" value={form.company.bairro ?? ""} onChange={(event) => updateCompany("bairro", event.target.value)} /></FormField>
          <FormField id="company-city" label="Cidade"><Input id="company-city" value={form.company.cidade ?? ""} onChange={(event) => updateCompany("cidade", event.target.value)} /></FormField>
          <FormField id="company-state" label="UF"><Input id="company-state" maxLength={2} value={form.company.uf ?? ""} onChange={(event) => updateCompany("uf", event.target.value.toUpperCase())} /></FormField>
          <FormField id="company-technician" label="Tecnico padrao"><Input id="company-technician" value={form.company.tecnicoPadrao ?? ""} onChange={(event) => updateCompany("tecnicoPadrao", event.target.value)} /></FormField>
          <FormField id="company-hours" label="Horario de atendimento" className="md:col-span-2 xl:col-span-3"><Textarea id="company-hours" value={form.company.horarioAtendimento ?? ""} onChange={(event) => updateCompany("horarioAtendimento", event.target.value)} /></FormField>
          <FormField id="company-message" label="Mensagem final" className="md:col-span-2"><Input id="company-message" value={form.company.mensagemFinal ?? ""} onChange={(event) => updateCompany("mensagemFinal", event.target.value)} /></FormField>
          <FormField id="company-footer" label="Rodape"><Input id="company-footer" value={form.company.rodape ?? ""} onChange={(event) => updateCompany("rodape", event.target.value)} /></FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar configuracoes"}
          </Button>
        </div>
      </Card>
      </form>

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
