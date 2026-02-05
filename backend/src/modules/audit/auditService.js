import { randomUUID } from "node:crypto";
import { AppError } from "../../core/appError.js";

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

class AuditService {
  constructor({ auditRepository }) {
    this.auditRepository = auditRepository;
  }

  async record(eventInput = {}) {
    const action = String(eventInput.action ?? "").trim();
    if (!action) {
      throw new AppError({
        message: "Acao de auditoria obrigatoria.",
        statusCode: 400,
        code: "INVALID_AUDIT_ACTION",
        expose: true
      });
    }

    const event = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      action,
      outcome: normalizeText(eventInput.outcome) || "success",
      actor: {
        id: eventInput.actor?.id ?? null,
        email: eventInput.actor?.email ?? null,
        role: eventInput.actor?.role ?? null
      },
      request: {
        ip: eventInput.request?.ip ?? null,
        requestId: eventInput.request?.requestId ?? null,
        userAgent: eventInput.request?.userAgent ?? null
      },
      metadata: eventInput.metadata ?? {}
    };

    return this.auditRepository.create(event);
  }

  async list(query = {}) {
    const page = Math.max(1, toNumber(query.page, 1));
    const pageSize = Math.min(Math.max(1, toNumber(query.pageSize, 20)), 100);
    const action = normalizeText(query.action);
    const outcome = normalizeText(query.outcome);
    const actorEmail = normalizeText(query.actorEmail);

    let events = await this.auditRepository.list();

    if (action) {
      events = events.filter((item) => normalizeText(item.action) === action);
    }

    if (outcome) {
      events = events.filter((item) => normalizeText(item.outcome) === outcome);
    }

    if (actorEmail) {
      events = events.filter((item) =>
        normalizeText(item.actor?.email).includes(actorEmail)
      );
    }

    events = events.sort((a, b) => {
      const left = Date.parse(a.createdAt) || 0;
      const right = Date.parse(b.createdAt) || 0;
      return right - left;
    });

    const total = events.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    return {
      items: events.slice(offset, offset + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages
      }
    };
  }

  async getById(id) {
    const event = await this.auditRepository.findById(id);
    if (!event) {
      throw new AppError({
        message: "Evento de auditoria nao encontrado.",
        statusCode: 404,
        code: "AUDIT_EVENT_NOT_FOUND",
        expose: true
      });
    }

    return event;
  }
}

export { AuditService };
