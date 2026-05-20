import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";
import {
  Camera,
  CheckCircle2,
  GripVertical,
  Loader2,
  PenLine,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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
import {
  firebaseAuth,
  firebaseStorage,
  isFirebaseClientConfigured,
} from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { CHECKLIST_ENTRADA_ITENS, CHECKLIST_SAIDA_ITENS } from "@/constants/business";
import { CHECKLIST_STATUS_LABELS } from "@/constants/status";
import { TIMEOUT } from "@/constants/query";
import { ROUTES } from "@/constants/routes";
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
import { toast } from "@/components/ui/sonner";
import { listOrdensServico } from "@/services/ordens-servico";

const statusClasses: Record<ChecklistItemStatus, string> = {
  funcionando: "border-success/40 bg-success/10",
  com_defeito: "border-destructive/40 bg-destructive/10",
  nao_testado: "border-border bg-secondary/30",
};

const imageContentTypesByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
};

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() ?? "";

const getImageContentType = (file: File) => {
  if (file.type.startsWith("image/")) {
    return file.type;
  }

  return imageContentTypesByExtension[getFileExtension(file.name)] ?? null;
};

const uploadWithTimeout = (
  storageRef: ReturnType<typeof ref>,
  file: File,
  contentType: string,
) =>
  new Promise<UploadTaskSnapshot>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType,
    });
    const timeoutId = window.setTimeout(() => {
      uploadTask.cancel();
      reject(new Error("Tempo limite excedido ao enviar a foto."));
    }, TIMEOUT.upload);

    uploadTask.on(
      "state_changed",
      undefined,
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
      () => {
        window.clearTimeout(timeoutId);
        resolve(uploadTask.snapshot);
      },
    );
  });

