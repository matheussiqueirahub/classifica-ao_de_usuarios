import { join } from "node:path";
import { FileStore } from "../../infrastructure/fileStore.js";
import { normalizeEmail } from "../../core/security.js";

class UserRepository {
  constructor(dataDir) {
    this.store = new FileStore(join(dataDir, "users.json"), () => ({ users: [] }));
  }

  async findByEmail(email) {
    const normalized = normalizeEmail(email);
    const state = await this.store.read();
    return state.users.find((user) => user.email === normalized) ?? null;
  }

  async findById(id) {
    const state = await this.store.read();
    return state.users.find((user) => user.id === id) ?? null;
  }

  async create(userData) {
    await this.store.update((state) => ({
      ...state,
      users: [...state.users, userData]
    }));
    return userData;
  }

  async list() {
    const state = await this.store.read();
    return state.users;
  }
}

export { UserRepository };
