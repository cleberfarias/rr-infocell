import request from "supertest";

import { createApp } from "../../app.js";

describe("movimentacoes estoque routes", () => {
  const app = createApp();

  const createProduto = async (estoqueAtual = 5) => {
    const response = await request(app).post("/api/produtos").send({
      sku: `MOV-${Date.now()}-${Math.random()}`,
      nome: "Peca para movimentacao",
      categoria: "peca",
      estoqueAtual,
      estoqueMinimo: 1,
      custo: 20,
      precoVenda: 40,
    });

    return response.body.data;
  };

  it("registers entrada and updates product stock", async () => {
    const produto = await createProduto(5);
    const response = await request(app).post("/api/movimentacoes-estoque").send({
      produtoId: produto.id,
      tipo: "entrada",
      quantidade: 3,
      motivo: "Compra de fornecedor",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.estoqueAnterior).toBe(5);
    expect(response.body.data.estoquePosterior).toBe(8);

    const produtoResponse = await request(app).get(
      `/api/produtos/${produto.id}`,
    );
    expect(produtoResponse.body.data.estoqueAtual).toBe(8);
  });

  it("registers saida and blocks negative stock", async () => {
    const produto = await createProduto(4);
    const response = await request(app).post("/api/movimentacoes-estoque").send({
      produtoId: produto.id,
      tipo: "saida",
      quantidade: 2,
      motivo: "Uso em atendimento",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.estoqueAnterior).toBe(4);
    expect(response.body.data.estoquePosterior).toBe(2);

    const blockedResponse = await request(app)
      .post("/api/movimentacoes-estoque")
      .send({
        produtoId: produto.id,
        tipo: "saida",
        quantidade: 5,
      });

    expect(blockedResponse.status).toBe(400);
    expect(blockedResponse.body.error.code).toBe("estoque_insuficiente");
  });

  it("registers manual adjustment", async () => {
    const produto = await createProduto(7);
    const response = await request(app).post("/api/movimentacoes-estoque").send({
      produtoId: produto.id,
      tipo: "ajuste",
      estoqueFinal: 3,
      motivo: "Contagem fisica",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.quantidade).toBe(4);
    expect(response.body.data.estoquePosterior).toBe(3);
  });

  it("lists movements filtered by product", async () => {
    const produto = await createProduto(1);
    await request(app).post("/api/movimentacoes-estoque").send({
      produtoId: produto.id,
      tipo: "entrada",
      quantidade: 1,
    });

    const response = await request(app).get(
      `/api/movimentacoes-estoque?produtoId=${produto.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].produtoId).toBe(produto.id);
  });
});
