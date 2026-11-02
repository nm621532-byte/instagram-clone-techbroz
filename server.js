// Private Insta — a liquid-glass Instagram-style social app (educational project by Tech Bro Z).
// Not affiliated with Instagram or Meta. Zero dependencies: only Node.js built-ins (Node 18+).
// v1.1: settings + privacy (private account, follow requests, close friends, block/restrict/mute,
// message requests, hidden words, comment controls, read receipts, sessions, data export, admin panel).
// v1.2: admin boosts create real-looking bot accounts (followers / likes / comments lists fill with names),
// paginated followers + "liked by" lists, admin Bots tab. Bots live only inside this app and cannot log in.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.2.0';
const APP_NAME = 'Private Insta';
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
let db = { users: {}, sessions: {}, follows: {}, posts: {}, comments: {}, stories: {}, messages: {}, notifs: {}, media: {}, requests: {}, accepted: null };
if (fs.existsSync(DB_FILE)) {
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { console.error('db read failed', e.message); }
}
let saveTimer = null;
let fIdx = null, botCache = null;
function writeNow() { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE); }
function save() {
  fIdx = null; botCache = null;                  // follower index / bot list are rebuilt on next read
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; writeNow(); }, 300);
}
function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; writeNow(); } }
process.on('SIGTERM', () => { flushSave(); process.exit(0); });
process.on('SIGINT', () => { flushSave(); process.exit(0); });

const id = (n = 12) => crypto.randomBytes(n).toString('hex');
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------- settings model (v1.1) + migration of v1.0 data
const DEFAULT_SETTINGS = {
  private: false,                 // private account: only approved followers see posts, reels, stories, follower lists
  storyReplies: 'everyone',       // everyone | following (people you follow) | off
  dmFrom: 'everyone',             // everyone | followers | nobody   (others land in Message requests / are refused)
  readReceipts: true, typing: true,
  commentsFrom: 'everyone',       // everyone | followers | off
  hiddenWords: [],
  activityStatus: true,
  mentionsFrom: 'everyone',       // everyone | followers | nobody
  notif: { likes: true, comments: true, follows: true, messages: true, mentions: true },
  theme: 'auto', language: 'en',
};
const LIST_KEYS = ['blocked', 'restricted', 'closeFriends', 'storyHidden', 'mutedPosts', 'mutedStories'];
const BOT_LISTS = Object.freeze(Object.fromEntries(LIST_KEYS.map(k => [k, Object.freeze([])])));
function botSettings(u) { return Object.assign({}, DEFAULT_SETTINGS, { private: !!u.priv, hiddenWords: [], notif: Object.assign({}, DEFAULT_SETTINGS.notif) }); }
function settingsOf(u) {
  if (u.isBot) return botSettings(u);              // bots: never stored, never editable
  if (!u.settings || typeof u.settings !== 'object') u.settings = {};
  const s = u.settings;
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (s[k] === undefined) s[k] = Array.isArray(v) ? [] : (typeof v === 'object' ? Object.assign({}, v) : v);
  }
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS.notif)) if (typeof s.notif[k] !== 'boolean') s.notif[k] = v;
  return s;
}
function L(u) { if (u.isBot) return BOT_LISTS; for (const k of LIST_KEYS) if (!Array.isArray(u[k])) u[k] = []; return u; }
function migrate() {
  let changed = false;
  if (!db.requests || typeof db.requests !== 'object') { db.requests = {}; changed = true; }
  if (!db.accepted || typeof db.accepted !== 'object') { // every v1.0 conversation counts as accepted (nothing moves to Requests)
    db.accepted = {}; for (const m of Object.values(db.messages)) db.accepted[m.conv] = true; changed = true;
  }
  for (const u of Object.values(db.users)) { if (u.isBot) continue; if (!u.settings) changed = true; settingsOf(u); L(u); if (!Array.isArray(u.logins)) u.logins = []; }
  for (const p of Object.values(db.posts)) { if (p.commentsOff === undefined) { p.commentsOff = false; p.hideLikes = false; changed = true; } }
  if ((db.schema || 1) < 2) { db.schema = 2; changed = true; }
  if (db.schema < 3) { migrateBoostsToBots(); db.schema = 3; changed = true; } // v1.2: boost numbers -> bot entries (same totals)
  if (changed) save();
}

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
function following(uid) {
  if (db.follows[uid]) return db.follows[uid];
  if (db.users[uid] && db.users[uid].isBot) return [];   // bots get a stored list only when they follow someone (keeps db small)
  return (db.follows[uid] = []);
}
function followerIndex() { // reverse index: uid -> [follower ids]; rebuilt after any save()
  if (fIdx) return fIdx;
  fIdx = new Map();
  for (const [k, arr] of Object.entries(db.follows)) for (const t of (arr || [])) { let s = fIdx.get(t); if (!s) fIdx.set(t, s = []); s.push(k); }
  return fIdx;
}
function followers(uid) { return (followerIndex().get(uid) || []).slice(); }
const isBotId = (i) => !!(db.users[i] && db.users[i].isBot);
function convKey(a, b) { return [a, b].sort().join(':'); }
const isFollowing = (a, b) => following(a).includes(b);              // a follows b
const gone = (u) => !u || u.deactivated || u.suspended;               // hidden from everyone else
function blockedEither(a, b) {
  const ua = db.users[a], ub = db.users[b];
  return !!((ua && L(ua).blocked.includes(b)) || (ub && L(ub).blocked.includes(a)));
}
function canView(viewer, owner) { // posts, reels, follower lists of `owner`
  if (!owner) return false;
  if (viewer.id === owner.id) return true;
  if (gone(owner) || blockedEither(viewer.id, owner.id)) return false;
  return !settingsOf(owner).private || isFollowing(viewer.id, owner.id);
}
// look up a user the way another user may see them: deactivated/suspended or "they blocked me" = does not exist
function visibleUser(name, me) {
  const u = userByName(name);
  if (!u || (u.id !== me.id && (gone(u) || L(u).blocked.includes(me.id)))) throw httpErr(404, 'User not found');
  return u;
}
function followerCount(u) { return followers(u.id).filter(i => !gone(db.users[i])).length + (u.bonusFollowers || 0); }

