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
    expect(response.body.data.every((despesa: { categoria: string; pago: boolean }) =>
      despesa.categoria === "luz" && despesa.pago,
    )).toBe(true);
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
});
