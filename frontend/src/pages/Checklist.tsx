import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Camera,
  CheckCircle2,
  Loader2,
  PenLine,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { firebaseStorage, isFirebaseClientConfigured } from "@/lib/firebase";
import { listAparelhos } from "@/services/aparelhos";
import {
  createChecklist,
  listChecklists,
  updateChecklist,
  type ChecklistFoto,
  type ChecklistItem,
  type ChecklistItemStatus,
} from "@/services/checklists";
import { listClientes } from "@/services/clientes";
import { listOrdensServico } from "@/services/ordens-servico";

const initialItems: ChecklistItem[] = [
  { nome: "Tela", status: "nao_testado" },
  { nome: "Touch", status: "nao_testado" },
  { nome: "Camera", status: "nao_testado" },
  { nome: "Microfone", status: "nao_testado" },
  { nome: "Alto-falante", status: "nao_testado" },
  { nome: "Botoes", status: "nao_testado" },
  { nome: "Conector de carga", status: "nao_testado" },
  { nome: "Wi-Fi", status: "nao_testado" },
  { nome: "Bluetooth", status: "nao_testado" },
  { nome: "Bateria", status: "nao_testado" },
];

const statusLabels: Record<ChecklistItemStatus, string> = {
  funcionando: "Funcionando",
  com_defeito: "Com defeito",
  nao_testado: "Nao testado",
};

const statusClasses: Record<ChecklistItemStatus, string> = {
  funcionando: "border-success/40 bg-success/10",
  com_defeito: "border-destructive/40 bg-destructive/10",
  nao_testado: "border-border bg-secondary/30",
};