// ---------------------------------------------------------------- v1.2 bot accounts
// Admin boosts create follow / like / comment entries from bot accounts so every list shows real-looking names.
// Bots: isBot flag, no password (cannot log in), no sessions, never notify or message anyone, counted apart in admin stats.
const BOT_ACTION_CAP = 10000;        // most bot followers / likes one admin action can add
const BOT_POOL_CAP = 30000;          // most bot followers one user (or bot likes one post) can have = largest pool size
const BOT_COMMENT_ACTION_CAP = 200;  // bot comments per action
const BOT_COMMENT_CAP = 300;         // bot comments per post
// name groups keep first names and surnames believable together (no "Salman Kaur")
const BOT_NAMES = [
  { w: 62, m: ['Aman', 'Rahul', 'Rohit', 'Ankit', 'Arjun', 'Vikas', 'Sahil', 'Karan', 'Aditya', 'Harsh', 'Nikhil', 'Yash', 'Deepak', 'Mohit', 'Saurabh', 'Abhishek', 'Akash', 'Vivek', 'Gaurav', 'Rajat', 'Varun', 'Kunal', 'Shubham', 'Ayush', 'Ritik', 'Rakesh', 'Manoj', 'Pankaj', 'Sunny', 'Lucky', 'Prince', 'Ravi', 'Ajay', 'Vijay', 'Tarun', 'Naveen', 'Pradeep', 'Anuj', 'Rishabh', 'Dev', 'Kartik', 'Siddharth', 'Aryan', 'Vansh', 'Kabir', 'Ishaan', 'Mayank'],
    f: ['Priya', 'Neha', 'Pooja', 'Anjali', 'Sneha', 'Riya', 'Kajal', 'Shreya', 'Nisha', 'Muskan', 'Khushi', 'Mehak', 'Komal', 'Payal', 'Tanya', 'Divya', 'Kavya', 'Ishita', 'Aditi', 'Sakshi', 'Nandini', 'Megha', 'Jyoti', 'Preeti', 'Shivani', 'Ritika', 'Bhavna', 'Sonam', 'Rashmi', 'Swati', 'Ananya', 'Diya', 'Tanvi', 'Palak', 'Mahi', 'Kirti', 'Vaishnavi'],
    l: ['Verma', 'Sharma', 'Gupta', 'Kumar', 'Yadav', 'Mishra', 'Tiwari', 'Pandey', 'Chauhan', 'Rathore', 'Thakur', 'Jain', 'Agarwal', 'Mehta', 'Patel', 'Shah', 'Joshi', 'Bhatt', 'Rawat', 'Negi', 'Saxena', 'Srivastava', 'Dubey', 'Chaudhary', 'Rajput', 'Soni', 'Arora', 'Kapoor', 'Malhotra', 'Bansal', 'Goyal', 'Nair', 'Reddy', 'Das', 'Roy', 'Sen', 'Singh'] },
  { w: 26, m: ['Imran', 'Faizan', 'Arif', 'Sameer', 'Zaid', 'Danish', 'Salman', 'Irfan', 'Shahid', 'Junaid', 'Asif', 'Farhan', 'Ayaan', 'Rehan', 'Sohail', 'Tanveer', 'Aamir', 'Adnan', 'Saif', 'Arbaaz', 'Kaif', 'Nadeem', 'Wasim', 'Shoaib'],
    f: ['Aisha', 'Sana', 'Zoya', 'Ayesha', 'Fatima', 'Nazia', 'Heena', 'Rubina', 'Afreen', 'Mehwish', 'Iqra', 'Alina', 'Sadia', 'Sumaiya', 'Nida', 'Hira', 'Zainab', 'Sara'],
    l: ['Khan', 'Ansari', 'Qureshi', 'Shaikh', 'Malik', 'Siddiqui', 'Mirza', 'Pathan', 'Hussain', 'Rizvi', 'Sheikh', 'Saifi', 'Alvi', 'Raza'] },
  { w: 12, m: ['Gurpreet', 'Harpreet', 'Manpreet', 'Jaspreet', 'Harjot', 'Amandeep', 'Karanveer', 'Jaskaran', 'Sukhdeep', 'Navjot'],
    f: ['Harleen', 'Navneet', 'Gurleen', 'Simran', 'Jasleen', 'Manpreet', 'Amrit', 'Rupinder', 'Kiranjot'],
    lm: ['Singh', 'Gill', 'Sandhu', 'Dhillon', 'Grewal', 'Sidhu', 'Bajwa'], lf: ['Kaur', 'Gill', 'Sandhu', 'Dhillon', 'Grewal'] },
];
function botName() {
  let x = crypto.randomInt(100), grp = BOT_NAMES[0]; for (const gp of BOT_NAMES) { if (x < gp.w) { grp = gp; break; } x -= gp.w; }
  const g = crypto.randomInt(100) < 45 ? 1 : 0;
  return { g, first: pick(g ? grp.f : grp.m), last: pick(grp.l || (g ? grp.lf : grp.lm)) };
}
const BOT_CITY = ['delhi', 'mumbai', 'jaipur', 'lucknow', 'indore', 'patna', 'pune', 'bhopal', 'up', 'mp', 'punjab', 'hyd', 'kolkata', 'surat', 'agra', 'kanpur'];
const BOT_BIO = ['', '', '', '', 'Dil se Desi 🇮🇳', 'Engineering student 📚', 'Foodie 🍕 | Traveller ✈️', 'Gym lover 💪', 'Just vibing ✨', 'Photography 📸', 'Cricket lover 🏏', 'Insta pe naya hu 😅', 'BCA student 💻', 'Shayari lover ✍️', 'Mehnat karo, result aayega 🔥', 'Coder by day, gamer by night 🎮', 'Chai > Coffee ☕', 'Music is life 🎧', 'Smile always 😊', 'Living my best life 🌸', 'Bike lover 🏍️', 'Delhi wale 😎', 'Mumbai meri jaan ❤️', 'Simple life, big dreams', 'Learning every day 📖', 'Proud Indian 🇮🇳', 'Bollywood fan 🎬', 'Self made 💯', 'Nature lover 🌿', 'Mom\'s favourite ❤️', 'Fashion & lifestyle 👗', 'Biryani lover 🍗', 'Allah is great ✨', 'Jai Shree Ram 🙏', 'Waheguru ji 🙏', 'Future doctor 🩺', 'UPSC aspirant 📚', 'Dancer 💃', 'Artist 🎨', 'Travel diaries 🌍'];
const BOT_COMMENTS = ['Bhai kya photo hai 🔥', 'Looking good 😎', 'Nice click 📸', 'Ekdum mast ❤️', 'Fire 🔥🔥', 'Sahi hai bhai 👌', 'Wah 😍', 'Killer look 🔥', 'Bohot sundar ✨', 'Next level 🤩', 'Keep shining ✨', 'Dil jeet liya ❤️', 'Bhai tu toh hero hai 😎', 'Superb click 👏', 'Hayee 😍', '💯💯', '😍🔥', '👏👏👏', 'Uff 🔥', 'Nice bro 👍', '🔥🔥', '🔥🔥🔥', 'Nice bro', 'Mast hai 😍', 'Superb 👌', 'Awesome ❤️', 'Bahut badhiya', 'Kya baat hai 🔥', 'Nice pic', 'Love it ❤️', 'Wow 😍', 'Op bhai 🔥', 'Great work 👏', 'Beautiful ✨', 'Jhakaas 💯', 'Too good', 'Keep it up 👍', 'Lit 🔥', 'Amazing 😍😍', 'Kamaal hai yaar', 'Zabardast 👌', '❤️❤️❤️', 'Nice one', 'So cool 😎', 'Gajab 🔥', 'Very nice 👍', 'Mind blowing 🤩', 'Perfect 👌', 'Classy 😎', 'Legend 🙌'];
const pick = (a) => a[crypto.randomInt(a.length)];
function botHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function botIds() { // all bots, oldest first (cached until the next save)
  if (!botCache) botCache = Object.values(db.users).filter(u => u.isBot).sort((a, b) => (a.n || 0) - (b.n || 0)).map(u => u.id);
  return botCache;
}
function botUsername(first, last, taken) {
  const f = first.toLowerCase(), l = last.toLowerCase(), n2 = () => String(crypto.randomInt(1, 99)), y = () => String(crypto.randomInt(95, 100) > 97 ? crypto.randomInt(1990, 2009) : crypto.randomInt(1, 999));
  const forms = [() => f + '.' + l[0] + '_' + n2(), () => f + '_' + l, () => 'its_' + f + '_' + l, () => f + '.' + l + n2(), () => f + '__' + y(), () => 'the.' + f + '.' + l,
    () => f + '_' + pick(BOT_CITY), () => l + '.' + f, () => f + l + '_' + n2(), () => 'im_' + f + n2(), () => f + '.official', () => f + '_' + l[0] + l[1] + '_' + y(), () => 'desi_' + f, () => f + '.' + l + '_'];
  for (let i = 0; i < 40; i++) {
    let u = pick(forms)().replace(/[^a-z0-9._]/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 20);
    if (i > 20) u = (u.slice(0, 15) + '_' + crypto.randomInt(100, 9999)).slice(0, 20);
    if (u.length >= 3 && USERNAME_RE.test(u) && !taken.has(u)) return u;
  }
  return 'user_' + id(4);
}
function ensureBots(n) { // grow the pool so at least n bots exist
  if (n > BOT_POOL_CAP) throw httpErr(400, 'Max ' + BOT_POOL_CAP.toLocaleString('en-IN') + ' bots');
  const have = botIds().length; if (have >= n) return;
  const taken = new Set(Object.values(db.users).map(u => u.username));
  let seq = have ? Math.max(...botIds().slice(-1).map(i => db.users[i].n || 0)) : 0;
  for (let k = have; k < n; k++) {
    const { g, first, last } = botName();
    const username = botUsername(first, last, taken); taken.add(username);
    const u = { id: id(), username, name: crypto.randomInt(100) < 12 ? first : first + ' ' + last, bio: pick(BOT_BIO), isBot: true, g, priv: crypto.randomInt(100) < 45 ? 1 : 0,
      created: now() - crypto.randomInt(30, 900) * 864e5, n: ++seq };
    db.users[u.id] = u;
  }
  save();
}
function botAvatarUrl(u) { const h = botHash(u.id); return (h % 100) < 10 ? null : '/bot-avatar/' + u.id + '.svg'; } // ~10% keep the default picture, like real accounts
function botAvatarSvg(u) {
  const h = botHash(u.id), r = (k, n) => Math.floor(h / k) % n;
  const BG = [['#f9a8d4', '#a78bfa'], ['#93c5fd', '#22d3ee'], ['#fcd34d', '#fb923c'], ['#86efac', '#14b8a6'], ['#c4b5fd', '#f472b6'], ['#fda4af', '#f59e0b'], ['#a5b4fc', '#60a5fa'], ['#5eead4', '#818cf8'], ['#fde68a', '#f87171'], ['#bbf7d0', '#38bdf8']];
  const [c1, c2] = BG[r(7, BG.length)];
  const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>`;
  if (r(3, 100) < 25) { // initials style
    const ini = (u.name || u.username).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase().replace(/[^A-Z]/g, '') || 'U';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${grad}<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="700" fill="#fff" opacity=".95">${ini}</text></svg>`;
  }
  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#a0672f', '#ffdbac', '#d9a066'], HAIR = ['#1b1b1b', '#2c1b10', '#3b2314', '#4a2f1b', '#101010', '#5a3825'];
  const SHIRT = ['#1e3a8a', '#0f766e', '#7c2d12', '#be185d', '#374151', '#f8fafc', '#4c1d95', '#b91c1c', '#065f46', '#111827'];
  const skin = SKIN[r(11, SKIN.length)], hair = HAIR[r(13, HAIR.length)], shirt = SHIRT[r(17, SHIRT.length)];
  const back = u.g ? `<path d="M24 46c0-20 12-31 26-31s26 11 26 31v32H24z" fill="${hair}"/>` : '';
  const top = u.g ? `<path d="M29 42c2-15 11-22 21-22s19 7 21 22c-6-8-14-11-21-11s-15 3-21 11z" fill="${hair}"/>`
    : [`<path d="M30 40c0-13 9-20 20-20s20 7 20 20c-4-6-11-9-20-9s-16 3-20 9z" fill="${hair}"/>`, `<path d="M30 42c-1-15 8-23 20-23 13 0 21 8 20 23-3-9-9-12-20-12s-17 3-20 12z" fill="${hair}"/><path d="M38 22c6-4 18-4 24 1" stroke="${hair}" stroke-width="5" fill="none"/>`][r(19, 2)];
  const beard = !u.g && r(23, 100) < 35 ? `<path d="M33 50c1 14 8 21 17 21s16-7 17-21c-3 6-9 9-17 9s-14-3-17-9z" fill="${hair}" opacity=".9"/>` : '';
  const glasses = r(29, 100) < 22 ? `<g fill="none" stroke="#111" stroke-width="1.8"><circle cx="42" cy="46" r="6"/><circle cx="58" cy="46" r="6"/><path d="M48 46h4"/></g>` : '';
  const ear = u.g && r(31, 100) < 50 ? `<circle cx="31" cy="52" r="1.8" fill="#facc15"/><circle cx="69" cy="52" r="1.8" fill="#facc15"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${grad}${back}<path d="M18 100c2-17 15-26 32-26s30 9 32 26z" fill="${shirt}"/><rect x="44" y="60" width="12" height="16" rx="5" fill="${skin}"/>`
    + `<ellipse cx="50" cy="46" rx="19" ry="22" fill="${skin}"/><circle cx="31" cy="48" r="3.5" fill="${skin}"/><circle cx="69" cy="48" r="3.5" fill="${skin}"/>${ear}${top}`
    + `<circle cx="42.5" cy="46" r="2.2" fill="#1f1f1f"/><circle cx="57.5" cy="46" r="2.2" fill="#1f1f1f"/><path d="M38 40.5q4-2.5 8 0M54 40.5q4-2.5 8 0" stroke="${hair}" stroke-width="1.6" fill="none"/>`
    + `<path d="M44 57q6 ${4 + r(37, 3)} 12 0" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>${beard}${glasses}</svg>`;
}
// --- follower bots
const botFollowersOf = (uid) => followers(uid).filter(isBotId);
function setBotFollowers(u, n, opts = {}) { // makes exactly n bots follow u (adds or removes ONLY bot edges)
  if (u.isBot) throw httpErr(400, "Bots can't be boosted");
  n = Math.max(0, Math.round(Number(n) || 0));
  const cur = botFollowersOf(u.id);
  if (n > cur.length) {
    const add = n - cur.length;
    if (!opts.noCap && add > BOT_ACTION_CAP) throw httpErr(400, 'Max ' + BOT_ACTION_CAP.toLocaleString('en-IN') + ' followers per action — add in steps');
    if (n > BOT_POOL_CAP) throw httpErr(400, 'Max ' + BOT_POOL_CAP.toLocaleString('en-IN') + ' bot followers per account');
    ensureBots(n);
    const have = new Set(cur), ids = botIds(), start = crypto.randomInt(ids.length); let added = 0;
    for (let i = 0; i < ids.length && added < add; i++) { const b = ids[(start + i) % ids.length]; if (!have.has(b)) { (db.follows[b] || (db.follows[b] = [])).push(u.id); added++; } }
  } else if (n < cur.length) {
    const drop = new Set(cur.slice(n));
    for (const b of drop) { const arr = (db.follows[b] || []).filter(x => x !== u.id); if (arr.length) db.follows[b] = arr; else delete db.follows[b]; }
  }
  save(); return n;
}
// --- like bots
const botLikesOf = (x) => x.likes.filter(isBotId);
function setBotLikes(x, n, opts = {}) {
  n = Math.max(0, Math.round(Number(n) || 0));
  const cur = botLikesOf(x);
  if (n > cur.length) {
    const add = n - cur.length;
    if (!opts.noCap && add > BOT_ACTION_CAP) throw httpErr(400, 'Max ' + BOT_ACTION_CAP.toLocaleString('en-IN') + ' likes per action — add in steps');
    if (n > BOT_POOL_CAP) throw httpErr(400, 'Max ' + BOT_POOL_CAP.toLocaleString('en-IN') + ' bot likes per post');
    ensureBots(n);
    const have = new Set(cur), ids = botIds(), start = crypto.randomInt(ids.length); let added = 0;
    for (let i = 0; i < ids.length && added < add; i++) { const b = ids[(start + i) % ids.length]; if (!have.has(b)) { x.likes.push(b); added++; } }
  } else if (n < cur.length) { const drop = new Set(cur.slice(n)); x.likes = x.likes.filter(i => !drop.has(i)); }
  save(); return n;
}
// --- comment bots (short generic comments; removable)
const botCommentsOf = (x) => Object.values(db.comments).filter(c => c.pid === x.id && c.bot);
function setBotComments(x, n, opts = {}) {
  n = Math.max(0, Math.round(Number(n) || 0));
  const cur = botCommentsOf(x).sort((a, b) => a.created - b.created);
  if (n > cur.length) {
    const add = n - cur.length;
    if (!opts.noCap && add > BOT_COMMENT_ACTION_CAP) throw httpErr(400, 'Max ' + BOT_COMMENT_ACTION_CAP + ' comments per action');
    if (n > BOT_COMMENT_CAP) throw httpErr(400, 'Max ' + BOT_COMMENT_CAP + ' bot comments per post');
    // each comment from a different bot, texts never repeated back-to-back, owner's hidden words respected, no notifications
    ensureBots(Math.max(n * 2, 50)); const used = new Set(cur.map(c => c.uid));
    const free = botIds().filter(i => !used.has(i)); for (let i = free.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [free[i], free[j]] = [free[j], free[i]]; }
    const owner = db.users[x.uid]; const words = owner ? settingsOf(owner).hiddenWords.filter(Boolean) : [];
    const texts = BOT_COMMENTS.filter(t => !words.some(w => t.toLowerCase().includes(w))); const pool = texts.length >= 2 ? texts : ['🔥🔥', '❤️❤️'];
    const t0 = Math.max(x.created, cur.length ? cur[cur.length - 1].created : 0), span = Math.max(60e3, now() - t0);
    const times = Array.from({ length: add }, () => Math.min(now(), t0 + 1e3 + crypto.randomInt(Math.max(1, Math.floor(span - 1e3))))).sort((a, b) => a - b);
    let prev = cur.length ? cur[cur.length - 1].text : null;
    for (let k = 0; k < add; k++) {
      let text = pick(pool); for (let tries = 0; text === prev && tries < 10; tries++) text = pick(pool);
      const c = { id: id(), pid: x.id, uid: free[k % free.length], text, created: times[k], bot: true }; db.comments[c.id] = c; prev = text;
    }
  } else if (n < cur.length) { for (const c of cur.slice(n)) delete db.comments[c.id]; }
  save(); return n;
}
function removeAllBotsFrom(u) { // "Remove all bots from this user": bot follows + bot likes/comments on their posts; real people untouched
  const out = { followers: botFollowersOf(u.id).length, likes: 0, comments: 0 };
  setBotFollowers(u, 0, { noCap: true });
  for (const x of Object.values(db.posts)) if (x.uid === u.id) { out.likes += botLikesOf(x).length; out.comments += botCommentsOf(x).length; setBotLikes(x, 0, { noCap: true }); setBotComments(x, 0, { noCap: true }); }
  delete u.bonusFollowers; save(); return out;
}
function migrateBoostsToBots() { // v1.1 stored boosts as plain numbers; v1.2 turns them into bot entries (totals unchanged)
  for (const u of Object.values(db.users)) if (!u.isBot && u.bonusFollowers > 0) {
    const k = Math.min(u.bonusFollowers, BOT_POOL_CAP); setBotFollowers(u, botFollowersOf(u.id).length + k, { noCap: true });
    if (u.bonusFollowers - k > 0) u.bonusFollowers -= k; else delete u.bonusFollowers;
  }
  for (const x of Object.values(db.posts)) {
    if (x.bonusLikes > 0) { const k = Math.min(x.bonusLikes, BOT_POOL_CAP); setBotLikes(x, botLikesOf(x).length + k, { noCap: true }); if (x.bonusLikes - k > 0) x.bonusLikes -= k; else delete x.bonusLikes; }
    if (x.bonusComments > 0) { const k = Math.min(x.bonusComments, BOT_COMMENT_CAP); setBotComments(x, botCommentsOf(x).length + k, { noCap: true }); if (x.bonusComments - k > 0) x.bonusComments -= k; else delete x.bonusComments; }
  }
}

