import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

const app = createApp();

describe("GET /api/contas", () => {
  it("retorna lista de contas", async () => {
    const res = await request(app).get("/api/contas");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe("POST /api/contas", () => {
  it("rejeita criação sem nome", async () => {
    const res = await request(app).post("/api/contas").send({});
    expect(res.status).toBe(400);
  });
});
