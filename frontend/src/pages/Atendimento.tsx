import { useEffect, useRef, useState } from "react";
import {
  Archive,
  FileText,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
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
  aguardando_aprovacao: "Aguard. aprovação",
  aguardando_peca: "Aguard. peça",
  em_manutencao: "Em manutenção",
  pronto_para_retirada: "Pronto ✅",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const EMOJIS = ["😀", "👍", "🙏", "✅", "📱", "🔧", "💰", "🧾", "⏳", "🚚", "❌"];

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

function statusMensagem(status?: string) {
  if (status === "lido") return "✓✓ lido";
  if (status === "entregue") return "✓✓";
  if (status === "enviado") return "✓";
  if (status === "falhou") return "falhou";
  return "";
}

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
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-base">Conectar WhatsApp</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
          </p>
        </div>
        <img src={qr} alt="QR WhatsApp" className="h-64 w-64 rounded-lg border border-border" />
        <p className="text-xs text-muted-foreground">O QR code atualiza automaticamente</p>
      </div>
    </div>
  );
}

function StatusConexao({
  status,
  qr,
}: {
  status: string;
  qr: string | null;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const conectado = status === "conectado";
  const qrPendente = status === "qr_pendente";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {conectado ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-600 font-medium">WhatsApp conectado</span>
          </>
        ) : qrPendente ? (
          <>
            <WifiOff className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-yellow-600 font-medium">WhatsApp desconectado</span>
            <Button
              size="sm"
              variant="outline"
              className="ml-2 h-7 gap-1.5 text-xs"
              onClick={() => setModalAberto(true)}
            >
              <QrCode className="h-3.5 w-3.5" />
              Escanear QR code
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {status === "conectando" ? "Conectando..." : "Desconectado"}
            </span>
          </>
        )}
      </div>

      {modalAberto && qr && (
        <ModalQR qr={qr} onClose={() => setModalAberto(false)} />
      )}
    </>
  );
}

