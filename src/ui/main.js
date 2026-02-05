import {
  classifyUser,
  summarizeHistory,
  validateUserInput
} from "../domain/classificationEngine.js";
import {
  clearHistory,
  filterHistoryByAccess,
  loadHistory,
  saveRecord,
  storageEnabled
} from "../services/historyStorage.js";
import { ApiClient, ApiError, normalizeBaseUrl } from "./apiClient.js";
import { clearSession, loadSession, saveSession } from "./sessionStore.js";

const ACCESS_KEYS = new Set([
  "completo",
  "ampliado",
  "supervisionado",
  "parcial",
  "visitante",
  "negado"
]);
const FEEDBACK_TYPES = new Set(["success", "error", "warning", "info"]);

const storedSession = loadSession();

const dom = {
  form: document.querySelector("#classification-form"),
  fullName: document.querySelector("#fullName"),
  age: document.querySelector("#age"),
  registrationStatus: document.querySelector("#registrationStatus"),
  emailVerified: document.querySelector("#emailVerified"),
  twoFactorEnabled: document.querySelector("#twoFactorEnabled"),
  acceptedTerms: document.querySelector("#acceptedTerms"),
  resultCard: document.querySelector("#result-card"),
  historyBody: document.querySelector("#history-body"),
  historyFilter: document.querySelector("#history-filter"),
  historySort: document.querySelector("#history-sort"),
  historySearch: document.querySelector("#history-search"),
  historySummary: document.querySelector("#history-summary"),
  historyPrev: document.querySelector("#history-prev"),
  historyNext: document.querySelector("#history-next"),
  historyPageInfo: document.querySelector("#history-page-info"),
  clearHistoryButton: document.querySelector("#clear-history"),
  exportHistoryButton: document.querySelector("#export-history"),
  exportButton: document.querySelector("#export-result"),
  formFeedback: document.querySelector("#form-feedback"),
  storageWarning: document.querySelector("#storage-warning"),
  metricTotal: document.querySelector("#metric-total"),
  metricAccess: document.querySelector("#metric-access"),
  metricRisk: document.querySelector("#metric-risk"),
  metricScore: document.querySelector("#metric-score"),
  apiSessionForm: document.querySelector("#api-session-form"),
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  apiEmail: document.querySelector("#apiEmail"),
  apiPassword: document.querySelector("#apiPassword"),
  disconnectApiButton: document.querySelector("#disconnect-api"),
  syncApiButton: document.querySelector("#sync-api"),
  loadAuditButton: document.querySelector("#load-audit"),
  apiModeBadge: document.querySelector("#api-mode-badge"),
  apiUserInfo: document.querySelector("#api-user-info"),
  apiSyncInfo: document.querySelector("#api-sync-info"),
  auditPanel: document.querySelector("#audit-panel"),
  auditBody: document.querySelector("#audit-body")
};

const fieldErrorMap = {
  fullName: {
    error: document.querySelector("#error-fullName"),
    input: document.querySelector("#fullName")
  },
  age: {
    error: document.querySelector("#error-age"),
    input: document.querySelector("#age")
  },
  registrationStatus: {
    error: document.querySelector("#error-registrationStatus"),
    input: document.querySelector("#registrationStatus")
  }
};

const state = {
  latestResult: null,
  history: loadHistory(),
  historyMeta: {
    page: 1,
    pageSize: 20,
    total: loadHistory().length,
    totalPages: 1
  },
  remoteSummary: null,
  auditEvents: [],
  api: {
    baseUrl: normalizeBaseUrl(storedSession.apiBaseUrl),
    token: storedSession.token,
    user: storedSession.user,
    lastSyncAt: null
  }
};

const apiClient = new ApiClient({
  baseUrl: state.api.baseUrl,
  getToken: () => state.api.token
});

function isApiMode() {
  return Boolean(state.api.token && state.api.user);
}

