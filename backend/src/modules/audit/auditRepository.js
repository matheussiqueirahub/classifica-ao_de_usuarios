import { join } from "node:path";
import { FileStore } from "../../infrastructure/fileStore.js";

class AuditRepository {
  constructor(dataDir) {
    this.store = new FileStore(join(dataDir, "audit-events.json"), () => ({
      events: []
    }));
  }

  async create(event) {
    await this.store.update((state) => ({
      ...state,
      events: [event, ...state.events]
    }));
    return event;
  }

  async list() {
    const state = await this.store.read();
    return state.events;
  }

  async findById(id) {
    const state = await this.store.read();
    return state.events.find((item) => item.id === id) ?? null;
  }
}

export { AuditRepository };
