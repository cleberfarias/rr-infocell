import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Textarea } from "@/components/ui/textarea";
import {
  createCliente,
  deleteCliente,
  listClientes,
  updateCliente,
  type Cliente,
  type ClienteInput,
} from "@/services/clientes";
import { Edit, Loader2, Plus, Search, Trash2, UserRound } from "lucide-react";

const emptyForm: ClienteInput = {
  nome: "",
  telefone: "",
  documento: "",
  email: "",
  endereco: "",
  observacoes: "",
};

const Clientes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<ClienteInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes", search],
    queryFn: () => listClientes(search),
  });

  const clientes = useMemo(() => clientesQuery.data ?? [], [clientesQuery.data]);

  const invalidateClientes = async () => {
    await queryClient.invalidateQueries({ queryKey: ["clientes"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: ClienteInput) =>
      editingCliente ? updateCliente(editingCliente.id, input) : createCliente(input),
    onSuccess: async () => {
      await invalidateClientes();
      setDialogOpen(false);
      setEditingCliente(null);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Nao foi possivel salvar o cliente.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: invalidateClientes,
  });

  const stats = useMemo(
    () => ({
      total: clientes.length,
      comEmail: clientes.filter((cliente) => cliente.email).length,
      comDocumento: clientes.filter((cliente) => cliente.documento).length,
    }),
    [clientes],
  );

  const openCreateDialog = () => {
    setEditingCliente(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setForm({
      nome: cliente.nome,
      telefone: cliente.telefone,
      documento: cliente.documento ?? "",
      email: cliente.email ?? "",
      endereco: cliente.endereco ?? "",
      observacoes: cliente.observacoes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const updateForm = (field: keyof ClienteInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  const handleDelete = (cliente: Cliente) => {
    const confirmed = window.confirm(`Excluir o cliente ${cliente.nome}?`);

    if (confirmed) {
      deleteMutation.mutate(cliente.id);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        description="Base de clientes usada por aparelhos, ordens de servico e historico."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        }
      />

      <Card className="surface-panel flex flex-wrap items-end gap-3 p-3">
        <FormField id="clientes-search" label="Buscar cliente" className="min-w-[240px] flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="clientes-search"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone, documento ou e-mail"
            />
          </div>
        </FormField>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">Total</p>
            <p className="font-display text-lg font-bold">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">E-mail</p>
            <p className="font-display text-lg font-bold">{stats.comEmail}</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">Doc.</p>
            <p className="font-display text-lg font-bold">{stats.comDocumento}</p>
          </div>
        </div>
      </Card>

      {clientesQuery.isLoading ? (
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : clientesQuery.isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={UserRound}
            title="Nao foi possivel carregar clientes"
            description="Verifique se o backend esta rodando em http://localhost:3333."
            actions={
              <Button variant="outline" onClick={() => clientesQuery.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </Card>
      ) : clientes.length === 0 ? (
        <Card className="surface-panel">
          <EmptyState
            icon={UserRound}
            title="Nenhum cliente encontrado"
            description="Ajuste a busca ou cadastre o primeiro cliente."
            actions={<Button onClick={openCreateDialog}>Novo cliente</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="surface-panel group p-5 transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-metal font-display text-lg font-bold">
                  {cliente.nome
                    .split(" ")
                    .map((name) => name[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-semibold">{cliente.nome}</h3>
                  <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                  {cliente.email && <p className="truncate text-xs text-muted-foreground">{cliente.email}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditDialog(cliente)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(cliente)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">Documento</p>
                  <p className="truncate">{cliente.documento ?? "Nao informado"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">Endereco</p>
                  <p className="truncate">{cliente.endereco ?? "Nao informado"}</p>
                </div>
              </div>

              {cliente.observacoes && (
                <p className="mt-3 rounded-md bg-secondary/30 p-3 text-xs text-muted-foreground">
                  {cliente.observacoes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="cliente-nome" label="Nome" className="sm:col-span-2">
                <Input
                  id="cliente-nome"
                  value={form.nome}
                  onChange={(event) => updateForm("nome", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="cliente-telefone" label="Telefone">
                <Input
                  id="cliente-telefone"
                  value={form.telefone}
                  onChange={(event) => updateForm("telefone", event.target.value)}
                  required
                />
              </FormField>
              <FormField id="cliente-documento" label="Documento">
                <Input
                  id="cliente-documento"
                  value={form.documento}
                  onChange={(event) => updateForm("documento", event.target.value)}
                />
              </FormField>
              <FormField id="cliente-email" label="E-mail" className="sm:col-span-2">
                <Input
                  id="cliente-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                />
              </FormField>
              <FormField id="cliente-endereco" label="Endereco" className="sm:col-span-2">
                <Input
                  id="cliente-endereco"
                  value={form.endereco}
                  onChange={(event) => updateForm("endereco", event.target.value)}
                />
              </FormField>
              <FormField id="cliente-observacoes" label="Observacoes" className="sm:col-span-2">
                <Textarea
                  id="cliente-observacoes"
                  value={form.observacoes}
                  onChange={(event) => updateForm("observacoes", event.target.value)}
                />
              </FormField>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
