import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronsUpDown, ClipboardCheck, Loader2, Plus, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DatePicker } from "@/components/ui/date-picker";

import { FormField, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { createAparelho, listAparelhos } from "@/services/aparelhos";
import { createCliente, listClientes } from "@/services/clientes";
import {
  createOrdemServico,
  type OrdemServicoInput,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";
import { listTecnicos } from "@/services/usuarios";

type NovaOSForm = {
  clienteId: string;
  aparelhoId: string;
  defeitoRelatado: string;
  diagnostico: string;
  status: OrdemServicoStatus;
  prioridade: "baixa" | "normal" | "urgente";
  tecnicoResponsavel: string;
  garantiaDias: string;
  valorPecas: string;
  valorMaoObra: string;
  entradaEm: string;
  previsaoEntregaEm: string;
};

type QuickClienteForm = {
  nome: string;
  telefone: string;
  documento: string;
  email: string;
  observacoes: string;
};

type QuickAparelhoForm = {
  marca: string;
  modelo: string;
  cor: string;
  imeiSerial: string;
  estadoFisico: string;
  acessorios: string;
  observacoes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: NovaOSForm = {
  clienteId: "",
  aparelhoId: "",
  defeitoRelatado: "",
  diagnostico: "",
  status: "recebido",
  prioridade: "normal",
  tecnicoResponsavel: "",
  garantiaDias: "90",
  valorPecas: "0",
  valorMaoObra: "0",
  entradaEm: today,
  previsaoEntregaEm: "",
};

const emptyQuickCliente: QuickClienteForm = {
  nome: "",
  telefone: "",
  documento: "",
  email: "",
  observacoes: "",
};

const emptyQuickAparelho: QuickAparelhoForm = {
  marca: "",
  modelo: "",
  cor: "",
  imeiSerial: "",
  estadoFisico: "",
  acessorios: "",
  observacoes: "",
};

const parseCurrency = (value: string) => Number(value.replace(",", ".")) || 0;

const DRAFT_KEY = "rr-nova-os-rascunho";

const NovaOS = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NovaOSForm>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyForm, ...JSON.parse(saved) };
    } catch {}
    return emptyForm;
  });
  const [quickCliente, setQuickCliente] = useState<QuickClienteForm>(emptyQuickCliente);
  const [quickAparelho, setQuickAparelho] = useState<QuickAparelhoForm>(emptyQuickAparelho);
  const [formError, setFormError] = useState<string | null>(null);
  const [cadastroRapidoError, setCadastroRapidoError] = useState<string | null>(null);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [aparelhoOpen, setAparelhoOpen] = useState(false);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "nova-os"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "nova-os", form.clienteId],
    queryFn: () => listAparelhos({ clienteId: form.clienteId }),
    enabled: Boolean(form.clienteId),
  });

  const tecnicosQuery = useQuery({
    queryKey: ["usuarios", "tecnicos"],
    queryFn: listTecnicos,
  });

  const clientes = useMemo(
    () => clientesQuery.data ?? [],
    [clientesQuery.data],
  );
  const aparelhos = useMemo(
    () => aparelhosQuery.data ?? [],
    [aparelhosQuery.data],
  );
  const tecnicoOptions = useMemo(
    () =>
      (tecnicosQuery.data ?? [])
        .map((tecnico) => tecnico.displayName || tecnico.email)
        .filter((nome): nome is string => Boolean(nome)),
    [tecnicosQuery.data],
  );

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId),
    [clientes, form.clienteId],
  );

  const selectedAparelho = useMemo(
    () => aparelhos.find((aparelho) => aparelho.id === form.aparelhoId),
    [aparelhos, form.aparelhoId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const { clienteId, aparelhoId, ...rest } = form;
      if (rest.defeitoRelatado || rest.diagnostico) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form]);

  const valorTotal = parseCurrency(form.valorPecas) + parseCurrency(form.valorMaoObra);

  const createMutation = useMutation({
    mutationFn: (input: OrdemServicoInput) => createOrdemServico(input),
    onSuccess: async (ordem) => {
      await queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      localStorage.removeItem(DRAFT_KEY);
      toast.success("OS criada! Seguindo para o checklist.");
      navigate(`/app/checklist?ordemId=${ordem.id}`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Não foi possível criar a OS.";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const createCadastroRapidoMutation = useMutation({
    mutationFn: async () => {
      const cliente = await createCliente({
        nome: quickCliente.nome.trim(),
        telefone: quickCliente.telefone.trim(),
        documento: quickCliente.documento.trim() || undefined,
        email: quickCliente.email.trim() || undefined,
        observacoes: quickCliente.observacoes.trim() || undefined,
      });
      const aparelho = await createAparelho({
        clienteId: cliente.id,
        marca: quickAparelho.marca.trim(),
        modelo: quickAparelho.modelo.trim(),
        cor: quickAparelho.cor.trim() || undefined,
        imeiSerial: quickAparelho.imeiSerial.trim() || undefined,
        estadoFisico: quickAparelho.estadoFisico.trim() || undefined,
        acessorios: quickAparelho.acessorios.trim() || undefined,
        observacoes: quickAparelho.observacoes.trim() || undefined,
      });
      return { cliente, aparelho };
    },
    onSuccess: async ({ cliente, aparelho }) => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
      setForm((current) => ({
        ...current,
        clienteId: cliente.id,
        aparelhoId: aparelho.id,
      }));
      setQuickCliente(emptyQuickCliente);
      setQuickAparelho(emptyQuickAparelho);
      setCadastroRapidoError(null);
      toast.success(`${cliente.nome} e ${aparelho.marca} ${aparelho.modelo} cadastrados.`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Não foi possível cadastrar cliente e aparelho.";
      setCadastroRapidoError(msg);
      toast.error(msg);
    },
  });

  const updateForm = (field: keyof NovaOSForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "clienteId" ? { aparelhoId: "" } : {}),
    }));
  };

  const updateQuickCliente = (field: keyof QuickClienteForm, value: string) => {
    setQuickCliente((current) => ({ ...current, [field]: value }));
  };

  const updateQuickAparelho = (field: keyof QuickAparelhoForm, value: string) => {
    setQuickAparelho((current) => ({ ...current, [field]: value }));
  };

  const handleCreateCadastroRapido = () => {
    setCadastroRapidoError(null);

    if (!quickCliente.nome.trim() || !quickCliente.telefone.trim()) {
      setCadastroRapidoError("Informe nome e telefone do cliente.");
      return;
    }

    if (!quickAparelho.marca.trim() || !quickAparelho.modelo.trim()) {
      setCadastroRapidoError("Informe marca e modelo do aparelho.");
      return;
    }

    createCadastroRapidoMutation.mutate();
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
      prioridade: form.prioridade,
      tecnicoResponsavel: form.tecnicoResponsavel || undefined,
      valorPecas: parseCurrency(form.valorPecas),
      valorMaoObra: parseCurrency(form.valorMaoObra),
      entradaEm: form.entradaEm || undefined,
      previsaoEntregaEm: form.previsaoEntregaEm || undefined,
      prazoPrometidoEm: form.previsaoEntregaEm || undefined,
      garantiaDias: Number(form.garantiaDias) || undefined,
    });
  };

  const isLoadingBase =
    clientesQuery.isLoading ||
    (Boolean(form.clienteId) && aparelhosQuery.isLoading);
  const canSubmit = Boolean(
    form.clienteId && form.aparelhoId && form.defeitoRelatado.trim(),
  );
  const canCreateCadastroRapido = Boolean(
    quickCliente.nome.trim() &&
      quickCliente.telefone.trim() &&
      quickAparelho.marca.trim() &&
      quickAparelho.modelo.trim(),
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Etapa 1 de 3"
        title="Nova ordem de serviço"
        description="Abra a OS no balcão com cliente, aparelho e defeito relatado. Valores podem ficar zerados até o diagnóstico."
        actions={
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-md bg-primary/15 px-3 py-1.5 font-mono text-primary">
              1. Entrada
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">
              2. Checklist
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">
              3. Diagnóstico
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="surface-panel p-6">
            <div className="mb-4 flex flex-col gap-1">
              <h3 className="font-display text-base font-semibold">
                Cliente e aparelho
              </h3>
              <p className="text-xs text-muted-foreground">
                Busque um cadastro existente ou crie cliente e aparelho sem sair da OS.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="nova-os-cliente" label="Cliente existente">
                <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {form.clienteId
                        ? clientes.find((c) => c.id === form.clienteId)?.nome
                        : "Buscar cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-full min-w-[320px]">
                    <Command>
                      <CommandInput placeholder="Nome ou telefone..." />
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {clientes.map((cliente) => (
                            <CommandItem
                              key={cliente.id}
                              value={`${cliente.nome} ${cliente.telefone}`}
                              onSelect={() => {
                                updateForm("clienteId", cliente.id);
                                setClienteOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.clienteId === cliente.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {cliente.nome} — {cliente.telefone}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormField>
              <FormField id="nova-os-aparelho" label="Aparelho existente">
                <Popover
                  open={aparelhoOpen}
                  onOpenChange={(open) => {
                    if (!form.clienteId) return;
                    setAparelhoOpen(open);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={!form.clienteId}
                      className="w-full justify-between font-normal"
                    >
                      {form.aparelhoId
                        ? (() => {
                            const a = aparelhos.find((ap) => ap.id === form.aparelhoId);
                            return a
                              ? `${a.marca} ${a.modelo}${a.imeiSerial ? ` — ${a.imeiSerial}` : ""}`
                              : "Buscar aparelho...";
                          })()
                        : form.clienteId
                          ? "Buscar aparelho..."
                          : "Selecione o cliente primeiro"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-full min-w-[320px]">
                    <Command>
                      <CommandInput placeholder="Marca, modelo ou IMEI..." />
                      <CommandEmpty>
                        {aparelhos.length === 0
                          ? "Nenhum aparelho cadastrado para este cliente."
                          : "Nenhum aparelho encontrado."}
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {aparelhos.map((aparelho) => (
                            <CommandItem
                              key={aparelho.id}
                              value={`${aparelho.marca} ${aparelho.modelo} ${aparelho.imeiSerial ?? ""}`}
                              onSelect={() => {
                                updateForm("aparelhoId", aparelho.id);
                                setAparelhoOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.aparelhoId === aparelho.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {aparelho.marca} {aparelho.modelo}
                              {aparelho.imeiSerial ? ` — ${aparelho.imeiSerial}` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormField>
            </div>

            <div className="mt-5 rounded-md border border-border bg-secondary/20 p-4">
              <div className="mb-4">
                <p className="font-display text-sm font-semibold">Cadastro rápido</p>
                <p className="text-xs text-muted-foreground">
                  Preencha cliente e aparelho e salve tudo de uma vez sem sair da OS.
                </p>
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cliente
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  value={quickCliente.nome}
                  onChange={(event) => updateQuickCliente("nome", event.target.value)}
                  placeholder="Nome do cliente"
                />
                <Input
                  value={quickCliente.telefone}
                  onChange={(event) => updateQuickCliente("telefone", event.target.value)}
                  placeholder="Telefone/WhatsApp"
                />
                <Input
                  value={quickCliente.documento}
                  onChange={(event) => updateQuickCliente("documento", event.target.value)}
                  placeholder="CPF/CNPJ opcional"
                />
                <Input
                  value={quickCliente.email}
                  onChange={(event) => updateQuickCliente("email", event.target.value)}
                  placeholder="E-mail opcional"
                />
                <Textarea
                  className="sm:col-span-2"
                  rows={2}
                  value={quickCliente.observacoes}
                  onChange={(event) => updateQuickCliente("observacoes", event.target.value)}
                  placeholder="Observações do cliente"
                />
              </div>
              <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Aparelho
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  value={quickAparelho.marca}
                  onChange={(event) => updateQuickAparelho("marca", event.target.value)}
                  placeholder="Marca"
                />
                <Input
                  value={quickAparelho.modelo}
                  onChange={(event) => updateQuickAparelho("modelo", event.target.value)}
                  placeholder="Modelo"
                />
                <Input
                  value={quickAparelho.cor}
                  onChange={(event) => updateQuickAparelho("cor", event.target.value)}
                  placeholder="Cor opcional"
                />
                <Input
                  value={quickAparelho.imeiSerial}
                  onChange={(event) => updateQuickAparelho("imeiSerial", event.target.value)}
                  placeholder="IMEI/série opcional"
                />
                <Input
                  value={quickAparelho.estadoFisico}
                  onChange={(event) => updateQuickAparelho("estadoFisico", event.target.value)}
                  placeholder="Estado físico"
                />
                <Input
                  value={quickAparelho.acessorios}
                  onChange={(event) => updateQuickAparelho("acessorios", event.target.value)}
                  placeholder="Acessórios entregues"
                />
                <Textarea
                  className="sm:col-span-2"
                  rows={2}
                  value={quickAparelho.observacoes}
                  onChange={(event) => updateQuickAparelho("observacoes", event.target.value)}
                  placeholder="Observações do aparelho"
                />
              </div>
              {cadastroRapidoError && (
                <p className="mt-3 text-xs text-destructive">{cadastroRapidoError}</p>
              )}
              <Button
                className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                type="button"
                disabled={!canCreateCadastroRapido || createCadastroRapidoMutation.isPending}
                onClick={handleCreateCadastroRapido}
              >
                {createCadastroRapidoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Salvar cliente e aparelho
              </Button>
            </div>

            <div className="mt-5 rounded-md border border-border bg-secondary/30 p-3 text-sm">
              <p className="font-mono text-[10px] uppercase text-muted-foreground">
                Resumo
              </p>
              <p className="mt-1 font-medium">
                {selectedCliente?.nome ?? "Cliente não selecionado"}
              </p>
              <p className="text-muted-foreground">
                {selectedAparelho
                  ? `${selectedAparelho.marca} ${selectedAparelho.modelo} ${selectedAparelho.imeiSerial ? `- ${selectedAparelho.imeiSerial}` : ""}`
                  : "Aparelho não selecionado"}
              </p>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Defeito e diagnóstico
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
              <FormField id="nova-os-diagnostico" label="Diagnóstico inicial">
                <Textarea
                  id="nova-os-diagnostico"
                  rows={2}
                  value={form.diagnostico}
                  onChange={(event) =>
                    updateForm("diagnostico", event.target.value)
                  }
                  placeholder="Opcional: teste rápido, primeira avaliação ou notas internas..."
                />
              </FormField>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">
              Operação
            </h3>
            <div className="space-y-4">
              <FormField id="nova-os-entrada" label="Data de entrada">
                <DatePicker
                  value={form.entradaEm}
                  onChange={(v) => updateForm("entradaEm", v)}
                />
              </FormField>
              <FormField id="nova-os-previsao" label="Previsão de entrega">
                <DatePicker
                  value={form.previsaoEntregaEm}
                  onChange={(v) => updateForm("previsaoEntregaEm", v)}
                  placeholder="Sem previsão"
                />
              </FormField>
              <FormField id="nova-os-prioridade" label="Prioridade">
                <Select
                  value={form.prioridade}
                  onValueChange={(value) => updateForm("prioridade", value)}
                >
                  <SelectTrigger id="nova-os-prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="nova-os-tecnico" label="Técnico responsável">
                <Select
                  value={form.tecnicoResponsavel}
                  onValueChange={(value) =>
                    updateForm("tecnicoResponsavel", value)
                  }
                  disabled={
                    tecnicosQuery.isLoading || tecnicoOptions.length === 0
                  }
                >
                  <SelectTrigger id="nova-os-tecnico">
                    <SelectValue
                      placeholder={
                        tecnicosQuery.isLoading
                          ? "Carregando técnicos"
                          : tecnicoOptions.length > 0
                            ? "Atribuir técnico"
                            : "Nenhum técnico cadastrado"
                      }
                    />
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
                    <SelectItem value="em_analise">Em análise</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="nova-os-garantia" label="Garantia padrão (dias)">
                <Input
                  id="nova-os-garantia"
                  type="number"
                  min="0"
                  step="1"
                  value={form.garantiaDias}
                  onChange={(event) =>
                    updateForm("garantiaDias", event.target.value)
                  }
                />
              </FormField>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-1 font-display text-base font-semibold">
              Valores opcionais
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Para aparelhos em análise ou orçamento, deixe zerado e preencha depois do diagnóstico.
            </p>
            <div className="space-y-4">
              <FormField id="nova-os-pecas" label="Valor de peças">
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
              <FormField id="nova-os-mao-obra" label="Valor de mão de obra">
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
              Próximo passo
            </p>
            <h3 className="mt-1 font-display text-base font-semibold">
              Checklist do aparelho
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ao salvar, você será levado diretamente ao checklist desta OS.
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
                Salvar OS e ir ao checklist
              </Button>
              <Button variant="outline" asChild>
                <Link to={form.aparelhoId ? "/app/checklist" : "/app/ordens"}>
                  <ClipboardCheck className="h-4 w-4" /> Ver checklists
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
