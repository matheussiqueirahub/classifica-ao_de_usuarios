# Classificacao de Usuarios API

Backend profissional para classificacao de usuarios com foco em seguranca, confiabilidade, rastreabilidade e escalabilidade.

## Visao geral do backend

### Dominio de negocio
A API centraliza regras de classificacao de usuarios com base em:
- Faixa etaria.
- Status cadastral.
- Conformidade de seguranca (email validado, 2FA, aceite de termos).

Com isso, o sistema define:
- Nivel de acesso.
- Nivel de risco.
- Score de confianca.
- Recomendacoes operacionais para regularizacao.

### Objetivo
Substituir fluxo local/manual por uma API versionada e segura, preparada para integracao com frontend, apps e sistemas corporativos.

## Arquitetura adotada

### Estilo arquitetural
- Monolito modular com separacao clara por camadas e modulos de dominio.
- API REST versionada em `/api/v1`.

### Camadas principais
- `backend/src/config`: carregamento e validacao de configuracoes.
- `backend/src/core`: erros de dominio e funcoes de seguranca.
- `backend/src/infrastructure`: persistencia e I/O.
- `backend/src/modules`: servicos de negocio (auth e classificacao).
- `backend/src/routes`: contratos HTTP e handlers.
- `backend/src/plugins`: concerns transversais (auth e tratamento global de erros).

### Principios aplicados
- SRP e separacao de responsabilidades.
- DRY no pipeline de filtros/ordenacao/paginacao.
- Contratos de API com schema de request/response.
- Dominio testavel e desacoplado da camada HTTP.

## Tecnologias utilizadas

- Node.js (ESM)
- Fastify (alto desempenho HTTP)
- `@fastify/jwt` (autenticacao stateless com JWT)
- `@fastify/helmet` (hardening de headers HTTP)
- `@fastify/rate-limit` (protecoes anti abuso / brute force)
- `@fastify/cors` (controle de origem)
- `@fastify/swagger` + `@fastify/swagger-ui` (documentacao OpenAPI)
- Persistencia em arquivo JSON com escrita atomica (camada `FileStore`)
- `node:test` para testes automatizados de integracao e dominio

## Seguranca e confiabilidade implementadas

- Autenticacao JWT (`Bearer` token).
- Autorizacao por perfil (`admin` e `analyst`) com guardas de rota.
- Hash de senha com `scrypt` + `salt` aleatorio + comparacao em tempo constante.
- Validacao de payload e query com schema JSON.
- CORS controlado por lista de origens permitidas.
- Rate limit global e reforco na rota de login.
- Tratamento global de erros com respostas padronizadas.
- Documentacao OpenAPI para contratos formais.

Observacao:
- CSRF nao e vetor principal neste backend porque autenticacao usa `Authorization: Bearer` (sem cookie de sessao).

## Features implementadas

- Cadastro de usuarios (admin).
- Login e emissao de token JWT.
- Endpoint de perfil autenticado (`/auth/me`).
- Criacao de classificacao com regras de negocio compartilhadas.
- Listagem com:
  - paginacao
  - filtro por acesso e risco
  - filtro por periodo
  - busca textual
  - ordenacao por data e score
- Exportacao filtrada em `JSON` e `CSV`.
- Exclusao de registro individual (admin).
- Limpeza total do historico (admin).
- Analytics consolidado (`/analytics/summary`).
- Health check (`/health`) e docs em `/docs`.

## API e contratos

### Versionamento
- Prefixo atual: `/api/v1`

### Endpoints principais
- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (admin)
- `GET /api/v1/auth/me`
- `POST /api/v1/classifications`
- `GET /api/v1/classifications`
- `GET /api/v1/classifications/:id`
- `GET /api/v1/classifications/export?format=json|csv`
- `DELETE /api/v1/classifications/:id` (admin)
- `DELETE /api/v1/classifications` (admin)
- `GET /api/v1/analytics/summary`

Documentacao interativa:
- `http://127.0.0.1:3001/docs`

## Setup e execucao

### Pre-requisitos
- Node.js 18+

