import cors from "cors";
import express from "express";

import { corsOptions } from "./config/http.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { routes } from "./routes.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
