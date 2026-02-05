async function healthRoutes(app) {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Health check da API",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              version: { type: "string" },
              timestamp: { type: "string" },
              uptimeSeconds: { type: "number" }
            }
          }
        }
      }
    },
    async () => ({
      status: "ok",
      service: app.config.app.name,
      version: app.config.app.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2))
    })
  );
}

export default healthRoutes;
