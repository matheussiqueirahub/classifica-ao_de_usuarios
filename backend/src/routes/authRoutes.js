const registerBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["fullName", "email", "password"],
  properties: {
    fullName: { type: "string", minLength: 3, maxLength: 120 },
    email: { type: "string", format: "email", maxLength: 160 },
    password: { type: "string", minLength: 8, maxLength: 128 },
    role: { type: "string", enum: ["admin", "analyst"] }
  }
};

const loginBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", maxLength: 160 },
    password: { type: "string", minLength: 8, maxLength: 128 }
  }
};

const userResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    fullName: { type: "string" },
    email: { type: "string" },
    role: { type: "string" },
    createdAt: { type: "string" }
  }
};

function buildRequestContext(request) {
  return {
    ip: request.ip,
    requestId: request.id,
    userAgent: request.headers["user-agent"] ?? null
  };
}

async function safeAudit(app, payload) {
  try {
    await app.services.auditService.record(payload);
  } catch (error) {
    app.log.warn({ err: error }, "Falha ao registrar evento de auditoria");
  }
}

async function authRoutes(app) {
  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "Autentica usuario e gera JWT",
        body: loginBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              token: { type: "string" },
              tokenType: { type: "string" },
              expiresIn: { type: "string" },
              user: userResponseSchema
            }
          }
        }
      }
    },
    async (request) => {
      const user = await app.services.authService.login(request.body);
      const token = await app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role
      });

      await safeAudit(app, {
        action: "AUTH_LOGIN",
        actor: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        request: buildRequestContext(request),
        metadata: {
          source: "api"
        }
      });

      return {
        token,
        tokenType: "Bearer",
        expiresIn: app.config.auth.tokenTtl,
        user
      };
    }
  );

  app.post(
    "/auth/register",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
      schema: {
        tags: ["auth"],
        summary: "Cadastra novo usuario (apenas admin)",
        security: [{ bearerAuth: [] }],
        body: registerBodySchema,
        response: {
          201: userResponseSchema
        }
      }
    },
    async (request, reply) => {
      const created = await app.services.authService.register(request.body);
      await safeAudit(app, {
        action: "AUTH_REGISTER",
        actor: {
          id: request.user.sub,
          email: request.user.email,
          role: request.user.role
        },
        request: buildRequestContext(request),
        metadata: {
          registeredUserId: created.id,
          registeredUserRole: created.role
        }
      });
      reply.code(201).send(created);
    }
  );

  app.get(
    "/auth/me",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Retorna perfil do usuario autenticado",
        security: [{ bearerAuth: [] }],
        response: {
          200: userResponseSchema
        }
      }
    },
    async (request) => {
      return app.services.authService.findUserById(request.user.sub);
    }
  );
}

export default authRoutes;
