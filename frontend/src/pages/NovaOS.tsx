import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { capitalizeFirst, formatPhone, formatDocument } from "@/lib/formatters";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  createAparelho,
  deleteAparelho,
  listAparelhos,
  updateAparelho,
  type AparelhoInput,
} from "@/services/aparelhos";
import {
  createCliente,
  deleteCliente,
  listClientes,
  updateCliente,
  type ClienteInput,
} from "@/services/clientes";
import {
  createOrdemServico,
  type OrdemServicoFormaPagamento,
  type OrdemServicoInput,
  type OrdemServicoStatus,
  type TipoSenhaAparelho,
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
  valorAdiantado: string;
  formaPagamentoAdiantamento: OrdemServicoFormaPagamento | "";
  entradaEm: string;
  previsaoEntregaEm: string;
  tipoSenha: TipoSenhaAparelho;
  senhaAparelho: string;
  padraoDeSenha: string;
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
  tecnicoResponsavel: "Robison Romalino",
  garantiaDias: "90",
  valorPecas: "0",
  valorMaoObra: "0",
  valorAdiantado: "",
  formaPagamentoAdiantamento: "",
  entradaEm: today,
  previsaoEntregaEm: "",
  tipoSenha: "nao_informou",
  senhaAparelho: "",
  padraoDeSenha: "",
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
  const [quickCliente, setQuickCliente] =
    useState<QuickClienteForm>(emptyQuickCliente);
  const [quickAparelho, setQuickAparelho] =
    useState<QuickAparelhoForm>(emptyQuickAparelho);
  const [formError, setFormError] = useState<string | null>(null);
  const [cadastroRapidoError, setCadastroRapidoError] = useState<string | null>(
    null,
  );
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [clienteOpen, setClienteOpen] = useState(false);
  const [aparelhoOpen, setAparelhoOpen] = useState(false);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [aparelhoDialogOpen, setAparelhoDialogOpen] = useState(false);
  const [clienteEditForm, setClienteEditForm] =
    useState<QuickClienteForm>(emptyQuickCliente);
  const [aparelhoEditForm, setAparelhoEditForm] =
    useState<QuickAparelhoForm>(emptyQuickAparelho);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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

  const valorTotal =
    parseCurrency(form.valorPecas) + parseCurrency(form.valorMaoObra);

  const createMutation = useMutation({
    mutationFn: (input: OrdemServicoInput) => createOrdemServico(input),
    onSuccess: async (ordem) => {
      await queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      localStorage.removeItem(DRAFT_KEY);
      toast.success("OS criada! Seguindo para o checklist.");
      navigate(`/app/checklist?ordemId=${ordem.id}`);
    },
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Não foi possível criar a OS.";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const createCadastroRapidoMutation = useMutation({
    mutationFn: async () => {
      let clienteId = form.clienteId;
      let clienteNome = "";
      if (!clienteId) {
        const cliente = await createCliente({
          nome: quickCliente.nome.trim(),
          telefone: quickCliente.telefone.trim() || undefined,
          documento: quickCliente.documento.trim() || undefined,
          email: quickCliente.email.trim() || undefined,
          observacoes: quickCliente.observacoes.trim() || undefined,
        });
        clienteId = cliente.id;
        clienteNome = cliente.nome;
      }
      const aparelho = await createAparelho({
        clienteId,
        marca: quickAparelho.marca.trim(),
        modelo: quickAparelho.modelo.trim(),
        cor: quickAparelho.cor.trim() || undefined,
        imeiSerial: quickAparelho.imeiSerial.trim() || undefined,
        estadoFisico: quickAparelho.estadoFisico.trim() || undefined,
        acessorios: quickAparelho.acessorios.trim() || undefined,
        observacoes: quickAparelho.observacoes.trim() || undefined,
      });
      return { clienteId, clienteNome, aparelho };
    },
    onSuccess: async ({ clienteId, clienteNome, aparelho }) => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
      setForm((current) => ({
        ...current,
        clienteId,
        aparelhoId: aparelho.id,
      }));
      setQuickCliente(emptyQuickCliente);
      setQuickAparelho(emptyQuickAparelho);
      setCadastroRapidoError(null);
      const label = clienteNome
        ? `${clienteNome} e ${aparelho.marca} ${aparelho.modelo} cadastrados.`
        : `${aparelho.marca} ${aparelho.modelo} adicionado ao cliente.`;
      toast.success(label);
    },
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Não foi possível cadastrar.";
      setCadastroRapidoError(msg);
      toast.error(msg);
    },
  });

  const updateClienteMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClienteInput }) =>
      updateCliente(id, input),
    onSuccess: async (cliente) => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setForm((current) => ({ ...current, clienteId: cliente.id }));
      setClienteDialogOpen(false);
      setEditErrors({});
      toast.success("Cliente atualizado.");
    },
    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o cliente.";
      toast.error(msg);
    },
  });

  const updateAparelhoMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AparelhoInput }) =>
      updateAparelho(id, input),
    onSuccess: async (aparelho) => {
      await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
      setForm((current) => ({
        ...current,
        clienteId: aparelho.clienteId,
        aparelhoId: aparelho.id,
      }));
      setAparelhoDialogOpen(false);
      setEditErrors({});
      toast.success("Aparelho atualizado.");
    },
    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o aparelho.";
      toast.error(msg);
    },
  });

  const deleteClienteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
      setForm((current) => ({ ...current, clienteId: "", aparelhoId: "" }));
      setQuickCliente(emptyQuickCliente);
      setQuickAparelho(emptyQuickAparelho);
      toast.success("Cliente excluído.");
    },
    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o cliente.";
      toast.error(msg);
    },
  });

  const deleteAparelhoMutation = useMutation({
    mutationFn: deleteAparelho,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
      setForm((current) => ({ ...current, aparelhoId: "" }));
      setQuickAparelho(emptyQuickAparelho);
      toast.success("Aparelho excluído.");
    },
    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o aparelho.";
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

  const updateQuickAparelho = (
    field: keyof QuickAparelhoForm,
    value: string,
  ) => {
    setQuickAparelho((current) => ({ ...current, [field]: value }));
  };

  const updateClienteEditForm = (
    field: keyof QuickClienteForm,
    value: string,
  ) => {
    setClienteEditForm((current) => ({ ...current, [field]: value }));
  };

  const updateAparelhoEditForm = (
    field: keyof QuickAparelhoForm,
    value: string,
  ) => {
    setAparelhoEditForm((current) => ({ ...current, [field]: value }));
  };

  const openClienteEditDialog = () => {
    if (!selectedCliente) return;
    setClienteEditForm({
      nome: selectedCliente.nome,
      telefone: selectedCliente.telefone ?? "",
      documento: selectedCliente.documento ?? "",
      email: selectedCliente.email ?? "",
      observacoes: selectedCliente.observacoes ?? "",
    });
    setEditErrors({});
    setClienteDialogOpen(true);
  };

  const openAparelhoEditDialog = () => {
    if (!selectedAparelho) return;
    setAparelhoEditForm({
      marca: selectedAparelho.marca,
      modelo: selectedAparelho.modelo,
      cor: selectedAparelho.cor ?? "",
      imeiSerial: selectedAparelho.imeiSerial ?? "",
      estadoFisico: selectedAparelho.estadoFisico ?? "",
      acessorios: selectedAparelho.acessorios ?? "",
      observacoes: selectedAparelho.observacoes ?? "",
    });
    setEditErrors({});
    setAparelhoDialogOpen(true);
  };

  const handleNovoCliente = () => {
    setForm((current) => ({ ...current, clienteId: "", aparelhoId: "" }));
    setQuickCliente(emptyQuickCliente);
    setQuickAparelho(emptyQuickAparelho);
    setQuickErrors({});
  };

  const handleNovoAparelho = () => {
    setForm((current) => ({ ...current, aparelhoId: "" }));
    setQuickAparelho(emptyQuickAparelho);
    setQuickErrors({});
  };

  const handleUpdateCliente = () => {
    if (!selectedCliente) return;
    const errs: Record<string, string> = {};
    if (!clienteEditForm.nome.trim()) errs.clienteNome = "Nome é obrigatório.";
    if (
      clienteEditForm.telefone.trim() &&
      clienteEditForm.telefone.replace(/\D/g, "").length < 10
    ) {
      errs.clienteTelefone = "Telefone inválido.";
    }
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    updateClienteMutation.mutate({
      id: selectedCliente.id,
      input: {
        nome: clienteEditForm.nome.trim(),
        telefone: clienteEditForm.telefone.trim() || undefined,
        documento: clienteEditForm.documento.trim() || undefined,
        email: clienteEditForm.email.trim() || undefined,
        observacoes: clienteEditForm.observacoes.trim() || undefined,
        receberMensagemAutomatica:
          selectedCliente.receberMensagemAutomatica ?? true,
      },
    });
  };

  const handleUpdateAparelho = () => {
    if (!selectedAparelho || !form.clienteId) return;
    const errs: Record<string, string> = {};
    if (!aparelhoEditForm.marca.trim()) {
      errs.aparelhoMarca = "Marca é obrigatória.";
    }
    if (!aparelhoEditForm.modelo.trim()) {
      errs.aparelhoModelo = "Modelo é obrigatório.";
    }
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    updateAparelhoMutation.mutate({
      id: selectedAparelho.id,
      input: {
        clienteId: form.clienteId,
        marca: aparelhoEditForm.marca.trim(),
        modelo: aparelhoEditForm.modelo.trim(),
        cor: aparelhoEditForm.cor.trim() || undefined,
        imeiSerial: aparelhoEditForm.imeiSerial.trim() || undefined,
        estadoFisico: aparelhoEditForm.estadoFisico.trim() || undefined,
        acessorios: aparelhoEditForm.acessorios.trim() || undefined,
        observacoes: aparelhoEditForm.observacoes.trim() || undefined,
      },
    });
  };

  const handleDeleteCliente = () => {
    if (!selectedCliente) return;
    const confirmed = window.confirm(
      `Excluir o cliente ${selectedCliente.nome}?`,
    );
    if (confirmed) deleteClienteMutation.mutate(selectedCliente.id);
  };

  const handleDeleteAparelho = () => {
    if (!selectedAparelho) return;
    const confirmed = window.confirm(
      `Excluir o aparelho ${selectedAparelho.marca} ${selectedAparelho.modelo}?`,
    );
    if (confirmed) deleteAparelhoMutation.mutate(selectedAparelho.id);
  };

  const handleCreateCadastroRapido = () => {
    setCadastroRapidoError(null);
    const errs: Record<string, string> = {};
    if (!form.clienteId) {
      if (!quickCliente.nome.trim()) errs.clienteNome = "Nome é obrigatório.";
      if (
        quickCliente.telefone.trim() &&
        quickCliente.telefone.replace(/\D/g, "").length < 10
      )
        errs.clienteTelefone = "Telefone inválido.";
    }
    if (!quickAparelho.marca.trim())
      errs.aparelhoMarca = "Marca é obrigatória.";
    if (!quickAparelho.modelo.trim())
      errs.aparelhoModelo = "Modelo é obrigatório.";
    if (Object.keys(errs).length > 0) {
      setQuickErrors(errs);
      return;
    }
    setQuickErrors({});
    createCadastroRapidoMutation.mutate();
  };

  const updQuick = (field: string, value: string) =>
    setQuickErrors((e) => {
      const n = { ...e };
      delete n[field];
      return n;
    });

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
      valorAdiantado: parseCurrency(form.valorAdiantado) || undefined,
      formaPagamentoAdiantamento: form.formaPagamentoAdiantamento || undefined,
      entradaEm: form.entradaEm || undefined,
      previsaoEntregaEm: form.previsaoEntregaEm || undefined,
      prazoPrometidoEm: form.previsaoEntregaEm || undefined,
      garantiaDias: Number(form.garantiaDias) || undefined,
      tipoSenha: form.tipoSenha,
      senhaAparelho:
        form.tipoSenha === "numerica"
          ? form.senhaAparelho || undefined
          : undefined,
      padraoDeSenha:
        form.tipoSenha === "padrao"
          ? form.padraoDeSenha || undefined
          : undefined,
    });
  };

  const isLoadingBase =
    clientesQuery.isLoading ||
    (Boolean(form.clienteId) && aparelhosQuery.isLoading);
  const canSubmit = Boolean(
    form.clienteId && form.aparelhoId && form.defeitoRelatado.trim(),
  );
  const canCreateCadastroRapido = Boolean(
    (form.clienteId ||
      quickCliente.nome.trim()) &&
    quickAparelho.marca.trim() &&
    quickAparelho.modelo.trim(),
  );

  return (
    <>
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
                  Busque um cadastro existente ou crie cliente e aparelho sem
                  sair da OS.
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
                                value={`${cliente.nome} ${cliente.telefone ?? ""}`}
                                onSelect={() => {
                                  updateForm("clienteId", cliente.id);
                                  setClienteOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.clienteId === cliente.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              {cliente.nome}
                              {cliente.telefone ? ` — ${cliente.telefone}` : ""}
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
                              const a = aparelhos.find(
                                (ap) => ap.id === form.aparelhoId,
                              );
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
                                    form.aparelhoId === aparelho.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {aparelho.marca} {aparelho.modelo}
                                {aparelho.imeiSerial
                                  ? ` — ${aparelho.imeiSerial}`
                                  : ""}
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
                  <p className="font-display text-sm font-semibold">
                    {form.clienteId ? "Novo aparelho" : "Cadastro rápido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.clienteId
                      ? "Adicione um novo aparelho ao cliente selecionado acima."
                      : "Preencha cliente e aparelho e salve tudo de uma vez sem sair da OS."}
                  </p>
                </div>
                {!form.clienteId && (
                  <>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cliente
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Input
                          value={quickCliente.nome}
                          onChange={(event) => {
                            updateQuickCliente(
                              "nome",
                              capitalizeFirst(event.target.value),
                            );
                            updQuick("clienteNome", "");
                          }}
                          placeholder="Nome do cliente *"
                          className={
                            quickErrors.clienteNome ? "border-destructive" : ""
                          }
                        />
                        {quickErrors.clienteNome && (
                          <p className="text-xs text-destructive">
                            {quickErrors.clienteNome}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Input
                          value={quickCliente.telefone}
                          onChange={(event) => {
                            updateQuickCliente(
                              "telefone",
                              formatPhone(event.target.value),
                            );
                            updQuick("clienteTelefone", "");
                          }}
                            placeholder="Telefone/WhatsApp opcional"
                          inputMode="numeric"
                          className={
                            quickErrors.clienteTelefone
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {quickErrors.clienteTelefone && (
                          <p className="text-xs text-destructive">
                            {quickErrors.clienteTelefone}
                          </p>
                        )}
                      </div>
                      <Input
                        value={quickCliente.documento}
                        onChange={(event) =>
                          updateQuickCliente(
                            "documento",
                            formatDocument(event.target.value),
                          )
                        }
                        placeholder="CPF/CNPJ opcional"
                        inputMode="numeric"
                      />
                      <Input
                        value={quickCliente.email}
                        onChange={(event) =>
                          updateQuickCliente("email", event.target.value)
                        }
                        placeholder="E-mail opcional"
                        type="email"
                        inputMode="email"
                      />
                      <Textarea
                        className="sm:col-span-2"
                        rows={2}
                        value={quickCliente.observacoes}
                        onChange={(event) =>
                          updateQuickCliente(
                            "observacoes",
                            capitalizeFirst(event.target.value),
                          )
                        }
                        placeholder="Observações do cliente"
                      />
                    </div>
                  </>
                )}
                <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aparelho
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Input
                      value={quickAparelho.marca}
                      onChange={(event) => {
                        updateQuickAparelho(
                          "marca",
                          capitalizeFirst(event.target.value),
                        );
                        updQuick("aparelhoMarca", "");
                      }}
                      placeholder="Marca *"
                      className={
                        quickErrors.aparelhoMarca ? "border-destructive" : ""
                      }
                    />
                    {quickErrors.aparelhoMarca && (
                      <p className="text-xs text-destructive">
                        {quickErrors.aparelhoMarca}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Input
                      value={quickAparelho.modelo}
                      onChange={(event) => {
                        updateQuickAparelho(
                          "modelo",
                          capitalizeFirst(event.target.value),
                        );
                        updQuick("aparelhoModelo", "");
                      }}
                      placeholder="Modelo *"
                      className={
                        quickErrors.aparelhoModelo ? "border-destructive" : ""
                      }
                    />
                    {quickErrors.aparelhoModelo && (
                      <p className="text-xs text-destructive">
                        {quickErrors.aparelhoModelo}
                      </p>
                    )}
                  </div>
                  <Input
                    value={quickAparelho.cor}
                    onChange={(event) =>
                      updateQuickAparelho(
                        "cor",
                        capitalizeFirst(event.target.value),
                      )
                    }
                    placeholder="Cor opcional"
                  />
                  <Input
                    value={quickAparelho.imeiSerial}
                    onChange={(event) =>
                      updateQuickAparelho("imeiSerial", event.target.value)
                    }
                    placeholder="IMEI/série opcional"
                  />
                  <Input
                    value={quickAparelho.estadoFisico}
                    onChange={(event) =>
                      updateQuickAparelho(
                        "estadoFisico",
                        capitalizeFirst(event.target.value),
                      )
                    }
                    placeholder="Estado físico"
                  />
                  <Input
                    value={quickAparelho.acessorios}
                    onChange={(event) =>
                      updateQuickAparelho(
                        "acessorios",
                        capitalizeFirst(event.target.value),
                      )
                    }
                    placeholder="Acessórios entregues"
                  />
                  <Textarea
                    className="sm:col-span-2"
                    rows={2}
                    value={quickAparelho.observacoes}
                    onChange={(event) =>
                      updateQuickAparelho(
                        "observacoes",
                        capitalizeFirst(event.target.value),
                      )
                    }
                    placeholder="Observações do aparelho"
                  />
                </div>
                {cadastroRapidoError && (
                  <p className="mt-3 text-xs text-destructive">
                    {cadastroRapidoError}
                  </p>
                )}
                <Button
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  type="button"
                  disabled={
                    !canCreateCadastroRapido ||
                    createCadastroRapidoMutation.isPending
                  }
                  onClick={handleCreateCadastroRapido}
                >
                  {createCadastroRapidoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {form.clienteId
                    ? "Salvar aparelho"
                    : "Salvar cliente e aparelho"}
                </Button>
              </div>

              <div className="mt-5 rounded-md border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Resumo
                </p>
                <p className="mt-2 font-medium">
                  {selectedCliente?.nome ?? "Cliente não selecionado"}
                </p>
                <p className="text-muted-foreground">
                  {selectedAparelho
                    ? `${selectedAparelho.marca} ${selectedAparelho.modelo}${selectedAparelho.imeiSerial ? ` — ${selectedAparelho.imeiSerial}` : ""}`
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
                      updateForm(
                        "defeitoRelatado",
                        capitalizeFirst(event.target.value),
                      )
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
                      updateForm(
                        "diagnostico",
                        capitalizeFirst(event.target.value),
                      )
                    }
                    placeholder="Opcional: teste rápido, primeira avaliação ou notas internas..."
                  />
                </FormField>
              </div>
            </Card>

            <Card className="surface-panel p-6">
              <h3 className="mb-4 font-display text-base font-semibold">
                Senha do aparelho
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      "sem_senha",
                      "numerica",
                      "padrao",
                      "nao_informou",
                    ] as TipoSenhaAparelho[]
                  ).map((tipo) => {
                    const labels: Record<TipoSenhaAparelho, string> = {
                      sem_senha: "Sem senha",
                      numerica: "Numérica",
                      padrao: "Padrão/desenho",
                      nao_informou: "Não informou",
                    };
                    return (
                      <label
                        key={tipo}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${form.tipoSenha === tipo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                      >
                        <input
                          type="radio"
                          name="tipo-senha"
                          value={tipo}
                          checked={form.tipoSenha === tipo}
                          onChange={() => updateForm("tipoSenha", tipo)}
                          className="sr-only"
                        />
                        {labels[tipo]}
                      </label>
                    );
                  })}
                </div>

                {form.tipoSenha === "numerica" && (
                  <FormField id="nova-os-senha" label="Digite a senha">
                    <Input
                      id="nova-os-senha"
                      value={form.senhaAparelho}
                      onChange={(e) =>
                        updateForm("senhaAparelho", e.target.value)
                      }
                      placeholder="Senha numérica do aparelho"
                      autoComplete="off"
                      inputMode="numeric"
                    />
                  </FormField>
                )}

                {form.tipoSenha === "padrao" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Clique nos pontos em sequência para registrar o padrão:
                    </p>
                    <div className="flex items-start gap-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                          const seq = form.padraoDeSenha
                            ? form.padraoDeSenha.split("→").map((s) => s.trim())
                            : [];
                          const idx = seq.indexOf(String(n));
                          const isSelected = idx !== -1;
                          const isLast = idx === seq.length - 1;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                const seq = form.padraoDeSenha
                                  ? form.padraoDeSenha
                                      .split("→")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  : [];
                                const i = seq.indexOf(String(n));
                                let newSeq: string[];
                                if (i !== -1) {
                                  newSeq = seq.filter((_, idx) => idx < i);
                                } else {
                                  newSeq = [...seq, String(n)];
                                }
                                updateForm("padraoDeSenha", newSeq.join(" → "));
                              }}
                              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                                isLast
                                  ? "border-primary bg-primary text-primary-foreground scale-110"
                                  : isSelected
                                    ? "border-primary/60 bg-primary/20 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <span className="text-[10px] absolute -mt-5 font-mono">
                                    {idx + 1}
                                  </span>
                                  {n}
                                </>
                              ) : (
                                n
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-mono text-xs text-muted-foreground">
                          Sequência:
                        </p>
                        <p className="font-mono text-sm font-semibold text-primary min-h-[1.5rem]">
                          {form.padraoDeSenha || "—"}
                        </p>
                        {form.padraoDeSenha && (
                          <button
                            type="button"
                            onClick={() => updateForm("padraoDeSenha", "")}
                            className="text-xs text-destructive underline"
                          >
                            Limpar padrão
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                Para aparelhos em análise ou orçamento, deixe zerado e preencha
                depois do diagnóstico.
              </p>
              <div className="space-y-4">
                <FormField id="nova-os-pecas" label="Valor de peças">
                  <MoneyInput
                    id="nova-os-pecas"
                    value={form.valorPecas}
                    onChange={(v) => updateForm("valorPecas", v)}
                  />
                </FormField>
                <FormField id="nova-os-mao-obra" label="Valor de mão de obra">
                  <MoneyInput
                    id="nova-os-mao-obra"
                    value={form.valorMaoObra}
                    onChange={(v) => updateForm("valorMaoObra", v)}
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
                <div className="col-span-2 space-y-2 border-t border-border pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Adiantamento (opcional)
                  </p>
                  <FormField id="nova-os-adiantado" label="Valor recebido na entrada">
                    <MoneyInput
                      id="nova-os-adiantado"
                      value={form.valorAdiantado}
                      onChange={(v) => updateForm("valorAdiantado", v)}
                    />
                  </FormField>
                  {parseCurrency(form.valorAdiantado) > 0 && (
                    <FormField id="nova-os-forma-adiantamento" label="Forma de pagamento">
                      <div className="flex gap-2">
                        {(["pix", "cartao", "dinheiro"] as const).map((fp) => (
                          <button
                            key={fp}
                            type="button"
                            className={cn(
                              "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-all",
                              form.formaPagamentoAdiantamento === fp
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => updateForm("formaPagamentoAdiantamento", fp)}
                          >
                            {fp === "pix" ? "PIX" : fp === "cartao" ? "Cartão" : "Dinheiro"}
                          </button>
                        ))}
                      </div>
                    </FormField>
                  )}
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

      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Input
                value={clienteEditForm.nome}
                onChange={(event) => {
                  updateClienteEditForm(
                    "nome",
                    capitalizeFirst(event.target.value),
                  );
                  setEditErrors((current) => {
                    const next = { ...current };
                    delete next.clienteNome;
                    return next;
                  });
                }}
                placeholder="Nome do cliente *"
                className={editErrors.clienteNome ? "border-destructive" : ""}
              />
              {editErrors.clienteNome && (
                <p className="text-xs text-destructive">
                  {editErrors.clienteNome}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Input
                value={clienteEditForm.telefone}
                onChange={(event) => {
                  updateClienteEditForm(
                    "telefone",
                    formatPhone(event.target.value),
                  );
                  setEditErrors((current) => {
                    const next = { ...current };
                    delete next.clienteTelefone;
                    return next;
                  });
                }}
                placeholder="Telefone/WhatsApp opcional"
                inputMode="numeric"
                className={
                  editErrors.clienteTelefone ? "border-destructive" : ""
                }
              />
              {editErrors.clienteTelefone && (
                <p className="text-xs text-destructive">
                  {editErrors.clienteTelefone}
                </p>
              )}
            </div>
            <Input
              value={clienteEditForm.documento}
              onChange={(event) =>
                updateClienteEditForm(
                  "documento",
                  formatDocument(event.target.value),
                )
              }
              placeholder="CPF/CNPJ opcional"
              inputMode="numeric"
            />
            <Input
              value={clienteEditForm.email}
              onChange={(event) =>
                updateClienteEditForm("email", event.target.value)
              }
              placeholder="E-mail opcional"
              type="email"
              inputMode="email"
            />
            <Textarea
              className="sm:col-span-2"
              rows={3}
              value={clienteEditForm.observacoes}
              onChange={(event) =>
                updateClienteEditForm(
                  "observacoes",
                  capitalizeFirst(event.target.value),
                )
              }
              placeholder="Observações do cliente"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClienteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateCliente}
              disabled={updateClienteMutation.isPending}
            >
              {updateClienteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Salvar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aparelhoDialogOpen} onOpenChange={setAparelhoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar aparelho</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Input
                value={aparelhoEditForm.marca}
                onChange={(event) => {
                  updateAparelhoEditForm(
                    "marca",
                    capitalizeFirst(event.target.value),
                  );
                  setEditErrors((current) => {
                    const next = { ...current };
                    delete next.aparelhoMarca;
                    return next;
                  });
                }}
                placeholder="Marca *"
                className={editErrors.aparelhoMarca ? "border-destructive" : ""}
              />
              {editErrors.aparelhoMarca && (
                <p className="text-xs text-destructive">
                  {editErrors.aparelhoMarca}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Input
                value={aparelhoEditForm.modelo}
                onChange={(event) => {
                  updateAparelhoEditForm(
                    "modelo",
                    capitalizeFirst(event.target.value),
                  );
                  setEditErrors((current) => {
                    const next = { ...current };
                    delete next.aparelhoModelo;
                    return next;
                  });
                }}
                placeholder="Modelo *"
                className={
                  editErrors.aparelhoModelo ? "border-destructive" : ""
                }
              />
              {editErrors.aparelhoModelo && (
                <p className="text-xs text-destructive">
                  {editErrors.aparelhoModelo}
                </p>
              )}
            </div>
            <Input
              value={aparelhoEditForm.cor}
              onChange={(event) =>
                updateAparelhoEditForm(
                  "cor",
                  capitalizeFirst(event.target.value),
                )
              }
              placeholder="Cor opcional"
            />
            <Input
              value={aparelhoEditForm.imeiSerial}
              onChange={(event) =>
                updateAparelhoEditForm("imeiSerial", event.target.value)
              }
              placeholder="IMEI/série opcional"
            />
            <Input
              value={aparelhoEditForm.estadoFisico}
              onChange={(event) =>
                updateAparelhoEditForm(
                  "estadoFisico",
                  capitalizeFirst(event.target.value),
                )
              }
              placeholder="Estado físico"
            />
            <Input
              value={aparelhoEditForm.acessorios}
              onChange={(event) =>
                updateAparelhoEditForm(
                  "acessorios",
                  capitalizeFirst(event.target.value),
                )
              }
              placeholder="Acessórios entregues"
            />
            <Textarea
              className="sm:col-span-2"
              rows={3}
              value={aparelhoEditForm.observacoes}
              onChange={(event) =>
                updateAparelhoEditForm(
                  "observacoes",
                  capitalizeFirst(event.target.value),
                )
              }
              placeholder="Observações do aparelho"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAparelhoDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateAparelho}
              disabled={updateAparelhoMutation.isPending}
            >
              {updateAparelhoMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Salvar aparelho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NovaOS;
