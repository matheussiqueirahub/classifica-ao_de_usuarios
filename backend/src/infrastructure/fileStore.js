import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

class FileStore {
  constructor(filePath, getDefaultState) {
    this.filePath = resolve(filePath);
    this.getDefaultState =
      typeof getDefaultState === "function" ? getDefaultState : () => ({});
    this.writeChain = Promise.resolve();
    this.initialized = false;
  }

  async ensureFile() {
    if (this.initialized) {
      return;
    }

    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      await readFile(this.filePath, "utf-8");
    } catch {
      const initial = this.getDefaultState();
      await writeFile(this.filePath, JSON.stringify(initial, null, 2), "utf-8");
    }

    this.initialized = true;
  }

  async read() {
    await this.ensureFile();
    const raw = await readFile(this.filePath, "utf-8");
    try {
      return JSON.parse(raw);
    } catch {
      const fallback = this.getDefaultState();
      await this.write(fallback);
      return fallback;
    }
  }

  async write(data) {
    await this.ensureFile();
    const payload = JSON.stringify(data, null, 2);
    const tempPath = `${this.filePath}.tmp`;

    this.writeChain = this.writeChain.then(async () => {
      await writeFile(tempPath, payload, "utf-8");
      await rename(tempPath, this.filePath);
    });

    return this.writeChain;
  }

  async update(updater) {
    const current = await this.read();
    const nextState = await updater(current);
    await this.write(nextState);
    return nextState;
  }
}

export { FileStore };
