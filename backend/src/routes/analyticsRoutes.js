async function analyticsRoutes(app) {
  app.get(
    "/analytics/summary",
    {
      preHandler: [app.authenticate, app.authorize(["admin", "analyst"])],
      schema: {
        tags: ["analytics"],
        summary: "Retorna resumo consolidado das classificacoes",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "number" },
              averageTrustScore: { type: "number" },
              byRiskLevel: {
                type: "object",
                additionalProperties: {
                  type: "number"
                }
              },
              byAccessLevel: {
                type: "object",
                additionalProperties: {
                  type: "number"
                }
              },
              recent24hCount: { type: "number" }
            }
          }
        }
      }
    },
    async () => {
      return app.services.classificationService.getSummary();
    }
  );
}

export default analyticsRoutes;
