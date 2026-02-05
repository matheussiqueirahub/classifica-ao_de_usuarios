import { AppError } from "../../core/appError.js";
import {
  classifyUser,
  summarizeHistory,
  validateUserInput
} from "../../../../src/domain/classificationEngine.js";

const ALLOWED_ACCESS = new Set([
  "completo",
  "ampliado",
  "supervisionado",
  "parcial",
  "visitante",
  "negado"
]);

const ALLOWED_RISK = new Set(["baixo", "medio", "alto"]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toDateValue(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickSortValue(record, sortBy) {
  if (sortBy === "trustScore") {
    return Number(record.security?.trustScore ?? 0);
  }

  return Date.parse(record.createdAt) || 0;
}

function buildQueryOptions(query = {}) {
  const page = Math.max(1, toNumber(query.page, 1));
  const pageSize = Math.min(Math.max(1, toNumber(query.pageSize, 20)), 100);
  const sortBy = query.sortBy === "trustScore" ? "trustScore" : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const search = normalizeText(query.search);
  const accessLevel = String(query.accessLevel ?? "").trim().toLowerCase();
  const riskLevel = String(query.riskLevel ?? "").trim().toLowerCase();
  const createdAfter = toDateValue(query.createdAfter);
  const createdBefore = toDateValue(query.createdBefore);

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    accessLevel,
    riskLevel,
    createdAfter,
    createdBefore
  };
}

function filterAndSortRecords(records, options) {
  let filtered = [...records];

  if (options.search) {
    filtered = filtered.filter((item) =>
      normalizeText(item.user?.fullName).includes(options.search)
    );
  }

  if (options.accessLevel) {
    filtered = filtered.filter((item) => item.access?.key === options.accessLevel);
  }

  if (options.riskLevel) {
    filtered = filtered.filter(
      (item) => item.security?.riskLevel?.key === options.riskLevel
    );
  }

  if (options.createdAfter !== null) {
    filtered = filtered.filter(
      (item) => (Date.parse(item.createdAt) || 0) >= options.createdAfter
    );
  }

  if (options.createdBefore !== null) {
    filtered = filtered.filter(
      (item) => (Date.parse(item.createdAt) || 0) <= options.createdBefore
    );
  }

  return filtered.sort((a, b) => {
    const left = pickSortValue(a, options.sortBy);
    const right = pickSortValue(b, options.sortBy);
    return options.sortOrder === "asc" ? left - right : right - left;
  });
}

function paginateRecords(records, page, pageSize) {
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    items: records.slice(offset, offset + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  };
}

class ClassificationService {
  constructor({ classificationRepository }) {
    this.classificationRepository = classificationRepository;
  }

  async createClassification(payload, actor) {
    const validation = validateUserInput(payload);
    if (!validation.isValid) {
      throw new AppError({
        message: "Dados invalidos para classificacao.",
        statusCode: 400,
        code: "INVALID_CLASSIFICATION_INPUT",
        details: validation.errors,
        expose: true
      });
    }

    const result = classifyUser(validation.sanitizedData);
    const record = {
      ...result,
      actor: {
        id: actor.sub,
        email: actor.email,
        role: actor.role
      }
    };

    return this.classificationRepository.create(record);
  }

  async getById(id) {
    const found = await this.classificationRepository.findById(id);
    if (!found) {
      throw new AppError({
        message: "Classificacao nao encontrada.",
        statusCode: 404,
        code: "CLASSIFICATION_NOT_FOUND",
        expose: true
      });
    }

    return found;
  }

  async list(query = {}) {
    const options = buildQueryOptions(query);

    if (options.accessLevel && !ALLOWED_ACCESS.has(options.accessLevel)) {
      throw new AppError({
        message: "Filtro accessLevel invalido.",
        statusCode: 400,
        code: "INVALID_ACCESS_FILTER",
        expose: true
      });
    }

    if (options.riskLevel && !ALLOWED_RISK.has(options.riskLevel)) {
      throw new AppError({
        message: "Filtro riskLevel invalido.",
        statusCode: 400,
        code: "INVALID_RISK_FILTER",
        expose: true
      });
    }

    const records = await this.classificationRepository.list();
    const sorted = filterAndSortRecords(records, options);
    return paginateRecords(sorted, options.page, options.pageSize);
  }

  async export(query = {}) {
    const options = buildQueryOptions(query);

    if (options.accessLevel && !ALLOWED_ACCESS.has(options.accessLevel)) {
      throw new AppError({
        message: "Filtro accessLevel invalido.",
        statusCode: 400,
        code: "INVALID_ACCESS_FILTER",
        expose: true
      });
    }

    if (options.riskLevel && !ALLOWED_RISK.has(options.riskLevel)) {
      throw new AppError({
        message: "Filtro riskLevel invalido.",
        statusCode: 400,
        code: "INVALID_RISK_FILTER",
        expose: true
      });
    }

    const records = await this.classificationRepository.list();
    return filterAndSortRecords(records, options);
  }

  async deleteById(id) {
    const deleted = await this.classificationRepository.removeById(id);
    if (!deleted) {
      throw new AppError({
        message: "Classificacao nao encontrada.",
        statusCode: 404,
        code: "CLASSIFICATION_NOT_FOUND",
        expose: true
      });
    }
  }

  async clearAll() {
    await this.classificationRepository.clear();
  }

  async getSummary() {
    const records = await this.classificationRepository.list();
    const summary = summarizeHistory(records);
    const recent24hCount = records.filter((item) => {
      const createdAt = Date.parse(item.createdAt) || 0;
      return Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    }).length;

    return {
      ...summary,
      recent24hCount
    };
  }
}

export { ClassificationService };