function ListaConversas({
  conversas,
  telefoneSelecionado,
  onSelect,
}: {
  conversas: Conversa[];
  telefoneSelecionado: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      {conversas.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
      )}
      {conversas.map((c) => (
        <button
          key={c.telefone}
          onClick={() => onSelect(c.telefone)}
          className={cn(
            "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 border-b border-border",
            telefoneSelecionado === c.telefone && "bg-accent",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {c.clienteId ? (
              <span className="text-xs font-bold">{c.nome.charAt(0).toUpperCase()}</span>
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-sm font-medium">{c.nome}</p>
              {c.arquivada && <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              {c.naoLidas > 0 && (
                <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {c.naoLidas}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.ultimaMensagem}</p>
            {c.statusAtendimento && (
              <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                {c.statusAtendimento.replace("_", " ")}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function BolhaMensagem({ msg }: { msg: Mensagem }) {
  const minha = msg.de !== "cliente";
  return (
    <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-xs rounded-2xl px-3 py-2 text-sm",
          minha
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm",
        )}
      >
        {msg.tipo === "imagem" && msg.midiaUrl && (
          <img src={msg.midiaUrl} alt="imagem" className="mb-1 max-w-full rounded" />
        )}
        {msg.tipo === "audio" && msg.midiaUrl && (
          <audio controls src={msg.midiaUrl} className="mb-1 w-48" />
        )}
        {msg.tipo === "video" && msg.midiaUrl && (
          <video controls src={msg.midiaUrl} className="mb-1 max-w-full rounded" />
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
              "mb-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs underline-offset-2 hover:underline",
              minha ? "border-primary-foreground/20" : "border-border",
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{msg.midiaNome ?? "Arquivo"}</span>
            <span className="shrink-0 opacity-70">{formatarTamanho(msg.midiaTamanho)}</span>
          </a>
        )}
        {msg.tipo === "contato" && (
          <div className="mb-1 rounded-md border border-border px-3 py-2 text-xs">
            <p className="font-medium">Contato recebido</p>
            <p className="opacity-80">{msg.texto}</p>
          </div>
        )}
        {msg.tipo === "localizacao" && (
          <a
            href={msg.texto.replace("Localizacao: ", "")}
            target="_blank"
            rel="noreferrer"
            className="mb-1 block rounded-md border border-border px-3 py-2 text-xs underline-offset-2 hover:underline"
          >
            Localização recebida
          </a>
        )}
        {msg.texto && !["[imagem]", "[audio]", "[video]", "[documento]", "[sticker]"].includes(msg.texto) && !["contato", "localizacao"].includes(msg.tipo) && (
          <p className="whitespace-pre-wrap">{msg.texto}</p>
        )}
        <p className={cn("mt-0.5 text-right text-[10px]", minha ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {hora(msg.timestamp)} {minha && statusMensagem(msg.statusEnvio)}
        </p>
      </div>
    </div>
  );
}

function PainelOS({ os, telefone }: { os: OrdemServico; telefone: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState({ forma: "pix" as "pix" | "cartao" | "dinheiro", valor: "" });
  const [mostrarPagamento, setMostrarPagamento] = useState(false);

  const acao = async (fn: () => Promise<unknown>, id: string) => {
    setLoading(id);
    try {
      await fn();
    } catch (error) {
      toast({
        title: "Acao nao concluida",
        description: error instanceof Error ? error.message : "Verifique a conexao do WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs text-muted-foreground">OS #{os.numero}</span>
        <span className="text-xs font-medium">{STATUS_LABEL[os.status] ?? os.status}</span>
      </div>
      <p className="font-medium truncate">{os.defeitoRelatado}</p>
      <p className="text-muted-foreground">R$ {os.valorTotal.toFixed(2).replace(".", ",")}</p>

      <div className="flex flex-col gap-1.5 pt-1">
        {os.status === "aguardando_aprovacao" && (
          <Button size="sm" variant="outline" disabled={!!loading}
            onClick={() => acao(() => enviarOrcamento(os.id), "orc")}
          >
            {loading === "orc" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Enviar orçamento
          </Button>
        )}
        {(os.status === "em_manutencao" || os.status === "em_analise") && (
          <Button size="sm" variant="outline" disabled={!!loading}
            onClick={() => acao(() => informarPronto(os.id), "pronto")}
          >
            {loading === "pronto" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Informar pronto
          </Button>
        )}
        {os.status === "pronto_para_retirada" && !mostrarPagamento && (
          <Button size="sm" variant="outline" onClick={() => setMostrarPagamento(true)}>
            Confirmar pagamento
          </Button>
        )}
        {mostrarPagamento && (
          <div className="space-y-1.5">
            <select
              value={pagamento.forma}
              onChange={(e) => setPagamento((p) => ({ ...p, forma: e.target.value as "pix" | "cartao" | "dinheiro" }))}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
            <input
              type="number"
              placeholder="Valor recebido"
              value={pagamento.valor}
              onChange={(e) => setPagamento((p) => ({ ...p, valor: e.target.value }))}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1" disabled={!!loading}
                onClick={() => acao(() => confirmarPagamento(os.id, pagamento.forma, Number(pagamento.valor)), "pag")}
              >
                {loading === "pag" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMostrarPagamento(false)}>Cancelar</Button>
            </div>
          </div>
        )}
        <Button size="sm" variant="ghost" disabled={!!loading}
          onClick={() => acao(() => enviarStatus(os.id), "status")}
        >
          {loading === "status" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Enviar status
        </Button>
      </div>
    </div>
  );
}

function PainelAtendimento({
  conversa,
  onAtualizada,
}: {
  conversa: Conversa | undefined;
  onAtualizada: () => Promise<void>;
}) {
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
    } catch (error) {
      toast({
        title: "Atendimento nao atualizado",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atendimento</p>
      <select
        value={statusAtendimento}
        onChange={(e) => setStatusAtendimento(e.target.value as "aberto" | "em_atendimento" | "finalizado")}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
      >
        <option value="aberto">Aberto</option>
        <option value="em_atendimento">Em atendimento</option>
        <option value="finalizado">Finalizado</option>
      </select>
      <input
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        placeholder="Responsável"
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/60"
      />
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas internas"
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/60"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" disabled={salvando} onClick={() => salvar(conversa.arquivada ?? false)}>
          {salvando && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" disabled={salvando} onClick={() => salvar(!(conversa.arquivada ?? false))}>
          {conversa.arquivada ? "Restaurar" : "Arquivar"}
        </Button>
      </div>
    </div>
  );
}

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
    const id = setInterval(poll, 1500);
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
    const id = setInterval(poll, 1500);
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
    const bateBusca = textoBusca.includes(busca.trim().toLowerCase());
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
        const file = new File([blob], `audio-atendimento-${Date.now()}.webm`, { type: mimeType });
        setArquivo(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setGravando(true);
    } catch {
      toast({
        title: "Microfone indisponivel",
        description: "Permita o uso do microfone no navegador para gravar audio.",
        variant: "destructive",
      });
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
      const [d, cvs] = await Promise.all([
        getConversa(telefoneSelecionado),
        listarConversas(),
      ]);
      setDetalhe(d);
      setConversas(cvs);
    } catch (error) {
      toast({
        title: "Mensagem nao enviada",
        description: error instanceof Error ? error.message : "Verifique a conexao do WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden -m-4 md:-m-8">
      <StatusConexao status={status} qr={qr} />

      <div className="flex flex-1 overflow-hidden">
        {/* Coluna 1 — Conversas */}
        <aside className="w-72 shrink-0 border-r border-border overflow-y-auto">
          <div className="space-y-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Conversas</span>
              <span className="ml-auto text-xs text-muted-foreground">{conversasFiltradas.length}</span>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as "ativas" | "nao_lidas" | "arquivadas" | "todas")}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="ativas">Ativas</option>
              <option value="nao_lidas">Não lidas</option>
              <option value="arquivadas">Arquivadas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
          <ListaConversas
            conversas={conversasFiltradas}
            telefoneSelecionado={telefoneSelecionado}
            onSelect={selecionar}
          />
        </aside>

        {/* Coluna 2 — Chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!telefoneSelecionado ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa para começar
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="font-semibold text-sm">
                  {detalhe?.cliente?.nome ?? telefoneSelecionado}
                </p>
                <p className="text-xs text-muted-foreground">{telefoneSelecionado}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!detalhe && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {detalhe?.mensagens.map((m) => (
                  <BolhaMensagem key={m.id} msg={m} />
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-border p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <div className="mb-2 flex flex-wrap gap-1">
                  {RESPOSTAS_RAPIDAS.map((resposta) => (
                    <button
                      key={resposta}
                      onClick={() => setTexto(resposta)}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {resposta}
                    </button>
                  ))}
                </div>
                <div className="mb-2 flex items-center gap-1">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setTexto((atual) => `${atual}${emoji}`)}
                      className="h-7 w-7 rounded-md text-sm hover:bg-accent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {arquivo && (
                  <div className="mb-2 rounded-md border border-border bg-secondary/50 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
                      <span className="text-muted-foreground">{formatarTamanho(arquivo.size)}</span>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setArquivo(null)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {previewUrl && arquivo.type.startsWith("image/") && (
                      <img src={previewUrl} alt="preview" className="mt-2 max-h-40 rounded-md object-contain" />
                    )}
                    {previewUrl && arquivo.type.startsWith("audio/") && (
                      <audio controls src={previewUrl} className="mt-2 w-full" />
                    )}
                    {previewUrl && arquivo.type.startsWith("video/") && (
                      <video controls src={previewUrl} className="mt-2 max-h-40 rounded-md" />
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant={arquivo ? "secondary" : "outline"}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviando || gravando}
                    title={arquivo ? arquivo.name : "Anexar arquivo"}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={gravando ? "destructive" : "outline"}
                    onClick={gravando ? pararGravacao : iniciarGravacao}
                    disabled={enviando}
                    title={gravando ? "Parar gravação" : "Gravar áudio"}
                  >
                    {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                    placeholder={arquivo ? "Legenda opcional..." : "Digite uma mensagem..."}
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <Button size="icon" onClick={enviar} disabled={enviando || gravando || (!texto.trim() && !arquivo)}>
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Coluna 3 — Cliente + OS */}
        {telefoneSelecionado && (
          <aside className="w-72 shrink-0 border-l border-border overflow-y-auto p-4 space-y-4">
            <PainelAtendimento conversa={conversaSelecionada} onAtualizada={recarregarAtual} />
            {detalhe?.cliente ? (
              <>
                <div>
                  <p className="font-semibold">{detalhe.cliente.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{detalhe.cliente.telefone}</p>
                  {detalhe.cliente.documento && (
                    <p className="text-xs text-muted-foreground">{detalhe.cliente.documento}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    OS ativas
                  </p>
                  {detalhe.ordensAtivas.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma OS ativa.</p>
                  )}
                  {detalhe.ordensAtivas.map((os) => (
                    <PainelOS key={os.id} os={os} telefone={telefoneSelecionado} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Número não cadastrado</p>
                <p>Este número não está vinculado a nenhum cliente no sistema.</p>
                <p className="text-xs">Cadastre o cliente em <strong>Clientes</strong> usando este telefone para vincular automaticamente.</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
