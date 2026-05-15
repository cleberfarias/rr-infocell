import request from "supertest";

import { createApp } from "../../app.js";

describe("orcamentos routes", () => {
  const app = createApp();

  it("creates or updates orcamento from ordem", async () => {
    const ordemResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste orcamento",
      diagnostico: "Trocar bateria",
      valorPecas: 100,
      valorMaoObra: 80,
    });
    const ordem = ordemResponse.body.data;

    const createResponse = await request(app).post("/api/orcamentos").send({
      ordemServicoId: ordem.id,
      status: "enviado",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.valorTotal).toBe(180);
    expect(createResponse.body.data.status).toBe("enviado");

    const updateResponse = await request(app).post("/api/orcamentos").send({
      ordemServicoId: ordem.id,
      status: "aprovado",
    });

    expect(updateResponse.status).toBe(201);
    expect(updateResponse.body.data.id).toBe(createResponse.body.data.id);
    expect(updateResponse.body.data.status).toBe("aprovado");

    const listResponse = await request(app).get(`/api/orcamentos?ordemServicoId=${ordem.id}`);

    expect(listResponse.body.data).toHaveLength(1);
  });
});
