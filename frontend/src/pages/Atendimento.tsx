import { useEffect, useRef, useState } from "react";
import { MessageSquare, Wifi, WifiOff, Send, Loader2, Phone, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getStatusWhatsApp,
  getQRCode,
  listarConversas,
  getConversa,
  enviarMensagem,
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

function hora(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
              {c.naoLidas > 0 && (
                <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {c.naoLidas}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.ultimaMensagem}</p>
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
        {msg.texto && msg.texto !== "[imagem]" && msg.texto !== "[audio]" && msg.texto !== "[video]" && (
          <p className="whitespace-pre-wrap">{msg.texto}</p>
        )}
        <p className={cn("mt-0.5 text-right text-[10px]", minha ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {hora(msg.timestamp)}
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

export default function Atendimento() {
  const [status, setStatus] = useState("conectando");
  const [qr, setQr] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [telefoneSelecionado, setTelefoneSelecionado] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const selecionar = (tel: string) => {
    setTelefoneSelecionado(tel);
    setDetalhe(null);
  };

  const enviar = async () => {
    if (!telefoneSelecionado || !texto.trim()) return;
    setEnviando(true);
    try {
      await enviarMensagem(telefoneSelecionado, texto.trim());
      setTexto("");
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
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Conversas</span>
            <span className="ml-auto text-xs text-muted-foreground">{conversas.length}</span>
          </div>
          <ListaConversas
            conversas={conversas}
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

              <div className="border-t border-border p-3 flex gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
                <Button size="icon" onClick={enviar} disabled={enviando || !texto.trim()}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Coluna 3 — Cliente + OS */}
        {telefoneSelecionado && (
          <aside className="w-72 shrink-0 border-l border-border overflow-y-auto p-4 space-y-4">
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
