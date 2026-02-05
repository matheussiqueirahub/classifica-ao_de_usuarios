async function auditRoutes(app) {
  app.get(
    "/audit/events",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
      schema: {
        tags: ["audit"],
        summary: "Lista eventos de auditoria (admin)",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "integer", minimum: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
            action: { type: "string", maxLength: 100 },
            outcome: { type: "string", enum: ["success", "failure"] },
            actorEmail: { type: "string", maxLength: 160 }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    createdAt: { type: "string" },
                    action: { type: "string" },
                    outcome: { type: "string" },
                    actor: { type: "object" },
                    request: { type: "object" },
                    metadata: { type: "object" }
                  }
                }
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  pageSize: { type: "number" },
                  total: { type: "number" },
                  totalPages: { type: "number" }
                }
              }
            }
          }
        }
      }
    },
    async (request) => {
      return app.services.auditService.list(request.query);
    }
  );

  app.get(
    "/audit/events/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
      schema: {
        tags: ["audit"],
        summary: "Busca evento de auditoria por id (admin)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 }
          }
        }
      }
    },
    async (request) => {
      return app.services.auditService.getById(request.params.id);
    }
  );
}

export default auditRoutes;
