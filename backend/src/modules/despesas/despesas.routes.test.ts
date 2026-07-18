import request from "supertest";

import { createApp } from "../../app.js";

describe("despesas routes", () => {
  const app = createApp();

  it("lists seeded despesas", async () => {
    const response = await request(app).get("/api/despesas");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("creates, updates and deletes despesa", async () => {
    const createResponse = await request(app).post("/api/despesas").send({
      descricao: "Licenca software",
      categoria: "outros",
      fornecedor: "SaaS",
      valor: 99,
      vencimento: "25/05",
      recorrente: true,
      pago: false,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));
    expect(createResponse.body.data.pago).toBe(false);

    const id = createResponse.body.data.id;
    const updateResponse = await request(app).put(`/api/despesas/${id}`).send({
      descricao: "Licenca software",
      categoria: "outros",
      fornecedor: "SaaS",
      valor: 109,
      vencimento: "25/05",
      recorrente: true,
      pago: true,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.valor).toBe(109);
    expect(updateResponse.body.data.pago).toBe(true);
    expect(updateResponse.body.data.pagoEm).toEqual(expect.any(String));

    const deleteResponse = await request(app).delete(`/api/despesas/${id}`);
    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/despesas/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it("filters despesas", async () => {
    const response = await request(app).get("/api/despesas?categoria=luz&pago=true");

    expect(response.status).toBe(200);
    expect(
      response.body.data.every(
        (despesa: { categoria: string; pago: boolean }) =>
          despesa.categoria === "luz" && despesa.pago,
      ),
    ).toBe(true);
  });

  it("creates monthly recurrences without duplicates and adjusts month end", async () => {
    const createResponse = await request(app).post("/api/despesas").send({
      descricao: "Aluguel recorrente teste",
      categoria: "aluguel",
      valor: 1500,
      vencimento: "31/01/2026",
      recorrente: true,
      pago: true,
    });
    const id = createResponse.body.data.id;

    const recurrenceResponse = await request(app)
      .post(`/api/despesas/${id}/recorrencias`)
      .send({ meses: 3 });

    expect(recurrenceResponse.status).toBe(201);
    expect(
      recurrenceResponse.body.data.criadas.map(
        (despesa: { vencimento: string }) => despesa.vencimento,
      ),
    ).toEqual(["28/02/2026", "31/03/2026", "30/04/2026"]);
    expect(
      recurrenceResponse.body.data.criadas.every(
        (despesa: { pago: boolean; recorrente: boolean }) => !despesa.pago && despesa.recorrente,
      ),
    ).toBe(true);

    const repeatedResponse = await request(app)
      .post(`/api/despesas/${id}/recorrencias`)
      .send({ meses: 3 });

    expect(repeatedResponse.body.data.criadas).toHaveLength(0);
    expect(repeatedResponse.body.data.ignoradas).toBe(3);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "A",
      categoria: "outros",
      valor: 0,
      vencimento: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("rejects a due date without month", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "Aluguel invalido",
      categoria: "aluguel",
      valor: 1000,
      vencimento: "10",
      recorrente: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("dd/mm");
  });

  it("creates every installment open with an independent due date", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "Equipamento parcelado teste",
      categoria: "outros",
      valor: 300,
      vencimento: "31/01/2027",
      tipoLancamento: "parcelada",
      totalParcelas: 3,
      pago: false,
    });

    expect(response.status).toBe(201);
    const origemId = response.body.data.id;
    const listResponse = await request(app).get("/api/despesas");
    const parcelas = listResponse.body.data.filter(
      (despesa: { id: string; recorrenciaOrigemId?: string }) =>
        despesa.id === origemId || despesa.recorrenciaOrigemId === origemId,
    );

    expect(parcelas.map((despesa: { vencimento: string }) => despesa.vencimento).sort()).toEqual([
      "28/02/2027",
      "31/01/2027",
      "31/03/2027",
    ]);
    expect(parcelas.every((despesa: { pago: boolean }) => !despesa.pago)).toBe(true);
  });

  it("materializes a fixed monthly expense only once for the requested month", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "Aluguel fixo automatico teste",
      categoria: "aluguel",
      valor: 1200,
      vencimento: "10/07/2027",
      tipoLancamento: "fixa",
      pago: true,
    });
    const origemId = response.body.data.id;

    await request(app).get("/api/despesas?competencia=2027-08");
    await request(app).get("/api/despesas?competencia=2027-08");
    const listResponse = await request(app).get("/api/despesas");
    const agosto = listResponse.body.data.filter(
      (despesa: { recorrenciaOrigemId?: string; vencimento: string }) =>
        despesa.recorrenciaOrigemId === origemId && despesa.vencimento === "10/08/2027",
    );

    expect(agosto).toHaveLength(1);
    expect(agosto[0].pago).toBe(false);
  });

  it("does not duplicate a fixed expense under concurrent requests", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "Aluguel concorrente teste",
      categoria: "aluguel",
      valor: 1300,
      vencimento: "10/07/2028",
      tipoLancamento: "fixa",
      pago: false,
    });
    const origemId = response.body.data.id;

    await Promise.all(
      Array.from({ length: 5 }, () => request(app).get("/api/despesas?competencia=2028-08")),
    );
    const listResponse = await request(app).get("/api/despesas");
    const agosto = listResponse.body.data.filter(
      (despesa: { recorrenciaOrigemId?: string; vencimento: string }) =>
        despesa.recorrenciaOrigemId === origemId && despesa.vencimento === "10/08/2028",
    );

    expect(agosto).toHaveLength(1);
  });

  it("stops a fixed series when an occurrence becomes unique and allows its deletion", async () => {
    const response = await request(app).post("/api/despesas").send({
      descricao: "Aluguel editavel teste",
      categoria: "aluguel",
      valor: 1400,
      vencimento: "10/07/2029",
      tipoLancamento: "fixa",
      pago: false,
    });
    const origemId = response.body.data.id;

    await request(app).get("/api/despesas?competencia=2029-08");
    const listResponse = await request(app).get("/api/despesas");
    const agosto = listResponse.body.data.find(
      (despesa: { recorrenciaOrigemId?: string }) => despesa.recorrenciaOrigemId === origemId,
    );

    const updateResponse = await request(app).put(`/api/despesas/${agosto.id}`).send({
      descricao: agosto.descricao,
      categoria: agosto.categoria,
      fornecedor: agosto.fornecedor,
      valor: agosto.valor,
      vencimento: agosto.vencimento,
      tipoLancamento: "unica",
      pago: agosto.pago,
    });
    expect(updateResponse.body.data.recorrenciaOrigemId).toBeUndefined();

    await request(app).delete(`/api/despesas/${agosto.id}`);
    await request(app).get("/api/despesas?competencia=2029-08");
    const finalList = await request(app).get("/api/despesas");
    expect(finalList.body.data.some((despesa: { id: string }) => despesa.id === agosto.id)).toBe(
      false,
    );
    expect(
      finalList.body.data.find((despesa: { id: string }) => despesa.id === origemId).tipoLancamento,
    ).toBe("unica");
  });
});
