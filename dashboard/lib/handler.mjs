// Excellent Mind dashboard: the HTTP routes, shared by the school-PC server (server.mjs) and the
// Vercel function (api/index.js). Storage is passed in, so the same routes work with SQLite on a PC
// and with Postgres online.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY = 5 * 1024 * 1024;
const SESSION_MS = 12 * 3600 * 1000;
const BANDS = ['delta', 'theta', 'lowAlpha', 'highAlpha', 'lowBeta', 'highBeta', 'lowGamma', 'midGamma'];

const same = (a, b) => {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
};

const cookieOf = (req, name) =>
  (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];

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
  // Vercel parses the body itself; a plain Node server leaves the stream to us.
  if (req.body !== undefined) {
    const b = req.body;
    if (b == null) return Promise.resolve({});
    if (typeof b === 'string') return Promise.resolve(JSON.parse(b || '{}'));
    if (Buffer.isBuffer(b)) return Promise.resolve(JSON.parse(b.toString('utf8') || '{}'));
    return Promise.resolve(b);
  }
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

/* ---------------- input cleaning (shared by both stores) ---------------- */

const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v) => (num(v) == null ? null : Math.round(v));
const bandsOf = (b) => (Array.isArray(b) && b.length === 8 && b.every((x) => num(x) != null) ? JSON.stringify(b.map(Number)) : null);

/** Turns a tablet's sync body into plain rows. */
export function cleanSync(body) {
  const device = body?.device ?? {};
  const deviceId = str(device.id, 80) || 'unknown';
  const children = [];
  const activities = [];
  for (const c of Array.isArray(body?.children) ? body.children.slice(0, 500) : []) {
    const id = str(c.id, 80);
    if (!id) continue;
    children.push({
      id, deviceId, firstName: str(c.firstName), lastName: str(c.lastName), birthday: str(c.birthday, 20),
      gender: str(c.gender, 10), studentId: str(c.studentId, 40), className: str(c.className, 40),
    });
    for (const a of Array.isArray(c.activities) ? c.activities.slice(0, 2000) : []) {
      const aid = str(a.id, 80);
      if (!aid) continue;
      activities.push({
        id: aid, childId: id, at: int(a.at), game: str(a.game, 30), protocol: str(a.protocol, 10), score: int(a.score),
        avg: int(a.avg), att: int(a.att), med: int(a.med), pctAbove: int(a.pctAbove), stars: int(a.stars),
        durationSec: int(a.durationSec), bands: bandsOf(a.bands),
      });
    }
  }
  return { device: { id: deviceId, name: str(device.name, 80) || 'Tablet' }, children, activities };
}

/* ---------------- routes ---------------- */

/**
 * @param {{ config: { schoolName: string, schoolKey: string, adminPassword: string, sessionSecret?: string },
 *           store: { sync(rows): Promise<number>, allData(): Promise<object>, deleteChild(id: string): Promise<void> },
 *           serveStatic?: (req, res) => void }} opts
 */
export function createHandler({ config, store, serveStatic }) {
  // Signed, stateless session cookie: works across serverless instances and survives restarts.
  // Changing the admin password signs everyone out.
  const secret = createHash('sha256').update(`em|${config.adminPassword}|${config.sessionSecret ?? config.schoolKey}`).digest();
  const sign = (exp) => createHmac('sha256', secret).update(String(exp)).digest('hex');
  const newToken = () => {
    const exp = Date.now() + SESSION_MS;
    return `${exp}.${sign(exp)}`;
  };
  const isAdmin = (req) => {
    const [exp, mac] = (cookieOf(req, 'em_session') ?? '').split('.');
    return Boolean(exp && mac && Number(exp) > Date.now() && same(mac, sign(exp)));
  };
  const hasKey = (req) => same(req.headers['x-school-key'] ?? '', config.schoolKey);
  const secure = (req) => (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');

  async function exportActivities() {
    const { children, activities } = await store.allData();
    const byId = Object.fromEntries(children.map((c) => [c.id, c]));
    return csv([
      ['child_id', 'student_id', 'first_name', 'last_name', 'class', 'date', 'game', 'protocol', 'score', 'avg_target', 'attention', 'pct_on_target', 'stars', 'duration_sec', ...BANDS.map((b) => `${b}_pct`)],
      ...activities.map((a) => {
        const c = byId[a.childId] ?? {};
        return [a.childId, c.studentId, c.firstName, c.lastName, c.className, new Date(a.at).toISOString(), a.game, a.protocol, a.score, a.avg, a.att, a.pctAbove, a.stars, a.durationSec, ...(a.bands ?? BANDS.map(() => ''))];
      }),
    ]);
  }

  return async function handle(req, res, pathname = new URL(req.url, 'http://x').pathname) {
    try {
      // Tablets
      if (pathname === '/api/ping' && req.method === 'GET') {
        if (!hasKey(req)) return send(res, 401, { error: 'wrong school key' });
        return send(res, 200, { ok: true, school: config.schoolName });
      }
      if (pathname === '/api/sync' && req.method === 'POST') {
        if (!hasKey(req)) return send(res, 401, { error: 'wrong school key' });
        const accepted = await store.sync(cleanSync(await readJson(req)));
        return send(res, 200, { ok: true, school: config.schoolName, accepted });
      }
      // Dashboard
      if (pathname === '/api/login' && req.method === 'POST') {
        const { password } = await readJson(req);
        if (!same(password ?? '', config.adminPassword)) return send(res, 401, { error: 'Wrong password' });
        return send(res, 200, { ok: true, school: config.schoolName }, {
          'set-cookie': `em_session=${newToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure(req)}`,
        });
      }
      if (pathname === '/api/logout' && req.method === 'POST') {
        return send(res, 200, { ok: true }, { 'set-cookie': `em_session=; Path=/; Max-Age=0${secure(req)}` });
      }
      if (pathname.startsWith('/api/')) {
        if (!isAdmin(req)) return send(res, 401, { error: 'Sign in first' });
        if (pathname === '/api/data') return send(res, 200, { school: config.schoolName, ...(await store.allData()), now: Date.now() });
        const del = pathname.match(/^\/api\/children\/([^/]+)$/);
        if (del && req.method === 'DELETE') {
          await store.deleteChild(decodeURIComponent(del[1]));
          return send(res, 200, { ok: true });
        }
        if (pathname === '/api/export/activities.csv')
          return send(res, 200, await exportActivities(), { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="excellent-mind-activities.csv"' });
        return send(res, 404, { error: 'Not found' });
      }
      if (req.method === 'GET' && serveStatic) return serveStatic(req, res);
      send(res, 404, 'Not found');
    } catch (e) {
      send(res, 400, { error: String(e?.message ?? e) });
    }
  };
}
