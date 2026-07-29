import type { NextFunction, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../firebase/admin.js", () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: getMock })),
    })),
  },
}));

import { AppError } from "../shared/errors.js";
import { getRequestTenantId, resolveTenant, type TenantRequest } from "./tenant.js";

const response = {} as Response;

async function run(request: TenantRequest) {
  const next = vi.fn() as unknown as NextFunction;
  await resolveTenant(request, response, next);
  return vi.mocked(next);
}

describe("resolveTenant", () => {
  beforeEach(() => getMock.mockReset());

  it("mantem o tenant padrao somente no bypass local sem usuario", async () => {
    const request = {} as TenantRequest;
    const next = await run(request);

    expect(request.tenantId).toBe("rr-infocell");
    expect(next).toHaveBeenCalledWith();
  });

  it("resolve o tenant de um usuario ativo", async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ tenantId: "assistencia-teste", status: "ativo" }),
    });
    const request = { user: { uid: "user-1" } } as TenantRequest;
    const next = await run(request);

    expect(request.tenantId).toBe("assistencia-teste");
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ["documento ausente", { exists: false }, "tenant_user_not_configured"],
    [
      "tenant ausente",
      { exists: true, data: () => ({ status: "ativo" }) },
      "tenant_not_configured",
    ],
    [
      "usuario inativo",
      { exists: true, data: () => ({ tenantId: "outro", status: "inativo" }) },
      "tenant_user_inactive",
    ],
  ])("bloqueia usuario autenticado com %s", async (_case, snapshot, code) => {
    getMock.mockResolvedValue(snapshot);
    const request = { user: { uid: "user-1" } } as TenantRequest;
    const next = await run(request);

    expect(request.tenantId).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code, statusCode: 403 });
  });

  it("bloqueia falha de leitura sem cair no tenant padrao", async () => {
    getMock.mockImplementationOnce(() => {
      throw new Error("firestore indisponivel");
    });
    const request = { user: { uid: "user-1" } } as TenantRequest;
    const next = await run(request);

    expect(request.tenantId).toBeUndefined();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      code: "tenant_resolution_failed",
      statusCode: 500,
    });
  });
});

describe("getRequestTenantId", () => {
  it("nao permite fallback para usuario autenticado", () => {
    const request = { user: { uid: "user-1" } } as TenantRequest;

    expect(() => getRequestTenantId(request)).toThrow(AppError);
  });
});
