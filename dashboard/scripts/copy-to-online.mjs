// Copies every result from the school PC's dashboard (data/dashboard.db) to the online dashboard,
// using the same /api/sync the tablets use. Safe to run more than once: results already online are
// skipped.
//
//   node scripts/copy-to-online.mjs https://excellent-mind.vercel.app <school key of the online dashboard>
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const [url, key] = process.argv.slice(2);
if (!url || !key) {
  console.log('Usage: node scripts/copy-to-online.mjs <online dashboard address> <school key>');
  process.exit(1);
}
const dbPath = join(process.env.DATA_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data'), 'dashboard.db');
if (!existsSync(dbPath)) {
  console.log(`No school-PC data found at ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const devices = db.prepare('SELECT id, name FROM devices').all();
const children = db.prepare('SELECT * FROM children').all();
const activities = db.prepare('SELECT * FROM activities ORDER BY at').all();

const byChild = {};
for (const a of activities) (byChild[a.child_id] ??= []).push(a);
const byDevice = {};
for (const c of children) (byDevice[c.device_id] ??= []).push(c);

const base = url.replace(/\/+$/, '');
let total = 0;
for (const [deviceId, list] of Object.entries(byDevice)) {
  const device = { id: deviceId, name: devices.find((d) => d.id === deviceId)?.name ?? 'Tablet' };
  const body = {
    device,
    children: list.map((c) => ({
      id: c.id, firstName: c.first_name, lastName: c.last_name, birthday: c.birthday, gender: c.gender,
      studentId: c.student_id, className: c.class_name,
      activities: (byChild[c.id] ?? []).map((a) => ({
        id: a.id, at: a.at, game: a.game, protocol: a.protocol, score: a.score, avg: a.avg, att: a.att, med: a.med,
        pctAbove: a.pct_above, stars: a.stars, durationSec: a.duration_sec, bands: a.bands ? JSON.parse(a.bands) : null,
      })),
    })),
  };
  const res = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-school-key': key },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(`${device.name}: failed (${json.error ?? `HTTP ${res.status}`})`);
    process.exit(1);
  }
  total += json.accepted;
  console.log(`${device.name}: ${list.length} children, ${json.accepted} new results copied`);
}
console.log(`Done: ${total} results copied to ${base}`);
