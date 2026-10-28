import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const { size } = await stat(file);
    const headers = { "content-type": types[path.extname(file)] || "application/octet-stream", "accept-ranges": "bytes" };
    const range = request.headers.range;
    let start = 0, end = size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      }
      if (!match || (!match[1] && !match[2]) || start > end || start >= size) {
        response.writeHead(416, { ...headers, "content-range": `bytes */${size}` });
        response.end();
        return;
      }
      headers["content-range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["content-length"] = Math.max(0, end - start + 1);
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD' || size === 0) return response.end();
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    response.end(await readFile(path.join(root, "404.html")));
  }
}).listen(port, "0.0.0.0", () => console.log(`Preview: http://localhost:${port}`));
