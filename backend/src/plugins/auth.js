import fp from "fastify-plugin";
import { AppError } from "../core/appError.js";

const authPlugin = fp(async (app) => {
  app.decorate("authenticate", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError({
        message: "Token invalido ou expirado.",
        statusCode: 401,
        code: "UNAUTHORIZED",
        expose: true
      });
    }
  });

  app.decorate("authorize", (roles = []) => {
    const acceptedRoles = Array.isArray(roles) ? roles : [roles];
    return async (request) => {
      if (!acceptedRoles.includes(request.user?.role)) {
        throw new AppError({
          message: "Acesso negado para este recurso.",
          statusCode: 403,
          code: "FORBIDDEN",
          expose: true
        });
      }
    };
  });
});

export default authPlugin;
