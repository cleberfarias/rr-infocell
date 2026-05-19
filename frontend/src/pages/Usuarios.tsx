import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
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
import { Switch } from "@/components/ui/switch";
import { roleLabels, type Role } from "@/lib/roles";
import {
  createUsuario,
  deleteUsuario,
  listUsuarios,
  updateUsuario,
  type Usuario,
  type UsuarioInput,
} from "@/services/usuarios";
import { toast } from "@/components/ui/sonner";

type UsuarioForm = UsuarioInput & {
  password: string;
};

const emptyForm: UsuarioForm = {
  disabled: false,
  displayName: "",
  email: "",
  password: "",
  role: "atendente",
};

const roleOptions: Role[] = ["admin", "atendente", "tecnico"];

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
};

const Usuarios = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: listUsuarios,
  });

  const usuarios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (usuariosQuery.data ?? []).filter((usuario) => {
      if (!normalizedSearch) {
        return true;
      }

      return [usuario.email, usuario.displayName, usuario.role]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [search, usuariosQuery.data]);

  const invalidateUsuarios = async () => {
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const aprovarMutation = useMutation({
    mutationFn: (usuario: Usuario) =>
      updateUsuario(usuario.uid, {
        role: "atendente",
        disabled: false,
        displayName: usuario.displayName,
      }),
    onSuccess: async (u) => {
      await invalidateUsuarios();
      toast.success(`${u.displayName ?? u.email} aprovado como Atendente.`);
    },
    onError: () => toast.error("Não foi possível aprovar o usuário."),
  });

  const excluirUsuarioMutation = useMutation({
    mutationFn: (uid: string) => deleteUsuario(uid),
    onSuccess: async () => {
      await invalidateUsuarios();
      toast.success(
        `Usuário ${deleteTarget?.displayName ?? deleteTarget?.email} excluído.`,
      );
      setDeleteTarget(null);
    },
    onError: () => toast.error("Não foi possível excluir o usuário."),
  });

  const saveMutation = useMutation({
    mutationFn: (input: UsuarioForm) => {
      const payload = {
        disabled: input.disabled,
        displayName: input.displayName || undefined,
        password: input.password || undefined,
        role: input.role,
      };

      return editingUsuario
        ? updateUsuario(editingUsuario.uid, payload)
        : createUsuario({
            ...payload,
            email: input.email,
            password: input.password || undefined,
          });
    },
    onSuccess: async () => {
      await invalidateUsuarios();
      setDialogOpen(false);
      setEditingUsuario(null);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o usuário.",
      );
    },
  });

  const openCreateDialog = () => {
    setEditingUsuario(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setForm({
      disabled: usuario.disabled,
      displayName: usuario.displayName ?? "",
      email: usuario.email ?? "",
      password: "",
      role: usuario.role ?? "atendente",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const updateForm = <TKey extends keyof UsuarioForm>(
    field: TKey,
    value: UsuarioForm[TKey],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    saveMutation.mutate(form);
  };

  const stats = useMemo(
    () => ({
      admin: (usuariosQuery.data ?? []).filter(
        (usuario) => usuario.role === "admin",
      ).length,
      ativos: (usuariosQuery.data ?? []).filter((usuario) => !usuario.disabled)
        .length,
      total: usuariosQuery.data?.length ?? 0,
    }),
    [usuariosQuery.data],
  );

  return (
    <>
      {/* Dialog: confirmar exclusão */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.displayName ?? deleteTarget?.email}
              </span>
              ?
              <br />
              <span className="text-destructive">
                O usuário perderá acesso ao sistema permanentemente.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={excluirUsuarioMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={excluirUsuarioMutation.isPending}
                onClick={() =>
                  deleteTarget &&
                  excluirUsuarioMutation.mutate(deleteTarget.uid)
                }
              >
                {excluirUsuarioMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <PageHeader
          eyebrow="Administração"
          title="Usuários e acessos"
          description="Cadastre usuários internos do Firebase Auth e defina o nível de acesso."
          actions={
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" /> Novo usuário
            </Button>
          }
        />

        <Card className="surface-panel flex flex-wrap items-end gap-3 p-3">
          <FormField
            id="usuarios-search"
            label="Buscar usuário"
            className="min-w-[240px] flex-1"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="usuarios-search"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, e-mail ou perfil"
              />
            </div>
          </FormField>
          <div className="grid min-w-[260px] grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
              <p className="font-mono uppercase text-muted-foreground">Total</p>
              <p className="font-display text-lg font-bold">{stats.total}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
              <p className="font-mono uppercase text-muted-foreground">
                Ativos
              </p>
              <p className="font-display text-lg font-bold">{stats.ativos}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
              <p className="font-mono uppercase text-muted-foreground">
                Admins
              </p>
              <p className="font-display text-lg font-bold">{stats.admin}</p>
            </div>
          </div>
        </Card>

        {usuariosQuery.isLoading ? (
          <Card className="surface-panel flex min-h-[260px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </Card>
        ) : usuariosQuery.isError ? (
          <Card className="surface-panel">
            <EmptyState
              icon={UserCog}
              title="Não foi possível carregar usuários"
              description="Entre com um usuário admin real do Firebase Auth e verifique se o backend está configurado com Firebase Admin SDK."
              actions={
                <Button
                  variant="outline"
                  onClick={() => usuariosQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              }
            />
          </Card>
        ) : usuarios.length === 0 ? (
          <Card className="surface-panel">
            <EmptyState
              icon={UserCog}
              title="Nenhum usuário encontrado"
              description="Ajuste a busca ou cadastre o primeiro usuário operacional."
              actions={<Button onClick={openCreateDialog}>Novo usuário</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {usuarios.map((usuario) => (
              <Card key={usuario.uid} className="surface-panel p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-metal">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-semibold">
                      {usuario.displayName || usuario.email || usuario.uid}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {usuario.email ?? "Sem e-mail"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(!usuario.role || usuario.disabled) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Aprovar acesso"
                        className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                        disabled={aprovarMutation.isPending}
                        onClick={() => aprovarMutation.mutate(usuario)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(usuario)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir usuário"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(usuario)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Perfil
                    </p>
                    {usuario.role ? (
                      <StatusBadge status="aprovado" />
                    ) : (
                      <span className="text-muted-foreground">Sem acesso</span>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {usuario.role ? roleLabels[usuario.role] : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Status
                    </p>
                    <p>{usuario.disabled ? "Bloqueado" : "Ativo"}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Ultimo acesso
                    </p>
                    <p>{formatDate(usuario.lastSignInAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUsuario ? "Editar usuário" : "Novo usuário"}
              </DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  id="usuario-email"
                  label="E-mail"
                  className="sm:col-span-2"
                >
                  <Input
                    id="usuario-email"
                    type="email"
                    value={form.email}
                    disabled={Boolean(editingUsuario)}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    required
                  />
                </FormField>
                <FormField
                  id="usuario-nome"
                  label="Nome"
                  className="sm:col-span-2"
                >
                  <Input
                    id="usuario-nome"
                    value={form.displayName}
                    onChange={(event) =>
                      updateForm("displayName", event.target.value)
                    }
                  />
                </FormField>
                <FormField
                  id="usuario-senha"
                  label={editingUsuario ? "Nova senha" : "Senha inicial"}
                >
                  <Input
                    id="usuario-senha"
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(event) =>
                      updateForm("password", event.target.value)
                    }
                    required={!editingUsuario}
                  />
                </FormField>
                <FormField id="usuario-role" label="Nível de acesso">
                  <Select
                    value={form.role}
                    onValueChange={(value) => updateForm("role", value as Role)}
                  >
                    <SelectTrigger id="usuario-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Usuário bloqueado</p>
                    <p className="text-xs text-muted-foreground">
                      Bloqueia login sem remover o cadastro do Firebase Auth.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(form.disabled)}
                    onCheckedChange={(checked) =>
                      updateForm("disabled", checked)
                    }
                  />
                </div>
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
                <Button type="submit" disabled={saveMutation.isPending}>
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
    </>
  );
};

export default Usuarios;
