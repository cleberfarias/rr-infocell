import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw, MessageSquare, Zap, Hand } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getConfiguracoesMensagens, saveConfiguracoesMensagens, type MensagemTemplate } from "@/services/whatsapp";

const QUERY_KEY = ["whatsapp", "configuracoes", "mensagens"];

type TemplateLocal = MensagemTemplate & { _dirty: boolean };

function TemplateCard({
  tpl,
  onChange,
  onReset,
}: {
  tpl: TemplateLocal;
  onChange: (id: string, patch: Partial<Pick<MensagemTemplate, "ativo" | "mensagem">>) => void;
  onReset: (id: string) => void;
}) {
  return (
    <Card className="surface-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-semibold text-sm truncate">{tpl.nome}</p>
            {tpl._dirty && (
              <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-400 text-[10px]">
                modificado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{tpl.descricao}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{tpl.ativo ? "Ativo" : "Inativo"}</span>
          <Switch
            checked={tpl.ativo}
            onCheckedChange={(v) => onChange(tpl.id, { ativo: v })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem</p>
          <div className="flex flex-wrap gap-1">
            {tpl.variaveis.map((v) => (
              <Tooltip key={v}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="font-mono text-[10px] rounded bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      const ta = document.getElementById(`tpl-${tpl.id}`) as HTMLTextAreaElement | null;
                      if (!ta) return;
                      const start = ta.selectionStart ?? ta.value.length;
                      const end = ta.selectionEnd ?? ta.value.length;
                      const newVal = ta.value.slice(0, start) + v + ta.value.slice(end);
                      onChange(tpl.id, { mensagem: newVal });
                      setTimeout(() => {
                        ta.selectionStart = ta.selectionEnd = start + v.length;
                        ta.focus();
                      }, 0);
                    }}
                  >
                    {v}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Clique para inserir no cursor</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <Textarea
          id={`tpl-${tpl.id}`}
          value={tpl.mensagem}
          onChange={(e) => onChange(tpl.id, { mensagem: e.target.value })}
          rows={Math.max(4, tpl.mensagem.split("\n").length + 1)}
          className="font-mono text-xs resize-none bg-secondary/30 border-border focus:border-primary/60"
          disabled={!tpl.ativo}
        />
      </div>

      {tpl._dirty && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => onReset(tpl.id)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restaurar padrão
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function ConfiguracoesMensagens() {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<TemplateLocal[] | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getConfiguracoesMensagens,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: saveConfiguracoesMensagens,
    onSuccess: () => {
      toast.success("Mensagens salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setLocal(null);
    },
    onError: () => {
      toast.error("Erro ao salvar mensagens.");
    },
  });

  const templates: TemplateLocal[] = local ?? (query.data?.map((t) => ({ ...t, _dirty: false })) ?? []);
  const automaticas = templates.filter((t) => t.tipo === "automatica");
  const manuais = templates.filter((t) => t.tipo === "manual");
  const hasChanges = templates.some((t) => t._dirty);

  function handleChange(id: string, patch: Partial<Pick<MensagemTemplate, "ativo" | "mensagem">>) {
    const base = local ?? (query.data?.map((t) => ({ ...t, _dirty: false })) ?? []);
    const original = query.data?.find((t) => t.id === id);
    setLocal(
      base.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              _dirty:
                (patch.mensagem !== undefined ? patch.mensagem !== original?.mensagem : t.mensagem !== original?.mensagem) ||
                (patch.ativo !== undefined ? patch.ativo !== original?.ativo : t.ativo !== original?.ativo),
            }
          : t,
      ),
    );
  }

  function handleReset(id: string) {
    const base = local ?? (query.data?.map((t) => ({ ...t, _dirty: false })) ?? []);
    const original = query.data?.find((t) => t.id === id);
    if (!original) return;
    setLocal(base.map((t) => (t.id === id ? { ...original, _dirty: false } : t)));
  }

  function handleSave() {
    const payload = templates.map(({ id, ativo, mensagem }) => ({ id, ativo, mensagem }));
    mutation.mutate(payload);
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-destructive">
        Erro ao carregar configurações. Verifique a conexão com o backend.
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <FaWhatsapp className="h-3 w-3 text-emerald-400" />
            Atendimento WhatsApp
          </p>
          <h1 className="font-display text-2xl font-semibold glow-text">
            Mensagens Automáticas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalize os textos enviados em cada etapa do atendimento. Use as variáveis disponíveis para inserir dados dinâmicos.
          </p>
        </div>

        <Button
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 shrink-0"
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending}
        >
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <Card className="surface-panel p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>
            As <strong className="text-foreground">variáveis</strong> entre <code className="font-mono text-primary text-xs">{"{{"}{"  "}{"}}"}  </code> são substituídas automaticamente pelos dados da OS, cliente e aparelho. Clique em uma variável para inseri-la na posição do cursor.
          </span>
        </div>
      </Card>

      <Tabs defaultValue="automaticas">
        <TabsList className="mb-4">
          <TabsTrigger value="automaticas" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Automáticas
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
              {automaticas.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="manuais" className="gap-1.5">
            <Hand className="h-3.5 w-3.5" />
            Ações Manuais
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
              {manuais.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automaticas" className="space-y-3 mt-0">
          <p className="text-xs text-muted-foreground pb-1">
            Enviadas automaticamente pelo sistema em resposta a eventos (abertura de OS, mudança de status, lembretes).
          </p>
          {automaticas.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onChange={handleChange}
              onReset={handleReset}
            />
          ))}
        </TabsContent>

        <TabsContent value="manuais" className="space-y-3 mt-0">
          <p className="text-xs text-muted-foreground pb-1">
            Enviadas pelo atendente ao acionar botões na tela de atendimento (enviar orçamento, confirmar pagamento, etc).
          </p>
          {manuais.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onChange={handleChange}
              onReset={handleReset}
            />
          ))}
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      )}
    </div>
  );
}
