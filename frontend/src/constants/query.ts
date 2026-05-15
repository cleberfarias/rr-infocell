/** Tempo que dados permanecem frescos antes de refetch */
export const STALE_TIME = {
  /** 30 segundos — dados que mudam frequentemente (WhatsApp, movimentações) */
  realtime: 30_000,
  /** 1 minuto — dados operacionais (ordens, checklist) */
  short: 60_000,
  /** 5 minutos — dados cadastrais (clientes, aparelhos, produtos) */
  medium: 5 * 60_000,
  /** 10 minutos — configurações (categorias, marcas, técnicos) */
  long: 10 * 60_000,
} as const;

/** Intervalos de polling para dados em tempo real */
export const POLL_INTERVAL = {
  /** 5 segundos — lista de conversas WhatsApp */
  conversas: 5_000,
  /** 3 segundos — mensagens da conversa ativa */
  mensagens: 3_000,
} as const;

/** Timeout para operações longas */
export const TIMEOUT = {
  /** Upload de fotos no Firebase Storage (ms) */
  upload: 120_000,
} as const;
