import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (value?: string): string => {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

export const formatDateShort = (value?: string): string => {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, "dd/MM", { locale: ptBR });
};

export const formatDateTime = (value?: string): string => {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
};

export const formatDateTimeShort = (value?: string): string => {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, "dd/MM HH:mm", { locale: ptBR });
};

export const formatRelativeDate = (value?: string): string => {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
};
