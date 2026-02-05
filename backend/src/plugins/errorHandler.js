import fp from "fastify-plugin";
import { isAppError } from "../core/appError.js";

const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Falha de validacao da requisicao.",
          details: error.validation
        }
      });
      return;
    }

    if (isAppError(error)) {
      reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.expose ? error.message : "Erro interno no servidor.",
          details: error.details ?? null
        }
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno no servidor.",
        details: null
      }
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Rota nao encontrada: ${request.method} ${request.url}`,
        details: null
      }
    });
  });
});

export default errorHandlerPlugin;
