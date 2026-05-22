import type { Request, Response } from "express";

import { conexaoService } from "../whatsapp/conexao.service.js";

type LogLevel = "log" | "info" | "warn" | "error";
type EventoTipo = "backend_log" | "request" | "frontend_error" | "process_error";

export type ObservabilidadeEvento = {
  id: string;
  tipo: EventoTipo;
  nivel: LogLevel;
  mensagem: string;
  detalhes?: unknown;
  criadoEm: string;
};

const MAX_EVENTOS = 500;

class ObservabilidadeService {
  private eventos: ObservabilidadeEvento[] = [];
  private consoleInstalado = false;

  instalarCapturaConsole() {
    if (this.consoleInstalado) return;
    this.consoleInstalado = true;

    for (const nivel of ["log", "info", "warn", "error"] as const) {
      const original = console[nivel].bind(console);
      console[nivel] = (...args: unknown[]) => {
        this.registrar({
          tipo: "backend_log",
          nivel,
          mensagem: this.formatarMensagem(args),
          detalhes: args.map((arg) => this.serializar(arg)),
        });
        original(...args);
      };
    }

    process.on("uncaughtException", (error) => {
      this.registrarErroProcesso("uncaughtException", error);
    });

    process.on("unhandledRejection", (reason) => {
      this.registrarErroProcesso("unhandledRejection", reason);
    });
  }

  registrarRequest(request: Request, response: Response, duracaoMs: number) {
    const nivel: LogLevel =
      response.statusCode >= 500 ? "error" : response.statusCode >= 400 ? "warn" : "info";
    this.registrar({
      tipo: "request",
      nivel,
      mensagem: `${request.method} ${request.originalUrl} -> ${response.statusCode} (${duracaoMs}ms)`,
      detalhes: {
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        duracaoMs,
        ip: request.ip,
        userAgent: request.header("user-agent") ?? null,
      },
    });
  }

  registrarErroBackend(error: unknown, request: Request) {
    this.registrar({
      tipo: "process_error",
      nivel: "error",
      mensagem: error instanceof Error ? error.message : "Erro backend desconhecido",
      detalhes: {
        method: request.method,
        path: request.originalUrl,
        error: this.serializar(error),
      },
    });
  }

  registrarErroFrontend(input: {
    mensagem: string;
    stack?: string;
    componentStack?: string;
    url?: string;
    userAgent?: string;
    usuario?: string | null;
  }) {
    this.registrar({
      tipo: "frontend_error",
      nivel: "error",
      mensagem: input.mensagem,
      detalhes: input,
    });
  }

  getSnapshot() {
    const memoria = process.memoryUsage();
    const whatsapp = conexaoService.getStatus();

    return {
      status: {
        backend: "online",
        nodeEnv: process.env.NODE_ENV ?? "development",
        uptimeSegundos: Math.round(process.uptime()),
        iniciadoEm: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        memoriaMb: {
          rss: Math.round(memoria.rss / 1024 / 1024),
          heapUsed: Math.round(memoria.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoria.heapTotal / 1024 / 1024),
        },
        whatsapp,
      },
      eventos: this.eventos.slice().reverse(),
      totais: {
        eventos: this.eventos.length,
        erros: this.eventos.filter((evento) => evento.nivel === "error").length,
        avisos: this.eventos.filter((evento) => evento.nivel === "warn").length,
      },
    };
  }

  private registrar(evento: Omit<ObservabilidadeEvento, "id" | "criadoEm">) {
    this.eventos.push({
      ...evento,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      criadoEm: new Date().toISOString(),
    });

    if (this.eventos.length > MAX_EVENTOS) {
      this.eventos.splice(0, this.eventos.length - MAX_EVENTOS);
    }
  }

  private registrarErroProcesso(tipo: "uncaughtException" | "unhandledRejection", error: unknown) {
    this.registrar({
      tipo: "process_error",
      nivel: "error",
      mensagem: `${tipo}: ${error instanceof Error ? error.message : String(error)}`,
      detalhes: this.serializar(error),
    });
  }

  private formatarMensagem(args: unknown[]) {
    return args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return arg.message;
        return this.stringifySeguro(this.serializar(arg));
      })
      .join(" ");
  }

  private stringifySeguro(valor: unknown) {
    try {
      return JSON.stringify(valor);
    } catch {
      return String(valor);
    }
  }

  private serializar(valor: unknown): unknown {
    if (valor instanceof Error) {
      return {
        name: valor.name,
        message: valor.message,
        stack: valor.stack,
      };
    }

    return valor;
  }
}

export const observabilidadeService = new ObservabilidadeService();
