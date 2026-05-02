import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveFromRoot } from "./config.js";

const port = Number.parseInt(process.env.PORT || "4173", 10);
const publicDir = resolveFromRoot("public");

const server = http.createServer(async (req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url || "/index.html");
  const filePath = path.join(publicDir, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));

  try {
    const content = await fs.readFile(filePath);
    const type = filePath.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Daily intel report server: http://localhost:${port}`);
});
