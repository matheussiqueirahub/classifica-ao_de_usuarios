import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";

async function createTestApp() {
  const tempDir = await mkdtemp(join(tmpdir(), "classificacao-api-"));
  const config = loadConfig({
    NODE_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: "0",
    JWT_SECRET: "test_secret_with_strong_entropy_123456",
    TOKEN_TTL: "2h",
    DATA_DIR: tempDir,
    CORS_ORIGINS: "*",
    SEED_ADMIN_EMAIL: "admin@test.local",
    SEED_ADMIN_PASSWORD: "TestAdmin123!",
    SEED_ADMIN_NAME: "Admin Teste"
  });

  const app = await buildApp({ config, logger: false });
  return { app, tempDir };
}

async function cleanup(app, tempDir) {
  await app.close();
  await rm(tempDir, { recursive: true, force: true });
}

async function loginAdmin(app) {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: "admin@test.local",
      password: "TestAdmin123!"
    }
  });

  assert.equal(loginResponse.statusCode, 200);
  const loginPayload = loginResponse.json();
  assert.ok(loginPayload.token);
  return loginPayload.token;
}

test("health check responde com status ok", async () => {
  const { app, tempDir } = await createTestApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.status, "ok");
    assert.equal(payload.service, "classificacao-usuarios-api");
  } finally {
    await cleanup(app, tempDir);
  }
});

test("admin autentica, cadastra analyst e analyst autentica", async () => {
  const { app, tempDir } = await createTestApp();
  try {
    const adminToken = await loginAdmin(app);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        fullName: "Analista Operacional",
        email: "analyst@test.local",
        password: "Analyst123!",
        role: "analyst"
      }
    });

    assert.equal(registerResponse.statusCode, 201);
    const registered = registerResponse.json();
    assert.equal(registered.role, "analyst");

    const analystLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "analyst@test.local",
        password: "Analyst123!"
      }
    });

    assert.equal(analystLogin.statusCode, 200);
    assert.ok(analystLogin.json().token);
  } finally {
    await cleanup(app, tempDir);
  }
});

test("rotas de classificacao exigem autenticacao", async () => {
  const { app, tempDir } = await createTestApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/classifications",
      payload: {
        fullName: "Usuario Sem Token",
        age: 29,
        registrationStatus: "registrado",
        emailVerified: true,
        twoFactorEnabled: true,
        acceptedTerms: true
      }
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await cleanup(app, tempDir);
  }
});

test("fluxo completo de classificacao e analytics funciona", async () => {
  const { app, tempDir } = await createTestApp();
  try {
    const adminToken = await loginAdmin(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/classifications",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        fullName: "Mariana Silva",
        age: 33,
        registrationStatus: "registrado",
        emailVerified: true,
        twoFactorEnabled: false,
        acceptedTerms: true
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();
    assert.equal(created.access.key, "ampliado");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/classifications?page=1&pageSize=10",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().pagination.total, 1);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/summary",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(summaryResponse.statusCode, 200);
    const summary = summaryResponse.json();
    assert.equal(summary.total, 1);
    assert.equal(summary.byAccessLevel.ampliado, 1);

    const exportJson = await app.inject({
      method: "GET",
      url: "/api/v1/classifications/export?format=json",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(exportJson.statusCode, 200);
    assert.equal(exportJson.json().count, 1);

    const exportCsv = await app.inject({
      method: "GET",
      url: "/api/v1/classifications/export?format=csv",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(exportCsv.statusCode, 200);
    assert.match(exportCsv.headers["content-type"], /text\/csv/);
    assert.match(exportCsv.body, /userFullName/);

    const auditList = await app.inject({
      method: "GET",
      url: "/api/v1/audit/events?page=1&pageSize=10",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(auditList.statusCode, 200);
    const auditPayload = auditList.json();
    assert.ok(auditPayload.pagination.total >= 2);
    assert.ok(auditPayload.items.some((item) => item.action === "CLASSIFICATION_CREATE"));
  } finally {
    await cleanup(app, tempDir);
  }
});

test("apenas admin pode limpar historico", async () => {
  const { app, tempDir } = await createTestApp();
  try {
    const adminToken = await loginAdmin(app);

    const registerAnalyst = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        fullName: "Analyst Restricted",
        email: "restricted@test.local",
        password: "Restricted123!",
        role: "analyst"
      }
    });
    assert.equal(registerAnalyst.statusCode, 201);

    const analystLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "restricted@test.local",
        password: "Restricted123!"
      }
    });
    assert.equal(analystLogin.statusCode, 200);
    const analystToken = analystLogin.json().token;

    const denied = await app.inject({
      method: "DELETE",
      url: "/api/v1/classifications",
      headers: {
        authorization: `Bearer ${analystToken}`
      }
    });
    assert.equal(denied.statusCode, 403);

    const deniedAudit = await app.inject({
      method: "GET",
      url: "/api/v1/audit/events",
      headers: {
        authorization: `Bearer ${analystToken}`
      }
    });
    assert.equal(deniedAudit.statusCode, 403);

    const allowed = await app.inject({
      method: "DELETE",
      url: "/api/v1/classifications",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(allowed.statusCode, 204);
  } finally {
    await cleanup(app, tempDir);
  }
});
