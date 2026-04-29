import request from "supertest";

import { createApp } from "../../app.js";

describe("aparelhos routes", () => {
  const app = createApp();

  it("lists seeded aparelhos", async () => {
    const response = await request(app).get("/api/aparelhos");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("filters aparelhos by search and cliente", async () => {
    const response = await request(app).get("/api/aparelhos?q=iPhone&clienteId=cli_marcos_almeida");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].modelo).toBe("iPhone 11");
  });

  it("creates, updates and deletes an aparelho", async () => {
    const createResponse = await request(app).post("/api/aparelhos").send({
      clienteId: "cli_marcos_almeida",
      marca: "Samsung",
      modelo: "Galaxy A54",
      cor: "Preto",
      imeiSerial: "123456789012345",
      estadoFisico: "Sem marcas aparentes",
      acessorios: "Capinha",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));

    const aparelhoId = createResponse.body.data.id;
    const updateResponse = await request(app).put(`/api/aparelhos/${aparelhoId}`).send({
      clienteId: "cli_marcos_almeida",
      marca: "Samsung",
      modelo: "Galaxy A54 5G",
      cor: "Preto",
      imeiSerial: "123456789012345",
      estadoFisico: "Tela com risco leve",
      acessorios: "Capinha",
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.modelo).toBe("Galaxy A54 5G");

    const deleteResponse = await request(app).delete(`/api/aparelhos/${aparelhoId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/aparelhos/${aparelhoId}`);

    expect(getResponse.status).toBe(404);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/aparelhos").send({
      clienteId: "cli_marcos_almeida",
      marca: "A",
      modelo: "B",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("does not create aparelho for an unknown cliente", async () => {
    const response = await request(app).post("/api/aparelhos").send({
      clienteId: "cliente_inexistente",
      marca: "Apple",
      modelo: "iPhone XR",
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("cliente_not_found");
  });
});
