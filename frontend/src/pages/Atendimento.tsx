import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  QrCode,
  Search,
  Send,
  Smile,
  Square,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  getStatusWhatsApp,
  getQRCode,
  listarConversas,
  getConversa,
  atualizarConversa,
  enviarMensagem,
  enviarMidia,
  enviarOrcamento,
  informarPronto,
  confirmarPagamento,
  enviarStatus,
  type Conversa,
  type Mensagem,
  type ConversaDetalhe,
} from "@/services/whatsapp";
import type { OrdemServico } from "@/services/ordens-servico";

const STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_peca: "Aguardando peça",
  em_manutencao: "Em manutenção",
  pronto_para_retirada: "Pronto para retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const EMOJIS = ["😀", "👍", "🙏", "✅", "📱", "🔧", "💰", "🧾", "⏳", "❌"];

const RESPOSTAS_RAPIDAS = [
  "Olá! Como posso ajudar?",
  "Pode nos enviar uma foto ou vídeo do aparelho?",
  "Recebemos sua mensagem e já vamos verificar.",
  "Seu aparelho está em análise técnica.",
  "Assim que houver atualização da OS, avisaremos por aqui.",
  "Obrigado pelo contato. RR Infocell agradece!",
];

function hora(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTamanho(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function arquivoParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function statusMensagemIcon(status?: string) {
  if (status === "lido") return <span className="text-sky-400">✓✓</span>;
  if (status === "entregue") return <span>✓✓</span>;
  if (status === "enviado") return <span>✓</span>;
  if (status === "falhou") return <span className="text-destructive">!</span>;
  return null;
}

function avatarLetra(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

// ─── Modal QR ────────────────────────────────────────────────────────────────

function ModalQR({ qr, onClose }: { qr: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-background p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-semibold">Conectar WhatsApp</p>
          <p className="mt-1 text-xs text-muted-foreground">
            WhatsApp → Aparelhos conectados → Conectar um aparelho
          </p>
        </div>
        <img src={qr} alt="QR WhatsApp" className="h-64 w-64 rounded-xl border border-border" />
        <p className="text-xs text-muted-foreground">Atualiza automaticamente</p>
      </div>
    </div>
  );
}

// ─── Status conexão ───────────────────────────────────────────────────────────

function StatusConexao({ status, qr }: { status: string; qr: string | null }) {
  const [modalAberto, setModalAberto] = useState(false);
  const conectado = status === "conectado";
  const qrPendente = status === "qr_pendente";

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border bg-background px-4 py-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            conectado ? "bg-emerald-500 animate-pulse" : qrPendente ? "bg-amber-400" : "bg-muted-foreground",
          )}
        />
        <span className={cn("text-xs font-medium", conectado ? "text-emerald-600" : "text-muted-foreground")}>
          {conectado ? "WhatsApp conectado" : qrPendente ? "Desconectado" : status === "conectando" ? "Conectando..." : "Desconectado"}
        </span>
        {conectado ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
        ) : qrPendente ? (
          <Button size="sm" variant="outline" className="ml-1 h-7 gap-1.5 text-xs" onClick={() => setModalAberto(true)}>
            <QrCode className="h-3.5 w-3.5" />
            Escanear QR
          </Button>
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      {modalAberto && qr && <ModalQR qr={qr} onClose={() => setModalAberto(false)} />}
    </>
  );
}

// ─── Item de conversa ─────────────────────────────────────────────────────────

function ItemConversa({
  c,
  selecionado,
  onClick,
}: {
  c: Conversa;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 hover:bg-accent/50",
        selecionado && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          c.clienteId ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
        )}
      >
        {c.clienteId ? avatarLetra(c.nome) : <Phone className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-sm font-medium">{c.nome}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {c.arquivada && <Archive className="h-3 w-3 text-muted-foreground" />}
            {c.naoLidas > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {c.naoLidas > 9 ? "9+" : c.naoLidas}
              </span>
            )}
          </div>
        </div>
        <p className="truncate text-xs text-muted-foreground">{c.ultimaMensagem}</p>
        {c.statusAtendimento && c.statusAtendimento !== "aberto" && (
          <span className="mt-0.5 inline-block rounded-sm bg-secondary px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            {c.statusAtendimento.replace("_", " ")}
          </span>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────

function BolhaMensagem({ msg }: { msg: Mensagem }) {
  const minha = msg.de !== "cliente";
  return (
    <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          minha
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm",
        )}
      >
        {msg.tipo === "imagem" && msg.midiaUrl && (
          <img src={msg.midiaUrl} alt="imagem" className="mb-1 max-w-full rounded-lg" />
        )}
        {msg.tipo === "audio" && msg.midiaUrl && (
          <audio controls src={msg.midiaUrl} className="mb-1 w-52" />
        )}
        {msg.tipo === "video" && msg.midiaUrl && (
          <video controls src={msg.midiaUrl} className="mb-1 max-w-full rounded-lg" />
        )}
        {msg.tipo === "sticker" && msg.midiaUrl && (
          <img src={msg.midiaUrl} alt="sticker" className="mb-1 h-28 w-28 object-contain" />
        )}
        {msg.tipo === "documento" && msg.midiaUrl && (
          <a
            href={msg.midiaUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:underline",
              minha ? "border-primary-foreground/20" : "border-border",
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{msg.midiaNome ?? "Arquivo"}</span>
            <span className="shrink-0 opacity-60">{formatarTamanho(msg.midiaTamanho)}</span>
          </a>
        )}
        {msg.tipo === "contato" && (
          <div className="mb-1 rounded-lg border border-border px-3 py-2 text-xs">
            <p className="font-medium">Contato</p>
            <p className="opacity-80">{msg.texto}</p>
          </div>
        )}
        {msg.tipo === "localizacao" && (
          <a
            href={msg.texto.replace("Localizacao: ", "")}
            target="_blank"
            rel="noreferrer"
            className="mb-1 block rounded-lg border border-border px-3 py-2 text-xs hover:underline"
          >
            📍 Localização recebida
          </a>
        )}
        {msg.texto &&
          !["[imagem]", "[audio]", "[video]", "[documento]", "[sticker]"].includes(msg.texto) &&
          !["contato", "localizacao"].includes(msg.tipo) && (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.texto}</p>
          )}
        <p
          className={cn(
            "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
            minha ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {hora(msg.timestamp)}
          {minha && statusMensagemIcon(msg.statusEnvio)}
        </p>
      </div>
    </div>
  );
}

// ─── Painel OS ────────────────────────────────────────────────────────────────

function PainelOS({ os, telefone: _telefone }: { os: OrdemServico; telefone: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<{ forma: "pix" | "cartao" | "dinheiro"; valor: string }>({
    forma: "pix",
    valor: "",
  });
  const [mostrarPagamento, setMostrarPagamento] = useState(false);

  const acao = async (fn: () => Promise<unknown>, id: string) => {
    setLoading(id);
    try {
      await fn();
      toast.success("Ação concluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verifique a conexão do WhatsApp.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">OS #{os.numero}</p>
          <p className="mt-0.5 font-medium leading-snug">{os.defeitoRelatado}</p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {STATUS_LABEL[os.status] ?? os.status}
        </span>
      </div>
      <p className="font-mono text-sm font-semibold">
        {os.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>

      <div className="flex flex-col gap-1.5 border-t border-border pt-2">
        {os.status === "aguardando_aprovacao" && (
          <Button size="sm" variant="outline" className="justify-start" disabled={!!loading}
            onClick={() => acao(() => enviarOrcamento(os.id), "orc")}>
            {loading === "orc" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Enviar orçamento
          </Button>
        )}
        {(os.status === "em_manutencao" || os.status === "em_analise") && (
          <Button size="sm" variant="outline" className="justify-start" disabled={!!loading}
            onClick={() => acao(() => informarPronto(os.id), "pronto")}>
            {loading === "pronto" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <span className="mr-2">✅</span>}
            Informar pronto
          </Button>
        )}
        {os.status === "pronto_para_retirada" && !mostrarPagamento && (
          <Button size="sm" variant="outline" className="justify-start" onClick={() => setMostrarPagamento(true)}>
            💰 Confirmar pagamento
          </Button>
        )}
        {mostrarPagamento && (
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-2">
            <Select value={pagamento.forma} onValueChange={(v) => setPagamento((p) => ({ ...p, forma: v as "pix" | "cartao" | "dinheiro" }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Valor recebido"
              value={pagamento.valor}
              onChange={(e) => setPagamento((p) => ({ ...p, valor: e.target.value }))}
              className="h-8 text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 h-7 text-xs" disabled={!!loading}
                onClick={() => acao(() => confirmarPagamento(os.id, pagamento.forma, Number(pagamento.valor)), "pag")}>
                {loading === "pag" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMostrarPagamento(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
        <Button size="sm" variant="ghost" className="justify-start text-muted-foreground" disabled={!!loading}
          onClick={() => acao(() => enviarStatus(os.id), "status")}>
          {loading === "status" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="mr-2 h-3.5 w-3.5" />}
          Enviar status
        </Button>
      </div>
    </div>
  );
}

// ─── Painel atendimento ───────────────────────────────────────────────────────

function PainelAtendimento({ conversa, onAtualizada }: { conversa: Conversa | undefined; onAtualizada: () => Promise<void> }) {
  const [salvando, setSalvando] = useState(false);
  const [statusAtendimento, setStatusAtendimento] = useState<"aberto" | "em_atendimento" | "finalizado">(
    conversa?.statusAtendimento ?? "aberto",
  );
  const [responsavel, setResponsavel] = useState(conversa?.atendenteResponsavel ?? "");
  const [notas, setNotas] = useState(conversa?.notasInternas ?? "");

  useEffect(() => {
    setStatusAtendimento(conversa?.statusAtendimento ?? "aberto");
    setResponsavel(conversa?.atendenteResponsavel ?? "");
    setNotas(conversa?.notasInternas ?? "");
  }, [conversa?.telefone, conversa?.statusAtendimento, conversa?.atendenteResponsavel, conversa?.notasInternas]);

  if (!conversa) return null;

  const salvar = async (arquivada = conversa.arquivada ?? false) => {
    setSalvando(true);
    try {
      await atualizarConversa(conversa.telefone, {
        statusAtendimento,
        atendenteResponsavel: responsavel.trim() || null,
        notasInternas: notas,
        arquivada,
      });
      await onAtualizada();
      toast.success("Atendimento atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atendimento</p>
      <Select value={statusAtendimento} onValueChange={(v) => setStatusAtendimento(v as "aberto" | "em_atendimento" | "finalizado")}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aberto">Aberto</SelectItem>
          <SelectItem value="em_atendimento">Em atendimento</SelectItem>
          <SelectItem value="finalizado">Finalizado</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        placeholder="Responsável"
        className="h-8 text-xs"
      />
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas internas..."
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary/60"
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs" disabled={salvando} onClick={() => salvar()}>
          {salvando && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={salvando}
          onClick={() => salvar(!(conversa.arquivada ?? false))}>
          {conversa.arquivada ? "Restaurar" : "Arquivar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Atendimento() {
  const [status, setStatus] = useState("conectando");
  const [qr, setQr] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [telefoneSelecionado, setTelefoneSelecionado] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"ativas" | "nao_lidas" | "arquivadas" | "todas">("ativas");
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [respostasOpen, setRespostasOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"lista" | "chat">("lista");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await getStatusWhatsApp();
        setStatus(s.status);
        if (s.status === "qr_pendente") {
          const q = await getQRCode().catch(() => null);
          setQr(q?.qr ?? null);
        } else {
          setQr(null);
        }
        const cvs = await listarConversas();
        setConversas(cvs);
      } catch { /* silencioso */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!telefoneSelecionado) return;
    const poll = async () => {
      try {
        const d = await getConversa(telefoneSelecionado);
        setDetalhe(d);
      } catch { /* silencioso */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [telefoneSelecionado]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detalhe?.mensagens]);

  useEffect(() => {
    if (!arquivo || (!arquivo.type.startsWith("image/") && !arquivo.type.startsWith("audio/") && !arquivo.type.startsWith("video/"))) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const conversaSelecionada = conversas.find((c) => c.telefone === telefoneSelecionado);
  const conversasFiltradas = conversas.filter((c) => {
    const textoBusca = `${c.nome} ${c.telefone} ${c.ultimaMensagem}`.toLowerCase();
    const bateBusca = !busca.trim() || textoBusca.includes(busca.trim().toLowerCase());
    const bateFiltro =
      filtro === "todas" ||
      (filtro === "ativas" && !c.arquivada) ||
      (filtro === "nao_lidas" && c.naoLidas > 0) ||
      (filtro === "arquivadas" && c.arquivada);
    return bateBusca && bateFiltro;
  });

  const selecionar = (tel: string) => {
    setTelefoneSelecionado(tel);
    setDetalhe(null);
    setMobileView("chat");
  };

  const voltarParaLista = () => {
    setMobileView("lista");
  };

  const recarregarAtual = async () => {
    const cvs = await listarConversas();
    setConversas(cvs);
    if (telefoneSelecionado) {
      const d = await getConversa(telefoneSelecionado);
      setDetalhe(d);
    }
  };

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: mimeType });
        setArquivo(file);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setGravando(true);
    } catch {
      toast.error("Permita o uso do microfone no navegador para gravar áudio.");
    }
  };

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  };

  const enviar = async () => {
    if (!telefoneSelecionado || (!texto.trim() && !arquivo)) return;
    setEnviando(true);
    try {
      if (arquivo) {
        const base64 = await arquivoParaBase64(arquivo);
        await enviarMidia(telefoneSelecionado, {
          base64,
          mimeType: arquivo.type || "application/octet-stream",
          nomeArquivo: arquivo.name,
          legenda: texto.trim() || undefined,
        });
      } else {
        await enviarMensagem(telefoneSelecionado, texto.trim());
      }
      setTexto("");
      setArquivo(null);
      const [d, cvs] = await Promise.all([getConversa(telefoneSelecionado), listarConversas()]);
      setDetalhe(d);
      setConversas(cvs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verifique a conexão do WhatsApp.");
    } finally {
      setEnviando(false);
    }
  };

  const naoLidasTotal = conversas.reduce((acc, c) => acc + (c.naoLidas ?? 0), 0);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden -m-4 md:-m-8 md:h-[calc(100vh-4rem)]">
      <StatusConexao status={status} qr={qr} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Coluna 1: Lista de conversas ─────────────────────────────── */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-background",
            "w-full md:w-72 md:shrink-0",
            mobileView === "chat" ? "hidden md:flex" : "flex",
          )}
        >
          {/* Header da lista */}
          <div className="border-b border-border px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Conversas</span>
              {naoLidasTotal > 0 && (
                <Badge className="ml-auto h-5 px-1.5 text-[10px]">{naoLidasTotal}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-secondary/30 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa..."
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <TabsList className="h-7 w-full">
                <TabsTrigger value="ativas" className="flex-1 text-[10px] px-1">Ativas</TabsTrigger>
                <TabsTrigger value="nao_lidas" className="flex-1 text-[10px] px-1">
                  Não lidas
                  {naoLidasTotal > 0 && (
                    <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1 text-[9px]">
                      {naoLidasTotal}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="arquivadas" className="flex-1 text-[10px] px-1">Arqv.</TabsTrigger>
                <TabsTrigger value="todas" className="flex-1 text-[10px] px-1">Todas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {conversasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversasFiltradas.map((c) => (
                <ItemConversa
                  key={c.telefone}
                  c={c}
                  selecionado={telefoneSelecionado === c.telefone}
                  onClick={() => selecionar(c.telefone)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Coluna 2: Chat ───────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden",
            mobileView === "lista" ? "hidden md:flex" : "flex",
          )}
        >
          {!telefoneSelecionado ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Selecione uma conversa</p>
              <p className="text-xs text-muted-foreground/60">Escolha da lista ao lado para começar</p>
            </div>
          ) : (
            <>
              {/* Header do chat */}
              <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={voltarParaLista}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    conversaSelecionada?.clienteId ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {conversaSelecionada?.clienteId
                    ? avatarLetra(conversaSelecionada.nome)
                    : <Phone className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">
                    {detalhe?.cliente?.nome ?? conversaSelecionada?.nome ?? telefoneSelecionado}
                  </p>
                  <p className="text-xs text-muted-foreground">{telefoneSelecionado}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} title="Info do cliente">
                  <Info className="h-4 w-4" />
                </Button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto bg-secondary/10 px-4 py-4 space-y-2">
                {!detalhe ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detalhe.mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  detalhe.mensagens.map((m) => <BolhaMensagem key={m.id} msg={m} />)
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border bg-background p-3">
                {/* Respostas rápidas (collapsible) */}
                {respostasOpen && (
                  <div className="mb-2 rounded-lg border border-border bg-secondary/30 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Respostas rápidas</p>
                      <button onClick={() => setRespostasOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {RESPOSTAS_RAPIDAS.map((r) => (
                        <button
                          key={r}
                          onClick={() => { setTexto(r); setRespostasOpen(false); }}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent hover:text-foreground transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                      <div className="flex gap-1 border-t border-border w-full pt-1.5 mt-0.5">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setTexto((atual) => `${atual}${emoji}`)}
                            className="h-7 w-7 rounded-md text-base hover:bg-accent transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview de arquivo */}
                {arquivo && (
                  <div className="mb-2 rounded-lg border border-border bg-secondary/40 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{arquivo.name}</span>
                      <span className="text-muted-foreground">{formatarTamanho(arquivo.size)}</span>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setArquivo(null)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {previewUrl && arquivo.type.startsWith("image/") && (
                      <img src={previewUrl} alt="preview" className="mt-2 max-h-32 rounded-lg object-contain" />
                    )}
                    {previewUrl && arquivo.type.startsWith("audio/") && (
                      <audio controls src={previewUrl} className="mt-2 w-full" />
                    )}
                    {previewUrl && arquivo.type.startsWith("video/") && (
                      <video controls src={previewUrl} className="mt-2 max-h-32 rounded-lg" />
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />

                <div className="flex items-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={() => setRespostasOpen((v) => !v)}
                    title="Respostas rápidas"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-9 w-9 shrink-0", arquivo ? "text-primary" : "text-muted-foreground")}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviando || gravando}
                    title="Anexar arquivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-9 w-9 shrink-0", gravando ? "text-destructive" : "text-muted-foreground")}
                    onClick={gravando ? pararGravacao : iniciarGravacao}
                    disabled={enviando}
                    title={gravando ? "Parar gravação" : "Gravar áudio"}
                  >
                    {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <div className="relative flex-1">
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                      placeholder={arquivo ? "Legenda opcional..." : "Digite uma mensagem..."}
                      className="w-full rounded-xl border border-input bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:bg-background transition-colors"
                    />
                    <button
                      onClick={() => setRespostasOpen((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    onClick={enviar}
                    disabled={enviando || gravando || (!texto.trim() && !arquivo)}
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Coluna 3: Info cliente/OS (desktop) + Sheet (mobile/tablet) ─ */}
        {telefoneSelecionado && (
          <>
            {/* Desktop: coluna fixa */}
            <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border overflow-y-auto p-4 space-y-4 bg-background">
              <PainelAtendimento conversa={conversaSelecionada} onAtualizada={recarregarAtual} />
              {detalhe?.cliente ? (
                <>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="font-semibold">{detalhe.cliente.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{detalhe.cliente.telefone}</p>
                    {detalhe.cliente.documento && (
                      <p className="text-xs text-muted-foreground">{detalhe.cliente.documento}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OS ativas</p>
                    {detalhe.ordensAtivas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma OS ativa.</p>
                    ) : (
                      detalhe.ordensAtivas.map((os) => (
                        <PainelOS key={os.id} os={os} telefone={telefoneSelecionado} />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
                  <p className="font-medium">Número não cadastrado</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre o cliente em <strong>Clientes</strong> com este telefone para vincular automaticamente.
                  </p>
                </div>
              )}
            </aside>

            {/* Mobile/Tablet: Sheet lateral */}
            <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
              <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0 lg:hidden">
                <SheetHeader className="border-b border-border px-4 py-3">
                  <SheetTitle className="text-sm">Informações</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <PainelAtendimento conversa={conversaSelecionada} onAtualizada={recarregarAtual} />
                  {detalhe?.cliente ? (
                    <>
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="font-semibold">{detalhe.cliente.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{detalhe.cliente.telefone}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OS ativas</p>
                        {detalhe.ordensAtivas.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhuma OS ativa.</p>
                        ) : (
                          detalhe.ordensAtivas.map((os) => (
                            <PainelOS key={os.id} os={os} telefone={telefoneSelecionado} />
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
                      <p className="font-medium">Número não cadastrado</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastre em <strong>Clientes</strong> com este telefone.
                      </p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </div>
  );
}
