// Storage for the online (Vercel) dashboard: Postgres over HTTP with Neon's serverless driver.
import { neon } from '@neondatabase/serverless';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS devices (
     id TEXT PRIMARY KEY, name TEXT, last_sync BIGINT, first_seen BIGINT)`,
  `CREATE TABLE IF NOT EXISTS children (
     id TEXT PRIMARY KEY, device_id TEXT, first_name TEXT, last_name TEXT, birthday TEXT,
     gender TEXT, student_id TEXT, class_name TEXT, updated_at BIGINT)`,
  `CREATE TABLE IF NOT EXISTS activities (
     id TEXT PRIMARY KEY, child_id TEXT NOT NULL, at BIGINT, game TEXT, protocol TEXT,
     score INTEGER, avg INTEGER, att INTEGER, med INTEGER, pct_above INTEGER, stars INTEGER,
     duration_sec INTEGER, bands TEXT, received_at BIGINT)`,
  `CREATE INDEX IF NOT EXISTS activities_child ON activities(child_id, at)`,
];

/** Builds one multi-row INSERT: VALUES ($1,$2,...), ($n,...). */
function multiInsert(head, rows, tail) {
  const params = [];
  const values = rows.map((r) => `(${r.map((v) => (params.push(v), `$${params.length}`)).join(',')})`);
  return { text: `${head} VALUES ${values.join(',')} ${tail}`, params };
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export function postgresStore(url) {
  const sql = neon(url);
  let ready;
  const init = () => (ready ??= sql.transaction(SCHEMA.map((q) => sql.query(q))).catch((e) => ((ready = undefined), Promise.reject(e))));

  return {
    async sync({ device, children, activities }) {
      await init();
      const now = Date.now();
      const queries = [
        sql.query(
          `INSERT INTO devices (id, name, last_sync, first_seen) VALUES ($1, $2, $3, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, last_sync = EXCLUDED.last_sync`,
          [device.id, device.name, now],
        ),
      ];
      for (const part of chunks(children, 500)) {
        const q = multiInsert(
          'INSERT INTO children (id, device_id, first_name, last_name, birthday, gender, student_id, class_name, updated_at)',
          part.map((c) => [c.id, c.deviceId, c.firstName, c.lastName, c.birthday, c.gender, c.studentId, c.className, now]),
          `ON CONFLICT (id) DO UPDATE SET device_id = EXCLUDED.device_id, first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name, birthday = EXCLUDED.birthday, gender = EXCLUDED.gender,
             student_id = EXCLUDED.student_id, class_name = EXCLUDED.class_name, updated_at = EXCLUDED.updated_at`,
        );
        queries.push(sql.query(q.text, q.params));
      }
      const firstActivityQuery = queries.length;
      for (const part of chunks(activities, 1000)) {
        const q = multiInsert(
          'INSERT INTO activities (id, child_id, at, game, protocol, score, avg, att, med, pct_above, stars, duration_sec, bands, received_at)',
          part.map((a) => [a.id, a.childId, a.at, a.game, a.protocol, a.score, a.avg, a.att, a.med, a.pctAbove, a.stars, a.durationSec, a.bands, now]),
          'ON CONFLICT (id) DO NOTHING RETURNING id',
        );
        queries.push(sql.query(q.text, q.params));
      }
      const results = await sql.transaction(queries);
      return results.slice(firstActivityQuery).reduce((n, rows) => n + rows.length, 0);
    },

    async allData() {
      await init();
      const [devices, children, activities] = await sql.transaction([
        sql.query('SELECT id, name, last_sync::float8 AS "lastSync", first_seen::float8 AS "firstSeen" FROM devices ORDER BY last_sync DESC'),
        sql.query(
          `SELECT id, device_id AS "deviceId", first_name AS "firstName", last_name AS "lastName", birthday, gender,
                  student_id AS "studentId", class_name AS "className", updated_at::float8 AS "updatedAt" FROM children`,
        ),
        sql.query(
          `SELECT id, child_id AS "childId", at::float8 AS at, game, protocol, score, avg, att, med, pct_above AS "pctAbove",
                  stars, duration_sec AS "durationSec", bands FROM activities ORDER BY at`,
        ),
      ], { readOnly: true });
      return { devices, children, activities: activities.map((a) => ({ ...a, bands: a.bands ? JSON.parse(a.bands) : null })) };
    },

    async deleteChild(id) {
      await init();
      await sql.transaction([
        sql.query('DELETE FROM activities WHERE child_id = $1', [id]),
        sql.query('DELETE FROM children WHERE id = $1', [id]),
      ]);
    },
  };
}
