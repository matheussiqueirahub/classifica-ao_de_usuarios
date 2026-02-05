const STORAGE_KEY = "classificacao_usuarios_historico_v2";
const MAX_ITEMS = 60;
let memoryHistory = [];

function isStorageAvailable() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    const testKey = "__storage_test_key__";
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageEnabled = isStorageAvailable();

function persistHistory(records) {
  if (!storageEnabled) {
    memoryHistory = [...records];
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadHistory() {
  if (!storageEnabled) {
    return [...memoryHistory];
  }

  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }

    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecord(record) {
  const records = [record, ...loadHistory()].slice(0, MAX_ITEMS);
  persistHistory(records);
  return records;
}

function clearHistory() {
  if (!storageEnabled) {
    memoryHistory = [];
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

function filterHistoryByAccess(records, accessLevel) {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  if (!accessLevel || accessLevel === "todos") {
    return records;
  }

  return records.filter((item) => item.access?.key === accessLevel);
}

export {
  storageEnabled,
  loadHistory,
  saveRecord,
  clearHistory,
  filterHistoryByAccess
};
