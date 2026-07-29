import { describe, expect, it } from "vitest";

import { tenantSettingsSchema } from "./tenant.schemas.js";

const validSettings = {
  name: "RR Infocell",
  branding: {
    logoUrl: "https://example.com/rr-infocell.png",
    primaryColor: "205 95% 55%",
    secondaryColor: "220 12% 14%",
  },
  company: {
    cnpj: "57.008.356/0001-99",
    endereco: "Rua Miguel Babi Sobrinho, 116",
    bairro: "Centro",
    cidade: "Anita Garibaldi",
    uf: "SC",
    telefone: "(49) 98890-3625",
    whatsapp: "(49) 98890-3625",
    tecnicoPadrao: "Robison Romalino",
  },
};

describe("tenantSettingsSchema", () => {
  it("aceita identidade e dados empresariais validos", () => {
    expect(tenantSettingsSchema.parse(validSettings)).toMatchObject(validSettings);
  });

  it("permite remover a URL customizada da logo", () => {
    expect(
      tenantSettingsSchema.parse({
        ...validSettings,
        branding: { ...validSettings.branding, logoUrl: "" },
      }).branding.logoUrl,
    ).toBe("");
  });

  it("rejeita cores fora do formato HSL esperado", () => {
    expect(() =>
      tenantSettingsSchema.parse({
        ...validSettings,
        branding: { ...validSettings.branding, primaryColor: "#0088ff" },
      }),
    ).toThrow("Cor deve usar o formato HSL");
  });

  it("rejeita marcacao HTML em dados usados nas impressoes", () => {
    expect(() =>
      tenantSettingsSchema.parse({
        ...validSettings,
        company: { ...validSettings.company, mensagemFinal: "<script>alert(1)</script>" },
      }),
    ).toThrow("Campo nao pode conter marcacao HTML");
  });
});
