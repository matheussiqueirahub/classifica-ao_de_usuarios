# Sistema de Classificação de Usuários

Este projeto contém um script JavaScript (`sistema-registro.js`) que demonstra o uso combinado de:

- Operador ternário para classificar o usuário como maior ou menor de idade.
- Estrutura `switch` para mensagens personalizadas conforme o status de registro.
- Operadores lógicos para controlar o acesso (completo ou limitado) com base em idade e registro.

## Como executar

### Navegador

1. Crie um arquivo HTML simples e importe o script:
   ```html
   <!DOCTYPE html>
   <html lang="pt-BR">
   <head>
     <meta charset="UTF-8" />
     <title>Classificação de Usuários</title>
   </head>
   <body>
     <script src="sistema-registro.js"></script>
   </body>
   </html>
   ```
2. Abra o HTML no navegador. As janelas `prompt` pedirão idade e status, e o resultado será exibido no console (`F12` > Console).

### Node.js

1. Instale a dependência `prompt-sync`:
   ```bash
   npm install prompt-sync
   ```
2. No topo de `sistema-registro.js`, adicione:
   ```javascript
   const prompt = require("prompt-sync")();
   ```
3. Execute:
   ```bash
   node sistema-registro.js
   ```

## Lógica de classificação

- `idade >= 18 ? "maior de idade" : "menor de idade"` define a faixa etária.
- O `switch` avalia `registrado`, `não registrado` e outros estados.
- A combinação de idade e registro controla o nível de acesso:
  - Maior de idade **e** registrado → acesso completo.
  - Menor de idade **ou** não registrado → acesso limitado.

## Licença

Este projeto está disponível sob a licença MIT. Confira o arquivo `LICENSE`, se presente.