function mediaUrl(file) { return file ? '/media/' + file : null; }
function activeStories(uid) { const t = now(); return Object.values(db.stories).filter(s => s.uid === uid && t - s.created < STORY_TTL).sort((a, b) => a.created - b.created); }
function storyVisible(s, viewer) {
  const owner = db.users[s.uid]; if (!owner) return false;
  if (owner.id === viewer.id) return true;
  if (gone(owner) || blockedEither(viewer.id, owner.id)) return false;
  if (!isFollowing(viewer.id, owner.id)) return false;                 // stories: followers only (private or public)
  if (L(owner).storyHidden.includes(viewer.id)) return false;          // "Hide story from"
  if (s.close && !L(owner).closeFriends.includes(viewer.id)) return false; // Close Friends story
  return true;
}
function storiesFor(uid, viewer) { return activeStories(uid).filter(s => storyVisible(s, viewer)); }
function publicUser(u, me) {
  if (!u) return null;
  const o = { id: u.id, username: u.username, name: u.name, avatar: u.isBot ? botAvatarUrl(u) : mediaUrl(u.avatar), verified: !!u.verified, accent: u.accent || null, isPrivate: u.isBot ? !!u.priv : !!(u.settings && u.settings.private) };
  if (me) {
    const st = storiesFor(u.id, me);
    o.hasStory = st.length > 0;
    o.storySeen = o.hasStory && st.every(s => s.seen.includes(me.id));
    o.closeStory = st.some(s => s.close && !s.seen.includes(me.id)) || (o.hasStory && st.every(s => s.close));
  }
  return o;
}
function hiddenFor(c, post, viewer) { // comment visibility
  const author = db.users[c.uid];
  if (!author || gone(author) && c.uid !== viewer.id) return true;
  if (blockedEither(viewer.id, c.uid)) return true;
  if ((c.hidden || c.restricted) && c.uid !== viewer.id && post.uid !== viewer.id) return true;
  return false;
}
function visibleComments(post, viewer) { return Object.values(db.comments).filter(c => c.pid === post.id && !hiddenFor(c, post, viewer)); }
function commentBlockReason(post, me) {
  if (post.uid === me.id) return null;
  const owner = db.users[post.uid]; const s = settingsOf(owner);
  if (post.commentsOff) return 'Commenting is turned off for this post';
  if (s.commentsFrom === 'off') return owner.username + ' has turned off comments';
  if (s.commentsFrom === 'followers' && !isFollowing(me.id, owner.id)) return 'Only followers of ' + owner.username + ' can comment';
  return null;
}
function likedByName(p, me) { // "Liked by X and N others": someone the viewer follows, else the latest real liker, else the latest bot
  let best = null, real = null, bot = null;
  for (let i = p.likes.length - 1; i >= 0; i--) {
    const u = db.users[p.likes[i]]; if (!u || u.id === me.id || gone(u) || blockedEither(u.id, me.id)) continue;
    if (isFollowing(me.id, u.id)) { best = u; break; }
    if (!u.isBot && !real) real = u; else if (u.isBot && !bot) bot = u;
  }
  const u = best || real || bot; return u ? u.username : null;
}
function postView(p, me) {
  const mine = p.uid === me.id;
  const vis = visibleComments(p, me);
  return {
    id: p.id, type: p.type, media: mediaUrl(p.media), caption: p.caption, created: p.created,
    user: publicUser(db.users[p.uid], me),
    likes: (p.hideLikes && !mine) ? null : p.likes.length + (p.bonusLikes || 0), likesHidden: !!p.hideLikes,
    likedBy: (p.hideLikes && !mine) ? null : likedByName(p, me),
    views: (p.views || []).length + (p.bonusViews || 0),
    liked: p.likes.includes(me.id), saved: p.saves.includes(me.id),
    comments: vis.length + (p.bonusComments || 0), commentsOff: !!p.commentsOff, canComment: !commentBlockReason(p, me), commentNote: commentBlockReason(p, me),
    preview: vis.filter(c => !c.hidden && !c.restricted).sort((a, b) => b.created - a.created).slice(0, 2).reverse()
      .map(c => ({ id: c.id, text: c.text, user: { username: db.users[c.uid] ? db.users[c.uid].username : 'deleted' } })),
    mine,
  };
}
function readReceiptsOn(u) { return !!(u && settingsOf(u).readReceipts); }
function messageView(m, me) {
  const o = { id: m.id, from: db.users[m.from] ? db.users[m.from].username : '?', mine: m.from === me.id, kind: m.kind, text: m.text || '', created: m.created, request: !!m.request };
  // "Seen" is shown to the sender only if the reader allows read receipts (and the sender is not restricted)
  const reader = db.users[m.to];
  o.seen = m.from === me.id ? !!(m.seen && readReceiptsOn(reader) && !L(reader).restricted.includes(me.id)) : !!m.seen;
  if (m.kind === 'image') o.media = mediaUrl(m.media);
  if (m.kind === 'post') {
    const p = db.posts[m.postId]; const owner = p && db.users[p.uid];
    if (!p) o.post = null;
    else if (!canView(me, owner)) o.post = { id: p.id, locked: true, user: publicUser(owner) };
    else o.post = { id: p.id, media: mediaUrl(p.media), type: p.type, caption: p.caption.slice(0, 80), user: publicUser(owner) };
  }
  return o;
}
const NOTIF_PREF = { like: 'likes', comment: 'comments', follow: 'follows', request: 'follows', accept: 'follows', mention: 'mentions' };
function notify(to, from, type, extra) {
  if (to === from) return;
  const target = db.users[to]; if (!target || target.isBot || blockedEither(to, from)) return;   // bots never get notifications
  const pref = NOTIF_PREF[type]; if (pref && settingsOf(target).notif[pref] === false) return; // user switched this notification off
  const n = Object.assign({ id: id(), to, from, type, created: now(), read: false }, extra || {});
  db.notifs[n.id] = n; save();
  push(to, { type: 'notif' });
}
function handleMentions(text, from, extra) { // notifies @mentioned users who allow it; returns names that don't
  const names = [...new Set((String(text).match(/@([a-z0-9._]{3,20})/gi) || []).map(x => x.slice(1).toLowerCase()))].slice(0, 20);
  const blocked = [];
  for (const n of names) {
    const u = userByName(n); if (!u || u.id === from.id || gone(u) || blockedEither(u.id, from.id)) continue;
    const s = settingsOf(u);
    const ok = s.mentionsFrom === 'everyone' || (s.mentionsFrom === 'followers' && isFollowing(from.id, u.id));
    if (ok) notify(u.id, from.id, 'mention', extra); else blocked.push(u.username);
  }
  return blocked;
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
// Accepts a data URL; returns stored file name. allow: ['image'] or ['image','video']
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
// who may open a non-DM media file: avatars for anyone who can see the user, post media for anyone who can see the post, story media per story rules
function mediaAllowed(file, meta, me, req) {
  const owner = db.users[meta.owner];
  if (!owner) return false;
  if (owner.id === me.id) return true;
  const ses = req && db.sessions[req.sessKey];
  if (me.admin && ses && ses.adminUntil > now()) return true; // unlocked admin can moderate posts/stories (never DM photos)
  if (owner.avatar === file) return !L(owner).blocked.includes(me.id);
  const post = Object.values(db.posts).find(p => p.media === file);
  if (post) return canView(me, db.users[post.uid]);
  const story = Object.values(db.stories).find(s => s.media === file);
  if (story) return storyVisible(story, me);
  return false;
}

// ---------------------------------------------------------------- realtime (Server-Sent Events)
const streams = new Map(); // uid -> Set(res)
function push(uid, ev) {
  const set = streams.get(uid); if (!set) return;
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
  for (const res of set) { try { res.write(line); } catch (e) {} }
}
setInterval(() => { for (const set of streams.values()) for (const res of set) { try { res.write(': ping\n\n'); } catch (e) {} } }, 15000).unref();
function presence(u, me) { // activity status: shown only if BOTH people have it on, and never to blocked/restricted people
  if (!settingsOf(u).activityStatus || !settingsOf(me).activityStatus || L(u).restricted.includes(me.id) || blockedEither(u.id, me.id)) return { online: false, lastActive: null };
  return { online: streams.has(u.id), lastActive: u.lastActive || null };
}

// ---------------------------------------------------------------- auth / sessions
function parseCookies(req) {
  const out = {}; (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) {} } });
  return out;
}
function sessionUser(req) {
  let tok = parseCookies(req).ig_sid;
  const auth = req.headers.authorization || '';
  if (!tok && auth.startsWith('Bearer ')) tok = auth.slice(7);
  if (!tok || tok.length > 200) return null;
  const key = sha(tok);
  const s = db.sessions[key];
  if (!s) return null;
  if (now() - s.created > 30 * 24 * 3600 * 1000) { delete db.sessions[key]; save(); return null; }
  const u = db.users[s.uid];
  if (!u || u.deactivated || u.suspended) return null;
  req.sessKey = key;
  const t = now();
  if (!s.last || t - s.last > 60000) { s.last = t; u.lastActive = t; save(); }
  return u;
}
const sessId = (key) => sha('sid:' + key).slice(0, 16); // public handle of a session (never the token or its hash)
function maskIp(ip) {
  ip = String(ip || '').replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.split('.').slice(0, 2).join('.') + '.x.x';
  if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':…';
  return 'unknown';
}
function deviceOf(ua) {
  ua = String(ua || '');
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
  const br = /; wv\)/.test(ua) ? 'Private Insta app' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /node|undici/i.test(ua) ? 'Script' : 'Browser';
  return br + ' on ' + os;
}
function newSession(res, req, uid) {
  const tok = id(32);
  const meta = { uid, created: now(), last: now(), device: deviceOf(req.headers['user-agent']), ip: maskIp(clientIp(req)) };
  db.sessions[sha(tok)] = meta;
  const u = db.users[uid];
  if (u) { u.logins = (u.logins || []).concat({ t: meta.created, device: meta.device, ip: meta.ip }).slice(-20); u.lastActive = meta.created; }
  save();
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || req.headers['cf-visitor'] ? '; Secure' : '';
  res.setHeader('Set-Cookie', `ig_sid=${tok}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secure}`);
  return tok;
}
function killSessions(uid, exceptKey) { let n = 0; for (const [k, s] of Object.entries(db.sessions)) if (s.uid === uid && k !== exceptKey) { delete db.sessions[k]; n++; } save(); return n; }
function closeStreams(uid) { const set = streams.get(uid); if (set) for (const r of set) { try { r.end(); } catch (e) {} } streams.delete(uid); }
const attempts = new Map(); // brute-force guard: key -> [count, firstTs]
function tooMany(key, limit, count) { // count=false: only check
  const t = now(); let a = attempts.get(key);
  if (!a || t - a[1] > 10 * 60 * 1000) { a = [0, t]; attempts.set(key, a); }
  if (count !== false) a[0]++;
  return a[0] > limit;
}
function clientIp(req) { return String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress).trim(); }
const clearCookie = (res) => res.setHeader('Set-Cookie', 'ig_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');

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
    req.on('end', () => { if (!size) return resolve({}); try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); } catch (e) { reject(httpErr(400, 'Bad JSON')); } });
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

