#!/usr/bin/env node
// Private Insta v1.3 — reels uploader. Pushes finished reel videos (+ a poster jpg made with ffmpeg) from a local folder
// into the LIVE server's import folder through the admin API, then asks the server to import them.
// The server also auto-imports every few minutes, so this only has to deliver files. Safe to re-run (skips files already there).
//   IG_BASE=https://instaglass-live.sites.tab.bot IG_ADMIN_USER=.. IG_ADMIN_PASS=.. node tools/push-reels.mjs <ready-dir> [--once]
// Watches <ready-dir> (NNNN.mp4 + manifest.json [+ progress.json]) until the producer (pipeline.py) stops and nothing new arrives.
import fs from 'node:fs'; import path from 'node:path'; import { execFile, execSync } from 'node:child_process';
const SRC = path.resolve(process.argv[2] || '.'); const ONCE = process.argv.includes('--once');
const BASE = (process.env.IG_BASE || 'https://instaglass-live.sites.tab.bot').replace(/\/$/, '');
const USER = process.env.IG_ADMIN_USER, PASS = process.env.IG_ADMIN_PASS;
const POSTERS = process.env.POSTER_DIR || path.join(SRC, '..', 'posters'); fs.mkdirSync(POSTERS, { recursive: true });
const STATUS = process.env.STATUS_FILE || path.join(SRC, '..', 'push-status.json');
const CONC = 4, RE = /^\d{4,6}\.mp4$/;
let cookie = '', unlockedAt = 0;
const st = { started: new Date().toISOString(), uploaded: 0, posters: 0, skipped: 0, failed: 0, errors: [], passes: 0, imported: null, pending: null, lastPass: null, done: false };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const saveStatus = () => { try { fs.writeFileSync(STATUS + '.tmp', JSON.stringify(st, null, 1)); fs.renameSync(STATUS + '.tmp', STATUS); } catch (e) {} };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(method, p, body, headers = {}, raw = false) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const h = Object.assign({ 'X-IG': '1', 'User-Agent': 'PrivateInsta-ReelPusher/1.3' }, headers); if (cookie) h.Cookie = cookie;
      if (body !== undefined && !raw) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
      const r = await fetch(BASE + p, { method, headers: h, body, signal: AbortSignal.timeout(120000) });
      const sc = r.headers.get('set-cookie'); if (sc && sc.startsWith('ig_sid=')) cookie = sc.split(';')[0];
      const ct = r.headers.get('content-type') || ''; const data = ct.includes('json') ? await r.json() : await r.text();
      if (r.status >= 500 || r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      return { status: r.status, data };
    } catch (e) { if (attempt === 3) return { status: 0, data: { error: String(e.message || e) } }; await sleep(2000 * (attempt + 1)); }
  }
  return { status: 0, data: { error: 'retries exhausted' } };
}
async function ensureAdmin(force) {
  if (!force && Date.now() - unlockedAt < 20 * 60e3) return;
  let r = await api('POST', '/api/login', { username: USER, password: PASS }); if (r.status !== 200) throw new Error('login ' + r.status);
  r = await api('POST', '/api/admin/unlock', { password: PASS }); if (r.status !== 200) throw new Error('unlock ' + r.status);
  unlockedAt = Date.now();
}
async function adminCall(method, p, body, headers, raw) {
  await ensureAdmin(); let r = await api(method, p, body, headers, raw);
  if (r.status === 401 || (r.status === 403 && /locked|unlock/i.test(JSON.stringify(r.data)))) { await ensureAdmin(true); r = await api(method, p, body, headers, raw); }
  return r;
}
function metaMap() {
  const m = new Map();
  try { for (const e of JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))) if (e && e.file) m.set(e.file, e); } catch (e) {}
  try { const pj = JSON.parse(fs.readFileSync(path.join(SRC, 'progress.json'), 'utf8')); for (const e of Object.values(pj.done || {})) if (e && e.file && !m.has(e.file)) m.set(e.file, e); } catch (e) {}
  return m;
}
function poster(file) {
  const out = path.join(POSTERS, file.replace(/\.mp4$/, '.jpg'));
  if (fs.existsSync(out) && fs.statSync(out).size > 500) return Promise.resolve(out);
  return new Promise((res) => execFile('timeout', ['-k', '5', '60', 'ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', '1', '-i', path.join(SRC, file), '-frames:v', '1', '-vf', 'scale=360:640', '-q:v', '6', '-threads', '1', out],
    (err) => res(!err && fs.existsSync(out) && fs.statSync(out).size > 500 ? out : null)));
}
const producerAlive = () => { try { execSync('pgrep -f reel-import/pipeline.py', { stdio: 'ignore' }); return true; } catch (e) { return false; } };
async function pass() {
  const inbox = await adminCall('GET', '/api/admin/reels/inbox'); if (inbox.status !== 200) throw new Error('inbox ' + inbox.status);
  const have = inbox.data.files || {}; const meta = metaMap();
  const files = fs.readdirSync(SRC).filter(f => RE.test(f)).sort();
  const todo = [];
  for (const f of files) {
    let size; try { size = fs.statSync(path.join(SRC, f)).size; } catch (e) { continue; }
    if (have[f] === size) continue;
    const m = meta.get(f); const age = Date.now() - fs.statSync(path.join(SRC, f)).mtimeMs;
    if (!m && age < 10 * 60e3) continue; // wait for its caption in the manifest (max 10 min)
    todo.push({ f, size, m, jpg: have[f.replace(/\.mp4$/, '.jpg')] });
  }
  let i = 0, n = 0;
  async function worker() {
    while (i < todo.length) {
      const t = todo[i++];
      try {
        if (!t.jpg) { const pj = await poster(t.f); if (pj) { const r = await adminCall('PUT', '/api/admin/reels/inbox/' + path.basename(pj), fs.readFileSync(pj), { 'Content-Type': 'image/jpeg' }, true); if (r.status === 201 || r.status === 200) st.posters++; } }
        const hm = t.m ? { 'x-reel-meta': Buffer.from(JSON.stringify({ title: t.m.title, duration: t.m.duration, source_name: t.m.source_name })).toString('base64') } : {};
        const r = await adminCall('PUT', '/api/admin/reels/inbox/' + t.f, fs.readFileSync(path.join(SRC, t.f)), Object.assign({ 'Content-Type': 'video/mp4' }, hm), true);
        if (r.status === 201) { st.uploaded++; n++; } else if (r.status === 200) st.skipped++; else { st.failed++; st.errors = st.errors.concat([t.f + ': ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 120)]).slice(-20); }
        if (n && n % 50 === 0) { log('uploaded', st.uploaded); saveStatus(); }
        if (n && n % 100 === 0) { const r = await adminCall('POST', '/api/admin/reels/import?limit=500', {}); if (r.status === 200) { st.imported = r.data.total; st.pending = r.data.pending; log('imported on server', st.imported); } }
      } catch (e) { st.failed++; st.errors = st.errors.concat([t.f + ': ' + e.message]).slice(-20); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  // ask the server to import what arrived (it also does this by itself every few minutes)
  for (let k = 0; k < 20; k++) { const r = await adminCall('POST', '/api/admin/reels/import?limit=500', {}); if (r.status !== 200) { if (r.status !== 409) log('import', r.status, JSON.stringify(r.data).slice(0, 200)); break; } st.imported = r.data.total; st.pending = r.data.pending; if (!r.data.imported || !r.data.pending) break; }
  st.passes++; st.lastPass = new Date().toISOString(); saveStatus();
  log('pass', st.passes, 'new uploads', n, 'total uploaded', st.uploaded, 'imported on server', st.imported, 'pending', st.pending, 'local files', files.length);
  return n;
}
(async () => {
  if (!USER || !PASS) { console.error('set IG_ADMIN_USER / IG_ADMIN_PASS'); process.exit(1); }
  log('reel pusher ->', BASE, 'from', SRC);
  let quiet = 0;
  for (;;) {
    let n = 0; try { n = await pass(); } catch (e) { log('pass error', e.message); st.errors = st.errors.concat(['pass: ' + e.message]).slice(-20); saveStatus(); }
    if (ONCE) break;
    const alive = producerAlive(); quiet = (n === 0 && !alive) ? quiet + 1 : 0;
    if (quiet >= 3) break;   // producer finished and 3 passes found nothing new (files waiting for a caption get uploaded within 10 min)
    await sleep(alive ? 60e3 : 4 * 60e3);
  }
  st.done = true; saveStatus(); log('done', JSON.stringify({ uploaded: st.uploaded, imported: st.imported, failed: st.failed }));
})();