### Instalacao
```bash
npm install
```

### Configuracao
1. Copie `.env.example` para `.env`.
2. Ajuste variaveis sensiveis:
   - `JWT_SECRET`
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - `CORS_ORIGINS`

### Rodar backend
```bash
npm run dev:api
```

### Rodar backend em modo producao
```bash
npm run start:api
```

### Rodar frontend local
```bash
npm run dev
```

### Testes
```bash
npm run test:api
npm test
```

## Estrutura do projeto

```text
.
|-- backend/
|   |-- data/
|   |-- src/
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- config/
|   |   |   `-- env.js
|   |   |-- core/
|   |   |   |-- appError.js
|   |   |   `-- security.js
|   |   |-- infrastructure/
|   |   |   `-- fileStore.js
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |   |-- authService.js
|   |   |   |   `-- userRepository.js
|   |   |   `-- classifications/
|   |   |       |-- classificationRepository.js
|   |   |       `-- classificationService.js
|   |   |-- plugins/
|   |   |   |-- auth.js
|   |   |   `-- errorHandler.js
|   |   `-- routes/
|   |       |-- analyticsRoutes.js
|   |       |-- authRoutes.js
|   |       |-- classificationRoutes.js
|   |       `-- healthRoutes.js
|   `-- tests/
|       `-- api.test.js
|-- src/ (motor de regras compartilhado com frontend)
|-- styles/
|-- index.html
|-- sistema-registro.js
`-- tests/
    `-- classificationEngine.test.js
```

## Guia de Design System (Frontend)

### Tokens principais
- Cores base: `--bg`, `--surface`, `--text`, `--text-soft`, `--brand`, `--danger`, `--success`, `--warning`, `--info`.
- Espacamentos: `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`.
- Raios e profundidade: `--radius-sm`, `--radius-md`, `--radius-lg`, `--shadow`.

### Tipografia e ritmo visual
- Familia principal: `Space Grotesk`.
- Familia auxiliar para labels tecnicos: `IBM Plex Mono`.
- Hierarquia por blocos: hero -> titulos de painel -> labels -> helper/error text.

### Componentes reutilizaveis
- Container e paineis: `.app-shell`, `.panel`.
- Botoes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`.
- Inputs e selects com foco consistente e estados de validacao.
- Indicadores de estado: `.chip-*`, `.badge-*`, `.mode-badge`.
- Feedback de formulario: `.form-feedback.is-info|is-success|is-warning|is-error`.

### Estados de interacao
- `hover`: ajuste de borda em campos e elevacao leve em botoes.
- `focus-visible`: anel de foco padronizado para teclado.
- `disabled`: opacidade reduzida e cursor bloqueado.
- `error`: borda vermelha em campo + mensagem de erro por campo.
- `status`: mensagens de acao com severidade visual (info, sucesso, aviso, erro).

### Responsividade e acessibilidade
- Layout adaptativo por breakpoints (`980px` e `640px`).
- `skip-link` para navegacao por teclado.
- `aria-live` nos feedbacks e resumos dinamicos.
- `caption` em tabelas para leitores de tela.
- `prefers-reduced-motion` para reduzir animacao em cenarios sensiveis.

## Boas praticas e padroes adotados

- API versionada e documentada.
- Repositorios desacoplados da camada HTTP.
- Servicos de dominio independentes de framework.
- Validacao estrita de entrada para reduzir superficie de ataque.
- Erros padronizados com codigos semanticos.
- Testes de integracao para fluxos criticos de autenticacao e classificacao.
- Configuracao via ambiente para ambientes dev/staging/prod.

## Melhorias futuras

- Migracao para banco relacional (PostgreSQL) com migrations.
- Cache para consultas analiticas (Redis).
- Refresh token com rotacao e revogacao.
- Observabilidade com tracing distribuido e metricas Prometheus.
- Auditoria de seguranca com trilha imutavel (append-only log).
- Controle de permissao granular (RBAC expandido para escopos).
- Rate limit adaptativo por IP + usuario + endpoint.

## Licenca

Projeto sob licenca MIT. Consulte `LICENSE`.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
