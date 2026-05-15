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
    expect(
      eventosResponse.body.data.some((evento: { tipo: string }) => evento.tipo === "venda"),
    ).toBe(true);
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

  it("finalizes direct phone sale by IMEI and decreases stock", async () => {
    const produtoResponse = await request(app).post("/api/produtos").send({
      sku: "IPH-12-VD",
      nome: "iPhone 12 seminovo venda direta",
      categoria: "celular_seminovo",
      estoqueAtual: 1,
      estoqueMinimo: 0,
      custo: 1200,
      precoVenda: 1700,
      imei: "359222222222222",
      garantiaDias: 90,
    });
    const produto = produtoResponse.body.data;

    const vendaResponse = await request(app)
      .post("/api/vendas")
      .send({
        clienteNome: "Cliente Balcao",
        formaPagamento: "pix",
        valorRecebido: 1700,
        itens: [{ produtoId: produto.id, quantidade: 1 }],
      });

    expect(vendaResponse.status).toBe(201);
    expect(vendaResponse.body.data.tipo).toBe("direta");
    expect(vendaResponse.body.data.itens[0].imei).toBe("359222222222222");
    expect(vendaResponse.body.data.itens[0].garantiaDias).toBe(90);

    const estoqueResponse = await request(app).get(`/api/produtos/${produto.id}`);
    expect(estoqueResponse.body.data.estoqueAtual).toBe(0);
  });
});
