import request from "supertest";

import { createApp } from "../../app.js";

describe("ordens-servico routes", () => {
  const app = createApp();

  it("lists seeded ordens de servico", async () => {
    const response = await request(app).get("/api/ordens-servico");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("filters ordens by status, search and cliente", async () => {
    const response = await request(app).get(
      "/api/ordens-servico?q=carrega&status=recebido&clienteId=cli_marcos_almeida",
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].defeitoRelatado).toContain("carrega");
  });

  it("creates, updates and deletes an ordem de servico", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Bateria descarregando rapido",
      status: "recebido",
      tecnicoResponsavel: "Rafael S.",
      valorPecas: 120,
      valorMaoObra: 80,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));
    expect(createResponse.body.data.numero).toEqual(expect.any(Number));
    expect(createResponse.body.data.valorTotal).toBe(200);

    const ordemId = createResponse.body.data.id;
    const updateResponse = await request(app).put(`/api/ordens-servico/${ordemId}`).send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Bateria descarregando rapido",
      diagnostico: "Bateria com desgaste elevado",
      status: "pronto_para_retirada",
      tecnicoResponsavel: "Rafael S.",
      valorPecas: 140,
      valorMaoObra: 90,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.status).toBe("pronto_para_retirada");
    expect(updateResponse.body.data.valorTotal).toBe(230);
    expect(updateResponse.body.data.concluidaEm).toEqual(expect.any(String));

    const deleteResponse = await request(app).delete(`/api/ordens-servico/${ordemId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/ordens-servico/${ordemId}`);

    expect(getResponse.status).toBe(404);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "A",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("does not create ordem for aparelho from another cliente", async () => {
    const response = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_moto_g_juliana",
      defeitoRelatado: "Tela sem imagem",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("aparelho_cliente_mismatch");
  });

  it("locks terminal ordens from updates", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste de bloqueio",
      status: "entregue",
    });

    expect(createResponse.status).toBe(201);

    const updateResponse = await request(app)
      .put(`/api/ordens-servico/${createResponse.body.data.id}`)
      .send({
        clienteId: "cli_marcos_almeida",
        aparelhoId: "apa_iphone_11_marcos",
        defeitoRelatado: "Tentativa de edicao",
        status: "em_manutencao",
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.error.code).toBe("ordem_servico_locked");
  });
});
