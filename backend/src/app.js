import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { loadConfig } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import observabilityPlugin from "./plugins/observability.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import classificationRoutes from "./routes/classificationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { UserRepository } from "./modules/auth/userRepository.js";
import { AuthService } from "./modules/auth/authService.js";
import { ClassificationRepository } from "./modules/classifications/classificationRepository.js";
import { ClassificationService } from "./modules/classifications/classificationService.js";
import { AuditRepository } from "./modules/audit/auditRepository.js";
import { AuditService } from "./modules/audit/auditService.js";

function createCorsOriginChecker(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed"), false);
  };
}

async function buildApp(options = {}) {
  const config = options.config ?? loadConfig();
  const logger = options.logger ?? {
    level: config.app.logLevel
  };

  const app = Fastify({
    logger,
    trustProxy: true
  });

  const userRepository =
    options.userRepository ?? new UserRepository(config.storage.dataDir);
  const classificationRepository =
    options.classificationRepository ??
    new ClassificationRepository(config.storage.dataDir);
  const auditRepository =
    options.auditRepository ?? new AuditRepository(config.storage.dataDir);

  const authService = new AuthService({
    userRepository,
    seedAdmin: config.auth.seedAdmin
  });
  const classificationService = new ClassificationService({
    classificationRepository
  });
  const auditService = new AuditService({
    auditRepository
  });

  app.decorate("config", config);
  app.decorate("services", {
    authService,
    classificationService,
    auditService
  });

  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  await app.register(cors, {
    origin: createCorsOriginChecker(config.security.corsOrigins),
    credentials: false
  });

  await app.register(rateLimit, {
    max: config.security.rateLimit.max,
    timeWindow: config.security.rateLimit.timeWindow
  });

  await app.register(jwt, {
    secret: config.auth.jwtSecret,
    sign: {
      expiresIn: config.auth.tokenTtl
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Classificacao de Usuarios API",
        description:
          "API backend para classificacao de usuarios com seguranca, historico e analytics.",
        version: config.app.version
      },
      tags: [
        { name: "health", description: "Saude da API" },
        { name: "auth", description: "Autenticacao e usuarios" },
        { name: "classifications", description: "Operacoes de classificacao" },
        { name: "analytics", description: "Consolidacao e metricas" },
        { name: "audit", description: "Trilha de auditoria operacional" }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false
    }
  });

  await app.register(observabilityPlugin);
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes);
  await app.register(
    async function v1Routes(v1) {
      await v1.register(authRoutes);
      await v1.register(classificationRoutes);
      await v1.register(analyticsRoutes);
      await v1.register(auditRoutes);
    },
    { prefix: "/api/v1" }
  );

  await authService.ensureSeedAdmin();
  if (config.auth.weakSecret) {
    app.log.warn(
      "JWT_SECRET fraco detectado. Configure uma chave forte antes de producao."
    );
  }

  return app;
}

export { buildApp };
