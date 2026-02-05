import { randomUUID } from "node:crypto";
import { AppError } from "../../core/appError.js";
import { hashPassword, normalizeEmail, verifyPassword } from "../../core/security.js";

const ALLOWED_ROLES = new Set(["admin", "analyst"]);

function safeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

class AuthService {
  constructor({ userRepository, seedAdmin }) {
    this.userRepository = userRepository;
    this.seedAdmin = seedAdmin;
  }

  async ensureSeedAdmin() {
    const email = normalizeEmail(this.seedAdmin.email);
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      return safeUser(existing);
    }

    const passwordHash = await hashPassword(this.seedAdmin.password);
    const created = await this.userRepository.create({
      id: randomUUID(),
      fullName: this.seedAdmin.fullName,
      email,
      role: "admin",
      passwordHash,
      createdAt: new Date().toISOString()
    });
    return safeUser(created);
  }

  async register({ fullName, email, password, role = "analyst" }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = String(role).toLowerCase();
    const cleanName = String(fullName ?? "").trim().replace(/\s+/g, " ");

    if (!cleanName || cleanName.length < 3) {
      throw new AppError({
        message: "Nome invalido para cadastro.",
        statusCode: 400,
        code: "INVALID_NAME",
        expose: true
      });
    }

    if (!normalizedEmail.includes("@")) {
      throw new AppError({
        message: "Email invalido para cadastro.",
        statusCode: 400,
        code: "INVALID_EMAIL",
        expose: true
      });
    }

    if (String(password ?? "").length < 8) {
      throw new AppError({
        message: "Senha deve ter ao menos 8 caracteres.",
        statusCode: 400,
        code: "WEAK_PASSWORD",
        expose: true
      });
    }

    if (!ALLOWED_ROLES.has(normalizedRole)) {
      throw new AppError({
        message: "Perfil invalido. Use admin ou analyst.",
        statusCode: 400,
        code: "INVALID_ROLE",
        expose: true
      });
    }

    const alreadyExists = await this.userRepository.findByEmail(normalizedEmail);
    if (alreadyExists) {
      throw new AppError({
        message: "Usuario ja cadastrado para este email.",
        statusCode: 409,
        code: "USER_ALREADY_EXISTS",
        expose: true
      });
    }

    const passwordHash = await hashPassword(password);
    const created = await this.userRepository.create({
      id: randomUUID(),
      fullName: cleanName,
      email: normalizedEmail,
      role: normalizedRole,
      passwordHash,
      createdAt: new Date().toISOString()
    });

    return safeUser(created);
  }

  async login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError({
        message: "Credenciais invalidas.",
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        expose: true
      });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError({
        message: "Credenciais invalidas.",
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        expose: true
      });
    }

    return safeUser(user);
  }

  async findUserById(id) {
    const user = await this.userRepository.findById(id);
    return safeUser(user);
  }
}

export { AuthService };
