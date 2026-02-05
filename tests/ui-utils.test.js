import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBaseUrl, ApiError } from "../src/ui/apiClient.js";
import { loadSession } from "../src/ui/sessionStore.js";

test("normaliza base URL da API para /api/v1", () => {
  assert.equal(
    normalizeBaseUrl("http://127.0.0.1:3001"),
    "http://127.0.0.1:3001/api/v1"
  );
  assert.equal(
    normalizeBaseUrl("http://127.0.0.1:3001/api/v1/"),
    "http://127.0.0.1:3001/api/v1"
  );
  assert.equal(normalizeBaseUrl(""), "http://127.0.0.1:3001/api/v1");
});

test("ApiError preserva status, codigo e detalhes", () => {
  const error = new ApiError("Falha de teste", 422, "TEST_ERROR", { field: "email" });
  assert.equal(error.message, "Falha de teste");
  assert.equal(error.statusCode, 422);
  assert.equal(error.code, "TEST_ERROR");
  assert.deepEqual(error.details, { field: "email" });
});

test("sessionStore retorna fallback sem window/sessionStorage", () => {
  const session = loadSession();
  assert.equal(session.apiBaseUrl, "http://127.0.0.1:3001/api/v1");
  assert.equal(session.token, null);
  assert.equal(session.user, null);
});
