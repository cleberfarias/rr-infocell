import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";

export const checklistsRoutes = Router();

checklistsRoutes.get("/", (_request, response) => {
  response.status(httpStatus.ok).json({
    data: [],
    meta: {
      module: "checklists",
      status: "scaffold",
    },
  });
});
