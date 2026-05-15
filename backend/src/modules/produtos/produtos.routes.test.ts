import request from "supertest";

import { createApp } from "../../app.js";

describe("produtos routes", () => {
  const app = createApp();

  it("lists seeded produtos", async () => {
    const response = await request(app).get("/api/produtos");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("filters produtos by search, categoria and ativo", async () => {
    const response = await request(app).get("/api/produtos?q=tela&categoria=peca&ativo=true");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].sku).toBe("TLA-IP13P");
  });

  it("creates, updates and deletes a produto", async () => {
    const createResponse = await request(app).post("/api/produtos").send({
      sku: "FLX-S23",
      nome: "Flex de carga S23",
      categoria: "peca",
      estoqueAtual: 6,
      estoqueMinimo: 4,
      custo: 55,
      precoVenda: 90,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));
    expect(createResponse.body.data.ativo).toBe(true);

    const produtoId = createResponse.body.data.id;
    const updateResponse = await request(app).put(`/api/produtos/${produtoId}`).send({
      sku: "FLX-S23",
      nome: "Flex de carga Galaxy S23",
      categoria: "peca",
      estoqueAtual: 5,
      estoqueMinimo: 3,
      custo: 55,
      precoVenda: 95,
      ativo: false,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.nome).toBe("Flex de carga Galaxy S23");
    expect(updateResponse.body.data.ativo).toBe(false);

    const deleteResponse = await request(app).delete(`/api/produtos/${produtoId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/produtos/${produtoId}`);

    expect(getResponse.status).toBe(404);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/produtos").send({
      sku: "A",
      nome: "B",
      categoria: "peca",
      estoqueAtual: -1,
      estoqueMinimo: 0,
      custo: 0,
      precoVenda: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("requires IMEI and individual stock for phone products", async () => {
    const missingImei = await request(app).post("/api/produtos").send({
      sku: "IPH-13-SEM",
      nome: "iPhone 13 seminovo",
      categoria: "celular_seminovo",
      estoqueAtual: 1,
      estoqueMinimo: 0,
      custo: 1800,
      precoVenda: 2400,
    });

    expect(missingImei.status).toBe(400);
    expect(missingImei.body.error.code).toBe("validation_error");

    const multipleStock = await request(app).post("/api/produtos").send({
      sku: "IPH-13-SEM",
      nome: "iPhone 13 seminovo",
      categoria: "celular_seminovo",
      estoqueAtual: 2,
      estoqueMinimo: 0,
      custo: 1800,
      precoVenda: 2400,
      imei: "359111111111111",
    });

    expect(multipleStock.status).toBe(400);
    expect(multipleStock.body.error.code).toBe("validation_error");
  });
});
