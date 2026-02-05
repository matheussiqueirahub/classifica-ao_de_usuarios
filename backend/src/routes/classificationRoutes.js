const classificationBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "fullName",
    "age",
    "registrationStatus",
    "emailVerified",
    "twoFactorEnabled",
    "acceptedTerms"
  ],
  properties: {
    fullName: { type: "string", minLength: 2, maxLength: 120 },
    age: { type: "number", minimum: 0, maximum: 120 },
    registrationStatus: {
      type: "string",
      enum: ["registrado", "pendente", "nao registrado", "bloqueado"]
    },
    emailVerified: { type: "boolean" },
    twoFactorEnabled: { type: "boolean" },
    acceptedTerms: { type: "boolean" }
  }
};

const classificationResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "createdAt", "user", "registration", "security", "access", "recommendations"],
  properties: {
    id: { type: "string" },
    createdAt: { type: "string" },
    user: {
      type: "object",
      additionalProperties: false,
      properties: {
        fullName: { type: "string" },
        age: { type: "number" },
        isAdult: { type: "boolean" },
        ageGroup: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string" },
            label: { type: "string" },
            min: { type: "number" },
            max: { type: "number" }
          }
        }
      }
    },
    registration: {
      type: "object",
      additionalProperties: false,
      properties: {
        key: { type: "string" },
        label: { type: "string" },
        guidance: { type: "string" }
      }
    },
    security: {
      type: "object",
      additionalProperties: false,
      properties: {
        emailVerified: { type: "boolean" },
        twoFactorEnabled: { type: "boolean" },
        acceptedTerms: { type: "boolean" },
        trustScore: { type: "number" },
        riskLevel: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string" },
            label: { type: "string" }
          }
        }
      }
    },
    access: {
      type: "object",
      additionalProperties: false,
      properties: {
        key: { type: "string" },
        label: { type: "string" },
        summary: { type: "string" }
      }
    },
    recommendations: { type: "array", items: { type: "string" } },
    actor: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        role: { type: "string" }
      }
    }
  }
};

async function classificationRoutes(app) {
  app.get(
    "/classifications/export",
    {
      preHandler: [app.authenticate, app.authorize(["admin", "analyst"])],
      schema: {
        tags: ["classifications"],
        summary: "Exporta classificacoes filtradas em JSON ou CSV",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            sortBy: { type: "string", enum: ["createdAt", "trustScore"] },
            sortOrder: { type: "string", enum: ["asc", "desc"] },
            search: { type: "string", maxLength: 120 },
            accessLevel: {
              type: "string",
              enum: [
                "completo",
                "ampliado",
                "supervisionado",
                "parcial",
                "visitante",
                "negado"
              ]
            },
            riskLevel: { type: "string", enum: ["baixo", "medio", "alto"] },
            createdAfter: { type: "string" },
            createdBefore: { type: "string" },
            format: { type: "string", enum: ["json", "csv"] }
          }
        }
      }
    },
    async (request, reply) => {
      const format = request.query.format === "csv" ? "csv" : "json";
      const records = await app.services.classificationService.export(request.query);

      if (format === "csv") {
        const header =
          "id,createdAt,userFullName,userAge,registrationStatus,accessLevel,trustScore,riskLevel,actorEmail";
        const rows = records.map((item) =>
          [
            item.id,
            item.createdAt,
            String(item.user?.fullName ?? "").replaceAll(",", " "),
            item.user?.age ?? "",
            item.registration?.key ?? "",
            item.access?.key ?? "",
            item.security?.trustScore ?? "",
            item.security?.riskLevel?.key ?? "",
            item.actor?.email ?? ""
          ].join(",")
        );
        reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header("Content-Disposition", "attachment; filename=classifications.csv")
          .send([header, ...rows].join("\n"));
        return;
      }

      reply.send({
        exportedAt: new Date().toISOString(),
        count: records.length,
        items: records
      });
    }
  );

  app.post(
    "/classifications",
    {
      preHandler: [app.authenticate, app.authorize(["admin", "analyst"])],
      schema: {
        tags: ["classifications"],
        summary: "Cria nova classificacao",
        security: [{ bearerAuth: [] }],
        body: classificationBodySchema,
        response: {
          201: classificationResponseSchema
        }
      }
    },
    async (request, reply) => {
      const created = await app.services.classificationService.createClassification(
        request.body,
        request.user
      );
      reply.code(201).send(created);
    }
  );

  app.get(
    "/classifications",
    {
      preHandler: [app.authenticate, app.authorize(["admin", "analyst"])],
      schema: {
        tags: ["classifications"],
        summary: "Lista classificacoes com filtros e paginacao",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "integer", minimum: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
            sortBy: { type: "string", enum: ["createdAt", "trustScore"] },
            sortOrder: { type: "string", enum: ["asc", "desc"] },
            search: { type: "string", maxLength: 120 },
            accessLevel: {
              type: "string",
              enum: [
                "completo",
                "ampliado",
                "supervisionado",
                "parcial",
                "visitante",
                "negado"
              ]
            },
            riskLevel: { type: "string", enum: ["baixo", "medio", "alto"] },
            createdAfter: { type: "string" },
            createdBefore: { type: "string" }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: classificationResponseSchema
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
      return app.services.classificationService.list(request.query);
    }
  );

  app.get(
    "/classifications/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin", "analyst"])],
      schema: {
        tags: ["classifications"],
        summary: "Busca classificacao por id",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 }
          }
        },
        response: {
          200: classificationResponseSchema
        }
      }
    },
    async (request) => {
      return app.services.classificationService.getById(request.params.id);
    }
  );

  app.delete(
    "/classifications/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
      schema: {
        tags: ["classifications"],
        summary: "Remove classificacao por id (apenas admin)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 }
          }
        },
        response: {
          204: {
            type: "null"
          }
        }
      }
    },
    async (request, reply) => {
      await app.services.classificationService.deleteById(request.params.id);
      reply.code(204).send();
    }
  );

  app.delete(
    "/classifications",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
      schema: {
        tags: ["classifications"],
        summary: "Limpa historico de classificacoes (apenas admin)",
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: "null"
          }
        }
      }
    },
    async (_, reply) => {
      await app.services.classificationService.clearAll();
      reply.code(204).send();
    }
  );
}

export default classificationRoutes;
