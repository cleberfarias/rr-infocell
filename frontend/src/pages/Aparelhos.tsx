import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, Search, Smartphone, Trash2 } from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createAparelho,
  deleteAparelho,
  listAparelhos,
  updateAparelho,
  type Aparelho,
  type AparelhoInput,
} from "@/services/aparelhos";
import { listClientes, type Cliente } from "@/services/clientes";

const emptyForm: AparelhoInput = {
  clienteId: "",
  marca: "",
  modelo: "",
  cor: "",
  imeiSerial: "",
  estadoFisico: "",
  acessorios: "",
  observacoes: "",
};

const Aparelhos = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAparelho, setEditingAparelho] = useState<Aparelho | null>(null);
  const [form, setForm] = useState<AparelhoInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "aparelhos-select"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", search, clienteFilter],
    queryFn: () =>
      listAparelhos({
        query: search,
        clienteId: clienteFilter === "todos" ? "" : clienteFilter,
      }),
  });

  const clientes = useMemo(
    () => clientesQuery.data ?? [],
    [clientesQuery.data],
  );
  const aparelhos = useMemo(
    () => aparelhosQuery.data ?? [],
    [aparelhosQuery.data],
  );

  const clienteById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes],
  );

  const invalidateAparelhos = async () => {
    await queryClient.invalidateQueries({ queryKey: ["aparelhos"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: AparelhoInput) =>
      editingAparelho
        ? updateAparelho(editingAparelho.id, input)
        : createAparelho(input),
    onSuccess: async () => {
      await invalidateAparelhos();
      setDialogOpen(false);
      setEditingAparelho(null);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o aparelho.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAparelho,
    onSuccess: invalidateAparelhos,
  });

  const stats = useMemo(
    () => ({
      total: aparelhos.length,
      comImei: aparelhos.filter((aparelho) => aparelho.imeiSerial).length,
      clientes: new Set(aparelhos.map((aparelho) => aparelho.clienteId)).size,
    }),
    [aparelhos],
  );

  const openCreateDialog = () => {
    setEditingAparelho(null);
    setForm({
      ...emptyForm,
      clienteId: clienteFilter === "todos" ? "" : clienteFilter,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (aparelho: Aparelho) => {
    setEditingAparelho(aparelho);
    setForm({
      clienteId: aparelho.clienteId,
      marca: aparelho.marca,
      modelo: aparelho.modelo,
      cor: aparelho.cor ?? "",
      imeiSerial: aparelho.imeiSerial ?? "",
      estadoFisico: aparelho.estadoFisico ?? "",
      acessorios: aparelho.acessorios ?? "",
      observacoes: aparelho.observacoes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const updateForm = (field: keyof AparelhoInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  const handleDelete = (aparelho: Aparelho) => {
    const confirmed = window.confirm(
      `Excluir o aparelho ${aparelho.marca} ${aparelho.modelo}?`,
    );

    if (confirmed) {
      deleteMutation.mutate(aparelho.id);
    }
  };

  const getClienteName = (clienteId: string) => {
    const cliente = clienteById.get(clienteId);

    return cliente ? cliente.nome : "Cliente nao encontrado";
  };

  const renderClienteSelectItems = (items: Cliente[]) =>
    items.map((cliente) => (
      <SelectItem key={cliente.id} value={cliente.id}>
        {cliente.nome}
      </SelectItem>
    ));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cadastros"
        title="Aparelhos"
        description="Aparelhos vinculados aos clientes para abertura e historico de ordens de servico."
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" /> Novo aparelho
          </Button>
        }
      />

      <Card className="surface-panel flex flex-wrap items-end gap-3 p-3">
        <FormField
          id="aparelhos-search"
          label="Buscar aparelho"
          className="min-w-[240px] flex-1"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="aparelhos-search"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Marca, modelo, cor, IMEI ou estado"
            />
          </div>
        </FormField>
        <FormField
          id="aparelhos-cliente-filter"
          label="Cliente"
          className="min-w-[220px]"
        >
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger id="aparelhos-cliente-filter">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {renderClienteSelectItems(clientes)}
            </SelectContent>
          </Select>
        </FormField>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">Total</p>
            <p className="font-display text-lg font-bold">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">IMEI</p>
            <p className="font-display text-lg font-bold">{stats.comImei}</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">
              Clientes
            </p>
            <p className="font-display text-lg font-bold">{stats.clientes}</p>
          </div>
        </div>
      </Card>

      {aparelhosQuery.isLoading || clientesQuery.isLoading ? (
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : aparelhosQuery.isError || clientesQuery.isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={Smartphone}
            title="Nao foi possivel carregar aparelhos"
            description="Verifique se o backend esta rodando em http://localhost:3333."
            actions={
              <Button
                variant="outline"
                onClick={() => {
                  aparelhosQuery.refetch();
                  clientesQuery.refetch();
                }}
              >
                Tentar novamente
              </Button>
            }
          />
        </Card>
      ) : aparelhos.length === 0 ? (
        <Card className="surface-panel">
          <EmptyState
            icon={Smartphone}
            title="Nenhum aparelho encontrado"
            description="Ajuste os filtros ou cadastre o primeiro aparelho para um cliente."
            actions={<Button onClick={openCreateDialog}>Novo aparelho</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {aparelhos.map((aparelho) => (
            <Card
              key={aparelho.id}
              className="surface-panel group p-5 transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-metal">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-semibold">
                    {aparelho.marca} {aparelho.modelo}
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {getClienteName(aparelho.clienteId)}
                  </p>
                  {aparelho.imeiSerial && (
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      IMEI/Serial {aparelho.imeiSerial}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => openEditDialog(aparelho)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(aparelho)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    Cor
                  </p>
                  <p className="truncate">{aparelho.cor ?? "Nao informada"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    Estado fisico
                  </p>
                  <p className="truncate">
                    {aparelho.estadoFisico ?? "Nao informado"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    Acessorios
                  </p>
                  <p className="truncate">
                    {aparelho.acessorios ?? "Nao informado"}
                  </p>
                </div>
              </div>

              {aparelho.observacoes && (
                <p className="mt-3 rounded-md bg-secondary/30 p-3 text-xs text-muted-foreground">
                  {aparelho.observacoes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAparelho ? "Editar aparelho" : "Novo aparelho"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                id="aparelho-cliente"
                label="Cliente"
                className="sm:col-span-2"
              >
                <Select
                  value={form.clienteId}
                  onValueChange={(value) => updateForm("clienteId", value)}
                >
                  <SelectTrigger id="aparelho-cliente">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderClienteSelectItems(clientes)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="aparelho-marca" label="Marca">
                <Input
                  id="aparelho-marca"
                  value={form.marca}
                  onChange={(event) => updateForm("marca", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="aparelho-modelo" label="Modelo">
                <Input
                  id="aparelho-modelo"
                  value={form.modelo}
                  onChange={(event) => updateForm("modelo", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="aparelho-cor" label="Cor">
                <Input
                  id="aparelho-cor"
                  value={form.cor}
                  onChange={(event) => updateForm("cor", event.target.value)}
                />
              </FormField>
              <FormField id="aparelho-imei" label="IMEI / Serial">
                <Input
                  id="aparelho-imei"
                  className="font-mono"
                  value={form.imeiSerial}
                  onChange={(event) =>
                    updateForm("imeiSerial", event.target.value)
                  }
                />
              </FormField>
              <FormField
                id="aparelho-estado"
                label="Estado fisico"
                className="sm:col-span-2"
              >
                <Input
                  id="aparelho-estado"
                  value={form.estadoFisico}
                  onChange={(event) =>
                    updateForm("estadoFisico", event.target.value)
                  }
                />
              </FormField>
              <FormField
                id="aparelho-acessorios"
                label="Acessorios"
                className="sm:col-span-2"
              >
                <Input
                  id="aparelho-acessorios"
                  value={form.acessorios}
                  onChange={(event) =>
                    updateForm("acessorios", event.target.value)
                  }
                />
              </FormField>
              <FormField
                id="aparelho-observacoes"
                label="Observacoes"
                className="sm:col-span-2"
              >
                <Textarea
                  id="aparelho-observacoes"
                  value={form.observacoes}
                  onChange={(event) =>
                    updateForm("observacoes", event.target.value)
                  }
                />
              </FormField>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || !form.clienteId}
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aparelhos;