const Checklist = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const atendenteLogado = displayName.trim() || "Atendente";
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const checklistTipo = searchParams.get("tipo") === "saida" ? "saida" : "entrada";
  const itensBase = checklistTipo === "saida" ? CHECKLIST_SAIDA_ITENS : CHECKLIST_ENTRADA_ITENS;
  const [itens, setItens] = useState<ChecklistItem[]>(itensBase);
  const [novoItemNome, setNovoItemNome] = useState("");
  const [fotos, setFotos] = useState<ChecklistFoto[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [criadoPor, setCriadoPor] = useState(atendenteLogado);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    queryFn: () => listChecklists({ ordemServicoId: selectedOrdemId, tipo: checklistTipo }),
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
      setSearchParams({ ordemId: ordensQuery.data[0].id, tipo: checklistTipo });
    }
  }, [checklistTipo, ordensQuery.data, selectedOrdemId, setSearchParams]);

  useEffect(() => {
    if (existingChecklist) {
      setItens(
        existingChecklist.itens.length > 0
          ? existingChecklist.itens
          : itensBase,
      );
      setFotos(existingChecklist.fotos ?? []);
      setObservacoesGerais(existingChecklist.observacoesGerais ?? "");
      setCriadoPor(existingChecklist.criadoPor ?? atendenteLogado);
      return;
    }

    setItens(itensBase);
    setFotos([]);
    setObservacoesGerais("");
    setCriadoPor(atendenteLogado);
  }, [atendenteLogado, existingChecklist, itensBase]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma ordem de serviço.");
      }

      const input = {
        ordemServicoId: selectedOrdem.id,
        aparelhoId: selectedOrdem.aparelhoId,
        tipo: checklistTipo as "entrada" | "saida",
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
      if (checklistTipo === "entrada" && selectedOrdemId) {
        toast.success("Checklist de entrada salvo! Seguindo para manutenção.");
        navigate(ROUTES.manutencaoOS(selectedOrdemId));
      } else if (checklistTipo === "saida" && selectedOrdemId) {
        toast.success("Checklist de saída salvo! Gerando comprovante.");
        navigate(ROUTES.ordemDetalhe(selectedOrdemId));
      } else {
        toast.success("Checklist salvo com sucesso.");
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Não foi possível salvar o checklist.";
      setFormError(msg);
      toast.error(msg);
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
    setSearchParams({ ordemId: value, tipo: checklistTipo });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);

    if (!selectedFiles.length || !selectedOrdem) {
      return;
    }

    setUploadError(null);

    if (!isFirebaseClientConfigured || !firebaseStorage) {
      setUploadError("Firebase Storage não está configurado no frontend.");
      return;
    }

    if (!firebaseAuth?.currentUser) {
      setUploadError(
        "Para anexar fotos, entre com um usuário real do Firebase Auth. O modo de desenvolvimento por perfil não autentica no Storage.",
      );
      return;
    }

    const token = await firebaseAuth.currentUser.getIdTokenResult(true);
    const role = token.claims.role;
    const hasStorageRole =
      typeof role === "string" &&
      ["admin", "atendente", "tecnico"].includes(role);

    if (!hasStorageRole) {
      setUploadError(
        "Seu usuário Firebase não tem a claim role necessária para enviar fotos. Defina role como admin, atendente ou técnico e faça login novamente.",
      );
      return;
    }

    const imageFiles = selectedFiles
      .map((file) => ({ file, contentType: getImageContentType(file) }))
      .filter((item): item is { file: File; contentType: string } =>
        Boolean(item.contentType),
      );

    if (imageFiles.length === 0) {
      setUploadError(
        "Selecione arquivos de imagem nos formatos JPG, PNG, WEBP, GIF, BMP ou HEIC.",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFotos: ChecklistFoto[] = [];

      for (const [index, { file, contentType }] of imageFiles.entries()) {
        const safeName = file.name.replace(/[^\w.-]/g, "_");
        const path = `ordensServico/${selectedOrdem.id}/${Date.now()}-${safeName}`;
        const storageRef = ref(firebaseStorage, path);
        const snapshot = await uploadWithTimeout(storageRef, file, contentType);
        const url = await getDownloadURL(snapshot.ref);

        uploadedFotos.push({
          nome: file.name,
          url,
          path,
          contentType,
          uploadedAt: new Date().toISOString(),
        });
        setUploadProgress(Math.round(((index + 1) / imageFiles.length) * 100));
      }

      setFotos((current) => [...current, ...uploadedFotos]);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar as fotos para o Firebase Storage.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
    <form className="checklist-page space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow={selectedOrdem ? `OS-${selectedOrdem.numero}` : "Checklist"}
        title={checklistTipo === "saida" ? "Checklist de saída" : "Checklist de entrada"}
        description={
          checklistTipo === "saida"
            ? "Confirme os testes finais antes da entrega ao cliente."
            : "Registre o estado físico e funcional do aparelho antes do diagnóstico."
        }
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={!selectedOrdem}
            >
              <Printer className="h-4 w-4" />
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

      {selectedOrdem && (
        <section className="checklist-print-area">
          <header className="print-header">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {(() => {
                const logoUrl = localStorage.getItem("rr-logo-url");
                return logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: 52, maxWidth: 130, objectFit: "contain", flexShrink: 0 }} />
                ) : null;
              })()}
              <div>
                <p className="print-kicker">RR Infocell</p>
                <h1>{checklistTipo === "saida" ? "Checklist de saída" : "Checklist de entrada"}</h1>
                <p>Ordem de serviço OS-{selectedOrdem.numero}</p>
              </div>
            </div>
            <div className="print-meta">
              <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
              <span>Responsável: {criadoPor || "-"}</span>
            </div>
          </header>

          <div className="print-grid print-summary">
            <div>
              <span>Cliente</span>
              <strong>{cliente?.nome ?? selectedOrdem.clienteId}</strong>
              <p>{cliente?.telefone ?? "-"}</p>
            </div>
            <div>
              <span>Aparelho</span>
              <strong>
                {aparelho
                  ? `${aparelho.marca} ${aparelho.modelo}`
                  : selectedOrdem.aparelhoId}
              </strong>
              <p>{aparelho?.imeiSerial ?? "-"}</p>
            </div>
            <div>
              <span>Status da OS</span>
              <strong>{selectedOrdem.status}</strong>
              <p>Checklist técnico</p>
            </div>
          </div>

          <h2>Inspeção do aparelho</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.nome}>
                  <td>{item.nome}</td>
                  <td>{CHECKLIST_STATUS_LABELS[item.status]}</td>
                  <td>{item.observacao || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Observações gerais</h2>
          <p className="print-notes">{observacoesGerais || "-"}</p>

          <h2>Fotos anexadas</h2>
          {fotos.length > 0 ? (
            <div className="print-photos">
              {fotos.map((foto) => (
                <figure key={foto.path}>
                  <img src={foto.url} alt={foto.nome} />
                  <figcaption>{foto.nome}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="print-notes">Nenhuma foto anexada.</p>
          )}

          <div className="print-signatures">
            <div>
              <span>Cliente</span>
            </div>
            <div>
              <span>Atendente</span>
            </div>
          </div>
        </section>
      )}

      {isLoading ? (
        <Card className="surface-panel flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : isError ? (
        <Card className="surface-panel">
          <EmptyState
            icon={CheckCircle2}
            title="Não foi possível carregar o checklist"
            description="Verifique se o backend está rodando em http://localhost:3333."
          />
        </Card>
      ) : !selectedOrdem ? (
        <Card className="surface-panel">
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma OS disponível"
            description="Crie uma ordem de serviço antes de registrar o checklist."
            actions={
              <Button asChild>
                <Link to={ROUTES.novaOS}>Nova OS</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="surface-panel p-6 lg:col-span-2">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormField id="checklist-ordem" label="Ordem de serviço">
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
              {checklistTipo === "saida" ? "Teste final do aparelho" : "Inspeção do aparelho"}
            </h3>
            <div className="space-y-2">
              {itens.map((item, index) => (
                <div
                  key={item.nome}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === index) return;
                    setItens((prev) => {
                      const next = [...prev];
                      const [moved] = next.splice(dragIndex, 1);
                      next.splice(index, 0, moved);
                      return next;
                    });
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className={`grid gap-3 rounded-md border p-3 text-sm transition-all md:grid-cols-[28px_180px_180px_1fr] cursor-grab active:cursor-grabbing ${statusClasses[item.status]} ${dragOverIndex === index && dragIndex !== index ? "border-primary/60 bg-primary/5" : ""} ${dragIndex === index ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex items-center font-medium">{item.nome}</div>
                  <Select
                    value={item.status}
                    onValueChange={(value) => updateItem(index, { status: value as ChecklistItemStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHECKLIST_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.observacao ?? ""}
                      onChange={(event) => updateItem(index, { observacao: event.target.value })}
                      placeholder="Observação do item"
                    />
                    {!itensBase.some((b) => b.nome === item.nome) && (
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover item"
                        onClick={() => setItens((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar item personalizado */}
            <div className="mt-3 flex gap-2">
              <Input
                value={novoItemNome}
                onChange={(e) => setNovoItemNome(e.target.value)}
                placeholder="Nome do novo item (ex.: Alto-falante traseiro)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const nome = novoItemNome.trim();
                    if (!nome) return;
                    if (itens.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) return;
                    setItens((prev) => [...prev, { nome, status: "funcionando" }]);
                    setNovoItemNome("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nome = novoItemNome.trim();
                  if (!nome) return;
                  if (itens.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) return;
                  setItens((prev) => [...prev, { nome, status: "funcionando" }]);
                  setNovoItemNome("");
                }}
              >
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                id="checklist-observacoes"
                label="Observações do estado"
              >
                <Textarea
                  id="checklist-observacoes"
                  rows={3}
                  value={observacoesGerais}
                  onChange={(event) => setObservacoesGerais(event.target.value)}
                  placeholder="Riscos, marcas de uso, condições especiais..."
                />
              </FormField>
              <FormField
                id="checklist-criado-por"
                label="Atendente responsável"
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
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif"
                  multiple
                  className="sr-only"
                  disabled={isUploading || !selectedOrdem}
                  onChange={(event) => {
                    handleUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {uploadProgress !== null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {uploadError && (
                <p className="mt-3 text-xs text-destructive">{uploadError}</p>
              )}
              {!isFirebaseClientConfigured && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Configure as variáveis VITE_FIREBASE_* para habilitar upload
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
