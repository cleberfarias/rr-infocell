import { Router } from "express";

import { firebaseApp } from "../../firebase/admin.js";
import { httpStatus } from "../../shared/http-status.js";

export const healthRoutes = Router();

healthRoutes.get("/", (_request, response) => {
  response.status(httpStatus.ok).json({
    data: {
      status: "ok",
      service: "rr-infocell-backend",
      firebaseAdmin: firebaseApp ? "configured" : "not_configured",
      timestamp: new Date().toISOString(),
    },
  });
});