const Checklist = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [itens, setItens] = useState<ChecklistItem[]>(initialItems);
  const [fotos, setFotos] = useState<ChecklistFoto[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [criadoPor, setCriadoPor] = useState("Camila O.");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "checklist"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "checklist"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "checklist"],
    queryFn: () => listAparelhos(),
  });

  const selectedOrdem = useMemo(
    () =>
      (ordensQuery.data ?? []).find((ordem) => ordem.id === selectedOrdemId),
    [ordensQuery.data, selectedOrdemId],
  );

  const checklistsQuery = useQuery({
    queryKey: ["checklists", selectedOrdemId],
    queryFn: () => listChecklists({ ordemServicoId: selectedOrdemId }),
    enabled: Boolean(selectedOrdemId),
  });

  const existingChecklist = checklistsQuery.data?.[0] ?? null;

  const cliente = useMemo(
    () =>
      (clientesQuery.data ?? []).find(
        (item) => item.id === selectedOrdem?.clienteId,
      ),
    [clientesQuery.data, selectedOrdem?.clienteId],
  );

  const aparelho = useMemo(
    () =>
      (aparelhosQuery.data ?? []).find(
        (item) => item.id === selectedOrdem?.aparelhoId,
      ),
    [aparelhosQuery.data, selectedOrdem?.aparelhoId],
  );

  useEffect(() => {
    if (!selectedOrdemId && ordensQuery.data?.[0]) {
      setSelectedOrdemId(ordensQuery.data[0].id);
      setSearchParams({ ordemId: ordensQuery.data[0].id });
    }
  }, [ordensQuery.data, selectedOrdemId, setSearchParams]);

  useEffect(() => {
    if (existingChecklist) {
      setItens(
        existingChecklist.itens.length > 0
          ? existingChecklist.itens
          : initialItems,
      );
      setFotos(existingChecklist.fotos ?? []);
      setObservacoesGerais(existingChecklist.observacoesGerais ?? "");
      setCriadoPor(existingChecklist.criadoPor ?? "Camila O.");
      return;
    }

    setItens(initialItems);
    setFotos([]);
    setObservacoesGerais("");
    setCriadoPor("Camila O.");
  }, [existingChecklist]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma ordem de servico.");
      }

      const input = {
        ordemServicoId: selectedOrdem.id,
        aparelhoId: selectedOrdem.aparelhoId,
        itens,
        fotos,
        observacoesGerais,
        criadoPor,
      };

      return existingChecklist
        ? updateChecklist(existingChecklist.id, input)
        : createChecklist(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["checklists"] });
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o checklist.",
      );
    },
  });

  const updateItem = (index: number, patch: Partial<ChecklistItem>) => {
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const handleOrdemChange = (value: string) => {
    setSelectedOrdemId(value);
    setSearchParams({ ordemId: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !selectedOrdem) {
      return;
    }

    setUploadError(null);

    if (!isFirebaseClientConfigured || !firebaseStorage) {
      setUploadError("Firebase Storage nao esta configurado no frontend.");
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      setUploadError("Selecione apenas arquivos de imagem.");
      return;
    }

    setIsUploading(true);

    try {
      const uploadedFotos = await Promise.all(
        imageFiles.map(async (file) => {
          const safeName = file.name.replace(/[^\w.-]/g, "_");
          const path = `ordensServico/${selectedOrdem.id}/${Date.now()}-${safeName}`;
          const storageRef = ref(firebaseStorage, path);
          const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
          });
          const url = await getDownloadURL(snapshot.ref);

          return {
            nome: file.name,
            url,
            path,
            contentType: file.type,
            uploadedAt: new Date().toISOString(),
          };
        }),
      );

      setFotos((current) => [...current, ...uploadedFotos]);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar as fotos para o Firebase Storage.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeFoto = (path: string) => {
    setFotos((current) => current.filter((foto) => foto.path !== path));
  };

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading ||
    (Boolean(selectedOrdemId) && checklistsQuery.isLoading);

  const isError =
    ordensQuery.isError ||
    clientesQuery.isError ||
    aparelhosQuery.isError ||
    checklistsQuery.isError;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow={selectedOrdem ? `OS-${selectedOrdem.numero}` : "Checklist"}
        title="Checklist de entrada"
        description="Registre o estado fisico e funcional do aparelho antes do diagnostico."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline">
              Imprimir
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              disabled={!selectedOrdem || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar checklist
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={CheckCircle2}
            title="Nao foi possivel carregar o checklist"
            description="Verifique se o backend esta rodando em http://localhost:3333."
          />
        </Card>
      ) : !selectedOrdem ? (
        <Card className="surface-panel">
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma OS disponivel"
            description="Crie uma ordem de servico antes de registrar o checklist."
            actions={
              <Button asChild>
                <Link to="/app/ordens/nova">Nova OS</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="surface-panel p-6 lg:col-span-2">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormField id="checklist-ordem" label="Ordem de servico">
                <Select
                  value={selectedOrdemId}
                  onValueChange={handleOrdemChange}
                >
                  <SelectTrigger id="checklist-ordem">
                    <SelectValue placeholder="Selecione a OS" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ordensQuery.data ?? []).map((ordem) => (
                      <SelectItem key={ordem.id} value={ordem.id}>
                        OS-{ordem.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Cliente
                </p>
                <p className="truncate font-medium">
                  {cliente?.nome ?? selectedOrdem.clienteId}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {cliente?.telefone ?? ""}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Aparelho
                </p>
                <p className="truncate font-medium">
                  {aparelho
                    ? `${aparelho.marca} ${aparelho.modelo}`
                    : selectedOrdem.aparelhoId}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {aparelho?.imeiSerial ?? ""}
                </p>
              </div>
            </div>

            <h3 className="mb-4 font-display text-base font-semibold">
              Inspecao do aparelho
            </h3>
            <div className="space-y-3">
              {itens.map((item, index) => (
                <div
                  key={item.nome}
                  className={`grid gap-3 rounded-md border p-3 text-sm transition-all md:grid-cols-[180px_180px_1fr] ${statusClasses[item.status]}`}
                >
                  <div className="flex items-center font-medium">
                    {item.nome}
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={(value) =>
                      updateItem(index, {
                        status: value as ChecklistItemStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={item.observacao ?? ""}
                    onChange={(event) =>
                      updateItem(index, { observacao: event.target.value })
                    }
                    placeholder="Observacao do item"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                id="checklist-observacoes"
                label="Observacoes do estado"
              >
                <Textarea
                  id="checklist-observacoes"
                  rows={3}
                  value={observacoesGerais}
                  onChange={(event) => setObservacoesGerais(event.target.value)}
                  placeholder="Riscos, marcas de uso, condicoes especiais..."
                />
              </FormField>
              <FormField
                id="checklist-criado-por"
                label="Atendente responsavel"
              >
                <Input
                  id="checklist-criado-por"
                  value={criadoPor}
                  onChange={(event) => setCriadoPor(event.target.value)}
                  placeholder="Nome do atendente"
                />
              </FormField>
            </div>
            {formError && (
              <p className="mt-4 text-sm text-destructive">{formError}</p>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="surface-panel p-6">
              <h3 className="mb-1 font-display text-base font-semibold">
                Fotos do aparelho
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Envie imagens da frente, verso, laterais e detalhes do dano.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {fotos.map((foto) => (
                  <div
                    key={foto.path}
                    className="group relative overflow-hidden rounded-md border border-border bg-secondary/30"
                  >
                    <img
                      src={foto.url}
                      alt={foto.nome}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100"
                      title="Remover foto do checklist"
                      onClick={() => removeFoto(foto.path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <p className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">
                      {foto.nome}
                    </p>
                  </div>
                ))}
                {fotos.length === 0 && (
                  <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Sem fotos
                    </span>
                  </div>
                )}
              </div>
              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "Enviando..." : "Anexar fotos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={isUploading || !selectedOrdem}
                  onChange={(event) => {
                    handleUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {uploadError && (
                <p className="mt-3 text-xs text-destructive">{uploadError}</p>
              )}
              {!isFirebaseClientConfigured && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Configure as variaveis VITE_FIREBASE_* para habilitar upload
                  real.
                </p>
              )}
            </Card>

            <Card className="surface-panel p-6">
              <h3 className="mb-3 font-display text-base font-semibold">
                Assinaturas
              </h3>
              <div className="space-y-3">
                {["Cliente", "Atendente"].map((person) => (
                  <div key={person}>
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {person}
                    </Label>
                    <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground">
                      <PenLine className="mr-2 h-4 w-4" /> Assinatura futura
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </form>
  );
};

export default Checklist;
