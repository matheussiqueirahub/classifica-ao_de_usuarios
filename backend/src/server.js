import { buildApp } from "./app.js";

const app = await buildApp();

try {
  await app.listen({
    host: app.config.server.host,
    port: app.config.server.port
  });
  app.log.info(
    `API online em http://${app.config.server.host}:${app.config.server.port}`
  );
} catch (error) {
  app.log.error({ err: error }, "Falha ao iniciar API");
  process.exit(1);
}
