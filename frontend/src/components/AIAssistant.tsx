import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { perguntarAI } from "@/services/ajuda";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const quickGuides = [
  { label: "Como abrir uma OS?", question: "Como eu abro uma nova ordem de serviço no sistema?" },
  { label: "Como fazer o checklist?", question: "Como eu faço o checklist de entrada do aparelho?" },
  { label: "Como criar um orçamento?", question: "Como eu crio e envio um orçamento para o cliente?" },
  { label: "Como entregar o aparelho?", question: "Quais são os passos para entregar o aparelho ao cliente com garantia?" },
  { label: "Como cadastrar no estoque?", question: "Como eu cadastro um produto ou peça no estoque?" },
  { label: "Como usar o PDV?", question: "Como eu faço uma venda direta no PDV?" },
];

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content:
    "Olá! Sou o assistente do RR Infocell. Posso te ajudar a entender como usar qualquer parte do sistema.\n\nUse os guias rápidos abaixo ou escreva sua dúvida.",
};

export const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, open]);

  const sendMessage = async (question: string) => {
    const text = question.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const resposta = await perguntarAI(text);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: resposta },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro desconhecido.";
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Erro: ${detail}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Assistente IA"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition-all hover:scale-105 hover:opacity-90 md:bottom-6 md:right-6"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-[420px] flex-col gap-0 p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="text-left text-base">Assistente RR Infocell</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Tire dúvidas sobre como usar o sistema
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Guias rápidos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickGuides.map((guide) => (
                <button
                  key={guide.label}
                  onClick={() => sendMessage(guide.question)}
                  disabled={isLoading}
                  className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  {guide.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      msg.role === "assistant" ? "bg-gradient-primary" : "bg-secondary",
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                      msg.role === "assistant"
                        ? "bg-secondary/60 text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div className="flex items-center rounded-lg bg-secondary/60 px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida... (Enter para enviar)"
                className="resize-none"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-auto shrink-0 self-end bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                disabled={!input.trim() || isLoading}
                onClick={() => sendMessage(input)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Shift+Enter para nova linha · Enter para enviar
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
