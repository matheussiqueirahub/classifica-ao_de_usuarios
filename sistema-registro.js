import { classifyUser, validateUserInput } from "./src/domain/classificationEngine.js";

function yesNoToBoolean(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized === "s" || normalized === "sim" || normalized === "y" || normalized === "yes";
}

function runLegacyPromptFlow(promptFn = globalThis.prompt) {
  if (typeof promptFn !== "function") {
    return null;
  }

  const payload = {
    fullName: promptFn("Informe o nome completo do usuario:"),
    age: promptFn("Informe a idade:"),
    registrationStatus: promptFn("Status (registrado, pendente, nao registrado, bloqueado):"),
    emailVerified: yesNoToBoolean(promptFn("E-mail validado? (s/n):")),
    twoFactorEnabled: yesNoToBoolean(promptFn("2FA ativo? (s/n):")),
    acceptedTerms: yesNoToBoolean(promptFn("Termos aceitos? (s/n):"))
  };

  const validation = validateUserInput(payload);
  if (!validation.isValid) {
    console.log("Nao foi possivel classificar: dados invalidos.");
    console.table(validation.errors);
    return null;
  }

  const result = classifyUser(validation.sanitizedData);
  console.log(`Usuario: ${result.user.fullName}`);
  console.log(`Faixa etaria: ${result.user.ageGroup.label}`);
  console.log(`Status de registro: ${result.registration.label}`);
  console.log(`Nivel de acesso: ${result.access.label}`);
  console.log(`Confianca: ${result.security.trustScore}%`);
  console.log(`Risco: ${result.security.riskLevel.label}`);
  console.log("Recomendacoes:");
  result.recommendations.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`);
  });
  return result;
}

export { runLegacyPromptFlow };

if (typeof window !== "undefined" && typeof window.prompt === "function") {
  runLegacyPromptFlow(window.prompt);
}

const isNodeRuntime = typeof process !== "undefined" && Boolean(process.versions?.node);
const isDirectExecution =
  isNodeRuntime &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("/sistema-registro.js");

if (isDirectExecution) {
  console.log(
    "Fluxo legado em modo modulo. Abra index.html para usar a interface completa ou importe runLegacyPromptFlow em ambiente com prompt."
  );
}