// ---------------------------------------------------------------- tiny zip writer (stored, no compression) for "Download your data"
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {
  const parts = [], central = []; let offset = 0;
  const d = new Date(); const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'); const data = f.data; const crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat(parts.concat([cd, end]));
}

// ---------------------------------------------------------------- routes
const routes = [];
function route(method, pattern, auth, fn) {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, auth, fn });
}
function deleteUserData(me) { // removes a user and everything that points at them
  for (const x of Object.values(db.posts)) if (x.uid === me.id) { for (const c of Object.values(db.comments)) if (c.pid === x.id) delete db.comments[c.id]; dropMedia(x.media); delete db.posts[x.id]; }
  for (const x of Object.values(db.posts)) { x.likes = x.likes.filter(u => u !== me.id); x.saves = x.saves.filter(u => u !== me.id); }
  for (const c of Object.values(db.comments)) if (c.uid === me.id || !db.posts[c.pid]) delete db.comments[c.id];
  for (const st of Object.values(db.stories)) { if (st.uid === me.id) { dropMedia(st.media); delete db.stories[st.id]; } else st.seen = st.seen.filter(u => u !== me.id); }
  for (const m of Object.values(db.messages)) if (m.from === me.id || m.to === me.id) { dropMedia(m.media); delete db.messages[m.id]; }
  for (const k of Object.keys(db.accepted || {})) if (k.split(':').includes(me.id)) delete db.accepted[k];
  for (const n of Object.values(db.notifs)) if (n.to === me.id || n.from === me.id || (n.pid && !db.posts[n.pid])) delete db.notifs[n.id];
  for (const [k, s] of Object.entries(db.sessions)) if (s.uid === me.id) delete db.sessions[k];
  delete db.follows[me.id]; for (const k of Object.keys(db.follows)) db.follows[k] = db.follows[k].filter(u => u !== me.id);
  delete db.requests[me.id]; for (const k of Object.keys(db.requests)) db.requests[k] = db.requests[k].filter(u => u !== me.id);
  for (const u of Object.values(db.users)) for (const k of LIST_KEYS) if (Array.isArray(u[k])) u[k] = u[k].filter(x => x !== me.id);
  closeStreams(me.id);
  dropMedia(me.avatar); delete db.users[me.id];
  save();
}
const noDemo = (me, what) => { if (me.demo) throw httpErr(403, 'The shared demo account cannot ' + what + ' — sign up for your own account to try this'); };
function meView(me) {
  return Object.assign(publicUser(me, me), { bio: me.bio || '', website: me.website || '', pronouns: me.pronouns || '', gender: me.gender || '', admin: !!me.admin, demo: !!me.demo, settings: settingsOf(me) });
}

// ================================================================ accounts
route('POST', '/api/signup', false, async (req, res, b) => {
  if (tooMany('signup:' + clientIp(req), 40)) throw httpErr(429, 'Too many sign-ups from this network, try later');
  const username = clean(b.username, 30).toLowerCase();
  const password = String(b.password || '');
  if (!USERNAME_RE.test(username)) throw httpErr(400, 'Username: 3-20 chars, a-z 0-9 . _ only');
  if (password.length < 6 || password.length > 100) throw httpErr(400, 'Password must be 6-100 characters');
  if (userByName(username)) throw httpErr(409, 'Username already taken');
  const salt = id(16);
  const u = { id: id(), username, name: clean(b.name, 40) || username, bio: '', avatar: null, salt, pass: hashPassword(password, salt), created: now(), logins: [] };
  settingsOf(u); L(u);
  db.users[u.id] = u; db.follows[u.id] = [];
  save(); newSession(res, req, u.id);
  send(res, 201, { user: publicUser(u) });
});
route('POST', '/api/login', false, async (req, res, b) => {
  const username = clean(b.username, 30).toLowerCase();
  const ipKey = 'loginfail:' + clientIp(req), uKey = 'loginfail:' + username;
  if (tooMany(ipKey, 60, false) || tooMany(uKey, 10, false)) throw httpErr(429, 'Too many wrong passwords, wait 10 minutes');
  const u = userByName(username);
  if (!u || u.isBot || !u.pass || !checkPassword(u, String(b.password || ''))) { tooMany(ipKey, 60); tooMany(uKey, 10); throw httpErr(401, 'Wrong username or password'); }
  if (u.suspended) throw httpErr(403, 'This account has been suspended by the admin');
  let reactivated = false;
  if (u.deactivated) { u.deactivated = false; delete u.deactivatedAt; reactivated = true; } // logging in again reactivates (like Instagram)
  newSession(res, req, u.id);
  send(res, 200, { user: publicUser(u), reactivated });
});
route('POST', '/api/logout', false, async (req, res) => {
  const tok = parseCookies(req).ig_sid; if (tok) { delete db.sessions[sha(tok)]; save(); }
  clearCookie(res);
  send(res, 200, { ok: true });
});
route('GET', '/api/me', true, async (req, res, b, me) => {
  const unreadDm = Object.values(db.messages).filter(m => m.to === me.id && !m.seen && !m.deleted && !m.request && !gone(db.users[m.from])).length;
  const msgRequests = new Set(Object.values(db.messages).filter(m => m.to === me.id && m.request && !m.deleted && !gone(db.users[m.from])).map(m => m.from)).size;
  const unreadNotif = Object.values(db.notifs).filter(n => n.to === me.id && !n.read && !blockedEither(me.id, n.from)).length;
  const followRequests = (db.requests[me.id] || []).filter(i => !gone(db.users[i])).length;
  send(res, 200, { user: meView(me), unreadDm, unreadNotif, msgRequests, followRequests, version: VERSION });
});
const ACCENTS = /^#[0-9a-f]{6}$/i;
route('PUT', '/api/me', true, async (req, res, b, me) => {
  if (b.username !== undefined && clean(b.username, 30).toLowerCase() !== me.username) {
    noDemo(me, 'change its username');
    const nu = clean(b.username, 30).toLowerCase();
    if (!USERNAME_RE.test(nu)) throw httpErr(400, 'Username: 3-20 chars, a-z 0-9 . _ only');
    if (userByName(nu)) throw httpErr(409, 'That username is already taken');
    me.username = nu;
  }
  if (b.name !== undefined) me.name = clean(b.name, 40) || me.username;
  if (b.bio !== undefined) me.bio = clean(b.bio, 150);
  if (b.website !== undefined) {
    let w = clean(b.website, 120);
    if (w) {
      if (!/^https?:\/\//i.test(w)) w = 'https://' + w;
      let ok = false; try { const x = new URL(w); ok = (x.protocol === 'https:' || x.protocol === 'http:') && /\./.test(x.hostname); } catch (e) {}
      if (!ok) throw httpErr(400, 'Website must be a valid link, e.g. https://example.com');
    }
    me.website = w;
  }
  if (b.pronouns !== undefined) me.pronouns = clean(b.pronouns, 30);
  if (b.gender !== undefined) me.gender = clean(b.gender, 30);
  if (b.accent !== undefined) { const a = clean(b.accent, 7); if (a && !ACCENTS.test(a)) throw httpErr(400, 'Accent must be a colour like #a78bfa'); me.accent = a || null; }
  if (b.avatar) { const old = me.avatar; me.avatar = storeMedia(b.avatar, me.id, ['image']).file; dropMedia(old); }
  if (b.removeAvatar) { dropMedia(me.avatar); me.avatar = null; }
  save(); send(res, 200, { user: meView(me) });
});
route('DELETE', '/api/me', true, async (req, res, b, me) => {
  if (!checkPassword(me, String(b.password || ''))) throw httpErr(401, 'Password is wrong');
  if (me.demo) throw httpErr(403, 'Demo accounts cannot be deleted');
  if (me.admin) throw httpErr(403, 'The admin account cannot be deleted from the app');
  deleteUserData(me);
  clearCookie(res); send(res, 200, { ok: true });
});
route('POST', '/api/me/deactivate', true, async (req, res, b, me) => {
  if (!checkPassword(me, String(b.password || ''))) throw httpErr(401, 'Password is wrong');
  noDemo(me, 'be deactivated'); if (me.admin) throw httpErr(403, 'The admin account cannot be deactivated');
  me.deactivated = true; me.deactivatedAt = now();
  killSessions(me.id); closeStreams(me.id);
  clearCookie(res); save(); send(res, 200, { ok: true, note: 'Your account is hidden. Log in again any time to reactivate it.' });
});
route('POST', '/api/me/password', true, async (req, res, b, me) => {
  noDemo(me, 'change its password');
  if (tooMany('pwchange:' + me.id, 10, false)) throw httpErr(429, 'Too many tries, wait 10 minutes');
  if (!checkPassword(me, String(b.oldPassword || ''))) { tooMany('pwchange:' + me.id, 10); throw httpErr(401, 'Current password is wrong'); }
  const np = String(b.newPassword || '');
  if (np.length < 6 || np.length > 100) throw httpErr(400, 'New password must be 6-100 characters');
  if (checkPassword(me, np)) throw httpErr(400, 'New password must be different');
  me.salt = id(16); me.pass = hashPassword(np, me.salt);
  const n = killSessions(me.id, req.sessKey); // every other device is logged out
  save(); send(res, 200, { ok: true, loggedOut: n });
});
route('GET', '/api/me/sessions', true, async (req, res, b, me) => {
  const list = Object.entries(db.sessions).filter(([, s]) => s.uid === me.id).sort((a, c) => (c[1].last || c[1].created) - (a[1].last || a[1].created))
    .map(([k, s]) => ({ id: sessId(k), device: s.device || 'Unknown device', ip: s.ip || 'unknown', created: s.created, last: s.last || s.created, current: k === req.sessKey }));
  send(res, 200, { sessions: list, logins: (me.logins || []).slice().reverse() });
});
route('DELETE', '/api/me/sessions/:sid', true, async (req, res, b, me, p) => {
  const k = Object.keys(db.sessions).find(k => db.sessions[k].uid === me.id && sessId(k) === p.sid);
  if (!k) throw httpErr(404, 'Session not found');
  if (k === req.sessKey) throw httpErr(400, 'Use Log out for this device');
  delete db.sessions[k]; save(); send(res, 200, { ok: true });
});
route('POST', '/api/me/logout-others', true, async (req, res, b, me) => {
  if (me.demo) throw httpErr(403, 'The shared demo account cannot log out other people — sign up for your own account to try this');
  send(res, 200, { ok: true, loggedOut: killSessions(me.id, req.sessKey) });
});
route('POST', '/api/me/logout-all', true, async (req, res, b, me) => {
  if (me.demo) throw httpErr(403, 'The shared demo account cannot log out other people — sign up for your own account to try this');
  const n = killSessions(me.id); closeStreams(me.id); clearCookie(res); send(res, 200, { ok: true, loggedOut: n });
});
route('GET', '/api/me/export', true, async (req, res, b, me) => {
  const uname = (i) => (db.users[i] ? db.users[i].username : 'deleted');
  const myPosts = Object.values(db.posts).filter(p => p.uid === me.id).sort((a, c) => a.created - c.created);
  const files = [];
  let total = 0;
  const addMedia = (file, name) => { if (!file) return null; const fp = path.join(MEDIA_DIR, file); try { const st = fs.statSync(fp); if (total + st.size > 60 * 1024 * 1024) return null; total += st.size; files.push({ name, data: fs.readFileSync(fp) }); return name; } catch (e) { return null; } };
  const data = {
    app: APP_NAME + ' v' + VERSION, exportedAt: new Date().toISOString(), note: 'Only your own data. Media files of your posts are in the media/ folder.',
    profile: { username: me.username, name: me.name, bio: me.bio || '', website: me.website || '', pronouns: me.pronouns || '', gender: me.gender || '', accent: me.accent || '', created: new Date(me.created).toISOString(), avatar: addMedia(me.avatar, 'media/avatar.' + String(me.avatar || '').split('.').pop()) },
    settings: settingsOf(me),
    followers: followers(me.id).map(uname), following: following(me.id).map(uname),
    closeFriends: L(me).closeFriends.map(uname), hideStoryFrom: me.storyHidden.map(uname), blocked: me.blocked.map(uname), restricted: me.restricted.map(uname), mutedPosts: me.mutedPosts.map(uname), mutedStories: me.mutedStories.map(uname),
    posts: myPosts.map((p, i) => ({ id: p.id, type: p.type, caption: p.caption, created: new Date(p.created).toISOString(), likes: p.likes.length, commentsOff: !!p.commentsOff, hideLikeCount: !!p.hideLikes, file: addMedia(p.media, 'media/post-' + (i + 1) + '.' + p.media.split('.').pop()) })),
    commentsYouWrote: Object.values(db.comments).filter(c => c.uid === me.id).map(c => ({ postId: c.pid, text: c.text, created: new Date(c.created).toISOString() })),
    likedPostIds: Object.values(db.posts).filter(p => p.likes.includes(me.id)).map(p => p.id),
    savedPostIds: Object.values(db.posts).filter(p => p.saves.includes(me.id)).map(p => p.id),
    messages: Object.values(db.messages).filter(m => (m.from === me.id || m.to === me.id) && !m.deleted).sort((a, c) => a.created - c.created)
      .map(m => ({ with: uname(m.from === me.id ? m.to : m.from), fromYou: m.from === me.id, kind: m.kind, text: m.text || '', created: new Date(m.created).toISOString() })),
    loginActivity: (me.logins || []).map(l => ({ time: new Date(l.t).toISOString(), device: l.device, ip: l.ip })),
  };
  files.unshift({ name: 'your_data.json', data: Buffer.from(JSON.stringify(data, null, 2)) });
  files.unshift({ name: 'README.txt', data: Buffer.from(APP_NAME + ' — your data export (' + me.username + ')\r\nyour_data.json = profile, settings, posts, comments, messages, login activity.\r\nmedia/ = your photos and videos.\r\n') });
  const zip = makeZip(files);
  res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="private-insta-' + me.username + '-data.zip"', 'Content-Length': zip.length, 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' });
  res.end(zip);
});

