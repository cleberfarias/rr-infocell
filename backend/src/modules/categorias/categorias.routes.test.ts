import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

const app = createApp();

describe("GET /api/categorias", () => {
  it("retorna lista com categorias padrão", async () => {
    const res = await request(app).get("/api/categorias");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    const peca = res.body.data.find((c: { id: string }) => c.id === "peca");
    expect(peca).toBeDefined();
    expect(peca.nome).toBe("Peça");
  });
});

describe("POST /api/categorias", () => {
  it("rejeita criação sem nome", async () => {
    const res = await request(app).post("/api/categorias").send({});
    expect(res.status).toBe(400);
  });
});
