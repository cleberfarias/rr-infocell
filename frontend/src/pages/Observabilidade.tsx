import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, Clock, RefreshCw, Server, Terminal, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getObservabilidadeSnapshot,
  type ObservabilidadeEvento,
} from "@/services/observabilidade";

const nivelClasse: Record<ObservabilidadeEvento["nivel"], string> = {
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  log: "border-border bg-secondary text-muted-foreground",
};

function formatarUptime(segundos: number) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas}h ${minutos}min`;
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}

function detalhesTexto(detalhes: unknown) {
  if (!detalhes) return "";
  return JSON.stringify(detalhes, null, 2);
}

export default function Observabilidade() {
  const [busca, setBusca] = useState("");
  const [nivel, setNivel] = useState<"todos" | ObservabilidadeEvento["nivel"]>("todos");

  const snapshotQuery = useQuery({
    queryKey: ["observabilidade", "snapshot"],
    queryFn: getObservabilidadeSnapshot,
    refetchInterval: 10_000,
  });

  const snapshot = snapshotQuery.data;
  const eventos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (snapshot?.eventos ?? []).filter((evento) => {
      const bateNivel = nivel === "todos" || evento.nivel === nivel;
      const bateBusca =
        !termo ||
        evento.mensagem.toLowerCase().includes(termo) ||
        evento.tipo.toLowerCase().includes(termo) ||
        detalhesTexto(evento.detalhes).toLowerCase().includes(termo);
      return bateNivel && bateBusca;
    });
  }, [busca, nivel, snapshot?.eventos]);

  if (snapshotQuery.isLoading) {
    return <Card className="surface-panel p-6 text-sm text-muted-foreground">Carregando observabilidade...</Card>;
  }

  if (snapshotQuery.isError) {
    return (
      <Card className="surface-panel flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h1 className="font-display text-xl font-semibold">Acesso indisponivel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshotQuery.error instanceof Error
              ? snapshotQuery.error.message
              : "Nao foi possivel abrir a observabilidade."}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Diagnostico interno
          </p>
          <h1 className="font-display text-2xl font-semibold glow-text">Observabilidade</h1>
        </div>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => snapshotQuery.refetch()}
          disabled={snapshotQuery.isFetching}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", snapshotQuery.isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {snapshot && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="surface-panel p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-4 w-4" /> Backend
            </div>
            <p className="mt-2 font-display text-xl font-semibold">{snapshot.status.backend}</p>
            <p className="text-xs text-muted-foreground">{snapshot.status.nodeEnv}</p>
          </Card>
          <Card className="surface-panel p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="h-4 w-4" /> WhatsApp
            </div>
            <p className="mt-2 font-display text-xl font-semibold">{snapshot.status.whatsapp.status}</p>
            <p className="text-xs text-muted-foreground">conexao atual</p>
          </Card>
          <Card className="surface-panel p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Uptime
            </div>
            <p className="mt-2 font-display text-xl font-semibold">
              {formatarUptime(snapshot.status.uptimeSegundos)}
            </p>
            <p className="text-xs text-muted-foreground">desde {formatarData(snapshot.status.iniciadoEm)}</p>
          </Card>
          <Card className="surface-panel p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bug className="h-4 w-4" /> Erros
            </div>
            <p className="mt-2 font-display text-xl font-semibold">{snapshot.totais.erros}</p>
            <p className="text-xs text-muted-foreground">{snapshot.totais.avisos} avisos</p>
          </Card>
        </div>
      )}

      <Card className="surface-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar em logs, rotas, erros..."
          />
          <div className="flex flex-wrap gap-2">
            {(["todos", "error", "warn", "info", "log"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={nivel === item ? "default" : "outline"}
                onClick={() => setNivel(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="surface-panel overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Terminal className="h-4 w-4 text-primary" />
          <p className="font-display font-semibold">Eventos recentes</p>
          <Badge variant="outline" className="ml-auto">{eventos.length}</Badge>
        </div>
        <ScrollArea className="h-[520px]">
          <div className="divide-y divide-border">
            {eventos.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</div>
            ) : (
              eventos.map((evento) => (
                <div key={evento.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={nivelClasse[evento.nivel]}>
                      {evento.nivel}
                    </Badge>
                    <Badge variant="secondary">{evento.tipo.replace(/_/g, " ")}</Badge>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {formatarData(evento.criadoEm)}
                    </span>
                  </div>
                  <p className="break-words text-sm">{evento.mensagem}</p>
                  {evento.detalhes ? (
                    <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs text-muted-foreground">
                      {detalhesTexto(evento.detalhes)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
