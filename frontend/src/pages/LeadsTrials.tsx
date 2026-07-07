import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";

import { EmptyState, PageHeader } from "@/components/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STALE_TIME } from "@/constants/query";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { listTrialLeads, type TrialLead } from "@/services/trials";

function getOrigemLabel(lead: TrialLead) {
  const origem = lead.origemCadastro;
  if (origem.utmSource || origem.utmMedium) {
    return [origem.utmSource, origem.utmMedium].filter(Boolean).join(" / ");
  }
  if (origem.paginaOrigem) return "Referencia";
  return "Direto";
}

function getStatusBadge(lead: TrialLead) {
  if (lead.status !== "trial") {
    if (lead.status === "active") {
      return { label: "Cliente ativo", className: "border-sky-400/40 bg-sky-400/10 text-sky-300" };
    }
    return { label: lead.status.replace(/_/g, " "), className: "border-border bg-secondary text-muted-foreground" };
  }
  if (lead.diasRestantes <= 0) {
    return { label: "Trial expirado", className: "border-destructive/40 bg-destructive/10 text-destructive" };
  }
  return { label: "Trial ativo", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" };
}

export default function LeadsTrials() {
  const [busca, setBusca] = useState("");

  const trialsQuery = useQuery({
    queryKey: ["tenants", "trials"],
    queryFn: listTrialLeads,
    staleTime: STALE_TIME.short,
  });

  const leads = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const data = trialsQuery.data?.data ?? [];

    if (!termo) return data;

    return data.filter((lead) =>
      [lead.empresa, lead.nome, lead.email, lead.slug, getOrigemLabel(lead)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(termo)),
    );
  }, [busca, trialsQuery.data?.data]);

  const meta = trialsQuery.data?.meta ?? {
    total: 0,
    ativos: 0,
    clientesAtivos: 0,
    expirados: 0,
    acessaram: 0,
  };

  if (trialsQuery.isLoading) {
    return (
      <Card className="surface-panel flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (trialsQuery.isError) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={AlertTriangle}
          title="Nao foi possivel carregar leads e trials"
          description={
            trialsQuery.error instanceof Error
              ? trialsQuery.error.message
              : "Verifique se seu usuario tem permissao interna da plataforma."
          }
          actions={
            <Button variant="outline" onClick={() => trialsQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="SaaS / White Label"
        title="Leads e clientes"
        description="Acompanhe contas criadas, clientes ativos, origem do cadastro e primeiro acesso."
        actions={
          <Button
            variant="outline"
            onClick={() => trialsQuery.refetch()}
            disabled={trialsQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", trialsQuery.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="surface-panel p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="h-4 w-4" /> Contas criadas
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{meta.total}</p>
          <p className="text-xs text-muted-foreground">tenants da plataforma</p>
        </Card>
        <Card className="surface-panel p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Clientes ativos
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{meta.clientesAtivos}</p>
          <p className="text-xs text-muted-foreground">assinantes ou pilotos ativos</p>
        </Card>
        <Card className="surface-panel p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Trials ativos
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{meta.ativos}</p>
          <p className="text-xs text-muted-foreground">ainda dentro do prazo</p>
        </Card>
        <Card className="surface-panel p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Expirados
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{meta.expirados}</p>
          <p className="text-xs text-muted-foreground">precisam de follow-up</p>
        </Card>
      </div>

      <Card className="surface-panel p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por empresa, nome, e-mail, tenant ou origem..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
      </Card>

      <Card className="surface-panel overflow-hidden p-0">
        {leads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Nenhum lead ou cliente encontrado"
            description="Quando houver cliente ativo ou alguem criar uma conta pelo /demo/registrar, o cadastro aparecera aqui."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsavel</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const statusBadge = getStatusBadge(lead);
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="min-w-[180px]">
                        <p className="font-medium">{lead.empresa}</p>
                        <p className="font-mono text-xs text-muted-foreground">{lead.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[200px]">
                        <p>{lead.nome || "-"}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lead.planoTrial}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap">{formatDate(lead.criadoEm ?? undefined)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-mono", lead.diasRestantes <= 1 && "text-destructive")}>
                        {lead.status === "trial" ? lead.diasRestantes : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[130px]">
                        <Badge
                          variant="outline"
                          className={
                            lead.jaAcessou
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                              : "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          }
                        >
                          {lead.jaAcessou ? "Sim" : "Nao"}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lead.ultimoAcessoEm ? formatDateTime(lead.ultimoAcessoEm) : "Sem login"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[260px]">
                        <p className="truncate text-sm">{getOrigemLabel(lead)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.origemCadastro.utmCampaign ??
                            lead.origemCadastro.landingPage ??
                            lead.origemCadastro.paginaOrigem ??
                            "Sem UTM"}
                        </p>
                        {lead.origemCadastro.ipApprox && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            IP aprox.: {lead.origemCadastro.ipApprox}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
