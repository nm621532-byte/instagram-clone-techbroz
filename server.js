// InstaGlass — a liquid-glass Instagram-style social app (educational project by Tech Bro Z).
// Not affiliated with Instagram or Meta. Zero dependencies: only Node.js built-ins (Node 18+).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUBLIC_DIR = path.join(__dirname, 'public');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STORY_TTL = 24 * 3600 * 1000;
const MAX_BODY = 24 * 1024 * 1024;           // JSON body (base64 media inside)
const MAX_IMAGE = 8 * 1024 * 1024;           // decoded image bytes
const MAX_VIDEO = 15 * 1024 * 1024;          // decoded video bytes
fs.mkdirSync(MEDIA_DIR, { recursive: true });

// ---------------------------------------------------------------- database (JSON file)
let db = { users: {}, sessions: {}, follows: {}, posts: {}, comments: {}, stories: {}, messages: {}, notifs: {}, media: {} };
if (fs.existsSync(DB_FILE)) {
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { console.error('db read failed', e.message); }
}
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
}
function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); } }
process.on('SIGTERM', () => { flushSave(); process.exit(0); });
process.on('SIGINT', () => { flushSave(); process.exit(0); });

const id = (n = 12) => crypto.randomBytes(n).toString('hex');
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------- helpers
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function checkPassword(user, pw) {
  const h = Buffer.from(hashPassword(pw, user.salt), 'hex');
  const s = Buffer.from(user.pass, 'hex');
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max); }
function userByName(name) { name = String(name || '').toLowerCase(); return Object.values(db.users).find(u => u.username === name) || null; }
function following(uid) { return db.follows[uid] || (db.follows[uid] = []); }
function followers(uid) { return Object.keys(db.follows).filter(k => (db.follows[k] || []).includes(uid)); }
function convKey(a, b) { return [a, b].sort().join(':'); }

function mediaUrl(file) { return file ? '/media/' + file : null; }
function publicUser(u, me) {
  if (!u) return null;
  const o = { id: u.id, username: u.username, name: u.name, avatar: mediaUrl(u.avatar), verified: !!u.verified };
  if (me) {
    o.hasStory = activeStories(u.id).length > 0;
    o.storySeen = o.hasStory && activeStories(u.id).every(s => s.seen.includes(me.id));
  }
  return o;
}
function activeStories(uid) { const t = now(); return Object.values(db.stories).filter(s => s.uid === uid && t - s.created < STORY_TTL).sort((a, b) => a.created - b.created); }
function postView(p, me) {
  return {
    id: p.id, type: p.type, media: mediaUrl(p.media), caption: p.caption, created: p.created,
    user: publicUser(db.users[p.uid], me),
    likes: p.likes.length, liked: p.likes.includes(me.id), saved: p.saves.includes(me.id),
    comments: Object.values(db.comments).filter(c => c.pid === p.id).length,
    preview: Object.values(db.comments).filter(c => c.pid === p.id).sort((a, b) => b.created - a.created).slice(0, 2).reverse()
      .map(c => ({ id: c.id, text: c.text, user: { username: db.users[c.uid] ? db.users[c.uid].username : 'deleted' } })),
    mine: p.uid === me.id,
  };
}
function messageView(m, me) {
  const o = { id: m.id, from: db.users[m.from] ? db.users[m.from].username : '?', mine: m.from === me.id, kind: m.kind, text: m.text || '', created: m.created, seen: !!m.seen };
  if (m.kind === 'image') o.media = mediaUrl(m.media);
  if (m.kind === 'post') { const p = db.posts[m.postId]; o.post = p ? { id: p.id, media: mediaUrl(p.media), type: p.type, caption: p.caption.slice(0, 80), user: publicUser(db.users[p.uid]) } : null; }
  return o;
}
function notify(to, from, type, extra) {
  if (to === from) return;
  const n = Object.assign({ id: id(), to, from, type, created: now(), read: false }, extra || {});
  db.notifs[n.id] = n; save();
  push(to, { type: 'notif' });
}

