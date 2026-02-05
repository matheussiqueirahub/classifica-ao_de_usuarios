import { join } from "node:path";
import { FileStore } from "../../infrastructure/fileStore.js";

class ClassificationRepository {
  constructor(dataDir) {
    this.store = new FileStore(join(dataDir, "classifications.json"), () => ({
      records: []
    }));
  }

  async create(record) {
    await this.store.update((state) => ({
      ...state,
      records: [record, ...state.records]
    }));
    return record;
  }

  async findById(id) {
    const state = await this.store.read();
    return state.records.find((record) => record.id === id) ?? null;
  }

  async list() {
    const state = await this.store.read();
    return state.records;
  }

  async removeById(id) {
    let deleted = false;
    await this.store.update((state) => {
      const nextRecords = state.records.filter((record) => {
        const shouldKeep = record.id !== id;
        if (!shouldKeep) {
          deleted = true;
        }

        return shouldKeep;
      });

      return { ...state, records: nextRecords };
    });
    return deleted;
  }

  async clear() {
    await this.store.write({ records: [] });
  }
}

export { ClassificationRepository };