// ================================================================ settings
const ENUMS = { storyReplies: ['everyone', 'following', 'off'], dmFrom: ['everyone', 'followers', 'nobody'], commentsFrom: ['everyone', 'followers', 'off'], mentionsFrom: ['everyone', 'followers', 'nobody'], theme: ['auto', 'dark', 'light'], language: ['en', 'hi'] };
const BOOLS = ['private', 'readReceipts', 'typing', 'activityStatus'];
route('GET', '/api/settings', true, async (req, res, b, me) => send(res, 200, { settings: settingsOf(me) }));
route('PUT', '/api/settings', true, async (req, res, b, me) => {
  const s = settingsOf(me); const next = JSON.parse(JSON.stringify(s));
  for (const k of BOOLS) if (b[k] !== undefined) { if (typeof b[k] !== 'boolean') throw httpErr(400, k + ' must be true or false'); next[k] = b[k]; }
  for (const [k, vals] of Object.entries(ENUMS)) if (b[k] !== undefined) { if (!vals.includes(b[k])) throw httpErr(400, k + ' must be one of: ' + vals.join(', ')); next[k] = b[k]; }
  if (b.notif !== undefined) {
    if (!b.notif || typeof b.notif !== 'object') throw httpErr(400, 'notif must be an object');
    for (const [k, v] of Object.entries(b.notif)) { if (!(k in DEFAULT_SETTINGS.notif) || typeof v !== 'boolean') throw httpErr(400, 'Unknown notification setting ' + k); next.notif[k] = v; }
  }
  if (b.hiddenWords !== undefined) {
    const arr = Array.isArray(b.hiddenWords) ? b.hiddenWords : String(b.hiddenWords).split(/[,\n]/);
    next.hiddenWords = [...new Set(arr.map(w => clean(w, 30).toLowerCase()).filter(Boolean))].slice(0, 100);
  }
  const wasPrivate = s.private;
  Object.assign(s, next);
  if (wasPrivate && !s.private) { // going public: pending follow requests are approved automatically
    for (const rid of db.requests[me.id] || []) if (db.users[rid] && !isFollowing(rid, me.id)) { following(rid).push(me.id); notify(rid, me.id, 'accept'); }
    db.requests[me.id] = [];
  }
  save(); send(res, 200, { settings: s });
});
const listView = (ids, me) => ids.map(i => db.users[i]).filter(u => u && !gone(u)).map(u => publicUser(u, me));
route('GET', '/api/settings/lists', true, async (req, res, b, me) => {
  L(me);
  send(res, 200, { closeFriends: listView(me.closeFriends, me), storyHidden: listView(me.storyHidden, me), blocked: me.blocked.map(i => db.users[i]).filter(Boolean).map(u => publicUser(u)),
    restricted: listView(me.restricted, me), mutedPosts: listView(me.mutedPosts, me), mutedStories: listView(me.mutedStories, me) });
});
function listToggle(key, add) {
  return async (req, res, b, me, p) => {
    const u = visibleUser(p.username, me); if (u.id === me.id) throw httpErr(400, "You can't do that to yourself");
    const arr = L(me)[key];
    if (add && !arr.includes(u.id)) arr.push(u.id);
    if (!add) me[key] = arr.filter(x => x !== u.id);
    save(); send(res, 200, { ok: true, [key]: add });
  };
}
route('POST', '/api/close-friends/:username', true, listToggle('closeFriends', true));
route('DELETE', '/api/close-friends/:username', true, listToggle('closeFriends', false));
route('POST', '/api/story-hide/:username', true, listToggle('storyHidden', true));
route('DELETE', '/api/story-hide/:username', true, listToggle('storyHidden', false));
route('POST', '/api/users/:username/restrict', true, listToggle('restricted', true));
route('DELETE', '/api/users/:username/restrict', true, listToggle('restricted', false));
route('PUT', '/api/users/:username/mute', true, async (req, res, b, me, p) => {
  const u = visibleUser(p.username, me); if (u.id === me.id) throw httpErr(400, "You can't mute yourself");
  L(me);
  for (const [k, key] of [['posts', 'mutedPosts'], ['stories', 'mutedStories']]) if (b[k] !== undefined) {
    me[key] = me[key].filter(x => x !== u.id); if (b[k]) me[key].push(u.id);
  }
  save(); send(res, 200, { muted: { posts: me.mutedPosts.includes(u.id), stories: me.mutedStories.includes(u.id) } });
});
route('POST', '/api/users/:username/block', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  if (u.id === me.id) throw httpErr(400, "You can't block yourself");
  L(me); if (!me.blocked.includes(u.id)) me.blocked.push(u.id);
  db.follows[me.id] = following(me.id).filter(x => x !== u.id); db.follows[u.id] = following(u.id).filter(x => x !== me.id);
  db.requests[me.id] = (db.requests[me.id] || []).filter(x => x !== u.id); db.requests[u.id] = (db.requests[u.id] || []).filter(x => x !== me.id);
  me.closeFriends = me.closeFriends.filter(x => x !== u.id);
  save(); send(res, 200, { blocked: true });
});
route('DELETE', '/api/users/:username/block', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  me.blocked = L(me).blocked.filter(x => x !== u.id); save(); send(res, 200, { blocked: false });
});

// ================================================================ profiles, follow, follow requests
route('GET', '/api/users/:username', true, async (req, res, b, me, p) => {
  const u = visibleUser(p.username, me);
  const isMe = u.id === me.id; const blockedByMe = L(me).blocked.includes(u.id);
  const locked = !canView(me, u);
  const posts = locked ? [] : Object.values(db.posts).filter(x => x.uid === u.id).sort((a, c) => c.created - a.created)
    .map(x => ({ id: x.id, type: x.type, media: mediaUrl(x.media), likes: (x.hideLikes && !isMe) ? null : x.likes.length + (x.bonusLikes || 0), comments: visibleComments(x, me).length + (x.bonusComments || 0), views: (x.views || []).length + (x.bonusViews || 0) }));
  const user = Object.assign(publicUser(u, me), {
    bio: u.bio || '', website: u.website || '', pronouns: u.pronouns || '',
    posts: Object.values(db.posts).filter(x => x.uid === u.id).length, followers: followerCount(u), following: following(u.id).filter(i => !gone(db.users[i])).length,
    isMe, isFollowing: isFollowing(me.id, u.id), followsYou: isFollowing(u.id, me.id), requested: (db.requests[u.id] || []).includes(me.id),
    locked, blockedByMe, restricted: L(me).restricted.includes(u.id), closeFriend: me.closeFriends.includes(u.id), storyHidden: me.storyHidden.includes(u.id),
    muted: { posts: me.mutedPosts.includes(u.id), stories: me.mutedStories.includes(u.id) },
  });
  if (isMe) Object.assign(user, { gender: u.gender || '' });
  if (blockedByMe) { user.hasStory = false; }
  send(res, 200, { user, posts });
});
function pageArgs(q, total) { // ?offset=&limit= with sane bounds; no args = first 60 (v1.1 clients still work)
  const offset = Math.max(0, Math.min(parseInt((q && q.get('offset')) || '0', 10) || 0, total));
  const limit = Math.max(1, Math.min(parseInt((q && q.get('limit')) || '60', 10) || 60, 100));
  return { offset, limit };
}
route('GET', '/api/users/:username/:list', true, async (req, res, b, me, p, q) => {
  const u = visibleUser(p.username, me);
  if (!canView(me, u)) throw httpErr(403, 'This account is private');
  let ids;
  if (p.list === 'followers') ids = followers(u.id).reverse(); else if (p.list === 'following') ids = following(u.id).slice().reverse(); else throw httpErr(404, 'Not found');
  // newest first, real people before bots; paginated (?offset=&limit=) so a boosted account with thousands of followers stays fast
  const all = ids.map(i => db.users[i]).filter(x => x && !gone(x) && !blockedEither(x.id, me.id)).sort((a, c) => (a.isBot ? 1 : 0) - (c.isBot ? 1 : 0));
  const { offset, limit } = pageArgs(q, all.length);
  const page = all.slice(offset, offset + limit);
  send(res, 200, { users: page.map(x => Object.assign(publicUser(x, me), { isFollowing: isFollowing(me.id, x.id), followsYou: isFollowing(x.id, me.id), requested: (db.requests[x.id] || []).includes(me.id), isMe: x.id === me.id })),
    total: all.length, offset, next: offset + limit < all.length ? offset + limit : null });
});
route('POST', '/api/users/:username/follow', true, async (req, res, b, me, p) => {
  const u = visibleUser(p.username, me);
  if (u.id === me.id) throw httpErr(400, "You can't follow yourself");
  if (L(me).blocked.includes(u.id)) throw httpErr(403, 'Unblock ' + u.username + ' to follow them');
  if (isFollowing(me.id, u.id)) return send(res, 200, { following: true, requested: false, followers: followerCount(u) });
  if (settingsOf(u).private) { // private account: a follow request the owner must approve
    const r = db.requests[u.id] || (db.requests[u.id] = []);
    if (!r.includes(me.id)) { r.push(me.id); notify(u.id, me.id, 'request'); }
    save(); return send(res, 200, { following: false, requested: true, followers: followerCount(u) });
  }
  following(me.id).push(u.id); notify(u.id, me.id, 'follow');
  save(); send(res, 200, { following: true, requested: false, followers: followerCount(u) });
});
route('DELETE', '/api/users/:username/follow', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  db.follows[me.id] = following(me.id).filter(x => x !== u.id);
  db.requests[u.id] = (db.requests[u.id] || []).filter(x => x !== me.id);
  save(); send(res, 200, { following: false, requested: false, followers: followerCount(u) });
});
route('DELETE', '/api/followers/:username', true, async (req, res, b, me, p) => { // remove a follower
  const u = userByName(p.username); if (!u) throw httpErr(404, 'User not found');
  db.follows[u.id] = following(u.id).filter(x => x !== me.id); save(); send(res, 200, { ok: true });
});
route('GET', '/api/requests', true, async (req, res, b, me) => {
  send(res, 200, { requests: (db.requests[me.id] || []).map(i => db.users[i]).filter(u => u && !gone(u)).map(u => Object.assign(publicUser(u, me), { isFollowing: isFollowing(me.id, u.id) })) });
});
route('POST', '/api/requests/:username/accept', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); const r = db.requests[me.id] || [];
  if (!u || !r.includes(u.id)) throw httpErr(404, 'Request not found');
  db.requests[me.id] = r.filter(x => x !== u.id);
  if (!isFollowing(u.id, me.id)) following(u.id).push(me.id);
  notify(u.id, me.id, 'accept');
  for (const n of Object.values(db.notifs)) if (n.to === me.id && n.from === u.id && n.type === 'request') n.type = 'follow';
  save(); send(res, 200, { ok: true, followers: followerCount(me) });
});
route('DELETE', '/api/requests/:username', true, async (req, res, b, me, p) => {
  const u = userByName(p.username); const r = db.requests[me.id] || [];
  if (!u || !r.includes(u.id)) throw httpErr(404, 'Request not found');
  db.requests[me.id] = r.filter(x => x !== u.id);
  for (const n of Object.values(db.notifs)) if (n.to === me.id && n.from === u.id && n.type === 'request') delete db.notifs[n.id];
  save(); send(res, 200, { ok: true });
});
route('GET', '/api/search', true, async (req, res, b, me, p, q) => {
  const s = clean(q.get('q'), 30).toLowerCase();
  let list = Object.values(db.users).filter(u => u.id !== me.id && !gone(u) && !blockedEither(u.id, me.id));
  if (s) list = list.filter(u => u.username.includes(s) || (u.name || '').toLowerCase().includes(s));
  else list = list.filter(u => !isFollowing(me.id, u.id));
  list = list.filter(u => !u.isBot).concat(list.filter(u => u.isBot)); // real people first, then bots (they look like normal accounts)
  send(res, 200, { users: list.slice(0, 30).map(u => Object.assign(publicUser(u, me), { isFollowing: isFollowing(me.id, u.id), requested: (db.requests[u.id] || []).includes(me.id), followers: followerCount(u) })) });
});

