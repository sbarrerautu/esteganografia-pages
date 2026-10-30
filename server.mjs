import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('public');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.vtt':'text/vtt; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const file = path === root ? resolve(root, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff' }).end(data);
  } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }).end('Archivo no encontrado'); }
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
