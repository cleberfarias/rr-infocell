import request from "supertest";

import { createApp } from "../../app.js";

describe("vendas routes", () => {
  const app = createApp();

  it("finalizes venda and delivers ordem", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste venda PDV",
      status: "pronto_para_retirada",
      valorPecas: 80,
      valorMaoObra: 120,
    });
    const ordem = createResponse.body.data;

    const vendaResponse = await request(app).post("/api/vendas").send({
      ordemServicoId: ordem.id,
      formaPagamento: "dinheiro",
      valorRecebido: 250,
    });

    expect(vendaResponse.status).toBe(201);
    expect(vendaResponse.body.data.ordemServicoId).toBe(ordem.id);
    expect(vendaResponse.body.data.valorTotal).toBe(200);
    expect(vendaResponse.body.data.troco).toBe(50);

    const ordemResponse = await request(app).get(`/api/ordens-servico/${ordem.id}`);
    expect(ordemResponse.body.data.status).toBe("entregue");
    expect(ordemResponse.body.data.formaPagamento).toBe("dinheiro");

    const eventosResponse = await request(app).get(`/api/ordem-eventos?ordemServicoId=${ordem.id}`);
    expect(eventosResponse.body.data.some((evento: { tipo: string }) => evento.tipo === "venda")).toBe(true);
  });

  it("rejects payment below ordem total", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste pagamento insuficiente",
      status: "pronto_para_retirada",
      valorMaoObra: 100,
    });

    const response = await request(app).post("/api/vendas").send({
      ordemServicoId: createResponse.body.data.id,
      formaPagamento: "pix",
      valorRecebido: 50,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("pagamento_insuficiente");
  });
});