// ================================================================ posts
function listPosts(filter, q, me) {
  const before = parseInt(q.get('before') || '0', 10) || Infinity;
  const limit = Math.min(parseInt(q.get('limit') || '12', 10) || 12, 30);
  const rows = Object.values(db.posts).filter(x => canView(me, db.users[x.uid])).filter(filter).filter(x => x.created < before).sort((a, c) => c.created - a.created);
  return { posts: rows.slice(0, limit).map(x => postView(x, me)), more: rows.length > limit };
}
route('GET', '/api/feed', true, async (req, res, b, me, p, q) => {
  const f = new Set(following(me.id).filter(x => !L(me).mutedPosts.includes(x)).concat(me.id));
  send(res, 200, listPosts(x => f.has(x.uid), q, me));
});
route('GET', '/api/explore', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.uid !== me.id && !L(me).mutedPosts.includes(x.uid), q, me)));
route('GET', '/api/reels', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.type === 'video', q, me)));
route('GET', '/api/saved', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.saves.includes(me.id), q, me)));
route('POST', '/api/posts', true, async (req, res, b, me) => {
  const caption = clean(b.caption, 2200);
  const m = storeMedia(b.media, me.id, ['image', 'video']);
  const post = { id: id(), uid: me.id, media: m.file, type: m.kind, caption, created: now(), likes: [], saves: [], views: [], commentsOff: !!b.commentsOff, hideLikes: !!b.hideLikes };
  db.posts[post.id] = post; save();
  const mentionBlocked = handleMentions(caption, me, { pid: post.id, text: caption.slice(0, 80) });
  send(res, 201, { post: postView(post, me), mentionBlocked });
});
function getPost(pid) { const x = db.posts[pid]; if (!x) throw httpErr(404, 'Post not found'); return x; }
function viewPost(pid, me) { // a post the caller is allowed to see (private account / block / deactivated enforced here)
  const x = getPost(pid); const owner = db.users[x.uid];
  if (!owner || (x.uid !== me.id && (gone(owner) || blockedEither(me.id, owner.id)))) throw httpErr(404, 'Post not found');
  if (!canView(me, owner)) throw httpErr(403, 'This account is private');
  return x;
}
route('GET', '/api/posts/:id', true, async (req, res, b, me, p) => send(res, 200, { post: postView(viewPost(p.id, me), me) }));
route('PUT', '/api/posts/:id', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (x.uid !== me.id) throw httpErr(403, 'You can only edit your own post');
  if (b.caption !== undefined) x.caption = clean(b.caption, 2200);
  if (b.commentsOff !== undefined) x.commentsOff = !!b.commentsOff;
  if (b.hideLikes !== undefined) x.hideLikes = !!b.hideLikes;
  save(); send(res, 200, { post: postView(x, me) });
});
function removePost(x) {
  for (const c of Object.values(db.comments)) if (c.pid === x.id) delete db.comments[c.id];
  for (const n of Object.values(db.notifs)) if (n.pid === x.id) delete db.notifs[n.id];
  dropMedia(x.media); delete db.posts[x.id]; save();
}
route('DELETE', '/api/posts/:id', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); if (x.uid !== me.id) throw httpErr(403, 'You can only delete your own post');
  removePost(x); send(res, 200, { ok: true });
});
const likeCount = (x) => x.likes.length + (x.bonusLikes || 0);
route('GET', '/api/posts/:id/likes', true, async (req, res, b, me, p, q) => { // "Liked by" list (paginated)
  const x = viewPost(p.id, me);
  if (x.hideLikes && x.uid !== me.id) throw httpErr(403, 'The owner hid the likes on this post');
  const all = x.likes.slice().reverse().map(i => db.users[i]).filter(u => u && !gone(u) && !blockedEither(u.id, me.id)).sort((a, c) => (a.isBot ? 1 : 0) - (c.isBot ? 1 : 0));
  const { offset, limit } = pageArgs(q, all.length);
  send(res, 200, { users: all.slice(offset, offset + limit).map(u => Object.assign(publicUser(u, me), { isFollowing: isFollowing(me.id, u.id), requested: (db.requests[u.id] || []).includes(me.id), isMe: u.id === me.id })),
    total: all.length, offset, next: offset + limit < all.length ? offset + limit : null });
});
route('POST', '/api/posts/:id/like', true, async (req, res, b, me, p) => {
  const x = viewPost(p.id, me); if (!x.likes.includes(me.id)) { x.likes.push(me.id); notify(x.uid, me.id, 'like', { pid: x.id }); }
  save(); send(res, 200, { liked: true, likes: (x.hideLikes && x.uid !== me.id) ? null : likeCount(x) });
});
route('DELETE', '/api/posts/:id/like', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); x.likes = x.likes.filter(u => u !== me.id); save(); send(res, 200, { liked: false, likes: (x.hideLikes && x.uid !== me.id) ? null : likeCount(x) });
});
route('POST', '/api/posts/:id/view', true, async (req, res, b, me, p) => {
  const x = viewPost(p.id, me); if (!Array.isArray(x.views)) x.views = [];
  if (x.uid !== me.id && !x.views.includes(me.id)) { x.views.push(me.id); save(); }
  send(res, 200, { views: x.views.length + (x.bonusViews || 0) });
});
route('POST', '/api/posts/:id/save', true, async (req, res, b, me, p) => {
  const x = viewPost(p.id, me); if (!x.saves.includes(me.id)) x.saves.push(me.id); save(); send(res, 200, { saved: true });
});
route('DELETE', '/api/posts/:id/save', true, async (req, res, b, me, p) => {
  const x = getPost(p.id); x.saves = x.saves.filter(u => u !== me.id); save(); send(res, 200, { saved: false });
});
route('GET', '/api/posts/:id/comments', true, async (req, res, b, me, p) => {
  const x = viewPost(p.id, me);
  const list = visibleComments(x, me).sort((a, c) => a.created - c.created)
    .map(c => ({ id: c.id, text: c.text, created: c.created, user: publicUser(db.users[c.uid]), canDelete: c.uid === me.id || x.uid === me.id, hidden: !!(c.hidden || c.restricted) }));
  send(res, 200, { comments: list, canComment: !commentBlockReason(x, me), note: commentBlockReason(x, me) });
});
route('POST', '/api/posts/:id/comments', true, async (req, res, b, me, p) => {
  const x = viewPost(p.id, me); const text = clean(b.text, 500); if (!text) throw httpErr(400, 'Comment is empty');
  const why = commentBlockReason(x, me); if (why) throw httpErr(403, why);
  const owner = db.users[x.uid]; const words = settingsOf(owner).hiddenWords; const low = text.toLowerCase();
  const c = { id: id(), pid: x.id, uid: me.id, text, created: now() };
  if (me.id !== owner.id && words.some(w => w && low.includes(w))) c.hidden = true;        // hidden words filter
  if (L(owner).restricted.includes(me.id)) c.restricted = true;                             // restricted: only they (and the owner) see it
  db.comments[c.id] = c;
  if (!c.hidden && !c.restricted) { notify(x.uid, me.id, 'comment', { pid: x.id, text: text.slice(0, 80) }); handleMentions(text, me, { pid: x.id, text: text.slice(0, 80) }); }
  save();
  send(res, 201, { comment: { id: c.id, text, created: c.created, user: publicUser(me), canDelete: true, hidden: !!(c.hidden || c.restricted) } });
});
route('DELETE', '/api/comments/:id', true, async (req, res, b, me, p) => {
  const c = db.comments[p.id]; if (!c) throw httpErr(404, 'Comment not found');
  const post = db.posts[c.pid];
  if (c.uid !== me.id && !(post && post.uid === me.id)) throw httpErr(403, 'You can only delete your own comments');
  delete db.comments[c.id]; save(); send(res, 200, { ok: true });
});

// ================================================================ stories
route('GET', '/api/stories', true, async (req, res, b, me) => {
  const ids = [me.id].concat(following(me.id).filter(x => !L(me).mutedStories.includes(x)));
  const tray = ids.map(i => db.users[i]).filter(u => u && (u.id === me.id || !gone(u)) && storiesFor(u.id, me).length)
    .map(u => Object.assign(publicUser(u, me), { isMe: u.id === me.id, latest: storiesFor(u.id, me).slice(-1)[0].created }));
  const mine = tray.filter(x => x.isMe); const rest = tray.filter(x => !x.isMe).sort((a, c) => (a.storySeen - c.storySeen) || (c.latest - a.latest));
  send(res, 200, { tray: mine.concat(rest), meHasStory: mine.length > 0 });
});
function canReplyStory(owner, me) {
  if (owner.id === me.id) return false;
  const r = settingsOf(owner).storyReplies;
  return r === 'everyone' || (r === 'following' && isFollowing(owner.id, me.id));
}
route('GET', '/api/stories/:username', true, async (req, res, b, me, p) => {
  const u = visibleUser(p.username, me);
  const list = storiesFor(u.id, me).map(s => ({ id: s.id, media: mediaUrl(s.media), type: s.type, created: s.created, close: !!s.close, seen: s.seen.includes(me.id),
    viewers: u.id === me.id ? s.seen.filter(v => v !== me.id).map(v => publicUser(db.users[v])).filter(Boolean) : undefined,
    views: u.id === me.id ? s.seen.filter(v => v !== me.id).length + (s.bonusViews || 0) : undefined }));
  send(res, 200, { user: publicUser(u, me), stories: list, canReply: canReplyStory(u, me) });
});
route('POST', '/api/stories', true, async (req, res, b, me) => {
  const m = storeMedia(b.media, me.id, ['image', 'video']);
  const s = { id: id(), uid: me.id, media: m.file, type: m.kind, created: now(), seen: [], close: !!b.closeFriends };
  db.stories[s.id] = s; save(); send(res, 201, { story: { id: s.id, media: mediaUrl(s.media), created: s.created, close: s.close } });
});
function liveStory(sid, me) {
  const s = db.stories[sid]; if (!s || now() - s.created >= STORY_TTL) throw httpErr(404, 'Story not found');
  if (!storyVisible(s, me)) throw httpErr(403, 'You cannot view this story');
  return s;
}
route('POST', '/api/stories/:id/seen', true, async (req, res, b, me, p) => {
  const s = liveStory(p.id, me);
  if (!s.seen.includes(me.id)) { s.seen.push(me.id); save(); }
  send(res, 200, { ok: true });
});
route('POST', '/api/stories/:id/reply', true, async (req, res, b, me, p) => {
  const s = liveStory(p.id, me); const owner = db.users[s.uid];
  if (!canReplyStory(owner, me)) throw httpErr(403, owner.username + ' has turned off story replies');
  const text = clean(b.text, 1000); if (!text) throw httpErr(400, 'Reply is empty');
  const m = deliver(me, owner, { kind: 'text', text: '↩️ Replied to your story: ' + text }, true);
  send(res, 201, { message: messageView(m, me) });
});
route('DELETE', '/api/stories/:id', true, async (req, res, b, me, p) => {
  const s = db.stories[p.id]; if (!s) throw httpErr(404, 'Story not found');
  if (s.uid !== me.id) throw httpErr(403, 'You can only delete your own story');
  dropMedia(s.media); delete db.stories[s.id]; save(); send(res, 200, { ok: true });
});

