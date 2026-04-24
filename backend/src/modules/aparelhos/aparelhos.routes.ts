import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";

export const aparelhosRoutes = Router();

aparelhosRoutes.get("/", (_request, response) => {
  response.status(httpStatus.ok).json({
    data: [],
    meta: {
      module: "aparelhos",
      status: "scaffold",
    },
  });
});
