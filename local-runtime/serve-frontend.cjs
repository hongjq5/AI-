// Serve the verified production build for local integration without new packages.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../yubi-frontend-master/yubi-frontend-master/dist');
if (!fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error('Frontend dist is missing. Build the frontend first.');
}
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};
http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403); res.end(); return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname)) { res.writeHead(404); res.end(); return; }
    file = path.join(root, 'index.html');
  }
  res.writeHead(200, {
    'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(file);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}).listen(8000, '127.0.0.1', () => console.log('BI frontend: http://localhost:8000'));
