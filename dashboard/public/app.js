// Excellent Mind school dashboard (no build step, no dependencies).
'use strict';

const COLORS = ['#6C47FF', '#0BA59A', '#FF9F1C', '#F2456B', '#3E8EF7', '#B04FD8', '#1FAE5B', '#E0679A', '#2D9CDB', '#EB5757'];
// Brainwave families built from the eight ThinkGear bands.
const BANDS = [
  ['delta', [0], '#7C83FF', 'δ Delta'],
  ['theta', [1], '#B48BFF', 'θ Theta'],
  ['alpha', [2, 3], '#0BA59A', 'α Alpha'],
  ['beta', [4, 5], '#FF9F1C', 'β Beta'],
  ['gamma', [6, 7], '#F2456B', 'γ Gamma'],
];
const KEYS = ['focus', 'tbr', 'delta', 'theta', 'alpha', 'beta', 'gamma'];
const GAME = { runner: 'Rail Rush', glider: 'Sky Glider', rocket: 'Rocket Climb', kart: 'Turbo Kart', hoops: 'Hoop Shot', blaster: 'Star Blaster', reef: 'Reef Friends', garden: 'Magic Garden', video: 'Video' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const colorOf = (id) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

/* ---------------- metrics (same rules as the app) ---------------- */

const mean = (xs) => {
  const v = xs.filter((x) => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const round = (k, v) => (v == null ? null : k === 'tbr' ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10);

function activityMetrics(a) {
  const m = { focus: a.att ?? (a.protocol === 'focus' ? a.avg : null), tbr: null, delta: null, theta: null, alpha: null, beta: null, gamma: null };
  if (Array.isArray(a.bands) && a.bands.length === 8) {
    for (const [k, idx] of BANDS) m[k] = idx.reduce((s, i) => s + a.bands[i], 0);
    if (m.beta > 0) m.tbr = m.theta / m.beta;
  }
  return m;
}

/** First activities vs latest (windows never overlap). Rounds with no usable signal are skipped. */
function summarize(acts) {
  const all = [...acts].sort((a, b) => a.at - b.at);
  const chrono = all.filter((a) => (a.durationSec ?? 0) >= 5);
  const series = chrono.map(activityMetrics);
  const n = Math.max(1, Math.min(3, Math.floor(chrono.length / 2)));
  const pick = (end) => {
    const o = {};
    for (const k of KEYS) {
      const vals = series.map((s) => s[k]).filter((x) => x != null);
      o[k] = round(k, mean(end ? vals.slice(-n) : vals.slice(0, n)));
    }
    return o;
  };
  return {
    count: chrono.length,
    minutes: Math.round(all.reduce((s, a) => s + (a.durationSec ?? 0), 0) / 60),
    onTarget: chrono.length ? Math.round(mean(chrono.map((a) => a.pctAbove)) ?? 0) : null,
    lastAt: all.length ? all[all.length - 1].at : null,
    hasTrend: chrono.length >= 2,
    hasBands: series.some((m) => m.delta != null),
    first: pick(false),
    latest: pick(true),
    series,
    acts: chrono,
  };
}

const better = (k, d) => {
  if (Math.abs(d) < (k === 'tbr' ? 0.05 : 1)) return null;
  if (k === 'focus') return d > 0;
  if (k === 'tbr') return d < 0;
  return null;
};
const changeOf = (s, k) => (s.hasTrend && s.first[k] != null && s.latest[k] != null ? s.latest[k] - s.first[k] : null);
const tone = (k, d) => (d == null ? 'flat' : better(k, d) === true ? 'up' : better(k, d) === false ? 'down' : 'flat');
const toneColor = (t) => (t === 'up' ? 'var(--good)' : t === 'down' ? 'var(--coral)' : '#a7a2bd');
const fmt = (k, v) => (v == null ? '–' : k === 'tbr' ? v.toFixed(2) : k === 'focus' ? String(Math.round(v)) : `${v.toFixed(1)}%`);
const delta = (k, d) => {
  if (d == null) return '';
  const txt = k === 'tbr' ? Math.abs(d).toFixed(2) : k === 'focus' ? String(Math.abs(Math.round(d))) : Math.abs(d).toFixed(1);
  return `<span class="${tone(k, d)}">${Number(txt) === 0 ? '=' : d > 0 ? '▲' : '▼'} ${txt}</span>`;
};
const ageOf = (iso) => {
  const b = new Date(iso);
  if (!iso || Number.isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
};
const ago = (ms) => {
  if (!ms) return 'never';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};
const dateStr = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------------- charts (inline SVG) ---------------- */

/** Grouped bars: each brainwave band, first (light) vs latest (solid). */
function bandBars(first, latest, { width = 340, height = 150 } = {}) {
  const top = 14, bottom = 30, h = height - top - bottom;
  const max = Math.max(20, ...BANDS.flatMap(([k]) => [first[k] ?? 0, latest[k] ?? 0])) * 1.1;
  const slot = width / BANDS.length;
  const bw = Math.min(22, slot * 0.3);
  let out = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Brainwave bands, first vs latest">`;
  out += `<line x1="0" x2="${width}" y1="${top + h}" y2="${top + h}" stroke="#DED8F2"/>`;
  BANDS.forEach(([k, , c, label], i) => {
    const cx = slot * i + slot / 2;
    const fh = ((first[k] ?? 0) / max) * h;
    const l = latest[k] ?? 0;
    const lh = (l / max) * h;
    out += `<rect x="${cx - bw - 2}" y="${top + h - fh}" width="${bw}" height="${fh}" rx="4" fill="${c}" opacity="0.38"/>`;
    out += `<rect x="${cx + 2}" y="${top + h - lh}" width="${bw}" height="${lh}" rx="4" fill="${c}"/>`;
    out += `<text x="${cx + 2 + bw / 2}" y="${top + h - lh - 4}" font-size="10" font-weight="800" fill="#1D1838" text-anchor="middle">${Math.round(l)}</text>`;
    out += `<text x="${cx}" y="${height - 10}" font-size="11" fill="#55506F" text-anchor="middle">${label.split(' ')[0]}</text>`;
  });
  return out + '</svg>';
}

/** Line chart; values 0..yMax. */
function lineChart(series, { width = 700, height = 220, yMax = 100, fmtY = (v) => Math.round(v) } = {}) {
  const padL = 40, padB = 22, w = width - padL - 8, h = height - padB - 10;
  const n = Math.max(2, ...series.map((s) => s.values.length));
  const X = (i) => padL + (i / (n - 1)) * w;
  const Y = (v) => 10 + h - (Math.max(0, Math.min(yMax, v)) / yMax) * h;
  let out = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img">`;
  for (const q of [0, 0.5, 1]) {
    const v = q * yMax;
    out += `<line x1="${padL}" x2="${padL + w}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ECE8FB"/><text x="${padL - 6}" y="${Y(v) + 4}" font-size="11" fill="#8D88A5" text-anchor="end">${fmtY(v)}</text>`;
  }
  for (let i = 0; i < n; i += Math.max(1, Math.ceil(n / 12))) out += `<text x="${X(i)}" y="${height - 5}" font-size="10" fill="#8D88A5" text-anchor="middle">${i + 1}</text>`;
  for (const s of series) {
    const pts = s.values.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean);
    if (pts.length > 1) out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) s.values.forEach((v, i) => v != null && (out += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${s.color}"/>`));
  }
  if (!series.some((s) => s.values.some((v) => v != null))) out += `<text x="${padL + w / 2}" y="${10 + h / 2}" font-size="14" fill="#8D88A5" text-anchor="middle">No data yet</text>`;
  return out + '</svg>';
}

/** Small attention trend for the card. */
function sparkline(values, color) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return '<div class="spark-empty">Attention trend appears after 2 activities</div>';
  const W = 300, H = 44;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${H - 4 - (Math.max(0, Math.min(100, x)) / 100) * (H - 8)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ---------------- data ---------------- */

const state = { raw: null, students: [], cls: 'all', q: '', sort: 'name' };

async function api(path, opts) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  if (res.status === 401) throw Object.assign(new Error('auth'), { auth: true });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.json();
}

/**
 * One student per card. Profiles that share a Student ID (the same child on different tablets)
 * are merged, so a school can add tablets without splitting a child's history.
 */
function buildStudents(raw) {
  const byChild = {};
  for (const a of raw.activities) (byChild[a.childId] ??= []).push(a);
  const groups = new Map();
  for (const c of raw.children) {
    const sid = (c.studentId || '').trim().toUpperCase();
    const key = sid ? `sid:${sid}` : `id:${c.id}`;
    const g = groups.get(key) ?? { key, profiles: [], acts: new Map() };
    g.profiles.push(c);
    for (const a of byChild[c.id] ?? []) g.acts.set(a.id, a);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => {
    const p = [...g.profiles].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
    return {
      key: g.key,
      ids: g.profiles.map((x) => x.id),
      deviceIds: [...new Set(g.profiles.map((x) => x.deviceId))],
      name: `${p.firstName} ${p.lastName}`.trim() || 'Unnamed',
      className: p.className,
      studentId: p.studentId,
      birthday: p.birthday,
      color: colorOf(g.key),
      s: summarize([...g.acts.values()]),
    };
  });
}

async function load() {
  try {
    state.raw = await api('/api/data');
  } catch (e) {
    if (e.auth) return showLogin();
    throw e;
  }
  state.students = buildStudents(state.raw);
  $('login').hidden = true;
  $('app').hidden = false;
  render();
}

function showLogin() {
  $('app').hidden = true;
  $('login').hidden = false;
  $('password').focus();
}

/* ---------------- rendering ---------------- */

function visible() {
  const q = state.q.trim().toLowerCase();
  const list = state.students.filter(
    (r) => (state.cls === 'all' || (r.className || '—') === state.cls) && (!q || r.name.toLowerCase().includes(q) || (r.studentId || '').toLowerCase().includes(q)),
  );
  const ch = (r) => changeOf(r.s, 'focus');
  const bySort = {
    name: (a, b) => a.name.localeCompare(b.name),
    improved: (a, b) => (ch(b) ?? -1e9) - (ch(a) ?? -1e9),
    needs: (a, b) => (ch(a) ?? 1e9) - (ch(b) ?? 1e9),
    recent: (a, b) => (b.s.lastAt ?? 0) - (a.s.lastAt ?? 0),
  };
  return list.sort(bySort[state.sort]);
}

function render() {
  const d = state.raw;
  $('school-name').textContent = d.school;
  $('last-sync').textContent = `Last tablet sync: ${ago(Math.max(0, ...d.devices.map((x) => x.lastSync ?? 0)))}`;

  const classes = [...new Set(state.students.map((r) => r.className || '—'))].sort();
  const sel = $('class-filter');
  sel.innerHTML = `<option value="all">All classes</option>${classes.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}`;
  sel.value = classes.includes(state.cls) ? state.cls : 'all';
  state.cls = sel.value;

  const rows = visible();
  renderTiles(rows);
  $('students').innerHTML = rows.length ? rows.map(card).join('') : '<p class="empty">No students yet. They appear here once a tablet syncs.</p>';
  renderDevices();
}

function renderTiles(rows) {
  const trending = rows.filter((r) => r.s.hasTrend);
  const ds = trending.map((r) => changeOf(r.s, 'focus')).filter((x) => x != null);
  const avg = mean(ds);
  const improving = ds.filter((x) => better('focus', x) === true).length;
  const week = rows.filter((r) => r.s.lastAt && Date.now() - r.s.lastAt < 7 * 86400000).length;
  const acts = rows.reduce((s, r) => s + r.s.count, 0);
  const tiles = [
    [String(rows.length), 'Students'],
    [String(week), 'Active in the last 7 days'],
    [String(acts), 'Activities played'],
    [avg == null ? '–' : `${avg > 0 ? '+' : ''}${Math.round(avg)}`, 'Average attention change', toneColor(tone('focus', avg))],
    [`${improving}/${trending.length}`, 'Improving in attention', 'var(--good)'],
  ];
  $('tiles').innerHTML = tiles.map(([v, l, c]) => `<div class="tile"><b style="color:${c ?? 'var(--text)'}">${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
}

function card(r) {
  const s = r.s;
  const meta = [r.className ? `Class ${r.className}` : '', r.studentId ? `ID ${r.studentId}` : '', ageOf(r.birthday) != null ? `${ageOf(r.birthday)} yrs` : ''].filter(Boolean).join(' · ');
  const body = !s.count
    ? '<p class="empty">Not played yet.</p>'
    : `<div class="sub"><span>Brainwaves</span><span class="muted small">θ/β ${fmt('tbr', s.first.tbr)} → <b>${fmt('tbr', s.latest.tbr)}</b> ${delta('tbr', changeOf(s, 'tbr'))}</span></div>
       ${s.hasBands ? bandBars(s.first, s.latest) : '<p class="empty small">No brainwave data in these rounds.</p>'}
       <div class="sub"><span>Attention per activity</span></div>
       ${sparkline(s.series.map((m) => m.focus).slice(-20), r.color)}`;
  return `<article class="card student" data-key="${esc(r.key)}" tabindex="0">
    <header>
      <span class="avatar" style="background:${r.color}">${esc(r.name[0] ?? '?')}</span>
      <div class="who-text"><b>${esc(r.name)}</b><small class="muted">${esc(meta || 'No class set')}</small></div>
      <div class="att"><b>${fmt('focus', s.latest.focus)}</b><small>Attention ${delta('focus', changeOf(s, 'focus'))}</small></div>
    </header>
    ${body}
    <footer class="muted small">${s.count} ${s.count === 1 ? "activity" : "activities"} · ${s.minutes} min · ${s.onTarget == null ? '–' : `${s.onTarget}% on target`} · last active ${esc(ago(s.lastAt))}</footer>
  </article>`;
}

function renderDevices() {
  const d = state.raw;
  const kids = (id) => d.children.filter((c) => c.deviceId === id).length;
  $('tablet-count').textContent = `${d.devices.length} tablet${d.devices.length === 1 ? '' : 's'} syncing`;
  $('devices').innerHTML = d.devices.length
    ? `<thead><tr><th>Tablet</th><th>Students</th><th>Last sync</th><th>First seen</th></tr></thead><tbody>${d.devices
        .map((x) => `<tr><td><b>${esc(x.name)}</b></td><td>${kids(x.id)}</td><td>${esc(ago(x.lastSync))}</td><td>${x.firstSeen ? esc(dateStr(x.firstSeen)) : '–'}</td></tr>`)
        .join('')}</tbody>`
    : '<tbody><tr><td class="empty">No tablet has synced yet. See "Add a tablet" in the README.</td></tr></tbody>';
}

function openStudent(key) {
  const r = state.students.find((x) => x.key === key);
  if (!r) return;
  const s = r.s;
  const bandSeries = BANDS.map(([k, , c]) => ({ color: c, values: s.series.map((m) => m[k]).slice(-30) }));
  const peak = Math.max(20, ...bandSeries.flatMap((x) => x.values.filter((v) => v != null)));
  const history = [...s.acts]
    .reverse()
    .slice(0, 60)
    .map((a) => {
      const m = activityMetrics(a);
      return `<tr><td>${esc(dateStr(a.at))}</td><td>${esc(GAME[a.game] ?? a.game)}</td><td>${a.score ?? '–'}</td><td>${a.pctAbove ?? '–'}%</td><td>${fmt('focus', m.focus)}</td><td>${fmt('tbr', m.tbr)}</td><td>${'★'.repeat(a.stars ?? 0) || '–'}</td></tr>`;
    })
    .join('');
  const tablets = r.deviceIds.map((id) => state.raw.devices.find((x) => x.id === id)?.name ?? '–').join(', ');
  $('drawer-body').innerHTML = `
    <div class="who"><span class="avatar big" style="background:${r.color}">${esc(r.name[0] ?? '?')}</span>
      <div><h1 style="margin:0">${esc(r.name)}</h1><p class="muted">${esc(
        [r.className ? `Class ${r.className}` : '', r.studentId ? `ID ${r.studentId}` : '', ageOf(r.birthday) != null ? `${ageOf(r.birthday)} yrs` : '', `tablet: ${tablets}`].filter(Boolean).join(' · '),
      )}</p></div></div>
    <div class="mini-tiles">
      <div class="tile"><b>${fmt('focus', s.latest.focus)}</b><span>Attention now ${delta('focus', changeOf(s, 'focus'))}</span></div>
      <div class="tile"><b>${fmt('tbr', s.latest.tbr)}</b><span>Theta/Beta ${delta('tbr', changeOf(s, 'tbr'))}</span></div>
      <div class="tile"><b>${s.onTarget ?? '–'}${s.onTarget == null ? '' : '%'}</b><span>Time on target</span></div>
      <div class="tile"><b>${s.count}</b><span>Activities · ${s.minutes} min</span></div>
    </div>
    <article class="card"><h2>Brainwave bands, first vs latest</h2>${s.hasBands ? bandBars(s.first, s.latest, { width: 640, height: 200 }) : '<p class="empty">No brainwave data yet.</p>'}</article>
    <article class="card"><div class="row-between"><h2>Brainwave bands per activity</h2><div class="legend">${BANDS.map(([, , c, l]) => `<span><i class="dot" style="background:${c}"></i>${l}</span>`).join('')}</div></div>
      ${lineChart(bandSeries, { width: 700, height: 230, yMax: Math.ceil(peak / 10) * 10, fmtY: (v) => `${Math.round(v)}%` })}</article>
    <article class="card"><h2>Attention per activity</h2>${lineChart([{ color: r.color, values: s.series.map((m) => m.focus).slice(-30), dots: true }], { width: 700, height: 200 })}</article>
    <article class="card"><h2>Activity history</h2><div class="table-wrap"><table class="history"><thead><tr><th>Date</th><th>Game</th><th>Score</th><th>On target</th><th>Attention</th><th>θ/β</th><th>Stars</th></tr></thead><tbody>${history || '<tr><td class="empty">No activities yet.</td></tr>'}</tbody></table></div></article>
    <div class="row-end"><button class="btn danger" id="remove-child">Remove from dashboard</button></div>`;
  $('drawer').hidden = false;
  $('remove-child').onclick = async () => {
    if (!confirm(`Remove ${r.name} and all ${s.count} synced activities from the dashboard? The tablet keeps its own copy and would send it again if it syncs this student later.`)) return;
    for (const id of r.ids) await api(`/api/children/${encodeURIComponent(id)}`, { method: 'DELETE' });
    $('drawer').hidden = true;
    load();
  };
}

/* ---------------- events ---------------- */

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-error').hidden = true;
  try {
    await api('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) });
    $('password').value = '';
    await load();
  } catch (err) {
    $('login-error').textContent = err.auth ? 'Wrong password.' : String(err.message);
    $('login-error').hidden = false;
  }
});
$('logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});
$('refresh').addEventListener('click', () => load());
$('class-filter').addEventListener('change', (e) => ((state.cls = e.target.value), render()));
$('sort').addEventListener('change', (e) => ((state.sort = e.target.value), render()));
$('search').addEventListener('input', (e) => ((state.q = e.target.value), render()));
$('students').addEventListener('click', (e) => {
  const key = e.target.closest('.student')?.dataset.key;
  if (key) openStudent(key);
});
$('students').addEventListener('keydown', (e) => {
  const key = e.target.closest('.student')?.dataset.key;
  if (key && (e.key === 'Enter' || e.key === ' ')) (e.preventDefault(), openStudent(key));
});
$('drawer-close').addEventListener('click', () => ($('drawer').hidden = true));
$('drawer').addEventListener('click', (e) => e.target === $('drawer') && ($('drawer').hidden = true));
document.addEventListener('keydown', (e) => e.key === 'Escape' && ($('drawer').hidden = true));

// Pick up new tablet syncs every 30 s while the page is open (not while a student is open).
setInterval(() => !$('app').hidden && !document.hidden && $('drawer').hidden && load().catch(() => {}), 30000);
load().catch((e) => console.error(e));
