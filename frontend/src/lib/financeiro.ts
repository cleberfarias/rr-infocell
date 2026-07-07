type DespesaFinanceiro = {
  valor: number;
  vencimento: string;
  pago?: boolean;
  pagoEm?: string;
  recorrente?: boolean;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export const parseVencimento = (value: string, referenceYear: number) => {
  const trimmed = value.trim();
  const brDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);

  if (brDate) {
    const day = Number(brDate[1]);
    const month = Number(brDate[2]) - 1;
    const yearText = brDate[3];
    const year = yearText
      ? Number(yearText.length === 2 ? `20${yearText}` : yearText)
      : referenceYear;
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]) - 1;
    const day = Number(isoDate[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  return null;
};

export const countDespesaOccurrences = (
  despesa: Pick<DespesaFinanceiro, "vencimento">,
  periodStart: Date,
  periodEnd: Date,
) => {
  const dueDate = parseVencimento(despesa.vencimento, periodStart.getFullYear());

  if (!dueDate) {
    return 0;
  }

  const normalizedStart = startOfDay(periodStart);
  const normalizedEnd = endOfDay(periodEnd);
  const normalizedDueDate = startOfDay(dueDate);

  return normalizedDueDate >= normalizedStart && normalizedDueDate <= normalizedEnd ? 1 : 0;
};

export const calcularDespesasPorVencimento = (
  despesas: DespesaFinanceiro[],
  periodStart: Date,
  periodEnd: Date,
) =>
  despesas.reduce(
    (sum, despesa) =>
      sum + despesa.valor * countDespesaOccurrences(despesa, periodStart, periodEnd),
    0,
  );
