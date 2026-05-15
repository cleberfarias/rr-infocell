import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, Search, ShieldCheck, UserCog } from "lucide-react";

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
  listUsuarios,
  updateUsuario,
  type Usuario,
  type UsuarioInput,
} from "@/services/usuarios";

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
      admin: (usuariosQuery.data ?? []).filter((usuario) => usuario.role === "admin").length,
      ativos: (usuariosQuery.data ?? []).filter((usuario) => !usuario.disabled).length,
      total: usuariosQuery.data?.length ?? 0,
    }),
    [usuariosQuery.data],
  );

  return (
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
            <p className="font-mono uppercase text-muted-foreground">Ativos</p>
            <p className="font-display text-lg font-bold">{stats.ativos}</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 px-3 py-2">
            <p className="font-mono uppercase text-muted-foreground">Admins</p>
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
              <Button variant="outline" onClick={() => usuariosQuery.refetch()}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => openEditDialog(usuario)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    Perfil
                  </p>
                  {usuario.role ? (
                    <StatusBadge status={usuario.role === "admin" ? "aprovado" : "pendente"} />
                  ) : (
                    <span className="text-muted-foreground">Sem claim</span>
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
              <FormField id="usuario-email" label="E-mail" className="sm:col-span-2">
                <Input
                  id="usuario-email"
                  type="email"
                  value={form.email}
                  disabled={Boolean(editingUsuario)}
                  onChange={(event) => updateForm("email", event.target.value)}
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
            {formError && <p className="text-sm text-destructive">{formError}</p>}
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
  );
};

export default Usuarios;
