import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyUser,
  normalizeRegistrationStatus,
  summarizeHistory,
  validateUserInput
} from "../src/domain/classificationEngine.js";

test("normaliza status de registro com acentos e sinonimos", () => {
  assert.equal(normalizeRegistrationStatus("Não Registrado"), "nao_registrado");
  assert.equal(normalizeRegistrationStatus("cadastrado"), "registrado");
  assert.equal(normalizeRegistrationStatus("suspenso"), "bloqueado");
});

test("valida campos obrigatorios e limites de idade", () => {
  const invalidPayload = validateUserInput({
    fullName: "A",
    age: "999",
    registrationStatus: "x"
  });

  assert.equal(invalidPayload.isValid, false);
  assert.ok(invalidPayload.errors.fullName);
  assert.ok(invalidPayload.errors.age);
  assert.ok(invalidPayload.errors.registrationStatus);
});

test("classifica usuario adulto registrado com seguranca completa", () => {
  const result = classifyUser({
    fullName: "Mariana Alves",
    age: 31,
    registrationStatus: "registrado",
    emailVerified: true,
    twoFactorEnabled: true,
    acceptedTerms: true
  });

  assert.equal(result.access.key, "completo");
  assert.equal(result.security.riskLevel.key, "baixo");
  assert.equal(result.security.trustScore, 100);
});

test("classifica conta bloqueada como acesso negado e risco alto", () => {
  const result = classifyUser({
    fullName: "Pedro Costa",
    age: 40,
    registrationStatus: "bloqueado",
    emailVerified: false,
    twoFactorEnabled: false,
    acceptedTerms: false
  });

  assert.equal(result.access.key, "negado");
  assert.equal(result.security.riskLevel.key, "alto");
  assert.ok(result.recommendations.length >= 2);
});

test("resume historico com media e agregacoes por risco e acesso", () => {
  const records = [
    classifyUser({
      fullName: "Lara Pontes",
      age: 28,
      registrationStatus: "registrado",
      emailVerified: true,
      twoFactorEnabled: true,
      acceptedTerms: true
    }),
    classifyUser({
      fullName: "Carlos Azevedo",
      age: 17,
      registrationStatus: "pendente",
      emailVerified: false,
      twoFactorEnabled: false,
      acceptedTerms: false
    })
  ];

  const summary = summarizeHistory(records);
  assert.equal(summary.total, 2);
  assert.equal(summary.byAccessLevel.completo, 1);
  assert.equal(summary.byRiskLevel.alto, 1);
  assert.equal(summary.averageTrustScore, 55);
});
