const STATUS_DETAILS = {
  registrado: {
    key: "registrado",
    label: "Registrado",
    guidance: "Conta ativa e apta para verificacoes de seguranca."
  },
  pendente: {
    key: "pendente",
    label: "Pendente",
    guidance: "Cadastro iniciado, mas faltam etapas de validacao."
  },
  nao_registrado: {
    key: "nao_registrado",
    label: "Nao registrado",
    guidance: "Usuario ainda nao iniciou processo formal de cadastro."
  },
  bloqueado: {
    key: "bloqueado",
    label: "Bloqueado",
    guidance: "Conta bloqueada por politica interna ou risco identificado."
  }
};

const ACCESS_LEVEL_DETAILS = {
  completo: {
    key: "completo",
    label: "Acesso completo",
    summary: "Todos os recursos operacionais estao disponiveis."
  },
  ampliado: {
    key: "ampliado",
    label: "Acesso ampliado",
    summary: "Acesso principal liberado com pequenas restricoes de seguranca."
  },
  supervisionado: {
    key: "supervisionado",
    label: "Acesso supervisionado",
    summary: "Uso permitido com supervisao e limites de seguranca."
  },
  parcial: {
    key: "parcial",
    label: "Acesso parcial",
    summary: "Apenas funcoes basicas ate conclusao do cadastro."
  },
  visitante: {
    key: "visitante",
    label: "Acesso visitante",
    summary: "Somente consulta basica sem operacoes sensiveis."
  },
  negado: {
    key: "negado",
    label: "Acesso negado",
    summary: "Sem permissao de acesso ate regularizacao da conta."
  }
};

const AGE_GROUPS = [
  { key: "crianca", label: "Crianca", min: 0, max: 12 },
  { key: "adolescente", label: "Adolescente", min: 13, max: 17 },
  { key: "adulto", label: "Adulto", min: 18, max: 59 },
  { key: "idoso", label: "Idoso", min: 60, max: 120 }
];

const STATUS_ALIASES = {
  registrado: "registrado",
  cadastrado: "registrado",
  ativo: "registrado",
  pendente: "pendente",
  aguardando: "pendente",
  "nao registrado": "nao_registrado",
  "não registrado": "nao_registrado",
  "nao cadastrado": "nao_registrado",
  visitante: "nao_registrado",
  bloqueado: "bloqueado",
  suspenso: "bloqueado",
  banido: "bloqueado"
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAgeGroup(age) {
  const group = AGE_GROUPS.find((item) => age >= item.min && age <= item.max);
  return group ?? AGE_GROUPS[AGE_GROUPS.length - 1];
}

function getRiskLevel(score) {
  if (score >= 80) {
    return { key: "baixo", label: "Baixo" };
  }

  if (score >= 55) {
    return { key: "medio", label: "Medio" };
  }

  return { key: "alto", label: "Alto" };
}

function computeTrustScore({ age, registrationStatus, emailVerified, twoFactorEnabled, acceptedTerms }) {
  let score = 100;

  if (age < 18) {
    score -= 10;
  }

  if (registrationStatus === "pendente") {
    score -= 20;
  }

  if (registrationStatus === "nao_registrado") {
    score -= 35;
  }

  if (registrationStatus === "bloqueado") {
    score -= 80;
  }

  if (!emailVerified) {
    score -= 20;
  }

  if (!twoFactorEnabled) {
    score -= 15;
  }

  if (!acceptedTerms) {
    score -= 25;
  }

  return clamp(score, 0, 100);
}

function resolveAccessLevel({ age, registrationStatus, emailVerified, twoFactorEnabled, acceptedTerms }) {
  if (registrationStatus === "bloqueado") {
    return ACCESS_LEVEL_DETAILS.negado;
  }

  if (registrationStatus === "registrado" && age >= 18 && emailVerified && acceptedTerms && twoFactorEnabled) {
    return ACCESS_LEVEL_DETAILS.completo;
  }

  if (registrationStatus === "registrado" && age >= 18 && emailVerified && acceptedTerms) {
    return ACCESS_LEVEL_DETAILS.ampliado;
  }

  if (registrationStatus === "registrado" && age < 18 && emailVerified) {
    return ACCESS_LEVEL_DETAILS.supervisionado;
  }

  if (registrationStatus === "pendente") {
    return ACCESS_LEVEL_DETAILS.parcial;
  }

  if (registrationStatus === "registrado") {
    return ACCESS_LEVEL_DETAILS.parcial;
  }

  return ACCESS_LEVEL_DETAILS.visitante;
}

function buildRecommendations(input) {
  const recommendations = [];

  if (input.registrationStatus === "nao_registrado") {
    recommendations.push("Iniciar o cadastro para liberar funcionalidades transacionais.");
  }

  if (input.registrationStatus === "pendente") {
    recommendations.push("Concluir o fluxo pendente de verificacao documental.");
  }

  if (input.registrationStatus === "bloqueado") {
    recommendations.push("Abrir atendimento com suporte para revisar o motivo de bloqueio.");
  }

  if (!input.emailVerified) {
    recommendations.push("Validar o e-mail para reduzir risco de fraude e recuperar conta com seguranca.");
  }

  if (!input.twoFactorEnabled) {
    recommendations.push("Ativar autenticacao em dois fatores para fortalecer seguranca da conta.");
  }

  if (!input.acceptedTerms) {
    recommendations.push("Aceitar termos e politicas para habilitar acesso pleno e conformidade.");
  }

  if (input.age < 18) {
    recommendations.push("Aplicar trilha supervisionada para uso de funcionalidades sensiveis.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Nenhuma pendencia critica identificada. Usuario apto para operacao completa.");
  }

  return recommendations;
}

function normalizeRegistrationStatus(rawStatus) {
  const normalized = normalizeText(rawStatus);
  return STATUS_ALIASES[normalized] ?? null;
}

function toSafeName(value) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized;
}

