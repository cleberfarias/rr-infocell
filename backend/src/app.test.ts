import request from "supertest";

import { createApp } from "./app.js";

describe("backend app", () => {
  const app = createApp();

  it("returns health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("rr-infocell-backend");
  });

  it("returns a typed not found response", async () => {
    const response = await request(app).get("/api/rota-inexistente");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("route_not_found");
  });
});
