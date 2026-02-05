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

const ACCESS_KEYS = new Set([
  "completo",
  "ampliado",
  "supervisionado",
  "parcial",
  "visitante",
  "negado"
]);

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
  clearHistoryButton: document.querySelector("#clear-history"),
  exportHistoryButton: document.querySelector("#export-history"),
  exportButton: document.querySelector("#export-result"),
  formFeedback: document.querySelector("#form-feedback"),
  storageWarning: document.querySelector("#storage-warning"),
  metricTotal: document.querySelector("#metric-total"),
  metricAccess: document.querySelector("#metric-access"),
  metricRisk: document.querySelector("#metric-risk"),
  metricScore: document.querySelector("#metric-score")
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
  history: loadHistory()
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  if (!ACCESS_KEYS.has(accessKey)) {
    return "badge-visitante";
  }

  return `badge-${accessKey}`;
}

function sanitizeAccessKey(accessKey) {
  return ACCESS_KEYS.has(accessKey) ? accessKey : "visitante";
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

function clearFieldErrors() {
  Object.values(fieldErrorMap).forEach((field) => {
    if (field.error) {
      field.error.textContent = "";
    }

    if (field.input) {
      field.input.setAttribute("aria-invalid", "false");
    }
  });
}

function renderFieldErrors(errors) {
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
    }
  });
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

function renderMetrics() {
  const summary = summarizeHistory(state.history);
  const accessCount = (summary.byAccessLevel.completo ?? 0) + (summary.byAccessLevel.ampliado ?? 0);

  dom.metricTotal.textContent = String(summary.total);
  dom.metricAccess.textContent = String(accessCount);
  dom.metricRisk.textContent = String(summary.byRiskLevel.alto ?? 0);
  dom.metricScore.textContent = `${summary.averageTrustScore}%`;
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

function getVisibleHistoryRecords() {
  const accessFiltered = filterHistoryByAccess(state.history, dom.historyFilter.value);
  const query = normalizeSearchText(dom.historySearch.value);
  const searched = query
    ? accessFiltered.filter((item) => normalizeSearchText(item.user?.fullName).includes(query))
    : accessFiltered;
  return sortHistoryRecords(searched, dom.historySort.value);
}

function renderHistory() {
  const visibleRecords = getVisibleHistoryRecords();
  const filterLabel = dom.historyFilter.options[dom.historyFilter.selectedIndex]?.textContent ?? "Todos";
  const query = dom.historySearch.value.trim();

  dom.historySummary.textContent = `${visibleRecords.length} registro(s) exibido(s) de ${state.history.length} no filtro "${filterLabel}"${query ? ` para busca "${query}"` : ""}.`;

  if (visibleRecords.length === 0) {
    dom.historyBody.innerHTML = `
      <tr>
        <td colspan="6">Nenhuma analise para o filtro selecionado.</td>
      </tr>
    `;
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

function notify(message) {
  dom.formFeedback.textContent = message;
}

function refreshDashboard() {
  renderMetrics();
  renderHistory();
}

function exportCurrentResult() {
  if (!state.latestResult) {
    notify("Realize uma analise antes de exportar.");
    return;
  }

  const payload = JSON.stringify(state.latestResult, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = state.latestResult.user.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  link.href = url;
  link.download = `classificacao-${safeName || "usuario"}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  notify("Resultado exportado em JSON com sucesso.");
}

function exportHistory() {
  if (!state.history.length) {
    notify("Nao ha historico para exportar.");
    return;
  }

  const payload = JSON.stringify(getVisibleHistoryRecords(), null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `historico-classificacao-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  notify("Historico filtrado exportado em JSON.");
}

function onSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const payload = readFormData();
  const validation = validateUserInput(payload);

  if (!validation.isValid) {
    renderFieldErrors(validation.errors);
    notify("Revise os campos destacados e tente novamente.");
    return;
  }

  const result = classifyUser(validation.sanitizedData);
  state.latestResult = result;
  state.history = saveRecord(result);
  dom.exportButton.disabled = false;
  renderResult(result);
  refreshDashboard();
  notify(`Classificacao concluida para ${result.user.fullName}.`);
}

function onReset() {
  clearFieldErrors();
  renderResult(null);
  state.latestResult = null;
  dom.exportButton.disabled = true;
  notify("Formulario limpo.");
}

function onClearHistory() {
  clearHistory();
  state.history = [];
  refreshDashboard();
  notify("Historico removido.");
}

function onFilterChange() {
  renderHistory();
}

function createDebounce(callback, delay = 120) {
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
      "Armazenamento local indisponivel neste navegador. O historico sera exibido apenas durante a sessao.";
  }
}

function attachEvents() {
  const debouncedSearch = createDebounce(() => renderHistory(), 150);
  dom.form.addEventListener("submit", onSubmit);
  dom.form.addEventListener("reset", onReset);
  dom.clearHistoryButton.addEventListener("click", onClearHistory);
  dom.historyFilter.addEventListener("change", onFilterChange);
  dom.historySort.addEventListener("change", onFilterChange);
  dom.historySearch.addEventListener("input", debouncedSearch);
  dom.exportHistoryButton.addEventListener("click", exportHistory);
  dom.exportButton.addEventListener("click", exportCurrentResult);
  document.addEventListener("keydown", onShortcutSubmit);
}

function init() {
  setupStorageFeedback();
  attachEvents();
  refreshDashboard();
}

init();
