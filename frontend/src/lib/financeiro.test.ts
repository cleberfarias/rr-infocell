import { describe, expect, it } from "vitest";

import { calcularDespesasPorVencimento, countDespesaOccurrences, parseVencimento } from "./financeiro";

describe("financeiro despesas por vencimento", () => {
  const junhoInicio = new Date(2026, 5, 1);
  const junhoFim = new Date(2026, 5, 30, 23, 59, 59, 999);
  const julhoInicio = new Date(2026, 6, 1);
  const julhoFim = new Date(2026, 6, 31, 23, 59, 59, 999);

  it("interpreta vencimentos em formatos aceitos", () => {
    expect(parseVencimento("20/06/2026", 2026)?.toISOString().slice(0, 10)).toBe("2026-06-20");
    expect(parseVencimento("20/06", 2026)?.toISOString().slice(0, 10)).toBe("2026-06-20");
    expect(parseVencimento("2026-06-20", 2026)?.toISOString().slice(0, 10)).toBe("2026-06-20");
  });

  it("contabiliza despesa no mes do vencimento, nao no mes da baixa", () => {
    const despesa = {
      valor: 150,
      vencimento: "20/06/2026",
      recorrente: true,
      pago: true,
      pagoEm: "2026-07-07T12:00:00.000Z",
    };

    expect(calcularDespesasPorVencimento([despesa], junhoInicio, junhoFim)).toBe(150);
    expect(calcularDespesasPorVencimento([despesa], julhoInicio, julhoFim)).toBe(0);
  });

  it("mantem uma despesa fora do periodo quando apenas pagoEm cai no periodo", () => {
    expect(
      countDespesaOccurrences(
        { vencimento: "15/06/2026" },
        julhoInicio,
        julhoFim,
      ),
    ).toBe(0);
  });
});
