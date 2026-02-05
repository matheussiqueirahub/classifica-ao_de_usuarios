import { resolve } from "node:path";

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value, fallback = "*") {
  const source = String(value ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return source.length ? source : [fallback];
}

function isWeakSecret(secret) {
  return (
    !secret ||
    secret.length < 16 ||
    secret.toLowerCase().includes("change_this_secret")
  );
}

function loadConfig(env = process.env) {
  const config = {
    app: {
      name: "classificacao-usuarios-api",
      version: "1.0.0",
      env: env.NODE_ENV ?? "development",
      logLevel: env.LOG_LEVEL ?? "info"
    },
    server: {
      host: env.API_HOST ?? "127.0.0.1",
      port: asNumber(env.API_PORT, 3001)
    },
    auth: {
      jwtSecret:
        env.JWT_SECRET ?? "change_this_secret_in_production_please_replace",
      tokenTtl: env.TOKEN_TTL ?? "8h",
      seedAdmin: {
        fullName: env.SEED_ADMIN_NAME ?? "Administrador Padrao",
        email: env.SEED_ADMIN_EMAIL ?? "admin@classificacao.local",
        password: env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
      }
    },
    security: {
      corsOrigins: parseCsv(
        env.CORS_ORIGINS,
        "http://127.0.0.1:4173,http://localhost:4173"
      ),
      rateLimit: {
        max: asNumber(env.RATE_LIMIT_MAX, 120),
        timeWindow: env.RATE_LIMIT_WINDOW ?? "1 minute"
      }
    },
    storage: {
      dataDir: resolve(env.DATA_DIR ?? "backend/data")
    }
  };

  config.auth.weakSecret = isWeakSecret(config.auth.jwtSecret);
  return config;
}

export { loadConfig };
