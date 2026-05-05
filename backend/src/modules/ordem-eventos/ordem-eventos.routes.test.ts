import request from "supertest";

import { createApp } from "../../app.js";

describe("ordem-eventos routes", () => {
  const app = createApp();

  it("creates and lists ordem eventos", async () => {
    const ordemResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste evento",
    });
    const ordem = ordemResponse.body.data;

    const createResponse = await request(app).post("/api/ordem-eventos").send({
      ordemServicoId: ordem.id,
      tipo: "comentario",
      titulo: "Contato com cliente",
      descricao: "Cliente pediu retorno no fim do dia.",
      criadoPor: "Rafael S.",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));

    const listResponse = await request(app).get(
      `/api/ordem-eventos?ordemServicoId=${ordem.id}`,
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].titulo).toBe("Contato com cliente");
  });
});
