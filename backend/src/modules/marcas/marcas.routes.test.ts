import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

const app = createApp();

describe("GET /api/marcas", () => {
  it("retorna lista com marcas padrão", async () => {
    const res = await request(app).get("/api/marcas");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const apple = res.body.data.find((m: { nome: string }) => m.nome === "Apple");
    expect(apple).toBeDefined();
  });
});

describe("POST /api/marcas", () => {
  it("rejeita criação sem nome", async () => {
    const res = await request(app).post("/api/marcas").send({});
    expect(res.status).toBe(400);
  });
});
