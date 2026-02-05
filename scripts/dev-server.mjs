import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { cwd, env } from "node:process";

const PORT = Number(env.PORT) || 4173;
const HOST = "127.0.0.1";
const PROJECT_ROOT = resolve(cwd());

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function sanitizePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/"));
  const withoutQuery = decoded.split("?")[0].split("#")[0];
  const normalized = normalize(withoutQuery).replace(/^([.]{2}[\\/])+/, "");
  if (!normalized || normalized === "." || normalized === "/") {
    return "index.html";
  }

  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

async function resolveFilePath(pathCandidate) {
  let absolutePath = resolve(join(PROJECT_ROOT, pathCandidate));

  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    return null;
  }

  try {
    const metadata = await stat(absolutePath);
    if (metadata.isDirectory()) {
      absolutePath = resolve(join(absolutePath, "index.html"));
    }
  } catch {
    if (!extname(absolutePath)) {
      absolutePath = `${absolutePath}.html`;
    }
  }

  return absolutePath.startsWith(PROJECT_ROOT) ? absolutePath : null;
}

const server = createServer(async (request, response) => {
  const candidate = sanitizePath(request.url);
  const absolutePath = await resolveFilePath(candidate);

  if (!absolutePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  try {
    const content = await readFile(absolutePath);
    const extension = extname(absolutePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Recurso nao encontrado.");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor local ativo em http://${HOST}:${PORT}`);
});
