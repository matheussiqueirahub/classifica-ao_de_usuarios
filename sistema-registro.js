// Sistema que classifica usuários por idade e status de registro.

const idade = Number(prompt("Informe sua idade:"));
const statusRegistro = prompt(
  "Informe seu status (registrado ou não registrado):"
)
  .trim()
  .toLowerCase();

// Operador ternário para saber se o usuário é maior ou menor de idade.
const classificacaoIdade = idade >= 18 ? "maior de idade" : "menor de idade";
console.log(`Você é ${classificacaoIdade}.`);

// Switch para mensagens conforme o status informado.
switch (statusRegistro) {
  case "registrado":
    console.log("Bem-vindo! Seu registro está ativo.");
    break;
  case "não registrado":
    console.log("Complete seu registro para aproveitar todos os recursos.");
    break;
  default:
    console.log("Status desconhecido.");
}

const maiorDeIdade = idade >= 18;
const isRegistrado = statusRegistro === "registrado";

if (maiorDeIdade && isRegistrado) {
  console.log("Acesso completo concedido.");
} else if (!maiorDeIdade || !isRegistrado) {
  console.log("Acesso limitado.");
}
