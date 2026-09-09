import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(config.logDir, { recursive: true });

export const logger = pino(
  { level: config.isProduction ? "info" : "debug" },
  pino.destination({ dest: path.join(config.logDir, "app.log"), mkdir: true })
);
