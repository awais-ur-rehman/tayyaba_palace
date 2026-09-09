import Fastify from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { runMigrations } from "./db/migrate.js";
import { authRoutes } from "./modules/auth/routes.js";
import { inventoryRoutes } from "./modules/inventory/routes.js";
import { bookingsRoutes } from "./modules/bookings/routes.js";
import { invoicesRoutes } from "./modules/invoices/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";
import { backupRoutes } from "./modules/backup/routes.js";
import { printerRoutes } from "./modules/printer/routes.js";
import { startBackupScheduler } from "./modules/backup/scheduler.js";
import { startFiscalQueue } from "./fiscal/queue.js";

runMigrations();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger });

await app.register(multipart);
await app.register(cookie);
await app.register(session, {
  secret: config.sessionSecret,
  cookie: {
    secure: false, // plain HTTP on localhost, see TECHNICAL_SPEC.md §11
    httpOnly: true,
    sameSite: "strict",
    maxAge: 12 * 60 * 60 * 1000,
  },
  rolling: true,
});

await app.register(authRoutes);
await app.register(inventoryRoutes);
await app.register(bookingsRoutes);
await app.register(invoicesRoutes);
await app.register(healthRoutes);
await app.register(settingsRoutes);
await app.register(backupRoutes);
await app.register(printerRoutes);

const clientDist = path.resolve(__dirname, "../../web/dist");
await app.register(fastifyStatic, {
  root: clientDist,
  wildcard: false,
});
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url?.startsWith("/api")) return reply.code(404).send({ error: "Not found" });
  reply.sendFile("index.html");
});

startFiscalQueue();
startBackupScheduler();

app.listen({ port: config.port, host: "127.0.0.1" }, (err, address) => {
  if (err) {
    logger.error(err);
    // Startup failures must be visible on the console, not just the log
    // file — an operator staring at a blank terminal has no way to know
    // the process even tried to start.
    if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
      console.error(
        `Port ${config.port} is already in use. Another copy of the server may already be running — ` +
          `stop it first, or change PORT in .env.`
      );
    } else {
      console.error("Failed to start server:", err.message);
    }
    process.exit(1);
  }
  console.log(`Tayyaba Palace server listening at ${address}`);
});
