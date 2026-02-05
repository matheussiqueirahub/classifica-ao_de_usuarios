# Painel de Classificacao de Usuarios

Aplicacao frontend para classificacao de usuarios com foco em governanca de acesso, usabilidade operacional e rastreabilidade.

## Visao geral do frontend

### Objetivo do produto
Transformar um fluxo simplificado baseado em `prompt` em uma experiencia web profissional para analise de usuarios com criterios de idade, status cadastral e seguranca.

### Publico-alvo
- Operacao e suporte que precisam tomar decisao de acesso com rapidez.
- Produto e seguranca que precisam padronizar regras e reduzir erro manual.

### Fluxos principais
1. Preenchimento de dados cadastrais e de conformidade.
2. Classificacao automatica por nivel de acesso, risco e score de confianca.
3. Leitura de recomendacoes acionaveis para regularizacao.
4. Consulta de historico com filtro, busca, ordenacao e exportacao.

## Analise tecnica do frontend

### Arquitetura e organizacao
- Arquitetura modular por responsabilidade:
  - `domain`: regras de negocio puras e testaveis.
  - `services`: persistencia local e filtros.
  - `ui`: camada de interacao e rendering.
- Beneficios:
  - Facil evoluir regras sem acoplar ao DOM.
  - Facil testar comportamento critico de classificacao.
  - Manutenibilidade maior para crescimento futuro.

### Performance e renderizacao
- Estado enxuto em memoria (`latestResult`, `history`) e rendering incremental.
- Busca no historico com debounce para evitar renderizacao excessiva.
- Ordenacao e filtros calculados sob demanda com custo previsivel.
- Limite de historico persistido para controlar uso de storage.

### Escalabilidade e qualidade
- Validacao centralizada de entrada.
- Normalizacao de status com aliases.
- Sanitizacao de output dinamico (escape HTML) para evitar injetar conteudo indevido.
- Testes automatizados do motor de classificacao.

### SEO, acessibilidade e responsividade
- SEO basico: metadados descritivos, Open Graph e `theme-color`.
- Acessibilidade:
  - Estrutura semantica, skip link e feedback em `aria-live`.
  - Campos com labels, estados de erro acessiveis e foco visivel.
  - Tabela com `caption` para tecnologia assistiva.
  - Suporte a `prefers-reduced-motion`.
- Responsividade:
  - Layout adaptativo para desktop e mobile.
  - Controles e botoes refluem sem quebrar o fluxo.

## Stack e tecnologias utilizadas

- HTML5 semantico
- CSS3 com design tokens (variaveis), componentes e media queries
- JavaScript ES Modules (sem framework)
- LocalStorage para historico local
- Node.js com `node:test` para testes automatizados

## Funcionalidades implementadas

- Formulario de classificacao com validacao robusta.
- Motor de regras com:
  - Faixa etaria.
  - Status de registro.
  - Score de confianca.
  - Nivel de risco.
  - Nivel de acesso.
- Recomendacoes operacionais contextualizadas.
- Dashboard com metricas de acompanhamento.
- Historico com:
  - Filtro por tipo de acesso.
  - Busca por nome.
  - Ordenacao por data e score.
  - Exportacao JSON do recorte visivel.
  - Limpeza do historico.
- Exportacao JSON do resultado atual.
- Atalho de produtividade: `Ctrl+Enter` / `Cmd+Enter` para submeter formulario.
- Compatibilidade mantida com fluxo legado em `sistema-registro.js`.

## Setup, execucao e build

### Pre-requisitos
- Node.js 18+ (testes)
- Navegador moderno

### Instalar dependencias
```bash
npm install
```

### Rodar frontend em desenvolvimento
```bash
npm run dev
```

### Rodar testes
```bash
npm test
```

### Executar a aplicacao
- Opcao recomendada: usar `npm run dev` e acessar `http://127.0.0.1:4173`.
- Opcao simples: abrir `index.html` diretamente.

### Build
- Projeto estatico sem etapa de build obrigatoria.
- Pode ser publicado diretamente em hosting estatico (GitHub Pages, Netlify, Vercel static).

## Estrutura do projeto

```text
.
|-- index.html
|-- package.json
|-- sistema-registro.js
|-- styles/
|   `-- main.css
|-- src/
|   |-- domain/
|   |   `-- classificationEngine.js
|   |-- services/
|   |   `-- historyStorage.js
|   `-- ui/
|       `-- main.js
`-- tests/
    `-- classificationEngine.test.js
```

## Boas praticas adotadas

- Separacao de responsabilidades por camadas.
- Codigo orientado a funcoes puras no dominio.
- Validacao e sanitizacao antes de processar dados.
- Tratamento de fallback quando `localStorage` nao esta disponivel.
- Reuso de tokens visuais e padrao consistente de componentes.
- Design responsivo com foco em legibilidade e clareza operacional.

## Melhorias futuras

- Persistencia remota com autenticacao e trilha de auditoria.
- RBAC (controle de acesso por papeis).
- Internacionalizacao (i18n).
- Telemetria de uso para medir conversao de fluxo.
- CI com validacao automatica de testes e qualidade.
- PWA com suporte offline e cache estrategico.

## Licenca

Projeto sob licenca MIT. Consulte `LICENSE`.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
