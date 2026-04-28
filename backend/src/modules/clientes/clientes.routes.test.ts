import request from "supertest";

import { createApp } from "../../app.js";

describe("clientes routes", () => {
  const app = createApp();

  it("lists seeded clientes", async () => {
    const response = await request(app).get("/api/clientes");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("filters clientes by name, phone or document", async () => {
    const response = await request(app).get("/api/clientes?q=Juliana");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].nome).toBe("Juliana Ramos");
  });

  it("creates, updates and deletes a cliente", async () => {
    const createResponse = await request(app).post("/api/clientes").send({
      nome: "Cliente Teste",
      telefone: "(11) 99999-0000",
      documento: "111.222.333-44",
      email: "cliente.teste@example.com",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));

    const clienteId = createResponse.body.data.id;
    const updateResponse = await request(app).put(`/api/clientes/${clienteId}`).send({
      nome: "Cliente Teste Atualizado",
      telefone: "(11) 98888-0000",
      documento: "111.222.333-44",
      email: "cliente.atualizado@example.com",
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.nome).toBe("Cliente Teste Atualizado");

    const deleteResponse = await request(app).delete(`/api/clientes/${clienteId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/clientes/${clienteId}`);

    expect(getResponse.status).toBe(404);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/clientes").send({
      nome: "A",
      telefone: "123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });
});