// ---------------------------------------------------------------- media validation + storage
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return { ext: 'jpg', kind: 'image', mime: 'image/jpeg' };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return { ext: 'png', kind: 'image', mime: 'image/png' };
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { ext: 'webp', kind: 'image', mime: 'image/webp' };
  if (buf.length > 12 && buf.slice(4, 8).toString() === 'ftyp') return { ext: 'mp4', kind: 'video', mime: 'video/mp4' };
  if (buf.length > 4 && buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return { ext: 'webm', kind: 'video', mime: 'video/webm' };
  return null;
}
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
// Accepts a data URL; returns stored file name. scope: {owner, conv?}. allow: ['image'] or ['image','video']
function storeMedia(dataUrl, owner, allow, conv) {
  if (typeof dataUrl !== 'string') throw httpErr(400, 'Media missing');
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(dataUrl);
  if (!m) throw httpErr(400, 'Media must be a base64 data URL');
  const buf = Buffer.from(m[2], 'base64');
  const t = sniff(buf);
  if (!t || !allow.includes(t.kind)) throw httpErr(415, 'Only ' + allow.join('/') + ' files are allowed (jpg, png, webp' + (allow.includes('video') ? ', mp4, webm' : '') + ')');
  if (t.kind === 'image' && buf.length > MAX_IMAGE) throw httpErr(413, 'Image too large (max 8 MB)');
  if (t.kind === 'video' && buf.length > MAX_VIDEO) throw httpErr(413, 'Video too large (max 15 MB)');
  const file = id(16) + '.' + t.ext;
  fs.writeFileSync(path.join(MEDIA_DIR, file), buf);
  db.media[file] = { owner, conv: conv || null, created: now() };
  return { file, kind: t.kind };
}
function dropMedia(file) {
  if (!file || !db.media[file]) return;
  delete db.media[file];
  fs.rm(path.join(MEDIA_DIR, file), () => {});
}

// ---------------------------------------------------------------- realtime (Server-Sent Events)
const streams = new Map(); // uid -> Set(res)
function push(uid, ev) {
  const set = streams.get(uid); if (!set) return;
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
  for (const res of set) { try { res.write(line); } catch (e) {} }
}
setInterval(() => { for (const set of streams.values()) for (const res of set) { try { res.write(': ping\n\n'); } catch (e) {} } }, 15000).unref();

// ---------------------------------------------------------------- auth / sessions
function parseCookies(req) {
  const out = {}; (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function sessionUser(req) {
  let tok = parseCookies(req).ig_sid;
  const auth = req.headers.authorization || '';
  if (!tok && auth.startsWith('Bearer ')) tok = auth.slice(7);
  if (!tok || tok.length > 200) return null;
  const s = db.sessions[sha(tok)];
  if (!s) return null;
  if (now() - s.created > 30 * 24 * 3600 * 1000) { delete db.sessions[sha(tok)]; save(); return null; }
  return db.users[s.uid] || null;
}
function newSession(res, req, uid) {
  const tok = id(32);
  db.sessions[sha(tok)] = { uid, created: now() }; save();
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || req.headers['cf-visitor'] ? '; Secure' : '';
  res.setHeader('Set-Cookie', `ig_sid=${tok}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secure}`);
  return tok;
}
const attempts = new Map(); // brute-force guard: key -> [count, firstTs]
function tooMany(key, limit, count) { // count=false: only check
  const t = now(); let a = attempts.get(key);
  if (!a || t - a[1] > 10 * 60 * 1000) { a = [0, t]; attempts.set(key, a); }
  if (count !== false) a[0]++;
  return a[0] > limit;
}
function clientIp(req) { return String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress).trim(); }

// ---------------------------------------------------------------- http plumbing
function httpErr(code, msg) { const e = new Error(msg); e.code = code; return e; }
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(httpErr(413, 'Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!size) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(httpErr(400, 'Bad JSON')); } });
    req.on('error', reject);
  });
}
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
};
const STATIC_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.apk': 'application/vnd.android.package-archive' };

function serveFile(req, res, file, mime, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); return res.end('Not found'); }
    const range = req.headers.range;
    const headers = { 'Content-Type': mime, 'Cache-Control': cache, 'Accept-Ranges': 'bytes' };
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      let [s, e] = range.slice(6).split('-'); s = s ? parseInt(s, 10) : 0; e = e ? Math.min(parseInt(e, 10), st.size - 1) : st.size - 1;
      if (s > e || s >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Content-Length': e - s + 1 }));
      return fs.createReadStream(file, { start: s, end: e }).pipe(res);
    }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': st.size }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ---------------------------------------------------------------- routes
const routes = [];
function route(method, pattern, auth, fn) {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, auth, fn });
}

