class ApiError extends Error {
  constructor(message, statusCode = 500, code = "API_ERROR", details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function normalizeBaseUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "http://127.0.0.1:3001/api/v1";
  }

  const withoutSlash = raw.replace(/\/+$/, "");
  if (withoutSlash.endsWith("/api/v1")) {
    return withoutSlash;
  }

  if (withoutSlash.includes("/api/")) {
    return withoutSlash;
  }

  return `${withoutSlash}/api/v1`;
}

function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.append(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

class ApiClient {
  constructor({ baseUrl, getToken }) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.getToken = getToken;
  }

  setBaseUrl(value) {
    this.baseUrl = normalizeBaseUrl(value);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}${buildQuery(options.query)}`;
    const headers = {
      Accept: options.accept ?? "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    };

    if (options.auth !== false) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      throw new ApiError(
        payload?.error?.message ?? `Erro HTTP ${response.status}`,
        response.status,
        payload?.error?.code ?? "API_ERROR",
        payload?.error?.details ?? null
      );
    }

    if (options.responseType === "text") {
      return response.text();
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async login(payload) {
    return this.request("/auth/login", {
      method: "POST",
      auth: false,
      body: payload
    });
  }

  async me() {
    return this.request("/auth/me");
  }

  async createClassification(payload) {
    return this.request("/classifications", {
      method: "POST",
      body: payload
    });
  }

  async listClassifications(query) {
    return this.request("/classifications", {
      query
    });
  }

  async getSummary() {
    return this.request("/analytics/summary");
  }

  async clearClassifications() {
    return this.request("/classifications", {
      method: "DELETE"
    });
  }

  async exportClassifications(format, query = {}) {
    return this.request("/classifications/export", {
      query: { ...query, format },
      responseType: format === "csv" ? "text" : "json",
      accept: format === "csv" ? "text/csv" : "application/json"
    });
  }

  async listAuditEvents(query = {}) {
    return this.request("/audit/events", {
      query
    });
  }
}

export { ApiClient, ApiError, normalizeBaseUrl };