function validateUserInput(payload = {}) {
  const errors = {};
  const fullName = toSafeName(payload.fullName);
  const age = Number(payload.age);
  const registrationStatus = normalizeRegistrationStatus(payload.registrationStatus);
  const emailVerified = Boolean(payload.emailVerified);
  const twoFactorEnabled = Boolean(payload.twoFactorEnabled);
  const acceptedTerms = Boolean(payload.acceptedTerms);

  if (!fullName || fullName.length < 2) {
    errors.fullName = "Informe um nome valido com pelo menos 2 caracteres.";
  }

  if (!Number.isFinite(age) || age < 0 || age > 120) {
    errors.age = "Informe uma idade valida entre 0 e 120 anos.";
  }

  if (!registrationStatus) {
    errors.registrationStatus = "Selecione um status de registro valido.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      fullName,
      age,
      registrationStatus,
      emailVerified,
      twoFactorEnabled,
      acceptedTerms
    }
  };
}

function createRecordId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(16).slice(2, 10);
  return `record-${Date.now()}-${randomPart}`;
}

function classifyUser(payload) {
  const validation = validateUserInput(payload);

  if (!validation.isValid) {
    const error = new Error("Entrada invalida para classificacao.");
    error.details = validation.errors;
    throw error;
  }

  const input = validation.sanitizedData;
  const ageGroup = getAgeGroup(input.age);
  const status = STATUS_DETAILS[input.registrationStatus];
  const access = resolveAccessLevel(input);
  const trustScore = computeTrustScore(input);
  const riskLevel = getRiskLevel(trustScore);
  const recommendations = buildRecommendations(input);

  return {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    user: {
      fullName: input.fullName,
      age: input.age,
      ageGroup,
      isAdult: input.age >= 18
    },
    registration: {
      ...status
    },
    security: {
      emailVerified: input.emailVerified,
      twoFactorEnabled: input.twoFactorEnabled,
      acceptedTerms: input.acceptedTerms,
      trustScore,
      riskLevel
    },
    access,
    recommendations
  };
}

function summarizeHistory(records = []) {
  const summary = {
    total: records.length,
    averageTrustScore: 0,
    byRiskLevel: {
      baixo: 0,
      medio: 0,
      alto: 0
    },
    byAccessLevel: {}
  };

  if (records.length === 0) {
    return summary;
  }

  const scoreSum = records.reduce((accumulator, record) => {
    const riskKey = record.security?.riskLevel?.key ?? "alto";
    const accessKey = record.access?.key ?? "visitante";
    summary.byRiskLevel[riskKey] = (summary.byRiskLevel[riskKey] ?? 0) + 1;
    summary.byAccessLevel[accessKey] = (summary.byAccessLevel[accessKey] ?? 0) + 1;
    return accumulator + Number(record.security?.trustScore ?? 0);
  }, 0);

  summary.averageTrustScore = Number((scoreSum / records.length).toFixed(1));
  return summary;
}

export {
  ACCESS_LEVEL_DETAILS,
  STATUS_DETAILS,
  AGE_GROUPS,
  normalizeRegistrationStatus,
  validateUserInput,
  classifyUser,
  summarizeHistory
};
