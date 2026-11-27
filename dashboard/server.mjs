// Excellent Mind school dashboard, running on a school PC.
// Tablets running the app POST each child's brainwave results to /api/sync; the lab in-charge
// opens the web dashboard (same address) to see progress across every child in the school.
// Node 22.13+ only, no npm dependencies (uses the built-in node:sqlite).
// The same routes also run online on Vercel: see api/index.js.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './lib/handler.mjs';
import { sqliteStore } from './lib/store-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const PUBLIC_DIR = join(here, 'public');
const PORT = Number(process.env.PORT ?? 4000);

/* ---------------- config (created on first run) ---------------- */

mkdirSync(DATA_DIR, { recursive: true });
const cfgPath = join(DATA_DIR, 'config.json');
const readable = (n) => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(n), (b) => abc[b % abc.length]).join('');
};
let config = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : null;
if (!config) {
  config = { schoolName: 'My School', schoolKey: `EM-${readable(4)}-${readable(4)}`, adminPassword: readable(10) };
  writeFileSync(cfgPath, JSON.stringify(config, null, 2));
}
if (process.env.SCHOOL_NAME) config.schoolName = process.env.SCHOOL_NAME;
if (process.env.SCHOOL_KEY) config.schoolKey = process.env.SCHOOL_KEY;
if (process.env.ADMIN_PASSWORD) config.adminPassword = process.env.ADMIN_PASSWORD;

/* ---------------- static files ---------------- */

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '') || 'index.html';
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
}

/* ---------------- server ---------------- */

const handle = createHandler({ config, store: sqliteStore(DATA_DIR), serveStatic });
const server = createServer((req, res) => handle(req, res));

server.listen(PORT, () => {
  // Tailscale gives each device a fixed 100.64.0.0/10 address. Virtual adapters (WSL, Hyper-V, other
  // VPNs, Docker) are skipped because tablets can't reach the PC through them.
  const isTailscale = (name, ip) => /tailscale/i.test(name) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip);
  const isVirtual = (name) => /vethernet|wsl|hyper-v|virtualbox|vmware|docker|loopback|vpn|bluetooth/i.test(name);
  const tailnet = [];
  const lan = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const n of list ?? []) {
      if (n.family !== 'IPv4' || n.internal) continue;
      if (isTailscale(name, n.address)) tailnet.push(n.address);
      else if (!isVirtual(name)) lan.push(n.address);
    }
  }
  console.log('\nExcellent Mind school dashboard is running.\n');
  console.log(`  Dashboard (this PC):         http://localhost:${PORT}`);
  tailnet.forEach((ip) => console.log(`  Tablets via Tailscale:       http://${ip}:${PORT}   (works on any internet)`));
  lan.forEach((ip) => console.log(`  Tablets on the same Wi-Fi:   http://${ip}:${PORT}`));
  console.log(`\n  School name:     ${config.schoolName}`);
  console.log(`  School key:      ${config.schoolKey}   (enter on each tablet: Settings > School dashboard)`);
  console.log(`  Admin password:  ${config.adminPassword}   (for the web dashboard)`);
  console.log(`\n  Settings and data live in ${DATA_DIR}\n`);
});