route('POST', '/api/signup', false, async (req, res, b) => {
  if (tooMany('signup:' + clientIp(req), 40)) throw httpErr(429, 'Too many sign-ups from this network, try later');
  const username = clean(b.username, 30).toLowerCase();
  const password = String(b.password || '');
  if (!USERNAME_RE.test(username)) throw httpErr(400, 'Username: 3-20 chars, a-z 0-9 . _ only');
  if (password.length < 6 || password.length > 100) throw httpErr(400, 'Password must be 6-100 characters');
  if (userByName(username)) throw httpErr(409, 'Username already taken');
  const salt = id(16);
  const u = { id: id(), username, name: clean(b.name, 40) || username, bio: '', avatar: null, salt, pass: hashPassword(password, salt), created: now() };
  db.users[u.id] = u; db.follows[u.id] = [];
  const official = userByName('techbroz'); if (official) db.follows[u.id].push(official.id);
  save(); newSession(res, req, u.id);
  send(res, 201, { user: publicUser(u) });
});
route('POST', '/api/login', false, async (req, res, b) => {
  const username = clean(b.username, 30).toLowerCase();
  const ipKey = 'loginfail:' + clientIp(req), uKey = 'loginfail:' + username;
  if (tooMany(ipKey, 60, false) || tooMany(uKey, 10, false)) throw httpErr(429, 'Too many wrong passwords, wait 10 minutes');
  const u = userByName(username);
  if (!u || !checkPassword(u, String(b.password || ''))) { tooMany(ipKey, 60); tooMany(uKey, 10); throw httpErr(401, 'Wrong username or password'); }
  newSession(res, req, u.id);
  send(res, 200, { user: publicUser(u) });
});
route('POST', '/api/logout', false, async (req, res) => {
  const tok = parseCookies(req).ig_sid; if (tok) { delete db.sessions[sha(tok)]; save(); }
  res.setHeader('Set-Cookie', 'ig_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
  send(res, 200, { ok: true });
});
route('GET', '/api/me', true, async (req, res, b, me) => {
  const unreadDm = Object.values(db.messages).filter(m => m.to === me.id && !m.seen && !m.deleted).length;
  const unreadNotif = Object.values(db.notifs).filter(n => n.to === me.id && !n.read).length;
  send(res, 200, { user: Object.assign(publicUser(me, me), { bio: me.bio }), unreadDm, unreadNotif });
});
route('PUT', '/api/me', true, async (req, res, b, me) => {
  if (b.name !== undefined) me.name = clean(b.name, 40) || me.username;
  if (b.bio !== undefined) me.bio = clean(b.bio, 150);
  if (b.avatar) { const old = me.avatar; me.avatar = storeMedia(b.avatar, me.id, ['image']).file; dropMedia(old); }
  if (b.removeAvatar) { dropMedia(me.avatar); me.avatar = null; }
  save(); send(res, 200, { user: Object.assign(publicUser(me, me), { bio: me.bio }) });
});
route('DELETE', '/api/me', true, async (req, res, b, me) => {
  if (!checkPassword(me, String(b.password || ''))) throw httpErr(401, 'Password is wrong');
  if (me.demo) throw httpErr(403, 'Demo accounts cannot be deleted');
  for (const x of Object.values(db.posts)) if (x.uid === me.id) { dropMedia(x.media); delete db.posts[x.id]; }
  for (const x of Object.values(db.posts)) { x.likes = x.likes.filter(u => u !== me.id); x.saves = x.saves.filter(u => u !== me.id); }
  for (const c of Object.values(db.comments)) if (c.uid === me.id || !db.posts[c.pid]) delete db.comments[c.id];
  for (const st of Object.values(db.stories)) { if (st.uid === me.id) { dropMedia(st.media); delete db.stories[st.id]; } else st.seen = st.seen.filter(u => u !== me.id); }
  for (const m of Object.values(db.messages)) if (m.from === me.id || m.to === me.id) { dropMedia(m.media); delete db.messages[m.id]; }
  for (const n of Object.values(db.notifs)) if (n.to === me.id || n.from === me.id || (n.pid && !db.posts[n.pid])) delete db.notifs[n.id];
  for (const [k, s] of Object.entries(db.sessions)) if (s.uid === me.id) delete db.sessions[k];
  delete db.follows[me.id]; for (const k of Object.keys(db.follows)) db.follows[k] = db.follows[k].filter(u => u !== me.id);
  dropMedia(me.avatar); delete db.users[me.id];
  res.setHeader('Set-Cookie', 'ig_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
  save(); send(res, 200, { ok: true });
});
route('GET', '/api/users/:username', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  const posts = Object.values(db.posts).filter(x => x.uid === u.id).sort((a, c) => c.created - a.created)
    .map(x => ({ id: x.id, type: x.type, media: mediaUrl(x.media), likes: x.likes.length, comments: Object.values(db.comments).filter(c => c.pid === x.id).length }));
  send(res, 200, {
    user: Object.assign(publicUser(u, me), { bio: u.bio, posts: posts.length, followers: followers(u.id).length, following: following(u.id).length, isMe: u.id === me.id, isFollowing: following(me.id).includes(u.id), followsYou: following(u.id).includes(me.id) }),
    posts,
  });
});
route('GET', '/api/users/:username/:list', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  let ids;
  if (p.list === 'followers') ids = followers(u.id); else if (p.list === 'following') ids = following(u.id); else throw httpErr(404, 'Not found');
  send(res, 200, { users: ids.map(i => db.users[i]).filter(Boolean).map(x => Object.assign(publicUser(x, me), { isFollowing: following(me.id).includes(x.id), isMe: x.id === me.id })) });
});
route('POST', '/api/users/:username/follow', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  if (u.id === me.id) throw httpErr(400, "You can't follow yourself");
  const f = following(me.id); if (!f.includes(u.id)) { f.push(u.id); notify(u.id, me.id, 'follow'); }
  save(); send(res, 200, { following: true, followers: followers(u.id).length });
});
route('DELETE', '/api/users/:username/follow', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  db.follows[me.id] = following(me.id).filter(x => x !== u.id);
  save(); send(res, 200, { following: false, followers: followers(u.id).length });
});
route('GET', '/api/search', true, async (req, res, b, me, p, q) => {
  const s = clean(q.get('q'), 30).toLowerCase();
  let list = Object.values(db.users).filter(u => u.id !== me.id);
  if (s) list = list.filter(u => u.username.includes(s) || (u.name || '').toLowerCase().includes(s));
  else list = list.filter(u => !following(me.id).includes(u.id));
  send(res, 200, { users: list.slice(0, 30).map(u => Object.assign(publicUser(u, me), { isFollowing: following(me.id).includes(u.id), followers: followers(u.id).length })) });
});

