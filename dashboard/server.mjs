// Excellent Mind — school dashboard server.
// Tablets running the app POST each child's brainwave results to /api/sync; the lab in-charge
// opens the web dashboard (same address) to see progress across every child in the school.
// Node 22.13+ only, no npm dependencies (uses the built-in node:sqlite).
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const PUBLIC_DIR = join(here, 'public');
const PORT = Number(process.env.PORT ?? 4000);
const MAX_BODY = 5 * 1024 * 1024;

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

/* ---------------- database ---------------- */

const db = new DatabaseSync(join(DATA_DIR, 'dashboard.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY, name TEXT, last_sync INTEGER, first_seen INTEGER
  );
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY, device_id TEXT, first_name TEXT, last_name TEXT, birthday TEXT,
    gender TEXT, student_id TEXT, class_name TEXT, updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, child_id TEXT NOT NULL, at INTEGER, game TEXT, protocol TEXT,
    score INTEGER, avg INTEGER, att INTEGER, med INTEGER, pct_above INTEGER, stars INTEGER,
    duration_sec INTEGER, bands TEXT, received_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS activities_child ON activities(child_id, at);
`);

const upDevice = db.prepare(`
  INSERT INTO devices (id, name, last_sync, first_seen) VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, last_sync = excluded.last_sync`);
const upChild = db.prepare(`
  INSERT INTO children (id, device_id, first_name, last_name, birthday, gender, student_id, class_name, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET device_id = excluded.device_id, first_name = excluded.first_name,
    last_name = excluded.last_name, birthday = excluded.birthday, gender = excluded.gender,
    student_id = excluded.student_id, class_name = excluded.class_name, updated_at = excluded.updated_at`);
const upActivity = db.prepare(`
  INSERT INTO activities (id, child_id, at, game, protocol, score, avg, att, med, pct_above, stars, duration_sec, bands, received_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING`);

/* ---------------- helpers ---------------- */

const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v) => (num(v) == null ? null : Math.round(v));
const bandsOf = (b) => (Array.isArray(b) && b.length === 8 && b.every((x) => num(x) != null) ? JSON.stringify(b.map(Number)) : null);

const same = (a, b) => {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
};

const sessions = new Map(); // token -> expiry
const SESSION_MS = 12 * 3600 * 1000;
const cookieOf = (req, name) =>
  (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
const isAdmin = (req) => {
  const t = cookieOf(req, 'em_session');
  const exp = t && sessions.get(t);
  if (!exp || exp < Date.now()) return false;
  sessions.set(t, Date.now() + SESSION_MS);
  return true;
};
const hasKey = (req) => same(req.headers['x-school-key'] ?? '', config.schoolKey);

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !(body instanceof Buffer);
  res.writeHead(status, {
    'content-type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

/* ---------------- routes ---------------- */

function sync(body) {
  const now = Date.now();
  const device = body?.device ?? {};
  const deviceId = str(device.id, 80) || 'unknown';
  let accepted = 0;
  db.exec('BEGIN');
  try {
    upDevice.run(deviceId, str(device.name, 80) || 'Tablet', now, now);
    for (const c of Array.isArray(body?.children) ? body.children.slice(0, 500) : []) {
      const id = str(c.id, 80);
      if (!id) continue;
      upChild.run(id, deviceId, str(c.firstName), str(c.lastName), str(c.birthday, 20), str(c.gender, 10), str(c.studentId, 40), str(c.className, 40), now);
      for (const a of Array.isArray(c.activities) ? c.activities.slice(0, 2000) : []) {
        const aid = str(a.id, 80);
        if (!aid) continue;
        const r = upActivity.run(
          aid, id, int(a.at), str(a.game, 30), str(a.protocol, 10), int(a.score), int(a.avg), int(a.att), int(a.med),
          int(a.pctAbove), int(a.stars), int(a.durationSec), bandsOf(a.bands), now,
        );
        accepted += Number(r.changes);
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return accepted;
}

function allData() {
  const devices = db.prepare('SELECT id, name, last_sync AS lastSync, first_seen AS firstSeen FROM devices ORDER BY last_sync DESC').all();
  const children = db
    .prepare(
      `SELECT id, device_id AS deviceId, first_name AS firstName, last_name AS lastName, birthday, gender,
              student_id AS studentId, class_name AS className, updated_at AS updatedAt FROM children`,
    )
    .all();
  const activities = db
    .prepare(
      `SELECT id, child_id AS childId, at, game, protocol, score, avg, att, med, pct_above AS pctAbove, stars,
              duration_sec AS durationSec, bands FROM activities ORDER BY at`,
    )
    .all()
    .map((a) => ({ ...a, bands: a.bands ? JSON.parse(a.bands) : null }));
  return { school: config.schoolName, devices, children, activities, now: Date.now() };
}

const BANDS = ['delta', 'theta', 'lowAlpha', 'highAlpha', 'lowBeta', 'highBeta', 'lowGamma', 'midGamma'];

function exportActivities() {
  const { children, activities } = allData();
  const byId = Object.fromEntries(children.map((c) => [c.id, c]));
  return csv([
    ['child_id', 'student_id', 'first_name', 'last_name', 'class', 'date', 'game', 'protocol', 'score', 'avg_target', 'attention', 'pct_on_target', 'stars', 'duration_sec', ...BANDS.map((b) => `${b}_pct`)],
    ...activities.map((a) => {
      const c = byId[a.childId] ?? {};
      return [a.childId, c.studentId, c.firstName, c.lastName, c.className, new Date(a.at).toISOString(), a.game, a.protocol, a.score, a.avg, a.att, a.pctAbove, a.stars, a.durationSec, ...(a.bands ?? BANDS.map(() => ''))];
    }),
  ]);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '') || 'index.html';
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) return send(res, 404, 'Not found');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    // Tablets
    if (pathname === '/api/ping' && req.method === 'GET') {
      if (!hasKey(req)) return send(res, 401, { error: 'wrong school key' });
      return send(res, 200, { ok: true, school: config.schoolName });
    }
    if (pathname === '/api/sync' && req.method === 'POST') {
      if (!hasKey(req)) return send(res, 401, { error: 'wrong school key' });
      const accepted = sync(await readJson(req));
      return send(res, 200, { ok: true, school: config.schoolName, accepted });
    }
    // Dashboard
    if (pathname === '/api/login' && req.method === 'POST') {
      const { password } = await readJson(req);
      if (!same(password ?? '', config.adminPassword)) return send(res, 401, { error: 'Wrong password' });
      const token = randomBytes(24).toString('hex');
      sessions.set(token, Date.now() + SESSION_MS);
      return send(res, 200, { ok: true, school: config.schoolName }, { 'set-cookie': `em_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
    }
    if (pathname === '/api/logout' && req.method === 'POST') {
      sessions.delete(cookieOf(req, 'em_session'));
      return send(res, 200, { ok: true }, { 'set-cookie': 'em_session=; Path=/; Max-Age=0' });
    }
    if (pathname.startsWith('/api/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Sign in first' });
      if (pathname === '/api/data') return send(res, 200, allData());
      const del = pathname.match(/^\/api\/children\/([^/]+)$/);
      if (del && req.method === 'DELETE') {
        const id = decodeURIComponent(del[1]);
        db.prepare('DELETE FROM activities WHERE child_id = ?').run(id);
        db.prepare('DELETE FROM children WHERE id = ?').run(id);
        return send(res, 200, { ok: true });
      }
      if (pathname === '/api/export/activities.csv')
        return send(res, 200, exportActivities(), { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="excellent-mind-activities.csv"' });
      return send(res, 404, { error: 'Not found' });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    send(res, 405, 'Method not allowed');
  } catch (e) {
    send(res, 400, { error: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
  console.log('\nExcellent Mind school dashboard is running.\n');
  console.log(`  Dashboard (this PC):   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  Tablets & other PCs:   http://${ip}:${PORT}`));
  console.log(`\n  School name:     ${config.schoolName}`);
  console.log(`  School key:      ${config.schoolKey}   (enter on each tablet: Settings > School dashboard)`);
  console.log(`  Admin password:  ${config.adminPassword}   (for the web dashboard)`);
  console.log(`\n  Settings and data live in ${DATA_DIR}\n`);
});
