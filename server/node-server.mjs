// Production server: serves the built client assets and hands everything else to TanStack Start.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd(), "dist");
const clientDir = join(root, "client");
const { default: app } = await import(pathToFileURL(join(root, "server", "server.js")).href);

const TYPES = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain", ".map": "application/json",
};

function serveStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = normalize(join(clientDir, pathname));
  if (!file.startsWith(clientDir + "/") || !existsSync(file) || !statSync(file).isFile()) return false;
  const immutable = pathname.startsWith("/assets/");
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=300",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if (serveStatic(req, res)) return;
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const url = `${proto}://${req.headers.host}${req.url}`;
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await app.fetch(request);
    const headers = {};
    for (const [k, v] of response.headers) {
      if (k === "set-cookie") continue;
      headers[k] = v;
    }
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) headers["set-cookie"] = cookies;
    res.writeHead(response.status, headers);
    if (!response.body) return res.end();
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error("Unhandled request error", error);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => console.log(`MarketIntel listening on ${port}`));
