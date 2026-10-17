const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'todos.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

const load = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; } };
const save = (todos) => fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data === undefined ? '' : JSON.stringify(data));
};

const readBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/api\/todos(?:\/([\w-]+))?$/);

  if (match) {
    const id = match[1];
    let todos = load();
    if (req.method === 'GET' && !id) return send(res, 200, todos);
    if (req.method === 'POST' && !id) {
      const { text } = await readBody(req);
      if (!text || !text.trim()) return send(res, 400, { error: 'Text is required' });
      const todo = { id: crypto.randomUUID(), text: text.trim(), done: false, createdAt: Date.now() };
      todos.push(todo); save(todos);
      return send(res, 201, todo);
    }
    const todo = todos.find((t) => t.id === id);
    if (!todo) return send(res, 404, { error: 'Not found' });
    if (req.method === 'PATCH') {
      const body = await readBody(req);
      if (typeof body.done === 'boolean') todo.done = body.done;
      if (typeof body.text === 'string' && body.text.trim()) todo.text = body.text.trim();
      save(todos);
      return send(res, 200, todo);
    }
    if (req.method === 'DELETE') {
      save(todos.filter((t) => t.id !== id));
      return send(res, 204);
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  // Static files
  const filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, content) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(content);
  });
});

server.listen(PORT, () => console.log(`To-Do app running at http://localhost:${PORT}`));