// ---- posts
function listPosts(filter, q, me) {
  const before = parseInt(q.get('before') || '0', 10) || Infinity;
  const limit = Math.min(parseInt(q.get('limit') || '12', 10) || 12, 30);
  const rows = Object.values(db.posts).filter(filter).filter(x => x.created < before).sort((a, c) => c.created - a.created);
  return { posts: rows.slice(0, limit).map(x => postView(x, me)), more: rows.length > limit };
}
route('GET', '/api/feed', true, async (req, res, b, me, p, q) => {
  const f = new Set(following(me.id).concat(me.id));
  send(res, 200, listPosts(x => f.has(x.uid), q, me));
});
route('GET', '/api/explore', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.uid !== me.id, q, me)));
route('GET', '/api/reels', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.type === 'video', q, me)));
route('GET', '/api/saved', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.saves.includes(me.id), q, me)));
route('POST', '/api/posts', true, async (req, res, b, me) => {
  const caption = clean(b.caption, 2200);
  const m = storeMedia(b.media, me.id, ['image', 'video']);
  const post = { id: id(), uid: me.id, media: m.file, type: m.kind, caption, created: now(), likes: [], saves: [] };
  db.posts[post.id] = post; save();
  send(res, 201, { post: postView(post, me) });
});
function getPost(pid) { const x = db.posts[pid]; if (!x) throw httpErr(404, 'Post not found'); return x; }
route('GET', '/api/posts/:id', true, async (req, res, b, me, p) => send(res, 200, { post: postView(getPost(p.id), me) }));
route('PUT', '/api/posts/:id', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (x.uid !== me.id) throw httpErr(403, 'You can only edit your own post');
  x.caption = clean(b.caption, 2200); save(); send(res, 200, { post: postView(x, me) });
});
route('DELETE', '/api/posts/:id', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (x.uid !== me.id) throw httpErr(403, 'You can only delete your own post');
  for (const c of Object.values(db.comments)) if (c.pid === x.id) delete db.comments[c.id];
  for (const n of Object.values(db.notifs)) if (n.pid === x.id) delete db.notifs[n.id];
  dropMedia(x.media); delete db.posts[x.id]; save(); send(res, 200, { ok: true });
});
route('POST', '/api/posts/:id/like', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (!x.likes.includes(me.id)) { x.likes.push(me.id); notify(x.uid, me.id, 'like', { pid: x.id }); }
  save(); send(res, 200, { liked: true, likes: x.likes.length });
});
route('DELETE', '/api/posts/:id/like', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); x.likes = x.likes.filter(u => u !== me.id); save(); send(res, 200, { liked: false, likes: x.likes.length });
});
route('POST', '/api/posts/:id/save', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (!x.saves.includes(me.id)) x.saves.push(me.id); save(); send(res, 200, { saved: true });
});
route('DELETE', '/api/posts/:id/save', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); x.saves = x.saves.filter(u => u !== me.id); save(); send(res, 200, { saved: false });
});
route('GET', '/api/posts/:id/comments', true, async (req, res, b, me, p) => {
  const x = getPost(p.id);
  const list = Object.values(db.comments).filter(c => c.pid === x.id).sort((a, c) => a.created - c.created)
    .map(c => ({ id: c.id, text: c.text, created: c.created, user: publicUser(db.users[c.uid]), canDelete: c.uid === me.id || x.uid === me.id }));
  send(res, 200, { comments: list });
});
route('POST', '/api/posts/:id/comments', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); const text = clean(b.text, 500); if (!text) throw httpErr(400, 'Comment is empty');
  const c = { id: id(), pid: x.id, uid: me.id, text, created: now() };
  db.comments[c.id] = c; notify(x.uid, me.id, 'comment', { pid: x.id, text: text.slice(0, 80) }); save();
  send(res, 201, { comment: { id: c.id, text, created: c.created, user: publicUser(me), canDelete: true } });
});
route('DELETE', '/api/comments/:id', true, async (req, res, b, me, p) => {
  const c = db.comments[p.id]; if (!c) throw httpErr(404, 'Comment not found');
  const post = db.posts[c.pid];
  if (c.uid !== me.id && !(post && post.uid === me.id)) throw httpErr(403, 'You can only delete your own comments');
  delete db.comments[c.id]; save(); send(res, 200, { ok: true });
});

