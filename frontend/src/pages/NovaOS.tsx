import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardCheck, Loader2, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { FormField, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  createOrdemServico,
  type OrdemServicoInput,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";

type NovaOSForm = {
  clienteId: string;
  aparelhoId: string;
  defeitoRelatado: string;
  diagnostico: string;
  status: OrdemServicoStatus;
  tecnicoResponsavel: string;
  valorPecas: string;
  valorMaoObra: string;
  entradaEm: string;
  previsaoEntregaEm: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: NovaOSForm = {
  clienteId: "",
  aparelhoId: "",
  defeitoRelatado: "",
  diagnostico: "",
  status: "recebido",
  tecnicoResponsavel: "",
  valorPecas: "0",
  valorMaoObra: "0",
  entradaEm: today,
  previsaoEntregaEm: "",
};

const tecnicoOptions = ["Rafael S.", "Diego M.", "Bruno T."];

const NovaOS = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NovaOSForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "nova-os"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "nova-os", form.clienteId],
    queryFn: () => listAparelhos({ clienteId: form.clienteId }),
    enabled: Boolean(form.clienteId),
  });

  const clientes = useMemo(
    () => clientesQuery.data ?? [],
    [clientesQuery.data],
  );
  const aparelhos = useMemo(
    () => aparelhosQuery.data ?? [],
    [aparelhosQuery.data],
  );

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId),
    [clientes, form.clienteId],
  );

  const selectedAparelho = useMemo(
    () => aparelhos.find((aparelho) => aparelho.id === form.aparelhoId),
    [aparelhos, form.aparelhoId],
  );

  const valorTotal =
    (Number(form.valorPecas.replace(",", ".")) || 0) +
    (Number(form.valorMaoObra.replace(",", ".")) || 0);

  const createMutation = useMutation({
    mutationFn: (input: OrdemServicoInput) => createOrdemServico(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      navigate("/app/ordens");
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Nao foi possivel criar a OS.",
      );
    },
  });

  const updateForm = (field: keyof NovaOSForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "clienteId" ? { aparelhoId: "" } : {}),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    createMutation.mutate({
      clienteId: form.clienteId,
      aparelhoId: form.aparelhoId,
      defeitoRelatado: form.defeitoRelatado,
      diagnostico: form.diagnostico || undefined,
      status: form.status,
      tecnicoResponsavel: form.tecnicoResponsavel || undefined,
      valorPecas: Number(form.valorPecas.replace(",", ".")) || 0,
      valorMaoObra: Number(form.valorMaoObra.replace(",", ".")) || 0,
      entradaEm: form.entradaEm || undefined,
      previsaoEntregaEm: form.previsaoEntregaEm || undefined,
    });
  };

  const isLoadingBase =
    clientesQuery.isLoading ||
    (Boolean(form.clienteId) && aparelhosQuery.isLoading);
  const canSubmit = Boolean(
    form.clienteId && form.aparelhoId && form.defeitoRelatado.trim(),
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Etapa 1 de 3"
        title="Nova ordem de servico"
        description="Selecione um cliente, escolha o aparelho cadastrado e registre a entrada na bancada."
        actions={
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-md bg-primary/15 px-3 py-1.5 font-mono text-primary">
              1. Cadastro
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">
              2. Checklist
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">
              3. Diagnostico
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Cliente e aparelho
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="nova-os-cliente" label="Cliente">
                <Select
                  value={form.clienteId}
                  onValueChange={(value) => updateForm("clienteId", value)}
                >
                  <SelectTrigger id="nova-os-cliente">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="nova-os-aparelho" label="Aparelho">
                <Select
                  value={form.aparelhoId}
                  onValueChange={(value) => updateForm("aparelhoId", value)}
                  disabled={!form.clienteId || aparelhos.length === 0}
                >
                  <SelectTrigger id="nova-os-aparelho">
                    <SelectValue
                      placeholder={
                        form.clienteId
                          ? "Selecione o aparelho"
                          : "Selecione o cliente"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {aparelhos.map((aparelho) => (
                      <SelectItem key={aparelho.id} value={aparelho.id}>
                        {aparelho.marca} {aparelho.modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm md:col-span-2">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Resumo
                </p>
                <p className="mt-1 font-medium">
                  {selectedCliente?.nome ?? "Cliente nao selecionado"}
                </p>
                <p className="text-muted-foreground">
                  {selectedAparelho
                    ? `${selectedAparelho.marca} ${selectedAparelho.modelo} ${selectedAparelho.imeiSerial ? `- ${selectedAparelho.imeiSerial}` : ""}`
                    : "Aparelho nao selecionado"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Defeito e diagnostico
            </h3>
            <div className="space-y-4">
              <FormField
                id="nova-os-defeito"
                label="Defeito relatado pelo cliente"
              >
                <Textarea
                  id="nova-os-defeito"
                  rows={3}
                  value={form.defeitoRelatado}
                  onChange={(event) =>
                    updateForm("defeitoRelatado", event.target.value)
                  }
                  placeholder="Descreva o problema conforme relato do cliente..."
                  required
                />
              </FormField>
              <FormField id="nova-os-diagnostico" label="Diagnostico inicial">
                <Textarea
                  id="nova-os-diagnostico"
                  rows={2}
                  value={form.diagnostico}
                  onChange={(event) =>
                    updateForm("diagnostico", event.target.value)
                  }
                  placeholder="Notas internas, teste rapido ou primeira avaliacao..."
                />
              </FormField>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Operacao
            </h3>
            <div className="space-y-4">
              <FormField id="nova-os-entrada" label="Data de entrada">
                <Input
                  id="nova-os-entrada"
                  type="date"
                  value={form.entradaEm}
                  onChange={(event) =>
                    updateForm("entradaEm", event.target.value)
                  }
                />
              </FormField>
              <FormField id="nova-os-previsao" label="Previsao de entrega">
                <Input
                  id="nova-os-previsao"
                  type="date"
                  value={form.previsaoEntregaEm}
                  onChange={(event) =>
                    updateForm("previsaoEntregaEm", event.target.value)
                  }
                />
              </FormField>
              <FormField id="nova-os-tecnico" label="Tecnico responsavel">
                <Select
                  value={form.tecnicoResponsavel}
                  onValueChange={(value) =>
                    updateForm("tecnicoResponsavel", value)
                  }
                >
                  <SelectTrigger id="nova-os-tecnico">
                    <SelectValue placeholder="Atribuir tecnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicoOptions.map((tecnico) => (
                      <SelectItem key={tecnico} value={tecnico}>
                        {tecnico}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="nova-os-status" label="Status inicial">
                <Select
                  value={form.status}
                  onValueChange={(value) => updateForm("status", value)}
                >
                  <SelectTrigger id="nova-os-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="em_analise">Em analise</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Valores iniciais
            </h3>
            <div className="space-y-4">
              <FormField id="nova-os-pecas" label="Valor de pecas">
                <Input
                  id="nova-os-pecas"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorPecas}
                  onChange={(event) =>
                    updateForm("valorPecas", event.target.value)
                  }
                />
              </FormField>
              <FormField id="nova-os-mao-obra" label="Valor de mao de obra">
                <Input
                  id="nova-os-mao-obra"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorMaoObra}
                  onChange={(event) =>
                    updateForm("valorMaoObra", event.target.value)
                  }
                />
              </FormField>
              <div className="rounded-md border border-border bg-secondary/30 p-3">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Total previsto
                </p>
                <p className="font-display text-xl font-bold">
                  {valorTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Proximo passo
            </p>
            <h3 className="mt-1 font-display text-base font-semibold">
              Checklist do aparelho
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A OS sera criada agora. O checklist real sera vinculado na proxima
              etapa.
            </p>
            {formError && (
              <p className="mt-3 text-sm text-destructive">{formError}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                disabled={
                  !canSubmit || createMutation.isPending || isLoadingBase
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar OS
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/checklist">
                  <ClipboardCheck className="h-4 w-4" /> Ir ao checklist
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default NovaOS;