function getAccessCount(summary) {
  return (summary.byAccessLevel.completo ?? 0) + (summary.byAccessLevel.ampliado ?? 0);
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function byDate(isoDate) {
  const parsed = Date.parse(isoDate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(isoDate) {
  if (!isoDate) {
    return "-";
  }

  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function riskChipClass(riskKey) {
  if (riskKey === "baixo") {
    return "chip-low";
  }

  if (riskKey === "medio") {
    return "chip-medium";
  }

  return "chip-high";
}

function accessBadgeClass(accessKey) {
  return ACCESS_KEYS.has(accessKey) ? `badge-${accessKey}` : "badge-visitante";
}

function sanitizeAccessKey(accessKey) {
  return ACCESS_KEYS.has(accessKey) ? accessKey : "visitante";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setFeedbackState(type) {
  const safeType = FEEDBACK_TYPES.has(type) ? type : "info";
  dom.formFeedback.classList.remove(
    "is-success",
    "is-error",
    "is-warning",
    "is-info"
  );
  dom.formFeedback.classList.add(`is-${safeType}`);
}

function notify(message, type = "info") {
  setFeedbackState(type);
  dom.formFeedback.textContent = message;
}

function clearFieldErrors() {
  Object.values(fieldErrorMap).forEach((field) => {
    if (field.error) {
      field.error.textContent = "";
    }

    if (field.input) {
      field.input.setAttribute("aria-invalid", "false");
      field.input.removeAttribute("aria-describedby");
    }
  });
}

function renderFieldErrors(errors) {
  let firstInvalidInput = null;

  Object.entries(errors).forEach(([field, message]) => {
    const target = fieldErrorMap[field];
    if (!target) {
      return;
    }

    if (target.error) {
      target.error.textContent = message;
    }

    if (target.input) {
      target.input.setAttribute("aria-invalid", "true");
      target.input.setAttribute("aria-describedby", `error-${field}`);
      if (!firstInvalidInput) {
        firstInvalidInput = target.input;
      }
    }
  });

  if (firstInvalidInput) {
    firstInvalidInput.focus();
  }
}

function renderResult(result) {
  if (!result) {
    dom.resultCard.className = "result-empty";
    dom.resultCard.textContent =
      'Preencha o formulario e clique em "Analisar usuario" para gerar o resultado.';
    return;
  }

  const recommendationList = result.recommendations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  dom.resultCard.className = "result-card";
  dom.resultCard.innerHTML = `
    <div class="result-head">
      <div>
        <h3>${escapeHtml(result.user.fullName)}</h3>
        <p class="result-subtitle">
          ${escapeHtml(result.user.ageGroup.label)} • ${result.user.age} anos
        </p>
      </div>
      <span class="chip ${riskChipClass(result.security.riskLevel.key)}">
        Risco ${escapeHtml(result.security.riskLevel.label)}
      </span>
    </div>

    <div class="result-grid">
      <article class="result-stat">
        <span>Nivel de acesso</span>
        <strong>${escapeHtml(result.access.label)}</strong>
        <small>${escapeHtml(result.access.summary)}</small>
      </article>
      <article class="result-stat">
        <span>Status do cadastro</span>
        <strong>${escapeHtml(result.registration.label)}</strong>
        <small>${escapeHtml(result.registration.guidance)}</small>
      </article>
      <article class="result-stat">
        <span>Indice de confianca</span>
        <strong>${result.security.trustScore}%</strong>
        <small>Baseado em registro, idade e seguranca da conta.</small>
      </article>
    </div>

    <p class="result-guidance">
      Atualizado em ${formatDateTime(result.createdAt)}.
    </p>

    <p class="recommendation-title">Recomendacoes</p>
    <ul class="recommendations">${recommendationList}</ul>
  `;
}

function sortHistoryRecords(records, sortKey) {
  const cloned = [...records];

  if (sortKey === "oldest") {
    return cloned.sort((a, b) => byDate(a.createdAt) - byDate(b.createdAt));
  }

  if (sortKey === "trust_desc") {
    return cloned.sort(
      (a, b) => Number(b.security?.trustScore ?? 0) - Number(a.security?.trustScore ?? 0)
    );
  }

  if (sortKey === "trust_asc") {
    return cloned.sort(
      (a, b) => Number(a.security?.trustScore ?? 0) - Number(b.security?.trustScore ?? 0)
    );
  }

  return cloned.sort((a, b) => byDate(b.createdAt) - byDate(a.createdAt));
}

function getVisibleLocalHistoryRecords() {
  const accessFiltered = filterHistoryByAccess(state.history, dom.historyFilter.value);
  const query = normalizeSearchText(dom.historySearch.value);
  const searched = query
    ? accessFiltered.filter((item) => normalizeSearchText(item.user?.fullName).includes(query))
    : accessFiltered;
  return sortHistoryRecords(searched, dom.historySort.value);
}

function mapSortOptionToApi(sortValue) {
  if (sortValue === "oldest") {
    return { sortBy: "createdAt", sortOrder: "asc" };
  }

  if (sortValue === "trust_desc") {
    return { sortBy: "trustScore", sortOrder: "desc" };
  }

  if (sortValue === "trust_asc") {
    return { sortBy: "trustScore", sortOrder: "asc" };
  }

  return { sortBy: "createdAt", sortOrder: "desc" };
}

function buildApiQuery(pageOverride, includePagination = true) {
  const query = {};
  const search = dom.historySearch.value.trim();
  const accessLevel = dom.historyFilter.value;
  const { sortBy, sortOrder } = mapSortOptionToApi(dom.historySort.value);

  query.sortBy = sortBy;
  query.sortOrder = sortOrder;
  query.search = search || undefined;
  query.accessLevel = accessLevel !== "todos" ? accessLevel : undefined;

  if (includePagination) {
    query.page = pageOverride ?? state.historyMeta.page;
    query.pageSize = state.historyMeta.pageSize;
  }

  return query;
}

function renderMetrics() {
  const summary = isApiMode() && state.remoteSummary
    ? state.remoteSummary
    : summarizeHistory(state.history);

  dom.metricTotal.textContent = String(summary.total ?? 0);
  dom.metricAccess.textContent = String(getAccessCount(summary));
  dom.metricRisk.textContent = String(summary.byRiskLevel?.alto ?? 0);
  dom.metricScore.textContent = `${summary.averageTrustScore ?? 0}%`;
}

function updateHistoryPaginationControls() {
  if (!isApiMode()) {
    dom.historyPrev.disabled = true;
    dom.historyNext.disabled = true;
    dom.historyPageInfo.textContent = "Paginacao ativa somente no modo API";
    return;
  }

  const page = state.historyMeta.page ?? 1;
  const totalPages = state.historyMeta.totalPages ?? 1;
  dom.historyPrev.disabled = page <= 1;
  dom.historyNext.disabled = page >= totalPages;
  dom.historyPageInfo.textContent = `Pagina ${page} de ${totalPages}`;
}

function renderHistory() {
  const visibleRecords = isApiMode() ? state.history : getVisibleLocalHistoryRecords();
  const query = dom.historySearch.value.trim();

  if (isApiMode()) {
    dom.historySummary.textContent =
      `${state.historyMeta.total} registro(s) no backend.` +
      (query ? ` Busca atual: "${query}".` : "");
  } else {
    const filterLabel =
      dom.historyFilter.options[dom.historyFilter.selectedIndex]?.textContent ?? "Todos";
    dom.historySummary.textContent =
      `${visibleRecords.length} registro(s) exibido(s) de ${state.history.length}` +
      ` no filtro "${filterLabel}"${query ? ` para busca "${query}"` : ""}.`;
  }

  if (visibleRecords.length === 0) {
    dom.historyBody.innerHTML = `
      <tr>
        <td colspan="6">Nenhuma analise para o filtro selecionado.</td>
      </tr>
    `;
    updateHistoryPaginationControls();
    return;
  }

  dom.historyBody.innerHTML = visibleRecords
    .map((item) => {
      const riskClass = riskChipClass(item.security?.riskLevel?.key);
      const accessKey = sanitizeAccessKey(item.access?.key);
      return `
        <tr>
          <td>${formatDateTime(item.createdAt)}</td>
          <td>${escapeHtml(item.user?.fullName ?? "-")}</td>
          <td>${escapeHtml(item.user?.ageGroup?.label ?? "-")}</td>
          <td>
            <span class="badge ${accessBadgeClass(accessKey)}">
              ${escapeHtml(item.access?.label ?? "Indefinido")}
            </span>
          </td>
          <td>${Number(item.security?.trustScore ?? 0)}%</td>
          <td>
            <span class="chip ${riskClass}">
              ${escapeHtml(item.security?.riskLevel?.label ?? "Alto")}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  updateHistoryPaginationControls();
}

function renderAuditPanel() {
  if (!state.auditEvents.length) {
    dom.auditBody.innerHTML = `
      <tr>
        <td colspan="5">Nenhum evento de auditoria carregado.</td>
      </tr>
    `;
    return;
  }

  dom.auditBody.innerHTML = state.auditEvents
    .map((event) => `
      <tr>
        <td>${formatDateTime(event.createdAt)}</td>
        <td>${escapeHtml(event.action ?? "-")}</td>
        <td>${escapeHtml(event.actor?.email ?? "Sistema")}</td>
        <td>${escapeHtml(event.outcome ?? "success")}</td>
        <td>${escapeHtml(event.request?.requestId ?? "-")}</td>
      </tr>
    `)
    .join("");
}

function updateConnectionPanel() {
  dom.apiBaseUrl.value = state.api.baseUrl;

  if (isApiMode()) {
    dom.apiModeBadge.textContent = "Modo API autenticado";
    dom.apiModeBadge.classList.add("mode-api");
    dom.apiModeBadge.classList.remove("mode-local");
    dom.apiUserInfo.textContent = `Usuario: ${state.api.user.fullName} (${state.api.user.role})`;
    dom.apiSyncInfo.textContent = state.api.lastSyncAt
      ? `Ultima sincronizacao: ${formatDateTime(state.api.lastSyncAt)}`
      : "Sincronizacao pendente.";
  } else {
    dom.apiModeBadge.textContent = "Modo local ativo";
    dom.apiModeBadge.classList.add("mode-local");
    dom.apiModeBadge.classList.remove("mode-api");
    dom.apiUserInfo.textContent = "Nenhum usuario autenticado.";
    dom.apiSyncInfo.textContent = "Sincronizacao pendente.";
  }

  dom.disconnectApiButton.disabled = !isApiMode();
  dom.syncApiButton.disabled = !isApiMode();
  dom.loadAuditButton.disabled = !isApiMode() || state.api.user?.role !== "admin";
}

function persistApiSession() {
  if (!isApiMode()) {
    clearSession();
    return;
  }

  saveSession({
    apiBaseUrl: state.api.baseUrl,
    token: state.api.token,
    user: state.api.user
  });
}

async function syncFromApi(pageOverride) {
  if (!isApiMode()) {
    return false;
  }

  try {
    const query = buildApiQuery(pageOverride, true);
    const [listResponse, summary] = await Promise.all([
      apiClient.listClassifications(query),
      apiClient.getSummary()
    ]);

    state.history = listResponse.items;
    state.historyMeta = {
      page: listResponse.pagination.page,
      pageSize: listResponse.pagination.pageSize,
      total: listResponse.pagination.total,
      totalPages: listResponse.pagination.totalPages
    };
    state.remoteSummary = summary;
    state.api.lastSyncAt = new Date().toISOString();
    renderMetrics();
    renderHistory();
    updateConnectionPanel();
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      disconnectApiSession(false);
      notify("Sessao expirada. Volte a autenticar.", "warning");
      return false;
    }

    notify(`Falha ao sincronizar API: ${error.message}`, "error");
    return false;
  }
}

function readFormData() {
  return {
    fullName: dom.fullName.value,
    age: dom.age.value,
    registrationStatus: dom.registrationStatus.value,
    emailVerified: dom.emailVerified.checked,
    twoFactorEnabled: dom.twoFactorEnabled.checked,
    acceptedTerms: dom.acceptedTerms.checked
  };
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCurrentResult() {
  if (!state.latestResult) {
    notify("Realize uma analise antes de exportar.", "warning");
    return;
  }

  const safeName = state.latestResult.user.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  downloadTextFile(
    `classificacao-${safeName || "usuario"}.json`,
    JSON.stringify(state.latestResult, null, 2),
    "application/json;charset=utf-8"
  );
  notify("Resultado exportado em JSON com sucesso.", "success");
}

async function exportHistory() {
  if (!state.history.length) {
    notify("Nao ha historico para exportar.", "warning");
    return;
  }

  if (isApiMode()) {
    try {
      const payload = await apiClient.exportClassifications(
        "json",
        buildApiQuery(undefined, false)
      );
      downloadTextFile(
        `historico-classificacao-api-${Date.now()}.json`,
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8"
      );
      notify("Historico remoto exportado em JSON.", "success");
      return;
    } catch (error) {
      notify(`Falha ao exportar via API: ${error.message}`, "error");
      return;
    }
  }

  const payload = JSON.stringify(getVisibleLocalHistoryRecords(), null, 2);
  downloadTextFile(
    `historico-classificacao-local-${Date.now()}.json`,
    payload,
    "application/json;charset=utf-8"
  );
  notify("Historico local exportado em JSON.", "success");
}

async function onSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const payload = readFormData();
  const validation = validateUserInput(payload);
  if (!validation.isValid) {
    renderFieldErrors(validation.errors);
    notify("Revise os campos destacados e tente novamente.", "warning");
    return;
  }

  if (isApiMode()) {
    try {
      const created = await apiClient.createClassification(validation.sanitizedData);
      state.latestResult = created;
      renderResult(created);
      dom.exportButton.disabled = false;
      await syncFromApi(1);
      notify(`Classificacao enviada para API: ${created.user.fullName}.`, "success");
    } catch (error) {
      notify(`Falha ao criar classificacao na API: ${error.message}`, "error");
    }
    return;
  }

  const result = classifyUser(validation.sanitizedData);
  state.latestResult = result;
  state.history = saveRecord(result);
  state.historyMeta = {
    page: 1,
    pageSize: 20,
    total: state.history.length,
    totalPages: 1
  };
  dom.exportButton.disabled = false;
  renderResult(result);
  renderMetrics();
  renderHistory();
  notify(`Classificacao concluida para ${result.user.fullName}.`, "success");
}

function onReset() {
  clearFieldErrors();
  state.latestResult = null;
  dom.exportButton.disabled = true;
  renderResult(null);
  notify("Formulario limpo.", "info");
}

async function onClearHistory() {
  if (isApiMode()) {
    try {
      await apiClient.clearClassifications();
      state.history = [];
      state.historyMeta.page = 1;
      await syncFromApi(1);
      notify("Historico remoto removido.", "success");
    } catch (error) {
      notify(`Falha ao limpar historico remoto: ${error.message}`, "error");
    }
    return;
  }

  clearHistory();
  state.history = [];
  state.historyMeta = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  };
  renderMetrics();
  renderHistory();
  notify("Historico local removido.", "success");
}

async function onFilterChange() {
  if (isApiMode()) {
    await syncFromApi(1);
    return;
  }

  renderHistory();
}

function createDebounce(callback, delay = 150) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

function onShortcutSubmit(event) {
  const focusedElement = document.activeElement;
  if (!focusedElement || !dom.form.contains(focusedElement)) {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    dom.form.requestSubmit();
  }
}

function setupStorageFeedback() {
  if (!storageEnabled) {
    dom.storageWarning.hidden = false;
    dom.storageWarning.textContent =
      "Armazenamento local indisponivel neste navegador. O historico local sera somente de sessao.";
  }
}

function disconnectApiSession(render = true) {
  state.api.token = null;
  state.api.user = null;
  state.api.lastSyncAt = null;
  state.remoteSummary = null;
  state.auditEvents = [];
  state.history = loadHistory();
  state.historyMeta = {
    page: 1,
    pageSize: 20,
    total: state.history.length,
    totalPages: 1
  };
  clearSession();

  if (render) {
    dom.auditPanel.hidden = true;
    updateConnectionPanel();
    renderMetrics();
    renderHistory();
  }
}

async function onApiSessionSubmit(event) {
  event.preventDefault();
  const baseUrl = normalizeBaseUrl(dom.apiBaseUrl.value);
  const email = dom.apiEmail.value.trim();
  const password = dom.apiPassword.value;

  if (!email || !password) {
    notify("Informe email e senha para autenticar na API.", "warning");
    return;
  }

  apiClient.setBaseUrl(baseUrl);
  state.api.baseUrl = baseUrl;

  try {
    const login = await apiClient.login({ email, password });
    state.api.token = login.token;
    state.api.user = login.user;
    state.api.lastSyncAt = null;
    persistApiSession();
    dom.apiPassword.value = "";
    dom.auditPanel.hidden = true;
    updateConnectionPanel();
    await syncFromApi(1);
    notify(`Autenticado na API como ${login.user.fullName}.`, "success");
  } catch (error) {
    notify(`Falha ao autenticar na API: ${error.message}`, "error");
  }
}

function onDisconnectApi() {
  disconnectApiSession(true);
  notify("Sessao API encerrada. Modo local reativado.", "info");
}

async function onSyncApi() {
  if (!isApiMode()) {
    notify("Autentique na API antes de sincronizar.", "warning");
    return;
  }

  const synced = await syncFromApi(state.historyMeta.page ?? 1);
  if (synced) {
    notify("Dados sincronizados com o backend.", "success");
  }
}

async function onLoadAudit() {
  if (!isApiMode()) {
    notify("Autentique na API para carregar auditoria.", "warning");
    return;
  }

  if (state.api.user.role !== "admin") {
    notify("Somente admin pode consultar auditoria.", "warning");
    return;
  }

  try {
    const response = await apiClient.listAuditEvents({
      page: 1,
      pageSize: 10
    });
    state.auditEvents = response.items;
    renderAuditPanel();
    dom.auditPanel.hidden = false;
    notify(`${response.pagination.total} evento(s) de auditoria disponiveis.`, "success");
  } catch (error) {
    notify(`Falha ao carregar auditoria: ${error.message}`, "error");
  }
}

async function onHistoryPrevPage() {
  if (!isApiMode() || state.historyMeta.page <= 1) {
    return;
  }

  await syncFromApi(state.historyMeta.page - 1);
}

async function onHistoryNextPage() {
  if (!isApiMode() || state.historyMeta.page >= state.historyMeta.totalPages) {
    return;
  }

  await syncFromApi(state.historyMeta.page + 1);
}

async function restoreApiSession() {
  if (!state.api.token) {
    return;
  }

  apiClient.setBaseUrl(state.api.baseUrl);

  try {
    const me = await apiClient.me();
    state.api.user = me;
    persistApiSession();
    await syncFromApi(1);
    notify(`Sessao restaurada para ${me.fullName}.`, "info");
  } catch {
    disconnectApiSession(false);
    notify("Sessao anterior invalida. Utilize login novamente.", "warning");
  }
}

function attachEvents() {
  const debouncedSearch = createDebounce(async () => {
    if (isApiMode()) {
      await syncFromApi(1);
      return;
    }

    renderHistory();
  });

  dom.form.addEventListener("submit", onSubmit);
  dom.form.addEventListener("reset", onReset);
  dom.clearHistoryButton.addEventListener("click", onClearHistory);
  dom.historyFilter.addEventListener("change", onFilterChange);
  dom.historySort.addEventListener("change", onFilterChange);
  dom.historySearch.addEventListener("input", debouncedSearch);
  dom.historyPrev.addEventListener("click", onHistoryPrevPage);
  dom.historyNext.addEventListener("click", onHistoryNextPage);
  dom.exportHistoryButton.addEventListener("click", exportHistory);
  dom.exportButton.addEventListener("click", exportCurrentResult);
  dom.apiSessionForm.addEventListener("submit", onApiSessionSubmit);
  dom.disconnectApiButton.addEventListener("click", onDisconnectApi);
  dom.syncApiButton.addEventListener("click", onSyncApi);
  dom.loadAuditButton.addEventListener("click", onLoadAudit);
  document.addEventListener("keydown", onShortcutSubmit);
}

async function init() {
  setupStorageFeedback();
  updateConnectionPanel();
  attachEvents();
  renderResult(null);
  renderMetrics();
  renderHistory();
  await restoreApiSession();
}

await init();
