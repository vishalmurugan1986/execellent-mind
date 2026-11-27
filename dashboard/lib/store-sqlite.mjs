// Storage for the school-PC server: one SQLite file, built into Node 22.13+ (no npm packages).
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function sqliteStore(dataDir) {
  const db = new DatabaseSync(join(dataDir, 'dashboard.db'));
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

  return {
    async sync({ device, children, activities }) {
      const now = Date.now();
      let accepted = 0;
      db.exec('BEGIN');
      try {
        upDevice.run(device.id, device.name, now, now);
        for (const c of children) upChild.run(c.id, c.deviceId, c.firstName, c.lastName, c.birthday, c.gender, c.studentId, c.className, now);
        for (const a of activities) {
          const r = upActivity.run(a.id, a.childId, a.at, a.game, a.protocol, a.score, a.avg, a.att, a.med, a.pctAbove, a.stars, a.durationSec, a.bands, now);
          accepted += Number(r.changes);
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return accepted;
    },

    async allData() {
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
      return { devices, children, activities };
    },

    async deleteChild(id) {
      db.prepare('DELETE FROM activities WHERE child_id = ?').run(id);
      db.prepare('DELETE FROM children WHERE id = ?').run(id);
    },

    /** Removes a tablet from the list, only when no student belongs to it. */
    async deleteDevice(id) {
      const r = db.prepare('DELETE FROM devices WHERE id = ? AND NOT EXISTS (SELECT 1 FROM children WHERE device_id = ?)').run(id, id);
      return Number(r.changes) > 0;
    },
  };
}