// ---- stories
route('GET', '/api/stories', true, async (req, res, b, me) => {
  const ids = [me.id].concat(following(me.id));
  const tray = ids.map(i => db.users[i]).filter(u => u && activeStories(u.id).length)
    .map(u => Object.assign(publicUser(u, me), { isMe: u.id === me.id, latest: activeStories(u.id).slice(-1)[0].created }));
  const mine = tray.filter(x => x.isMe); const rest = tray.filter(x => !x.isMe).sort((a, c) => (a.storySeen - c.storySeen) || (c.latest - a.latest));
  send(res, 200, { tray: mine.concat(rest), meHasStory: mine.length > 0 });
});
route('GET', '/api/stories/:username', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  const list = activeStories(u.id).map(s => ({ id: s.id, media: mediaUrl(s.media), type: s.type, created: s.created, seen: s.seen.includes(me.id), viewers: u.id === me.id ? s.seen.filter(v => v !== me.id).map(v => publicUser(db.users[v])).filter(Boolean) : undefined }));
  send(res, 200, { user: publicUser(u, me), stories: list });
});
route('POST', '/api/stories', true, async (req, res, b, me) => {
  const m = storeMedia(b.media, me.id, ['image', 'video']);
  const s = { id: id(), uid: me.id, media: m.file, type: m.kind, created: now(), seen: [] };
  db.stories[s.id] = s; save(); send(res, 201, { story: { id: s.id, media: mediaUrl(s.media), created: s.created } });
});
route('POST', '/api/stories/:id/seen', true, async (req, res, b, me, p) => {
  const s = db.stories[p.id]; if (!s || now() - s.created >= STORY_TTL) throw httpErr(404, 'Story not found');
  if (s.uid !== me.id && !following(me.id).includes(s.uid)) throw httpErr(403, 'Follow to see this story');
  if (!s.seen.includes(me.id)) { s.seen.push(me.id); save(); }
  send(res, 200, { ok: true });
});
route('DELETE', '/api/stories/:id', true, async (req, res, b, me, p) => {
  const s = db.stories[p.id]; if (!s) throw httpErr(404, 'Story not found');
  if (s.uid !== me.id) throw httpErr(403, 'You can only delete your own story');
  dropMedia(s.media); delete db.stories[s.id]; save(); send(res, 200, { ok: true });
});

