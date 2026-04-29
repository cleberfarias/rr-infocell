import request from "supertest";

import { createApp } from "../../app.js";

const checklistItens = [
  { nome: "Tela", status: "funcionando" },
  { nome: "Touch", status: "com_defeito", observacao: "Falha no canto superior" },
  { nome: "Camera", status: "nao_testado" },
];

describe("checklists routes", () => {
  const app = createApp();

  const createOrdem = async () => {
    const response = await request(app).post("/api/ordens-servico").send({
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Checklist teste",
      status: "recebido",
    });

    expect(response.status).toBe(201);

    return response.body.data;
  };

  it("lists checklists", async () => {
    const response = await request(app).get("/api/checklists");

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(response.body.data.length);
  });

  it("creates, filters, updates and deletes a checklist", async () => {
    const ordem = await createOrdem();

    const createResponse = await request(app)
      .post("/api/checklists")
      .send({
        ordemServicoId: ordem.id,
        aparelhoId: ordem.aparelhoId,
        itens: checklistItens,
        fotos: [
          {
            nome: "frente.jpg",
            url: "https://example.com/frente.jpg",
            path: `ordensServico/${ordem.id}/frente.jpg`,
            contentType: "image/jpeg",
            uploadedAt: new Date().toISOString(),
          },
        ],
        observacoesGerais: "Aparelho recebido sem carregador.",
        criadoPor: "Camila O.",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toEqual(expect.any(String));
    expect(createResponse.body.data.itens).toHaveLength(3);
    expect(createResponse.body.data.fotos).toHaveLength(1);

    const checklistId = createResponse.body.data.id;
    const filterResponse = await request(app).get(`/api/checklists?ordemServicoId=${ordem.id}`);

    expect(filterResponse.status).toBe(200);
    expect(filterResponse.body.data).toHaveLength(1);

    const updateResponse = await request(app)
      .put(`/api/checklists/${checklistId}`)
      .send({
        ordemServicoId: ordem.id,
        aparelhoId: ordem.aparelhoId,
        itens: [{ nome: "Tela", status: "com_defeito", observacao: "Trincada" }],
        fotos: [],
        observacoesGerais: "Tela trincada na entrada.",
        criadoPor: "Camila O.",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.itens[0].status).toBe("com_defeito");

    const deleteResponse = await request(app).delete(`/api/checklists/${checklistId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/checklists/${checklistId}`);

    expect(getResponse.status).toBe(404);
  });

  it("returns validation errors", async () => {
    const response = await request(app).post("/api/checklists").send({
      ordemServicoId: "ordem",
      aparelhoId: "aparelho",
      itens: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("does not create checklist for aparelho outside ordem", async () => {
    const ordem = await createOrdem();

    const response = await request(app).post("/api/checklists").send({
      ordemServicoId: ordem.id,
      aparelhoId: "apa_moto_g_juliana",
      itens: checklistItens,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("checklist_aparelho_mismatch");
  });
});