// ================================================================ direct messages
// A conversation is always "me + the other user", so nobody can address someone else's chat.
function pendingRequest(from, to) { return Object.values(db.messages).some(m => m.from === from && m.to === to && m.request && !m.deleted); }
function acceptConv(a, b) { const key = convKey(a, b); db.accepted[key] = true; for (const m of Object.values(db.messages)) if (m.conv === key && m.request) m.request = false; save(); }
// decides where a new message from `me` to `u` lands: 'inbox' or 'request'; throws if not allowed at all
function dmLane(me, u, isStoryReply) {
  if (blockedEither(me.id, u.id)) throw httpErr(403, "You can't message this account");
  const key = convKey(me.id, u.id);
  if (pendingRequest(u.id, me.id)) { acceptConv(me.id, u.id); return 'inbox'; }  // replying to a request accepts it
  if (L(u).restricted.includes(me.id)) return 'request';                          // restricted people land in Requests
  if (db.accepted[key] || isFollowing(u.id, me.id)) return 'inbox';               // they follow me / chat already accepted
  const s = settingsOf(u);
  if (s.dmFrom === 'everyone') return 'inbox';
  if (s.dmFrom === 'followers' && isFollowing(me.id, u.id)) return 'inbox';
  if (s.dmFrom === 'followers' || isStoryReply) return 'request';                 // strangers -> Message requests
  throw httpErr(403, u.username + " isn't accepting messages");
}
function deliver(me, u, fields, isStoryReply) {
  const lane = dmLane(me, u, isStoryReply);
  const key = convKey(me.id, u.id);
  if (lane === 'inbox') db.accepted[key] = true;
  const m = Object.assign({ id: id(), conv: key, from: me.id, to: u.id, created: now(), seen: 0, request: lane === 'request' }, fields);
  db.messages[m.id] = m; save();
  push(u.id, { type: 'dm', from: me.username, request: m.request, quiet: !settingsOf(u).notif.messages, message: messageView(m, u) });
  push(me.id, { type: 'dm_echo', to: u.username, message: messageView(m, me) });
  return m;
}
const activeMsgs = (me) => Object.values(db.messages).filter(m => !m.deleted && (m.from === me.id || m.to === me.id) && !gone(db.users[m.from === me.id ? m.to : m.from]));
function convList(me, requests) {
  const convs = new Map();
  for (const m of activeMsgs(me)) {
    const isReqForMe = m.request && m.to === me.id;
    if (!!requests !== isReqForMe) continue;
    const other = m.from === me.id ? m.to : m.from;
    const c = convs.get(other) || { last: null, unread: 0 };
    if (!c.last || m.created > c.last.created) c.last = m;
    if (m.to === me.id && !m.seen) c.unread++;
    convs.set(other, c);
  }
  return [...convs.entries()].filter(([o]) => db.users[o]).map(([o, c]) => ({ user: publicUser(db.users[o], me), last: messageView(c.last, me), unread: c.unread }))
    .sort((a, c) => c.last.created - a.last.created);
}
route('GET', '/api/inbox', true, async (req, res, b, me) => {
  const reqCount = convList(me, true).length;
  send(res, 200, { conversations: convList(me, false), requests: reqCount });
});
route('GET', '/api/inbox/requests', true, async (req, res, b, me) => send(res, 200, { conversations: convList(me, true) }));
function otherUser(name, me) { const u = visibleUser(name, me); if (u.id === me.id) throw httpErr(400, "You can't message yourself"); return u; }
function markSeen(me, u) {
  const key = convKey(me.id, u.id); let changed = false;
  for (const m of Object.values(db.messages)) if (m.conv === key && m.to === me.id && !m.seen && !m.request) { m.seen = now(); changed = true; }
  if (changed) { save(); if (readReceiptsOn(me) && !L(me).restricted.includes(u.id)) push(u.id, { type: 'seen', by: me.username }); }
}
route('GET', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id);
  const msgs = Object.values(db.messages).filter(m => m.conv === key && !m.deleted).sort((a, c) => a.created - c.created);
  const isRequest = msgs.some(m => m.request && m.to === me.id);
  if (!isRequest) markSeen(me, u); // opening a message request does not tell the sender you saw it
  let canMessage = true, why = null;
  if (blockedEither(me.id, u.id)) { canMessage = false; why = L(me).blocked.includes(u.id) ? 'You blocked this account' : "You can't message this account"; }
  else if (!isRequest) { try { const s = settingsOf(u); if (!db.accepted[key] && !isFollowing(u.id, me.id) && s.dmFrom === 'nobody' && !pendingRequest(u.id, me.id)) { canMessage = false; why = u.username + " isn't accepting messages"; } } catch (e) {} }
  send(res, 200, { user: Object.assign(publicUser(u, me), presence(u, me)), messages: msgs.slice(-200).map(m => messageView(m, me)), isRequest, canMessage, why });
});
route('POST', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me);
  const fields = {};
  if (b.postId) { const post = viewPost(String(b.postId), me); fields.kind = 'post'; fields.postId = post.id; fields.text = clean(b.text, 1000); }
  else if (b.media) { fields.kind = 'image'; fields.text = clean(b.text, 1000); }
  else { fields.kind = 'text'; fields.text = clean(b.text, 2000); if (!fields.text) throw httpErr(400, 'Message is empty'); }
  dmLane(me, u); // permission check before storing any photo
  if (b.media && !b.postId) fields.media = storeMedia(b.media, me.id, ['image'], convKey(me.id, u.id)).file;
  const m = deliver(me, u, fields);
  send(res, 201, { message: messageView(m, me), request: m.request });
});
route('POST', '/api/dm/:username/accept', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); if (!pendingRequest(u.id, me.id)) throw httpErr(404, 'No message request from ' + u.username);
  acceptConv(me.id, u.id); markSeen(me, u); send(res, 200, { ok: true });
});
route('DELETE', '/api/dm/:username/request', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); let n = 0;
  for (const m of Object.values(db.messages)) if (m.from === u.id && m.to === me.id && m.request) { dropMedia(m.media); delete db.messages[m.id]; n++; }
  if (!n) throw httpErr(404, 'No message request from ' + u.username);
  save(); send(res, 200, { ok: true, deleted: n });
});
route('POST', '/api/dm/:username/typing', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me);
  if (blockedEither(me.id, u.id)) throw httpErr(403, "You can't message this account");
  const key = convKey(me.id, u.id);
  // typing indicator: only if I allow it, and only inside an accepted chat
  if (settingsOf(me).typing && (db.accepted[key] || isFollowing(u.id, me.id)) && !L(u).restricted.includes(me.id)) push(u.id, { type: 'typing', from: me.username });
  send(res, 200, { ok: true });
});
route('POST', '/api/dm/:username/seen', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); markSeen(me, u); send(res, 200, { ok: true });
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

// ================================================================ notifications
route('GET', '/api/notifications', true, async (req, res, b, me) => {
  const list = Object.values(db.notifs).filter(n => n.to === me.id && db.users[n.from] && !gone(db.users[n.from]) && !blockedEither(me.id, n.from)).sort((a, c) => c.created - a.created).slice(0, 60)
    .map(n => { const pst = n.pid && db.posts[n.pid]; return { id: n.id, type: n.type, created: n.created, read: n.read, text: n.text || '', user: Object.assign(publicUser(db.users[n.from], me), { isFollowing: isFollowing(me.id, n.from), requested: (db.requests[n.from] || []).includes(me.id) }), post: pst && canView(me, db.users[pst.uid]) ? { id: pst.id, media: mediaUrl(pst.media), type: pst.type } : null }; });
  send(res, 200, { notifications: list, followRequests: (db.requests[me.id] || []).filter(i => db.users[i] && !gone(db.users[i])).length });
});
route('POST', '/api/notifications/read', true, async (req, res, b, me) => {
  for (const n of Object.values(db.notifs)) if (n.to === me.id) n.read = true; save(); send(res, 200, { ok: true });
});