// ---- direct messages (a conversation is always "me + the other user", so nobody can address someone else's chat)
route('GET', '/api/inbox', true, async (req, res, b, me) => {
  const convs = new Map();
  for (const m of Object.values(db.messages)) {
    if (m.deleted || (m.from !== me.id && m.to !== me.id)) continue;
    const other = m.from === me.id ? m.to : m.from;
    const c = convs.get(other) || { last: null, unread: 0 };
    if (!c.last || m.created > c.last.created) c.last = m;
    if (m.to === me.id && !m.seen) c.unread++;
    convs.set(other, c);
  }
  const list = [...convs.entries()].filter(([o]) => db.users[o]).map(([o, c]) => ({ user: publicUser(db.users[o], me), last: messageView(c.last, me), unread: c.unread }))
    .sort((a, c) => c.last.created - a.last.created);
  send(res, 200, { conversations: list });
});
function otherUser(name, me) { const u = userByName(name); if (!u) throw httpErr(404, 'User not found'); if (u.id === me.id) throw httpErr(400, "You can't message yourself"); return u; }
route('GET', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id);
  const msgs = Object.values(db.messages).filter(m => m.conv === key && !m.deleted).sort((a, c) => a.created - c.created);
  let changed = false; for (const m of msgs) if (m.to === me.id && !m.seen) { m.seen = now(); changed = true; }
  if (changed) { save(); push(u.id, { type: 'seen', by: me.username }); }
  send(res, 200, { user: Object.assign(publicUser(u, me), { online: streams.has(u.id) }), messages: msgs.slice(-200).map(m => messageView(m, me)) });
});
route('POST', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id);
  const m = { id: id(), conv: key, from: me.id, to: u.id, created: now(), seen: 0 };
  if (b.postId) { const post = getPost(String(b.postId)); m.kind = 'post'; m.postId = post.id; m.text = clean(b.text, 1000); }
  else if (b.media) { m.kind = 'image'; m.media = storeMedia(b.media, me.id, ['image'], key).file; m.text = clean(b.text, 1000); }
  else { m.kind = 'text'; m.text = clean(b.text, 2000); if (!m.text) throw httpErr(400, 'Message is empty'); }
  db.messages[m.id] = m; save();
  push(u.id, { type: 'dm', from: me.username, message: messageView(m, u) });
  push(me.id, { type: 'dm_echo', to: u.username, message: messageView(m, me) });
  send(res, 201, { message: messageView(m, me) });
});
route('POST', '/api/dm/:username/typing', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); push(u.id, { type: 'typing', from: me.username }); send(res, 200, { ok: true });
});
route('POST', '/api/dm/:username/seen', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id); let changed = false;
  for (const m of Object.values(db.messages)) if (m.conv === key && m.to === me.id && !m.seen) { m.seen = now(); changed = true; }
  if (changed) { save(); push(u.id, { type: 'seen', by: me.username }); }
  send(res, 200, { ok: true });
});
route('GET', '/api/messages/:id', true, async (req, res, b, me, p) => {
  const m = db.messages[p.id];
  if (!m || m.deleted || (m.from !== me.id && m.to !== me.id)) throw httpErr(404, 'Message not found'); // same answer as "doesn't exist": no IDOR leak
  send(res, 200, { message: messageView(m, me) });
});
route('DELETE', '/api/messages/:id', true, async (req, res, b, me, p) => {
  const m = db.messages[p.id];
  if (!m || m.deleted || (m.from !== me.id && m.to !== me.id)) throw httpErr(404, 'Message not found');
  if (m.from !== me.id) throw httpErr(403, 'You can only unsend your own messages');
  m.deleted = true; m.text = ''; if (m.media) { dropMedia(m.media); m.media = null; } save();
  push(m.to, { type: 'unsend', id: m.id, from: me.username }); send(res, 200, { ok: true });
});

