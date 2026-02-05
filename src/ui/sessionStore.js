const SESSION_KEY = "classificacao_api_session_v1";

function loadSession() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return {
      apiBaseUrl: "http://127.0.0.1:3001/api/v1",
      token: null,
      user: null
    };
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {
        apiBaseUrl: "http://127.0.0.1:3001/api/v1",
        token: null,
        user: null
      };
    }

    const parsed = JSON.parse(raw);
    return {
      apiBaseUrl:
        typeof parsed.apiBaseUrl === "string"
          ? parsed.apiBaseUrl
          : "http://127.0.0.1:3001/api/v1",
      token: typeof parsed.token === "string" ? parsed.token : null,
      user: parsed.user ?? null
    };
  } catch {
    return {
      apiBaseUrl: "http://127.0.0.1:3001/api/v1",
      token: null,
      user: null
    };
  }
}

function saveSession(session) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_KEY);
}

export { loadSession, saveSession, clearSession };
