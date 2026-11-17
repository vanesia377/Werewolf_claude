// Làng Trăng Máu — server nhiều người chơi (1 server duy nhất), không phụ thuộc thư viện ngoài.
const http = require('http'), fs = require('fs'), path = require('path');
const createGame = require('./game.js');
const PORT = process.env.PORT || 3000;

if (process.env.SIM) { // tự chơi toàn máy để kiểm thử: SIM=1 node server.js
  const game = createGame({ sim: true, isConnected: () => false, broadcast() { } }), wins = {}, seen = new Set();
  const play = setup => {
    game.reset([], setup); game.start(); let guard = 0;
    if (game.state().phase === 'lobby') return; // đội hình không hợp lệ
    game.state().players.forEach(p => seen.add(p.role));
    for (const r of ['jailer', 'cupid']) if (game.state().players.filter(p => p.role === r).length > 1) throw new Error('quá 1 ' + r);
    while (game.state().phase !== 'end') { game.advance(); if (++guard > 500) throw new Error('ván không kết thúc'); }
    wins[game.state().winner] = (wins[game.state().winner] || 0) + 1;
  };
  for (let i = 0; i < 1000; i++) play(undefined); // đội hình mặc định
  for (let i = 0; i < 6000; i++) { // đội hình ngẫu nhiên, đủ mọi vai trò và mọi cỡ phòng
    const w = 1 + Math.floor(Math.random() * 3), v = 2 + Math.floor(Math.random() * 2);
    const r = Math.max(2, Math.floor(Math.random() * (14 - v - w))), strong = Math.floor(Math.random() * (r + 1));
    play({ villager: v, randVR: r - strong, randVS: strong, randW: w, randN: Math.floor(Math.random() * 2), randS: Math.floor(Math.random() * 3) });
  }
  const missing = Object.keys(game.roles).filter(r => !game.roles[r].random && !seen.has(r));
  console.log('OK', wins, missing.length ? 'CHƯA THỬ: ' + missing : 'đã thử đủ ' + seen.size + ' vai trò');
} else {
  const conns = new Map(); // token -> res (SSE)
  const broadcast = () => { for (const [tok, res] of conns) res.write(`data: ${JSON.stringify(game.view(tok))}\n\n`); };
  const game = createGame({ isConnected: tok => conns.has(tok), broadcast });
  const file = (res, name, type) => { res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); res.end(fs.readFileSync(path.join(__dirname, name))); };
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/events') {
      const tok = u.searchParams.get('token');
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      conns.set(tok, res); res.write(`data: ${JSON.stringify(game.view(tok))}\n\n`);
      req.on('close', () => { if (conns.get(tok) === res) conns.delete(tok); });
    } else if (u.pathname === '/api' && req.method === 'POST') {
      let body = ''; req.on('data', d => { body += d; if (body.length > 5000) req.destroy(); });
      req.on('end', () => { try { game.handle(JSON.parse(body)); broadcast(); } catch (e) { console.error(e); } res.end('{}'); });
    } else if (u.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ltm-server'); }
    else if (u.pathname === '/game.js') file(res, 'game.js', 'text/javascript');
    else file(res, 'index.html', 'text/html');
  }).listen(PORT, () => console.log(`Làng Trăng Máu: http://localhost:${PORT}`));
  setInterval(() => { for (const r of conns.values()) r.write(': ping\n\n'); }, 20000);
}