// ---- notifications
route('GET', '/api/notifications', true, async (req, res, b, me) => {
  const list = Object.values(db.notifs).filter(n => n.to === me.id && db.users[n.from]).sort((a, c) => c.created - a.created).slice(0, 60)
    .map(n => { const pst = n.pid && db.posts[n.pid]; return { id: n.id, type: n.type, created: n.created, read: n.read, text: n.text || '', user: Object.assign(publicUser(db.users[n.from], me), { isFollowing: following(me.id).includes(n.from) }), post: pst ? { id: pst.id, media: mediaUrl(pst.media), type: pst.type } : null }; });
  send(res, 200, { notifications: list });
});
route('POST', '/api/notifications/read', true, async (req, res, b, me) => {
  for (const n of Object.values(db.notifs)) if (n.to === me.id) n.read = true; save(); send(res, 200, { ok: true });
});

// ---- realtime stream
route('GET', '/api/stream', true, async (req, res, b, me) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': ' + ' '.repeat(2048) + '\n\n');
  res.write('data: {"type":"hello"}\n\n');
  let set = streams.get(me.id); if (!set) streams.set(me.id, set = new Set());
  set.add(res);
  req.on('close', () => { set.delete(res); if (!set.size) streams.delete(me.id); });
  return 'stream';
});

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SEC_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://x');
  const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith('/api/')) {
      const r = routes.find(r => r.method === req.method && r.re.test(pathname));
      if (!r) throw httpErr(404, 'Not found');
      // CSRF guard: browsers can't add a custom header cross-site without CORS (which we never allow)
      if (req.method !== 'GET' && req.headers['x-ig'] !== '1') throw httpErr(403, 'Missing X-IG header');
      const me = sessionUser(req);
      if (r.auth && !me) throw httpErr(401, 'Please log in');
      const m = r.re.exec(pathname); const params = {}; r.keys.forEach((k, i) => params[k] = m[i + 1]);
      const body = req.method === 'GET' ? {} : await readBody(req);
      await r.fn(req, res, body, me, params, url.searchParams);
      return;
    }
    if (pathname.startsWith('/media/')) {
      const file = pathname.slice(7);
      // every answer here is per-user: never let a CDN cache an error/denial and replay it to someone else
      const deny = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' }); res.end(msg); };
      if (!/^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/.test(file) || !db.media[file]) return deny(404, 'Not found');
      const me = sessionUser(req);
      if (!me) return deny(401, 'Please log in');
      const meta = db.media[file];
      if (meta.conv && !meta.conv.split(':').includes(me.id)) return deny(404, 'Not found'); // DM photos: only the two people in that chat
      res.setHeader('Vary', 'Cookie');
      return serveFile(req, res, path.join(MEDIA_DIR, file), MIME[file.split('.').pop()], 'private, max-age=86400');
    }
    if (pathname === '/healthz') return send(res, 200, { ok: true, users: Object.keys(db.users).length, posts: Object.keys(db.posts).length });
    // static files
    let f = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!f.startsWith(PUBLIC_DIR)) { res.writeHead(400); return res.end(); }
    if (pathname === '/' || !path.extname(pathname)) f = path.join(PUBLIC_DIR, 'index.html');
    const ext = path.extname(f);
    return serveFile(req, res, f, STATIC_MIME[ext] || 'application/octet-stream', (ext === '.html' || ext === '.apk' || ext === '.zip') ? 'no-cache' : 'public, max-age=300');
  } catch (e) {
    const code = e.code && Number.isInteger(e.code) ? e.code : 500;
    if (code === 500) console.error(e);
    if (!res.headersSent) send(res, code, { error: code === 500 ? 'Server error' : e.message });
  }
});

// story cleanup: drop expired stories + their files every 10 minutes
setInterval(() => {
  const t = now(); let n = 0;
  for (const s of Object.values(db.stories)) if (t - s.created >= STORY_TTL) { dropMedia(s.media); delete db.stories[s.id]; n++; }
  if (n) save();
}, 10 * 60 * 1000).unref();

module.exports = { db, save, storeMedia, hashPassword, id, server, STORY_TTL, MEDIA_DIR };
if (require.main === module || process.env.START_SERVER) {
  try { require('./seed.js').run(module.exports); } catch (e) { console.error('seed skipped:', e.message); }
  server.listen(PORT, () => console.log('InstaGlass running on http://localhost:' + PORT + '  data: ' + DATA_DIR));
}
