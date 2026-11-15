// serve.ts — serves game/ on localhost so the game can be played in a
// desktop browser while it is built. Node 22, standard library only.
// Usage: node serve.ts [port]   (default port 8123)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.argv[2] || 8123);
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Ember & Anvil at http://localhost:${port}/`);
});
