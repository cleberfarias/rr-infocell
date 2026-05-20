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

  it("applies discount directly on ordem total", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Tela quebrada com desconto",
      status: "em_manutencao",
      valorPecas: 120,
      valorMaoObra: 80,
      desconto: 30,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.desconto).toBe(30);
    expect(createResponse.body.data.valorTotal).toBe(170);

    const updateResponse = await request(app)
      .put(`/api/ordens-servico/${createResponse.body.data.id}`)
      .send({
        clienteId: "cli_marcos_almeida",
        aparelhoId: "apa_iphone_11_marcos",
        defeitoRelatado: "Tela quebrada com desconto",
        status: "pronto_para_retirada",
        valorPecas: 120,
        valorMaoObra: 80,
        desconto: 50,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.desconto).toBe(50);
    expect(updateResponse.body.data.valorTotal).toBe(150);
  });

  it("stores mao de obra inclusa flag without charging zero value", async () => {
    const response = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Troca de tela com mao de obra inclusa",
      status: "em_manutencao",
      valorPecas: 200,
      valorMaoObra: 0,
      maoObraInclusaNaPeca: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.valorMaoObra).toBe(0);
    expect(response.body.data.maoObraInclusaNaPeca).toBe(true);
    expect(response.body.data.valorTotal).toBe(200);
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

  it("deducts stock when adding pecas usadas to ordem", async () => {
    const produtoResponse = await request(app).post("/api/produtos").send({
      sku: "OS-FLX-01",
      nome: "Flex de carga para OS",
      categoria: "peca",
      estoqueAtual: 4,
      estoqueMinimo: 1,
      custo: 20,
      precoVenda: 50,
    });
    const produto = produtoResponse.body.data;
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Conector com mau contato",
      status: "em_manutencao",
      valorMaoObra: 80,
    });
    const ordem = createResponse.body.data;

    const updateResponse = await request(app)
      .put(`/api/ordens-servico/${ordem.id}`)
      .send({
        clienteId: ordem.clienteId,
        aparelhoId: ordem.aparelhoId,
        defeitoRelatado: ordem.defeitoRelatado,
        status: ordem.status,
        valorMaoObra: ordem.valorMaoObra,
        pecasUsadas: [
          {
            produtoId: produto.id,
            quantidade: 2,
          },
        ],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.pecasUsadas).toHaveLength(1);
    expect(updateResponse.body.data.pecasUsadas[0].sku).toBe("OS-FLX-01");
    expect(updateResponse.body.data.valorPecas).toBe(100);
    expect(updateResponse.body.data.valorTotal).toBe(180);

    const produtoAfterResponse = await request(app).get(`/api/produtos/${produto.id}`);
    expect(produtoAfterResponse.body.data.estoqueAtual).toBe(2);

    const movimentacoesResponse = await request(app).get(
      `/api/movimentacoes-estoque?produtoId=${produto.id}`,
    );
    expect(movimentacoesResponse.body.data[0].origem).toBe("ordem_servico");
    expect(movimentacoesResponse.body.data[0].ordemServicoId).toBe(ordem.id);
  });

  it("registers payment when delivering ordem", async () => {
    const createResponse = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Teste de pagamento",
      status: "pronto_para_retirada",
      valorPecas: 50,
      valorMaoObra: 100,
    });
    const ordem = createResponse.body.data;

    const updateResponse = await request(app).put(`/api/ordens-servico/${ordem.id}`).send({
      clienteId: ordem.clienteId,
      aparelhoId: ordem.aparelhoId,
      defeitoRelatado: ordem.defeitoRelatado,
      status: "entregue",
      valorPecas: ordem.valorPecas,
      valorMaoObra: ordem.valorMaoObra,
      formaPagamento: "dinheiro",
      valorRecebido: 200,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.status).toBe("entregue");
    expect(updateResponse.body.data.formaPagamento).toBe("dinheiro");
    expect(updateResponse.body.data.valorRecebido).toBe(200);
    expect(updateResponse.body.data.troco).toBe(50);
    expect(updateResponse.body.data.pagoEm).toEqual(expect.any(String));
    expect(updateResponse.body.data.entregueEm).toEqual(expect.any(String));
  });
});