// ================================================================ admin (hidden panel; every route checks the role on the server)
const ADMIN_UNLOCK_MS = 30 * 60 * 1000;
function requireAdmin(req, me) {
  if (!me || !me.admin) throw httpErr(403, 'Admins only');
  const s = db.sessions[req.sessKey];
  if (!s || !s.adminUntil || s.adminUntil < now()) throw httpErr(401, 'Admin panel locked — confirm your password');
}
route('POST', '/api/admin/unlock', true, async (req, res, b, me) => {
  if (!me.admin) throw httpErr(403, 'Admins only');
  if (tooMany('adminunlock:' + me.id, 8, false)) throw httpErr(429, 'Too many tries, wait 10 minutes');
  if (!checkPassword(me, String(b.password || ''))) { tooMany('adminunlock:' + me.id, 8); throw httpErr(401, 'Wrong password'); }
  db.sessions[req.sessKey].adminUntil = now() + ADMIN_UNLOCK_MS; save();
  send(res, 200, { ok: true, until: db.sessions[req.sessKey].adminUntil });
});
const adminRoute = (method, pattern, fn) => route(method, pattern, true, async (req, res, b, me, p, q) => { requireAdmin(req, me); return fn(req, res, b, me, p, q); });
adminRoute('GET', '/api/admin/stats', async (req, res) => {
  const t = now();
  send(res, 200, { stats: {
    users: Object.values(db.users).filter(u => !u.isBot).length, bots: botIds().length, activeToday: Object.values(db.users).filter(u => u.lastActive && t - u.lastActive < 864e5).length, onlineNow: streams.size,
    posts: Object.values(db.posts).filter(p => p.type === 'image').length, reels: Object.values(db.posts).filter(p => p.type === 'video').length,
    stories: Object.values(db.stories).filter(s => t - s.created < STORY_TTL).length, comments: Object.values(db.comments).filter(c => !c.bot).length, botComments: Object.values(db.comments).filter(c => c.bot).length,
    messages: Object.values(db.messages).filter(m => !m.deleted).length, likes: Object.values(db.posts).reduce((a, p) => a + p.likes.filter(i => !isBotId(i)).length, 0),
    botFollows: Object.entries(db.follows).reduce((a, [k, v]) => a + (isBotId(k) ? (v || []).length : 0), 0), botLikes: Object.values(db.posts).reduce((a, p) => a + botLikesOf(p).length, 0),
    privateAccounts: Object.values(db.users).filter(u => !u.isBot && settingsOf(u).private).length, suspended: Object.values(db.users).filter(u => u.suspended).length,
  }, version: VERSION });
});
function adminUser(u) {
  return { id: u.id, username: u.username, name: u.name, avatar: mediaUrl(u.avatar), verified: !!u.verified, admin: !!u.admin, demo: !!u.demo, suspended: !!u.suspended, deactivated: !!u.deactivated,
    created: u.created, lastActive: u.lastActive || null, posts: Object.values(db.posts).filter(p => p.uid === u.id).length,
    realFollowers: followers(u.id).filter(i => !isBotId(i)).length, botFollowers: botFollowersOf(u.id).length, extraFollowers: u.bonusFollowers || 0,
    bonusFollowers: botFollowersOf(u.id).length + (u.bonusFollowers || 0), shownFollowers: followerCount(u), following: following(u.id).length, private: settingsOf(u).private };
}
adminRoute('GET', '/api/admin/users', async (req, res, b, me, p, q) => {
  const s = clean(q.get('q'), 30).toLowerCase();
  let list = Object.values(db.users).filter(u => !u.isBot); if (s) list = list.filter(u => u.username.includes(s) || (u.name || '').toLowerCase().includes(s));
  send(res, 200, { users: list.sort((a, c) => c.created - a.created).slice(0, 200).map(adminUser) });
});
const adminTarget = (name) => { const u = userByName(name); if (!u) throw httpErr(404, 'User not found'); return u; };
const boostNum = (v, cur) => { const n = Number(v); if (!Number.isFinite(n) || Math.abs(n) > 1e8) throw httpErr(400, 'Enter a number'); return Math.max(0, Math.round(n)); };
adminRoute('PUT', '/api/admin/users/:username', async (req, res, b, me, p) => {
  const u = adminTarget(p.username);
  if (b.verified !== undefined) u.verified = !!b.verified;
  // v1.2: follower boosts are real follow edges from bot accounts (they show in the followers list); only bot edges are ever removed
  if (b.bonusFollowers !== undefined) { const n = boostNum(b.bonusFollowers); delete u.bonusFollowers; setBotFollowers(u, n); }                 // set total boost
  if (b.addFollowers !== undefined) { const add = Number(b.addFollowers); if (!Number.isFinite(add)) throw httpErr(400, 'Enter a number'); setBotFollowers(u, boostNum(botFollowersOf(u.id).length + add)); } // add (negative = remove bots)
  if (b.suspended !== undefined) {
    if (u.admin && b.suspended) throw httpErr(400, 'An admin cannot be suspended');
    u.suspended = !!b.suspended; if (u.suspended) { killSessions(u.id); closeStreams(u.id); }
  }
  save(); send(res, 200, { user: adminUser(u) });
});
adminRoute('DELETE', '/api/admin/users/:username', async (req, res, b, me, p) => {
  const u = adminTarget(p.username); if (u.admin) throw httpErr(400, 'An admin cannot be deleted');
  deleteUserData(u); send(res, 200, { ok: true });
});
function adminPost(x) {
  return { id: x.id, type: x.type, media: mediaUrl(x.media), caption: x.caption.slice(0, 120), created: x.created, user: db.users[x.uid] ? db.users[x.uid].username : '?',
    realLikes: x.likes.filter(i => !isBotId(i)).length, bonusLikes: botLikesOf(x).length + (x.bonusLikes || 0), botLikes: botLikesOf(x).length,
    realComments: Object.values(db.comments).filter(c => c.pid === x.id && !c.bot).length, bonusComments: botCommentsOf(x).length + (x.bonusComments || 0), botComments: botCommentsOf(x).length,
    realViews: (x.views || []).length, bonusViews: x.bonusViews || 0 };
}
adminRoute('GET', '/api/admin/posts', async (req, res, b, me, p, q) => {
  const user = clean(q.get('user'), 30).toLowerCase(); const u = user ? userByName(user) : null;
  let list = Object.values(db.posts); if (user) list = list.filter(x => u && x.uid === u.id);
  send(res, 200, { posts: list.sort((a, c) => c.created - a.created).slice(0, 100).map(adminPost) });
});
adminRoute('PUT', '/api/admin/posts/:id', async (req, res, b, me, p) => {
  const x = getPost(p.id);
  const num = (v) => { const n = Number(v); if (!Number.isFinite(n)) throw httpErr(400, 'Enter a number'); return n; };
  // likes + comments = bot entries (names show in "Liked by" / comments); views stay a number
  if (b.bonusLikes !== undefined) { delete x.bonusLikes; setBotLikes(x, boostNum(b.bonusLikes)); }
  if (b.addLikes !== undefined) setBotLikes(x, boostNum(botLikesOf(x).length + num(b.addLikes)));
  if (b.bonusComments !== undefined) { delete x.bonusComments; setBotComments(x, boostNum(b.bonusComments)); }
  if (b.addComments !== undefined) setBotComments(x, boostNum(botCommentsOf(x).length + num(b.addComments)));
  if (b.bonusViews !== undefined) x.bonusViews = boostNum(b.bonusViews);
  if (b.addViews !== undefined) x.bonusViews = boostNum((x.bonusViews || 0) + num(b.addViews));
  save(); send(res, 200, { post: adminPost(x) });
});
adminRoute('POST', '/api/admin/reset-boosts', async (req, res, b) => { // all boosts, or one user's (b.username)
  const u = b.username ? adminTarget(String(b.username)) : null;
  for (const x of Object.values(db.users)) if (!x.isBot && (!u || x.id === u.id)) { delete x.bonusFollowers; if (botFollowersOf(x.id).length) setBotFollowers(x, 0, { noCap: true }); }
  for (const x of Object.values(db.posts)) if (!u || x.uid === u.id) { delete x.bonusLikes; delete x.bonusComments; delete x.bonusViews; setBotLikes(x, 0, { noCap: true }); setBotComments(x, 0, { noCap: true }); }
  for (const x of Object.values(db.stories)) if (!u || x.uid === u.id) delete x.bonusViews;
  save(); send(res, 200, { ok: true });
});
adminRoute('GET', '/api/admin/bots', async (req, res, b, me, p, q) => { // Bots tab: pool size, who has bots, a page of bots
  const boosted = [];
  for (const u of Object.values(db.users)) {
    if (u.isBot) continue;
    const f = botFollowersOf(u.id).length; let l = 0, c = 0;
    for (const x of Object.values(db.posts)) if (x.uid === u.id) { l += botLikesOf(x).length; c += botCommentsOf(x).length; }
    if (f || l || c) boosted.push({ username: u.username, name: u.name, avatar: mediaUrl(u.avatar), verified: !!u.verified, botFollowers: f, botLikes: l, botComments: c, realFollowers: followers(u.id).filter(i => !isBotId(i)).length });
  }
  const ids = botIds(); const { offset, limit } = pageArgs(q, ids.length);
  const list = ids.slice().reverse().slice(offset, offset + Math.min(limit, 50)).map(i => db.users[i]).map(u => ({ username: u.username, name: u.name, avatar: botAvatarUrl(u), bio: u.bio, private: !!u.priv, follows: (db.follows[u.id] || []).length }));
  send(res, 200, { total: ids.length, poolCap: BOT_POOL_CAP, actionCap: BOT_ACTION_CAP, boosted: boosted.sort((a, c) => c.botFollowers - a.botFollowers), bots: list, offset, next: offset + 50 < ids.length ? offset + 50 : null });
});
adminRoute('DELETE', '/api/admin/users/:username/bots', async (req, res, b, me, p) => {
  const u = adminTarget(p.username); if (u.isBot) throw httpErr(400, 'That is a bot');
  const removed = removeAllBotsFrom(u); send(res, 200, { ok: true, removed, user: adminUser(u) });
});
adminRoute('GET', '/api/admin/stories', async (req, res) => {
  const t = now();
  send(res, 200, { stories: Object.values(db.stories).filter(s => t - s.created < STORY_TTL).sort((a, c) => c.created - a.created).slice(0, 100)
    .map(s => ({ id: s.id, media: mediaUrl(s.media), type: s.type, created: s.created, user: db.users[s.uid] ? db.users[s.uid].username : '?', realViews: s.seen.length, bonusViews: s.bonusViews || 0, close: !!s.close })) });
});
adminRoute('PUT', '/api/admin/stories/:id', async (req, res, b, me, p) => {
  const s = db.stories[p.id]; if (!s) throw httpErr(404, 'Story not found');
  if (b.bonusViews !== undefined) s.bonusViews = boostNum(b.bonusViews);
  if (b.addViews !== undefined) s.bonusViews = boostNum((s.bonusViews || 0) + Number(b.addViews));
  save(); send(res, 200, { ok: true, bonusViews: s.bonusViews || 0 });
});
adminRoute('DELETE', '/api/admin/posts/:id', async (req, res, b, me, p) => { removePost(getPost(p.id)); send(res, 200, { ok: true }); });
adminRoute('GET', '/api/admin/comments', async (req, res, b, me, p, q) => {
  const pid = clean(q.get('post'), 40);
  let list = Object.values(db.comments); if (pid) list = list.filter(c => c.pid === pid);
  send(res, 200, { comments: list.sort((a, c) => c.created - a.created).slice(0, 100).map(c => ({ id: c.id, text: c.text, created: c.created, post: c.pid, user: db.users[c.uid] ? db.users[c.uid].username : '?', hidden: !!(c.hidden || c.restricted) })) });
});
adminRoute('DELETE', '/api/admin/comments/:id', async (req, res, b, me, p) => {
  const c = db.comments[p.id]; if (!c) throw httpErr(404, 'Comment not found'); delete db.comments[c.id]; save(); send(res, 200, { ok: true });
});

// ================================================================ realtime stream
route('GET', '/api/stream', true, async (req, res, b, me) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': ' + ' '.repeat(2048) + '\n\n');
  res.write('data: {"type":"hello"}\n\n');
  let set = streams.get(me.id); if (!set) streams.set(me.id, set = new Set());
  set.add(res);
  req.on('close', () => { set.delete(res); if (!set.size) streams.delete(me.id); if (db.users[me.id]) { db.users[me.id].lastActive = now(); save(); } });
  return 'stream';
});

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SEC_HEADERS)) res.setHeader(k, v);
  let url, pathname;
  try { url = new URL(req.url, 'http://x'); pathname = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
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
    if (pathname.startsWith('/bot-avatar/')) { // generated bot pictures (drawn shapes / initials, no real photos)
      const m = /^\/bot-avatar\/([a-f0-9]{24})\.svg$/.exec(pathname); const u = m && db.users[m[1]];
      if (!u || !u.isBot) { res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800, immutable' }); return res.end(botAvatarSvg(u));
    }
    if (pathname.startsWith('/media/')) {
      const file = pathname.slice(7);
      // every answer here is per-user: never let a CDN cache an error/denial and replay it to someone else
      const deny = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' }); res.end(msg); };
      if (!/^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/.test(file) || !db.media[file]) return deny(404, 'Not found');
      const me = sessionUser(req);
      if (!me) return deny(401, 'Please log in');
      const meta = db.media[file];
      if (meta.conv) { if (!meta.conv.split(':').includes(me.id)) return deny(404, 'Not found'); } // DM photos: only the two people in that chat
      else if (!mediaAllowed(file, meta, me, req)) return deny(403, 'This account is private');      // private accounts / close friends / blocks
      res.setHeader('Vary', 'Cookie');
      return serveFile(req, res, path.join(MEDIA_DIR, file), MIME[file.split('.').pop()], 'private, max-age=3600');
    }
    if (pathname === '/healthz') return send(res, 200, { ok: true, app: APP_NAME, version: VERSION, users: Object.values(db.users).filter(u => !u.isBot).length, posts: Object.keys(db.posts).length });
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

// admin bootstrap: ADMIN_BOOTSTRAP = JSON {username, salt, pass} (a password HASH, never the password) from the deploy, not the repo
function bootstrapAdmin() {
  let a; try { a = JSON.parse(process.env.ADMIN_BOOTSTRAP || 'null'); } catch (e) { console.error('bad ADMIN_BOOTSTRAP'); }
  if (!a || !a.username || !a.salt || !a.pass) return;
  let u = userByName(a.username);
  if (!u) {
    u = { id: id(), username: a.username, name: a.name || a.username, bio: '', avatar: null, salt: a.salt, pass: a.pass, created: now(), logins: [], admin: true, bootstrapped: true };
    settingsOf(u); L(u); db.users[u.id] = u; db.follows[u.id] = []; console.log('admin account created:', a.username);
  } else if (u.bootstrapped && a.resetPassword) { u.salt = a.salt; u.pass = a.pass; }
  u.admin = true; u.suspended = false; save();
}

module.exports = { db, save, storeMedia, hashPassword, id, server, STORY_TTL, MEDIA_DIR, deleteUserData, settingsOf, L, migrate };
if (require.main === module || process.env.START_SERVER) {
  migrate();
  try { require('./seed.js').run(module.exports); } catch (e) { console.error('seed skipped:', e.message); }
  bootstrapAdmin();
  server.listen(PORT, () => console.log(APP_NAME + ' v' + VERSION + ' running on http://localhost:' + PORT + '  data: ' + DATA_DIR));
}
