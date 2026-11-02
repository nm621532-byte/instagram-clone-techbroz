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

const VERSION = '1.6.0';
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
// v1.3 bulk reels import: the admin import reads ONLY IMPORT_DIR (+ its manifest.json); imported videos live in REELS_DIR (hardlinked, never copied twice)
const REELS_DIR = path.join(DATA_DIR, 'reels');
const IMPORT_DIR = path.resolve(process.env.IMPORT_DIR || path.join(DATA_DIR, 'reel-inbox'));
const MAX_REEL_BYTES = 40 * 1024 * 1024;
fs.mkdirSync(REELS_DIR, { recursive: true });
try { fs.mkdirSync(IMPORT_DIR, { recursive: true }); } catch (e) { console.error('import dir', e.message); }

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
  classic: false,                 // v1.4: Classic mode (flat Instagram look instead of liquid glass)
  lastSeen: true,                 // v1.5: show "Active 5m ago" (reciprocal: off = you can't see theirs either)
  hideFollowLists: false,         // v1.5: only you can open your followers / following lists (counts stay visible)
  screenshotBlock: false,         // v1.5: Android app blocks screenshots + screen recording everywhere (vanish / locked chats always)
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
function internIds() { // one shared string per user id (likes/follows arrays of thousands of reels stay small in memory)
  const canon = new Map(); for (const k of Object.keys(db.users)) canon.set(k, db.users[k].id = k);
  const fix = (arr) => { if (Array.isArray(arr)) for (let i = 0; i < arr.length; i++) { const c = canon.get(arr[i]); if (c) arr[i] = c; } };
  for (const p of Object.values(db.posts)) { fix(p.likes); fix(p.views); fix(p.saves); }
  for (const k of Object.keys(db.follows)) fix(db.follows[k]);
  for (const c of Object.values(db.comments)) { const u = canon.get(c.uid); if (u) c.uid = u; }
}
function migrate() {
  internIds();
  let changed = false;
  if (!db.requests || typeof db.requests !== 'object') { db.requests = {}; changed = true; }
  if (!db.accepted || typeof db.accepted !== 'object') { // every v1.0 conversation counts as accepted (nothing moves to Requests)
    db.accepted = {}; for (const m of Object.values(db.messages)) db.accepted[m.conv] = true; changed = true;
  }
  for (const u of Object.values(db.users)) { if (u.isBot) continue; if (!u.settings) changed = true; settingsOf(u); L(u); if (!Array.isArray(u.logins)) u.logins = []; }
  for (const p of Object.values(db.posts)) { if (p.commentsOff === undefined) { p.commentsOff = false; p.hideLikes = false; changed = true; } }
  if (!db.drafts || typeof db.drafts !== 'object') { db.drafts = {}; changed = true; } // v1.4: per-user upload drafts
  if ((db.schema || 1) < 2) { db.schema = 2; changed = true; }
  if (db.schema < 3) { migrateBoostsToBots(); db.schema = 3; changed = true; } // v1.2: boost numbers -> bot entries (same totals)
  if (db.schema < 4) { // v1.3: keep a copy of the v1.2 database before any reels get imported
    try { if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'db.backup-v1.2.json')); } catch (e) { console.error('backup', e.message); }
    RI(); db.schema = 4; changed = true;
  }
  if (db.schema < 5) { // v1.4: keep a copy of the v1.3 database before drafts / audience / edits fields are added
    try { if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'db.backup-v1.3.json')); } catch (e) { console.error('backup', e.message); }
    db.schema = 5; changed = true;
  }
  if (db.schema < 6) { // v1.5: keep a copy of the v1.4 database before Chat Lock / App Lock / vanish fields are added
    try { if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'db.backup-v1.4.json')); } catch (e) { console.error('backup', e.message); }
    db.schema = 6; changed = true;
  }
  if (!db.vanish || typeof db.vanish !== 'object') { db.vanish = {}; changed = true; } // v1.5: convKey -> { mode, by, since }
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
// v1.4: per-post audience — 'everyone' (default), 'followers' (only approved followers), 'close' (owner's Close Friends)
const VIS = ['everyone', 'followers', 'close'];
function postVisible(x, me) {
  if (!x || !x.vis || x.vis === 'everyone' || x.uid === me.id) return true;
  const o = db.users[x.uid]; if (!o) return false;
  if (x.vis === 'followers') return isFollowing(me.id, o.id);
  if (x.vis === 'close') return L(o).closeFriends.includes(me.id);
  return false;
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
    for (let i = 0; i < ids.length && added < add; i++) { const b = ids[(start + i) % ids.length]; if (!have.has(b) && b !== opts.exclude) { x.likes.push(b); added++; } }
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
    ensureBots(Math.max(n * 2, 50)); const used = new Set(cur.map(c => c.uid)); if (opts.exclude) used.add(opts.exclude);
    const free = botIds().filter(i => !used.has(i)); for (let i = free.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [free[i], free[j]] = [free[j], free[i]]; }
    const owner = db.users[x.uid]; const words = owner ? settingsOf(owner).hiddenWords.filter(Boolean) : [];
    const texts = (opts.texts || BOT_COMMENTS).filter(t => !words.some(w => t.toLowerCase().includes(w))); const pool = texts.length >= 2 ? texts : ['🔥🔥', '❤️❤️'];
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

// ---------------------------------------------------------------- v1.3 bulk REELS import (admin only)
// Videos + manifest.json are read ONLY from IMPORT_DIR. Each video becomes a Reel owned by a public bot "anime page",
// backdated over the past ~30 days, with a natural spread of bot likes / bot comments. Idempotent by file name.
const REEL_FILE_RE = /^\d{1,6}\.mp4$/;
const REEL_POSTER_RE = /^\d{1,6}\.jpg$/;
const REEL_OWNER_TARGET = 240;
const ANIME_COMMENTS = ['Goosebumps aa gaye 🔥', 'Edit OP hai bhai 🔥🔥', 'Ye kaunsa anime hai? 😍', 'Song ka naam bata do 🎧', 'Naruto fan here 🧡', 'Itachi 😭🖤', 'Gojo supremacy 😎',
  'Luffy 🔥👒', 'Bhai kya sync kiya hai 💯', 'Repeat pe chal raha hai 🔁', 'AOT forever 🗡️', 'Zoro 🗿🔥', 'Tanjiro 🌊❤️', 'Anime is life ✨', 'Next part kab? 🙏', 'Ufff ye scene 😭',
  'Masterpiece 👏', 'Best edit ever 🔥', 'Dil jeet liya ❤️', 'Mast edit 😍', 'Peak fiction 📈', 'Chills 🥶🔥', '🔥🔥🔥', '😍😍', '💯💯', 'Sasuke 🖤⚡', 'Goku 🐉🔥', 'Levi 🗡️😎',
  'Ye wala scene 🥺', 'Bhai editing skills 🔥', 'Background music 🔥🎶', 'Kitni baar dekh liya 😅', 'Op edit 💥', 'Anime fans yaha aao 🙌'];
const REEL_OWNER_BIOS = ['Anime edits daily 🔥 | Follow for more', 'Naruto • One Piece • AOT 🧡', 'Otaku hu, edits banata hu ✨', 'Daily anime reels 🎌', 'AMV editor 🎬',
  'Anime is not cartoon 😤', 'Weeb for life 🍥', 'Edits 🎧 | Anime | Vibes', 'Gojo ka fan 😎', 'Anime lover from India 🇮🇳🎌', 'Reels on anime + music 🎶', 'Daily 1 edit 🔥'];
const REEL_CAPTIONS = ['Ye scene 🔥 #anime #edit', 'Goosebumps 😱 #anime #animeedit', 'Kya entry thi 🔥 #anime #otaku', 'Bas dekhte raho 😍 #anime #amv'];
function RI() { // import state lives in the db: { files: { '0001.mp4': {pid, at} | {deleted|bad} }, auto, every, batch, last }
  if (!db.reelImport || typeof db.reelImport !== 'object') db.reelImport = {};
  const r = db.reelImport;
  if (!r.files || typeof r.files !== 'object') r.files = {};
  if (r.auto === undefined) r.auto = true;
  if (!r.every) r.every = 3;           // minutes between automatic imports
  if (!r.batch) r.batch = 150;         // reels per automatic import
  return r;
}
const logUniform = (a, b) => Math.round(Math.exp(Math.log(a) + Math.random() * (Math.log(b) - Math.log(a))));
const posterName = (f) => f.replace(/\.mp4$/, '.jpg');
function postMedia(p) { return p && p.reel ? '/reels-media/' + p.media : mediaUrl(p && p.media); }
function postPoster(p) { if (p && p.cover) return mediaUrl(p.cover); return p && p.reel && p.reel.poster ? '/reels-media/' + posterName(p.media) : null; }
function importPath(file) { // a file directly inside IMPORT_DIR, never anything else (no ../, no sub folders)
  if (typeof file !== 'string' || !(REEL_FILE_RE.test(file) || REEL_POSTER_RE.test(file))) return null;
  const f = path.join(IMPORT_DIR, file);
  return path.dirname(f) === IMPORT_DIR ? f : null;
}
let manCache = { mtime: -1, map: new Map() };
function importManifest() { // IMPORT_DIR/manifest.json: [{file, title, duration, source_name}]
  const mf = path.join(IMPORT_DIR, 'manifest.json');
  let st; try { st = fs.statSync(mf); } catch (e) { return manCache.map = new Map(); }
  if (st.mtimeMs === manCache.mtime) return manCache.map;
  const map = new Map();
  try { const arr = JSON.parse(fs.readFileSync(mf, 'utf8')); if (Array.isArray(arr)) for (const e of arr) if (e && REEL_FILE_RE.test(String(e.file))) map.set(String(e.file), e); } catch (e) { console.error('manifest', e.message); }
  manCache = { mtime: st.mtimeMs, map }; return map;
}
function setManifestEntry(file, meta) { // used by the admin upload endpoint; atomic rewrite
  const map = new Map(importManifest());
  map.set(file, { file, title: clean(String(meta.title || ''), 300), duration: Number(meta.duration) || null, source_name: clean(String(meta.source_name || ''), 160) });
  const mf = path.join(IMPORT_DIR, 'manifest.json'), tmp = mf + '.' + id(4) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify([...map.values()].sort((a, b) => a.file.localeCompare(b.file)), null, 0)); fs.renameSync(tmp, mf);
  manCache.mtime = -1;
}
function inboxFiles() { try { return fs.readdirSync(IMPORT_DIR).filter(f => REEL_FILE_RE.test(f)).sort(); } catch (e) { return []; } }
function reelOwnerUsername(first, last, taken) {
  const f = first.toLowerCase().replace(/[^a-z]/g, ''), l = last.toLowerCase().replace(/[^a-z]/g, '') || 'x', n2 = () => String(crypto.randomInt(1, 99));
  const forms = [() => f + '.edits', () => 'anime.' + f, () => f + '_amv', () => 'otaku.' + f, () => f + '.animefan', () => 'animeverse.' + f, () => f + 'x.edits', () => 'weeb_' + f,
    () => f + '_otaku_' + n2(), () => 'anime_with_' + f, () => f + '.amv' + n2(), () => f + l[0] + '_edits', () => 'edits.by.' + f, () => 'desi.otaku.' + f, () => f + '.' + l + '.edits', () => 'animevibes_' + f];
  for (let i = 0; i < 40; i++) {
    let u = pick(forms)().replace(/[^a-z0-9._]/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 20);
    if (i > 20) u = (u.slice(0, 15) + '_' + crypto.randomInt(100, 9999)).slice(0, 20);
    if (u.length >= 3 && USERNAME_RE.test(u) && !taken.has(u)) return u;
  }
  return 'anime_' + id(4);
}
function reelOwners() { // public bot "anime pages" that own the imported reels; created once, each with its own bot followers
  const have = Object.values(db.users).filter(u => u.isBot && u.reelOwner && !u.suspended).map(u => u.id);
  if (have.length >= REEL_OWNER_TARGET) return have;
  ensureBots(1000);
  const pool = botIds().slice(); const taken = new Set(Object.values(db.users).map(u => u.username));
  let seq = Math.max(0, ...pool.map(i => db.users[i].n || 0));
  for (let k = have.length; k < REEL_OWNER_TARGET; k++) {
    const { g, first, last } = botName();
    const username = reelOwnerUsername(first, last, taken); taken.add(username);
    const u = { id: id(), username, name: crypto.randomInt(100) < 35 ? pick(['Anime Edits', 'AMV', 'Otaku Edits', 'Anime World', 'Anime Vibes']) + ' • ' + first : first + ' ' + last,
      bio: pick(REEL_OWNER_BIOS), isBot: true, reelOwner: true, g, priv: 0, created: now() - crypto.randomInt(60, 1200) * 864e5, n: ++seq };
    db.users[u.id] = u; have.push(u.id);
    const nf = logUniform(30, 900), start = crypto.randomInt(pool.length); // a natural spread of followers (other bots)
    for (let i = 0, added = 0; i < pool.length && added < nf; i++) { const b = pool[(start + i) % pool.length]; (db.follows[b] || (db.follows[b] = [])).push(u.id); added++; }
  }
  save(); return have;
}
function sniffFile(f) { const fd = fs.openSync(f, 'r'); try { const b = Buffer.alloc(16); const n = fs.readSync(fd, b, 0, 16, 0); return sniff(b.slice(0, n)); } finally { fs.closeSync(fd); } }
function placeFile(src, dst) { // hardlink (no extra disk); copy only if the two folders are on different disks
  try { fs.unlinkSync(dst); } catch (e) {}
  try { fs.linkSync(src, dst); } catch (e) { if (e.code === 'EXDEV' || e.code === 'EPERM') fs.copyFileSync(src, dst); else throw e; }
}
let importBusy = false;
function importReels(limit, by, only) {
  if (importBusy) throw httpErr(409, 'An import is already running');
  importBusy = true;
  try {
    const r = RI(); limit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const files = inboxFiles(); const pending = files.filter(f => !r.files[f] && (!only || only.has(f)));
    const out = { imported: 0, failed: [], files: [], pending: 0, total: 0 };
    if (pending.length) {
      const man = importManifest(); const owners = reelOwners(); ensureBots(1000);
      for (const f of pending) {
        if (out.imported >= limit) break;
        const src = importPath(f); if (!src) continue;
        let st; try { st = fs.statSync(src); } catch (e) { continue; }
        const t = st.isFile() && st.size >= 2048 && st.size <= MAX_REEL_BYTES ? sniffFile(src) : null;
        if (!t || t.ext !== 'mp4') { r.files[f] = { bad: true, at: now() }; out.failed.push(f); continue; }
        placeFile(src, path.join(REELS_DIR, f));
        const pst = importPath(posterName(f)); let poster = false;
        try { if (pst && fs.statSync(pst).size > 500 && (sniffFile(pst) || {}).ext === 'jpg') { placeFile(pst, path.join(REELS_DIR, posterName(f))); poster = true; } } catch (e) {}
        const m = man.get(f) || {};
        const post = { id: id(), uid: pick(owners), media: f, type: 'video', caption: clean(String(m.title || pick(REEL_CAPTIONS)), 300), created: now() - crypto.randomInt(5 * 60e3, 30 * 864e5),
          likes: [], saves: [], views: [], commentsOff: false, hideLikes: false, reel: { poster, dur: Number(m.duration) || null, src: clean(String(m.source_name || ''), 160) } };
        db.posts[post.id] = post;
        const nl = logUniform(20, 800); setBotLikes(post, nl, { noCap: true, exclude: post.uid });
        post.bonusViews = Math.round(nl * (4 + Math.random() * 16));
        const nc = crypto.randomInt(0, 6); if (nc) setBotComments(post, nc, { noCap: true, texts: ANIME_COMMENTS, exclude: post.uid });
        r.files[f] = { pid: post.id, at: now() }; out.imported++; if (out.files.length < 50) out.files.push({ file: f, pid: post.id });
      }
    }
    out.pending = files.filter(f => !r.files[f]).length; out.total = importedCount();
    r.last = { at: now(), by: by || 'admin', imported: out.imported, failed: out.failed.length };
    save(); return out;
  } finally { importBusy = false; }
}
function importedCount() { let n = 0; for (const x of Object.values(db.posts)) if (x.reel) n++; return n; }
function removeImportedReels() { // "Delete all imported reels": posts, their bot likes/comments, files; turns auto-import off so they don't come back
  const pids = new Set(); for (const x of Object.values(db.posts)) if (x.reel) pids.add(x.id);
  for (const c of Object.values(db.comments)) if (pids.has(c.pid)) delete db.comments[c.id];
  for (const n of Object.values(db.notifs)) if (n.pid && pids.has(n.pid)) delete db.notifs[n.id];
  for (const pid of pids) { const x = db.posts[pid]; fs.rm(path.join(REELS_DIR, x.media), () => {}); fs.rm(path.join(REELS_DIR, posterName(x.media)), () => {}); delete db.posts[pid]; }
  const r = RI(); r.files = {}; r.auto = false; save(); return pids.size;
}
function diskInfo() {
  try { const s = fs.statfsSync(DATA_DIR); return { freeGB: Math.round(s.bavail * s.bsize / 1e8) / 10, totalGB: Math.round(s.blocks * s.bsize / 1e8) / 10 }; } catch (e) { return null; }
}
// auto-import watcher: every `every` minutes imports new files that arrived in IMPORT_DIR (admin can switch it off)
setInterval(() => {
  const r = RI(); if (!r.auto || importBusy) return;
  if (r.lastAuto && now() - r.lastAuto < r.every * 60e3) return;
  r.lastAuto = now();
  try { if (inboxFiles().some(f => !r.files[f])) { const o = importReels(r.batch, 'auto'); if (o.imported) console.log('auto-import:', o.imported, 'reels, pending', o.pending); } } catch (e) { console.error('auto-import', e.message); }
}, 30e3).unref();

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
    id: p.id, type: p.type, media: postMedia(p), poster: postPoster(p), caption: p.caption, created: p.created,
    user: publicUser(db.users[p.uid], me),
    likes: (p.hideLikes && !mine) ? null : p.likes.length + (p.bonusLikes || 0), likesHidden: !!p.hideLikes,
    likedBy: (p.hideLikes && !mine) ? null : likedByName(p, me),
    views: (p.views || []).length + (p.bonusViews || 0),
    liked: p.likes.includes(me.id), saved: p.saves.includes(me.id),
    comments: vis.length + (p.bonusComments || 0), commentsOff: !!p.commentsOff, canComment: !commentBlockReason(p, me), commentNote: commentBlockReason(p, me),
    preview: vis.filter(c => !c.hidden && !c.restricted).sort((a, b) => b.created - a.created).slice(0, 2).reverse()
      .map(c => ({ id: c.id, text: c.text, user: { username: db.users[c.uid] ? db.users[c.uid].username : 'deleted' } })),
    mine,
    // v1.4 upload extras (non-destructive edits are applied by the player: trim, speed, filter, text, music)
    edit: p.edit || null, location: p.location || '', vis: p.vis || 'everyone', isReel: !!(p.isReel || p.reel),
    tags: (p.tags || []).map(i => db.users[i]).filter(u => u && !gone(u) && !blockedEither(me.id, u.id)).map(u => u.username),
  };
}
function readReceiptsOn(u) { return !!(u && settingsOf(u).readReceipts); }
function messageView(m, me) {
  const o = { id: m.id, from: db.users[m.from] ? db.users[m.from].username : '?', mine: m.from === me.id, kind: m.kind, text: m.text || '', created: m.created, request: !!m.request };
  // "Seen" is shown to the sender only if the reader allows read receipts (and the sender is not restricted)
  const reader = db.users[m.to];
  o.seen = m.from === me.id ? !!(m.seen && readReceiptsOn(reader) && !L(reader).restricted.includes(me.id)) : !!m.seen;
  if (m.viewOnce) { o.viewOnce = true; o.opened = !!m.opened; o.expired = m.opened === -1; } // never a file link: opened once via POST /api/messages/:id/open
  else if (m.kind === 'image' || m.kind === 'video') o.media = mediaUrl(m.media);
  if (m.vanish) { o.vanish = m.vanish; if (m.expiresAt) o.expiresAt = m.expiresAt; }
  if (m.kind === 'post') {
    const p = db.posts[m.postId]; const owner = p && db.users[p.uid];
    if (!p) o.post = null;
    else if (!canView(me, owner) || !postVisible(p, me)) o.post = { id: p.id, locked: true, user: publicUser(owner) };
    else o.post = { id: p.id, media: postMedia(p), poster: postPoster(p), type: p.type, caption: p.caption.slice(0, 80), user: publicUser(owner) };
  }
  return o;
}
const NOTIF_PREF = { like: 'likes', comment: 'comments', follow: 'follows', request: 'follows', accept: 'follows', mention: 'mentions', tag: 'mentions' };
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
  const post = Object.values(db.posts).find(p => p.media === file || p.cover === file);
  if (post) return canView(me, db.users[post.uid]) && postVisible(post, me);
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
  const showSeen = settingsOf(u).lastSeen !== false && settingsOf(me).lastSeen !== false; // v1.5: "last seen" has its own switch
  return { online: streams.has(u.id), lastActive: showSeen ? (u.lastActive || null) : null };
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
const STATIC_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.apk': 'application/vnd.android.package-archive', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' };

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
  routes.push({ method, re, keys, auth, fn, pattern });
}
function deleteUserData(me) { // removes a user and everything that points at them
  for (const d of Object.values(db.drafts || {})) if (d.uid === me.id) { dropMedia(d.media); if (d.cover) dropMedia(d.cover); delete db.drafts[d.id]; }
  for (const x of Object.values(db.posts)) if (x.uid === me.id) { for (const c of Object.values(db.comments)) if (c.pid === x.id) delete db.comments[c.id]; dropMedia(x.media); if (x.cover) dropMedia(x.cover); delete db.posts[x.id]; }
  for (const x of Object.values(db.posts)) { x.likes = x.likes.filter(u => u !== me.id); x.saves = x.saves.filter(u => u !== me.id); }
  for (const c of Object.values(db.comments)) if (c.uid === me.id || !db.posts[c.pid]) delete db.comments[c.id];
  for (const st of Object.values(db.stories)) { if (st.uid === me.id) { dropMedia(st.media); delete db.stories[st.id]; } else st.seen = st.seen.filter(u => u !== me.id); }
  for (const m of Object.values(db.messages)) if (m.from === me.id || m.to === me.id) { dropMedia(m.media); delete db.messages[m.id]; }
  for (const k of Object.keys(db.accepted || {})) if (k.split(':').includes(me.id)) delete db.accepted[k];
  for (const k of Object.keys(db.vanish || {})) if (k.split(':').includes(me.id)) delete db.vanish[k];
  for (const u of Object.values(db.users)) { if (Array.isArray(u.lockedChats)) u.lockedChats = u.lockedChats.filter(x => x !== me.id); if (Array.isArray(u.hiddenChats)) u.hiddenChats = u.hiddenChats.filter(x => x !== me.id); }
  for (const [k, s] of Object.entries(db.sessions)) if (s.uid === me.id) appUnlock.delete(k);
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
  const unreadDm = Object.values(db.messages).filter(m => m.to === me.id && !m.seen && !m.deleted && !m.request && !gone(db.users[m.from]) && !chatFolder(me, m.from)).length; // locked / hidden chats don't count
  const msgRequests = new Set(Object.values(db.messages).filter(m => m.to === me.id && m.request && !m.deleted && !gone(db.users[m.from])).map(m => m.from)).size;
  const unreadNotif = Object.values(db.notifs).filter(n => n.to === me.id && !n.read && !blockedEither(me.id, n.from)).length;
  const followRequests = (db.requests[me.id] || []).filter(i => !gone(db.users[i])).length;
  send(res, 200, { user: meView(me), unreadDm, unreadNotif, msgRequests, followRequests, version: VERSION, appLocked: appLocked(req, me), appLock: appLockOn(me) ? { minutes: me.appLock.minutes || 0, fingerprint: (me.appLock.bio || []).length > 0 } : null });
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
const BOOLS = ['private', 'readReceipts', 'typing', 'activityStatus', 'classic', 'lastSeen', 'hideFollowLists', 'screenshotBlock'];
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
  const posts = locked ? [] : Object.values(db.posts).filter(x => x.uid === u.id && postVisible(x, me)).sort((a, c) => c.created - a.created)
    .map(x => ({ id: x.id, type: x.type, media: postMedia(x), poster: postPoster(x), edit: x.edit || null, vis: x.vis || 'everyone', likes: (x.hideLikes && !isMe) ? null : x.likes.length + (x.bonusLikes || 0), comments: visibleComments(x, me).length + (x.bonusComments || 0), views: (x.views || []).length + (x.bonusViews || 0) }));
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
  if (u.id !== me.id && settingsOf(u).hideFollowLists) throw httpErr(403, u.username + ' keeps their followers and following lists private');
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
// v1.4: reels you already watched (per user, newest 3000) go after unseen ones in a fresh Reels order
function markReelSeen(me, pid) {
  if (!me.seenReels || typeof me.seenReels !== 'object') me.seenReels = {};
  if (!me.seenReels[pid]) { me.seenReels[pid] = now(); const k = Object.keys(me.seenReels); if (k.length > 3000) { k.sort((a, c) => me.seenReels[a] - me.seenReels[c]); for (const old of k.slice(0, k.length - 3000)) delete me.seenReels[old]; } save(); }
}
function seedHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }
const OWN_FIRST = 24, OWN_GAP = 20, OWN_MAX = 3; // v1.6: where your own posts may appear in a fresh Home mix
function listPosts(filter, q, me, opts) {
  opts = opts || {};
  const limit = Math.min(parseInt(q.get('limit') || '12', 10) || 12, 30);
  const base = Object.values(db.posts).filter(x => canView(me, db.users[x.uid]) && postVisible(x, me)).filter(filter);
  const seed = clean(q.get('seed') || '', 40);
  if (seed) { // v1.4 "fresh" order (tap Home/Reels again): your own + followed posts from the last 3 days first, then a new shuffle every seed
    const offset = Math.max(0, parseInt(q.get('offset') || '0', 10) || 0);
    const fresh = now() - 3 * 24 * 3600 * 1000;
    const isFresh = (x) => !x.reel && x.created > fresh && (opts.freshFirst ? opts.freshFirst(x) : false);
    const key = new Map(base.map(x => [x.id, seedHash(seed + ':' + x.id)]));
    // "seen" is judged against the moment this Reels session opened (t0), so the order stays the same while you page
    const t0 = parseInt(q.get('t0') || '0', 10) || now(), seenMap = opts.preferUnseen && me.seenReels || null;
    const seen = (x) => !!(seenMap && seenMap[x.id] && seenMap[x.id] < t0);
    const start = clean(q.get('start') || '', 40);
    base.sort((a, c) => {
      if (start) { if (a.id === start) return -1; if (c.id === start) return 1; }
      const fa = isFresh(a), fc = isFresh(c); if (fa !== fc) return fa ? -1 : 1; if (fa) return c.created - a.created;
      const sa = seen(a), sc = seen(c); if (sa !== sc) return sa ? 1 : -1;
      return key.get(a.id) - key.get(c.id);
    });
    // v1.6: your own posts never stay pinned on top of Home. Right after you share, the app asks once with pin=<your new post id>
    // (honoured for 30 min, your own post only); every refresh after that has no pin, so your posts sit deep in the mix
    // (at most a few, from position OWN_FIRST on) and live on your profile, like Instagram.
    let list = base;
    const pinId = opts.pinOwn ? clean(q.get('pin') || '', 40) : '';
    const pinned = pinId ? base.find(x => x.id === pinId && x.uid === me.id && now() - x.created < 30 * 60 * 1000) : null;
    if (opts.demoteOwn) {
      const mine = base.filter(x => x.uid === me.id && x !== pinned).sort((a, c) => key.get(a.id) - key.get(c.id)).slice(0, OWN_MAX);
      list = base.filter(x => x.uid !== me.id);
      mine.forEach((x, i) => { const at = OWN_FIRST + i * OWN_GAP; if (at <= list.length) list.splice(at, 0, x); else list.push(x); });
    } else if (pinned) list = base.filter(x => x !== pinned);
    if (pinned) list = [pinned].concat(list);
    return { posts: list.slice(offset, offset + limit).map(x => postView(x, me)), more: list.length > offset + limit, next: offset + limit, seed };
  }
  const before = parseInt(q.get('before') || '0', 10) || Infinity;
  const rows = base.filter(x => x.created < before).sort((a, c) => c.created - a.created);
  return { posts: rows.slice(0, limit).map(x => postView(x, me)), more: rows.length > limit };
}
route('GET', '/api/feed', true, async (req, res, b, me, p, q) => {
  const muted = L(me).mutedPosts, f = new Set(following(me.id).filter(x => !muted.includes(x)).concat(me.id));
  // v1.3: imported reels are mixed into everyone's home feed by time, so a brand-new account never sees an empty feed
  // v1.6: only posts from people you follow get the "last 3 days on top" lift; your own posts are demoted (see listPosts)
  send(res, 200, listPosts(x => f.has(x.uid) || (x.reel && !muted.includes(x.uid)), q, me, { freshFirst: x => f.has(x.uid) && x.uid !== me.id, demoteOwn: true, pinOwn: true }));
});
route('GET', '/api/explore', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.uid !== me.id && !L(me).mutedPosts.includes(x.uid), q, me)));
route('GET', '/api/reels', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.type === 'video', q, me, { pinOwn: true, preferUnseen: true })));
route('GET', '/api/saved', true, async (req, res, b, me, p, q) => send(res, 200, listPosts(x => x.saves.includes(me.id), q, me)));
// ---------------------------------------------------------------- v1.4 richer upload: edits, cover, tags, location, audience, music, drafts
const FILTERS = ['normal', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden'];
const MUSIC = [ // royalty-free tracks made for this app (public/music); "orig" keeps the video's own sound
  { id: 'chill-lofi', title: 'Chill Lo-fi', artist: 'Private Insta Audio', file: '/music/chill-lofi.m4a', dur: 32 },
  { id: 'sunny-pop', title: 'Sunny Pop', artist: 'Private Insta Audio', file: '/music/sunny-pop.m4a', dur: 32 },
  { id: 'desi-beat', title: 'Desi Beat', artist: 'Private Insta Audio', file: '/music/desi-beat.m4a', dur: 32 },
  { id: 'night-drive', title: 'Night Drive', artist: 'Private Insta Audio', file: '/music/night-drive.m4a', dur: 32 },
  { id: 'epic-rise', title: 'Epic Rise', artist: 'Private Insta Audio', file: '/music/epic-rise.m4a', dur: 32 },
  { id: 'soft-piano', title: 'Soft Piano', artist: 'Private Insta Audio', file: '/music/soft-piano.m4a', dur: 32 },
];
const MAX_DRAFTS = 20;
let tagCache = { at: 0, list: [] };
const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
function parseEdit(e, kind) { // validated, normalised edit description (never trusted from the client as-is)
  if (!e || typeof e !== 'object') return null;
  const out = {};
  if (e.filter !== undefined && e.filter !== null) { if (!FILTERS.includes(e.filter)) throw httpErr(400, 'Unknown filter'); if (e.filter !== 'normal') out.filter = e.filter; }
  if (kind === 'video') {
    if (e.speed !== undefined && e.speed !== null) { const sp = Number(e.speed); if (![0.5, 0.75, 1, 1.5, 2].includes(sp)) throw httpErr(400, 'Speed must be 0.5x, 0.75x, 1x, 1.5x or 2x'); if (sp !== 1) out.speed = sp; }
    if (e.trim !== undefined && e.trim !== null) {
      if (!Array.isArray(e.trim) || e.trim.length !== 2) throw httpErr(400, 'trim must be [start, end] in seconds');
      const a = num(e.trim[0], 0, 3600, 0), z = num(e.trim[1], 0, 3600, 0);
      if (!(z - a >= 0.5)) throw httpErr(400, 'Trimmed video must be at least 0.5 seconds');
      out.trim = [Math.round(a * 100) / 100, Math.round(z * 100) / 100];
    }
    if (e.music !== undefined && e.music !== null) {
      const t = MUSIC.find(m => m.id === (e.music && e.music.id)); if (!t) throw httpErr(400, 'Unknown music track');
      out.music = { id: t.id, title: t.title, file: t.file, vol: num(e.music.vol, 0, 1, 0.8), start: num(e.music.start, 0, 25, 0) };
    }
    if (e.orig !== undefined) out.orig = !!e.orig; // false = original sound muted
  }
  if (e.text !== undefined && e.text !== null) {
    const t = clean(e.text.t, 120); if (t) {
      const col = /^#[0-9a-f]{6}$/i.test(String(e.text.color || '')) ? e.text.color : '#ffffff';
      const style = ['classic', 'bold', 'neon', 'box'].includes(e.text.style) ? e.text.style : 'bold';
      out.text = { t, color: col, style, x: num(e.text.x, 0, 100, 50), y: num(e.text.y, 0, 100, 50), size: num(e.text.size, 14, 64, 28) };
    }
  }
  return Object.keys(out).length ? out : null;
}
function parseTags(arr, me) { // usernames -> user ids (real, visible people only)
  if (arr === undefined || arr === null) return [];
  if (!Array.isArray(arr)) throw httpErr(400, 'tags must be a list of usernames');
  const ids = [];
  for (const raw of arr.slice(0, 20)) {
    const u = userByName(String(raw || '').replace(/^@/, '').toLowerCase());
    if (!u || gone(u) || blockedEither(me.id, u.id)) throw httpErr(400, 'Cannot tag @' + clean(raw, 30));
    if (u.id !== me.id && !ids.includes(u.id)) ids.push(u.id);
  }
  return ids;
}
function uploadFields(b, me, kind) {
  const vis = b.visibility === undefined ? 'everyone' : b.visibility;
  if (!VIS.includes(vis)) throw httpErr(400, 'visibility must be one of: ' + VIS.join(', '));
  return { caption: clean(b.caption, 2200), commentsOff: !!b.commentsOff, hideLikes: !!b.hideLikes, vis, location: clean(b.location, 80), tags: parseTags(b.tags, me), edit: parseEdit(b.edit, kind), isReel: kind === 'video' && b.kind !== 'post' };
}
route('POST', '/api/posts', true, async (req, res, b, me) => {
  let m, cover = null, draft = null;
  if (b.draftId) { // publish a saved draft (only your own)
    draft = db.drafts[String(b.draftId)];
    if (!draft || draft.uid !== me.id) throw httpErr(404, 'Draft not found');
    m = { file: draft.media, kind: draft.type };
  }
  if (b.kind === 'reel' && !draft && !(typeof b.media === 'string' && /^data:video\//i.test(b.media))) throw httpErr(400, 'A reel needs a video');
  const f = uploadFields(b, me, draft ? draft.type : (/^data:video\//i.test(String(b.media || '')) ? 'video' : 'image'));
  if (!m) m = storeMedia(b.media, me.id, ['image', 'video']);
  if (b.kind === 'reel' && m.kind !== 'video') { if (!draft) dropMedia(m.file); throw httpErr(400, 'A reel needs a video'); }
  if (m.kind === 'video') {
    if (b.cover) cover = storeMedia(b.cover, me.id, ['image']).file;
    else if (draft && draft.cover) cover = draft.cover;
  }
  const post = { id: id(), uid: me.id, media: m.file, type: m.kind, caption: f.caption, created: now(), likes: [], saves: [], views: [], commentsOff: f.commentsOff, hideLikes: f.hideLikes };
  if (cover) post.cover = cover;
  if (f.edit) post.edit = f.edit;
  if (f.location) post.location = f.location;
  if (f.tags.length) post.tags = f.tags;
  if (f.vis !== 'everyone') post.vis = f.vis;
  if (m.kind === 'video') post.isReel = f.isReel;
  if (draft) { if (draft.cover && draft.cover !== cover) dropMedia(draft.cover); delete db.drafts[draft.id]; }
  db.posts[post.id] = post; save(); tagCache.at = 0;
  const mentionBlocked = post.vis === 'close' ? [] : handleMentions(f.caption, me, { pid: post.id, text: f.caption.slice(0, 80) });
  for (const t of f.tags) if (postVisible(post, db.users[t])) notify(t, me.id, 'tag', { pid: post.id, text: f.caption.slice(0, 80) });
  send(res, 201, { post: postView(post, me), mentionBlocked });
});
const draftView = (d) => ({ id: d.id, type: d.type, kind: d.kind, media: mediaUrl(d.media), cover: d.cover ? mediaUrl(d.cover) : null, caption: d.caption, location: d.location || '', vis: d.vis || 'everyone', commentsOff: !!d.commentsOff, hideLikes: !!d.hideLikes, edit: d.edit || null, tags: (d.tags || []).map(i => db.users[i]).filter(Boolean).map(u => u.username), created: d.created, updated: d.updated });
const myDraft = (pid, me) => { const d = db.drafts[pid]; if (!d || d.uid !== me.id) throw httpErr(404, 'Draft not found'); return d; }; // other people's drafts look like they don't exist
route('GET', '/api/drafts', true, async (req, res, b, me) => {
  send(res, 200, { drafts: Object.values(db.drafts).filter(d => d.uid === me.id).sort((a, c) => c.updated - a.updated).map(draftView) });
});
route('GET', '/api/drafts/:id', true, async (req, res, b, me, p) => send(res, 200, { draft: draftView(myDraft(p.id, me)) }));
route('POST', '/api/drafts', true, async (req, res, b, me) => {
  noDemo(me, 'save drafts');
  if (Object.values(db.drafts).filter(d => d.uid === me.id).length >= MAX_DRAFTS) throw httpErr(400, 'You can keep up to ' + MAX_DRAFTS + ' drafts — post or delete one first');
  const kind = /^data:video\//i.test(String(b.media || '')) ? 'video' : 'image';
  const f = uploadFields(b, me, kind);
  const m = storeMedia(b.media, me.id, ['image', 'video']);
  const d = { id: id(), uid: me.id, media: m.file, type: m.kind, kind: b.kind === 'reel' && m.kind === 'video' ? 'reel' : 'post', caption: f.caption, location: f.location, vis: f.vis, commentsOff: f.commentsOff, hideLikes: f.hideLikes, edit: f.edit, tags: f.tags, created: now(), updated: now() };
  if (m.kind === 'video' && b.cover) d.cover = storeMedia(b.cover, me.id, ['image']).file;
  db.drafts[d.id] = d; save();
  send(res, 201, { draft: draftView(d) });
});
route('PUT', '/api/drafts/:id', true, async (req, res, b, me, p) => {
  const d = myDraft(p.id, me);
  const f = uploadFields(Object.assign({ caption: d.caption, location: d.location, visibility: d.vis, commentsOff: d.commentsOff, hideLikes: d.hideLikes, kind: d.kind }, b, { tags: b.tags !== undefined ? b.tags : (d.tags || []).map(i => db.users[i] && db.users[i].username).filter(Boolean) }), me, d.type);
  Object.assign(d, { caption: f.caption, location: f.location, vis: f.vis, commentsOff: f.commentsOff, hideLikes: f.hideLikes, tags: f.tags, updated: now() });
  if (b.edit !== undefined) d.edit = f.edit;
  if (b.cover && d.type === 'video') { if (d.cover) dropMedia(d.cover); d.cover = storeMedia(b.cover, me.id, ['image']).file; }
  save(); send(res, 200, { draft: draftView(d) });
});
route('DELETE', '/api/drafts/:id', true, async (req, res, b, me, p) => {
  const d = myDraft(p.id, me); dropMedia(d.media); if (d.cover) dropMedia(d.cover); delete db.drafts[d.id]; save(); send(res, 200, { ok: true });
});
route('GET', '/api/music', true, async (req, res) => send(res, 200, { tracks: MUSIC, filters: FILTERS }));
route('GET', '/api/hashtags', true, async (req, res, b, me, p, q) => { // #hashtag suggestions (public posts only)
  if (now() - tagCache.at > 60000) {
    const cnt = new Map();
    for (const x of Object.values(db.posts)) {
      const o = db.users[x.uid]; if (!o || gone(o) || (x.vis && x.vis !== 'everyone') || settingsOf(o).private) continue;
      const seen = new Set(); for (const m of String(x.caption || '').toLowerCase().matchAll(/#([\p{L}\p{N}_]{2,40})/gu)) if (!seen.has(m[1])) { seen.add(m[1]); cnt.set(m[1], (cnt.get(m[1]) || 0) + 1); }
    }
    tagCache = { at: now(), list: [...cnt.entries()].sort((a, c) => c[1] - a[1]).slice(0, 500) };
  }
  const s = clean(q.get('q') || '', 40).toLowerCase().replace(/^#/, '');
  send(res, 200, { tags: tagCache.list.filter(([t]) => !s || t.startsWith(s)).slice(0, 8).map(([tag, posts]) => ({ tag, posts })) });
});
function getPost(pid) { const x = db.posts[pid]; if (!x) throw httpErr(404, 'Post not found'); return x; }
function viewPost(pid, me) { // a post the caller is allowed to see (private account / block / deactivated enforced here)
  const x = getPost(pid); const owner = db.users[x.uid];
  if (!owner || (x.uid !== me.id && (gone(owner) || blockedEither(me.id, owner.id)))) throw httpErr(404, 'Post not found');
  if (!canView(me, owner)) throw httpErr(403, 'This account is private');
  if (!postVisible(x, me)) throw httpErr(404, 'Post not found');
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
  if (x.reel) { // an imported reel: remove its files and remember not to import that file again
    fs.rm(path.join(REELS_DIR, x.media), () => {}); fs.rm(path.join(REELS_DIR, posterName(x.media)), () => {});
    RI().files[x.media] = { deleted: true, at: now() };
  } else dropMedia(x.media);
  if (x.cover) dropMedia(x.cover);
  delete db.posts[x.id]; save();
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
  if (x.type === 'video') markReelSeen(me, x.id);
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


// ================================================================ v1.5 privacy: Chat PIN, Chat Lock, hidden chats, App Lock
// PINs are never stored: scrypt(pin, per-user salt). Wrong tries are counted on the ACCOUNT (not the session or device),
// 5 wrong in a row -> locked out for PIN_LOCKOUT_MS. A correct Chat PIN opens locked + hidden chats on that one session for a few minutes.
const PIN_RE = /^\d{4,6}$/;
const PIN_MAX_FAILS = 5;
const PIN_LOCKOUT_MS = Math.max(1000, parseInt(process.env.PIN_LOCKOUT_MS || String(5 * 60 * 1000), 10));
const CHAT_UNLOCK_MS = 10 * 60 * 1000;
const AUTOLOCK_MIN = [0, 1, 5, 15, 30, 60];     // App Lock: minutes in the background before the app locks again
function pinHash(pin, salt) { return crypto.scryptSync('pin:' + pin, salt, 32).toString('hex'); }
function sameHex(a, b) { try { const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex'); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); } catch (e) { return false; } }
function newPin(pin) { if (!PIN_RE.test(String(pin == null ? '' : pin))) throw httpErr(400, 'PIN must be 4 to 6 digits'); const salt = id(16); return { salt, hash: pinHash(String(pin), salt), set: now() }; }
function guardOf(me, kind) { me.pinGuard = me.pinGuard || {}; return me.pinGuard[kind] = me.pinGuard[kind] || { fails: 0, until: 0 }; }
function lockoutErr(st) { const sec = Math.ceil((st.until - now()) / 1000); const e = httpErr(429, 'Too many wrong tries. Try again in ' + (sec > 90 ? Math.ceil(sec / 60) + ' minutes' : sec + ' seconds')); e.extra = { retryAfter: sec, lockedOut: true }; return e; }
// checks a secret against a stored hash with the account-wide wrong-try counter; throws 401 (tries left) or 429 (locked out)
function checkSecret(me, kind, ok) {
  const st = guardOf(me, kind);
  if (st.until > now()) throw lockoutErr(st);
  if (ok()) { if (st.fails || st.until) { st.fails = 0; st.until = 0; save(); } return true; }
  st.fails++;
  if (st.fails >= PIN_MAX_FAILS) { st.fails = 0; st.until = now() + PIN_LOCKOUT_MS; save(); throw lockoutErr(st); }
  save(); const e = httpErr(401, 'Wrong PIN — ' + (PIN_MAX_FAILS - st.fails) + (PIN_MAX_FAILS - st.fails === 1 ? ' try' : ' tries') + ' left'); e.extra = { triesLeft: PIN_MAX_FAILS - st.fails }; throw e;
}
function checkPin(me, kind, pin) {
  const rec = kind === 'chat' ? me.chatPin : me.appLock;
  if (!rec || !rec.hash) throw httpErr(400, kind === 'chat' ? 'Set a Chat PIN first' : 'App Lock is off');
  return checkSecret(me, kind, () => PIN_RE.test(String(pin == null ? '' : pin)) && sameHex(pinHash(String(pin), rec.salt), rec.hash));
}
function privLists(me) { if (!Array.isArray(me.lockedChats)) me.lockedChats = []; if (!Array.isArray(me.hiddenChats)) me.hiddenChats = []; return me; }
function chatFolder(me, otherId) { if (!me || me.isBot) return null; privLists(me); return me.lockedChats.includes(otherId) ? 'locked' : me.hiddenChats.includes(otherId) ? 'hidden' : null; }
function sessOf(req) { return req && req.sessKey ? db.sessions[req.sessKey] : null; }
function chatUnlocked(req) { const s = sessOf(req); return !!(s && s.chatUntil && s.chatUntil > now()); }
function lockedErr(folder) { const e = httpErr(423, folder === 'hidden' ? 'This chat is hidden. Enter your Chat PIN.' : 'This chat is locked. Enter your Chat PIN.'); e.extra = { chatLocked: true, folder }; return e; }
function requireChatOpen(req, me, otherId) { const f = chatFolder(me, otherId); if (f && !chatUnlocked(req)) throw lockedErr(f); return f; }
// App Lock state per session lives in memory: a server restart locks every App-Lock session again (safe default)
const appUnlock = new Map(); // sessKey -> { at, last }
function appLockOn(u) { return !!(u && !u.isBot && u.appLock && u.appLock.hash); }
function appLockIdleMs(u) { return (u.appLock.minutes || 0) * 60000 + 90000; } // the open app sends a heartbeat every 60 s
function appLocked(req, u) {
  if (!appLockOn(u)) return false;
  const st = appUnlock.get(req.sessKey);
  if (!st) return true;
  if (now() - st.last > appLockIdleMs(u)) { appUnlock.delete(req.sessKey); return true; }
  return false;
}
const APP_LOCK_OPEN = new Set(['GET /api/me', 'POST /api/logout', 'POST /api/login', 'POST /api/signup', 'GET /api/app-lock', 'POST /api/app-lock/verify', 'POST /api/app-lock/bio-verify']);

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
  const v = db.vanish && db.vanish[key];
  if (v && m.kind !== 'system') { m.vanish = v.mode; if (VANISH_MODES[v.mode]) m.expiresAt = m.created + Math.round(VANISH_MODES[v.mode] * VANISH_SCALE); }
  db.messages[m.id] = m; save();
  pushDm(u, me, m);
  push(me.id, { type: 'dm_echo', to: u.username, message: messageView(m, me) });
  return m;
}
// v1.5: a message into a chat the reader locked or hid is announced as "New message" only — no name, no text, no photo
function chatRef(key, uid) { return sha('ref:' + key + ':' + uid).slice(0, 16); }
function pushDm(u, from, m) {
  const quiet = !settingsOf(u).notif.messages;
  if (chatFolder(u, from.id)) push(u.id, { type: 'dm', private: true, quiet, chat: chatRef(m.conv, u.id) });
  else push(u.id, { type: 'dm', from: from.username, request: m.request, quiet, message: messageView(m, u) });
}
// v1.5 vanish mode: messages disappear after they are seen (when the reader leaves the chat) or after 1 h / 24 h
const VANISH_MODES = { seen: 0, '1h': 3600 * 1000, '24h': 24 * 3600 * 1000 };
const VANISH_SCALE = Math.max(0.00001, Math.min(1, parseFloat(process.env.VANISH_SCALE || '1') || 1)); // test hook only (local smoke runs timers fast)
const VANISH_SEEN_KEEP = Math.round(30 * 60 * 1000 * VANISH_SCALE); // seen "after seen" messages left behind if the chat was never closed
const VIEW_ONCE_TTL = 14 * 24 * 3600 * 1000;                       // unopened view-once photos/videos expire after 14 days
function vanishMsg(m) { // hard delete: the text and any photo are gone from the server
  dropMedia(m.media); delete db.messages[m.id];
  for (const uid of [m.from, m.to]) push(uid, { type: 'vanished', ids: [m.id] });
}
function sweepVanish() {
  const t = now(); let n = 0;
  for (const m of Object.values(db.messages)) {
    if (m.expiresAt && m.expiresAt <= t) { vanishMsg(m); n++; }
    else if (m.vanish === 'seen' && m.seen && t - m.seen > VANISH_SEEN_KEEP) { vanishMsg(m); n++; }
    else if (m.viewOnce && !m.opened && m.media && t - m.created > VIEW_ONCE_TTL) { dropMedia(m.media); m.media = null; m.opened = -1; n++; }
  }
  if (n) save();
  return n;
}
setInterval(sweepVanish, VANISH_SCALE < 1 ? 1000 : 20000).unref();
const activeMsgs = (me) => Object.values(db.messages).filter(m => !m.deleted && (m.from === me.id || m.to === me.id) && !gone(db.users[m.from === me.id ? m.to : m.from]));
function convList(me, requests, folder) { // folder: undefined = main inbox (no locked / hidden chats), 'locked', 'hidden'
  const convs = new Map(); const t = now();
  for (const m of activeMsgs(me)) {
    const isReqForMe = m.request && m.to === me.id;
    if (!!requests !== isReqForMe) continue;
    if (m.expiresAt && m.expiresAt <= t) continue;
    const other = m.from === me.id ? m.to : m.from;
    if ((chatFolder(me, other) || undefined) !== folder) continue;
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
  privLists(me);
  const lockedIds = me.lockedChats.filter(i => db.users[i] && !gone(db.users[i]));
  const lockedUnread = Object.values(db.messages).some(m => m.to === me.id && !m.seen && !m.deleted && !m.request && lockedIds.includes(m.from));
  send(res, 200, { conversations: convList(me, false), requests: reqCount, locked: { count: lockedIds.length, unread: lockedUnread }, chatPinSet: !!(me.chatPin && me.chatPin.hash) });
});
route('GET', '/api/inbox/locked', true, async (req, res, b, me) => { if (!chatUnlocked(req)) throw lockedErr('locked'); send(res, 200, { conversations: convList(me, false, 'locked'), until: sessOf(req).chatUntil }); });
route('GET', '/api/inbox/hidden', true, async (req, res, b, me) => { if (!chatUnlocked(req)) throw lockedErr('hidden'); send(res, 200, { conversations: convList(me, false, 'hidden'), until: sessOf(req).chatUntil }); });
route('GET', '/api/inbox/requests', true, async (req, res, b, me) => send(res, 200, { conversations: convList(me, true) }));
function otherUser(name, me) { const u = visibleUser(name, me); if (u.id === me.id) throw httpErr(400, "You can't message yourself"); return u; }
function markSeen(me, u) {
  const key = convKey(me.id, u.id); let changed = false;
  for (const m of Object.values(db.messages)) if (m.conv === key && m.to === me.id && !m.seen && !m.request) { m.seen = now(); changed = true; }
  if (changed) { save(); if (readReceiptsOn(me) && !L(me).restricted.includes(u.id)) push(u.id, { type: 'seen', by: me.username }); }
}
route('GET', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id);
  const folder = requireChatOpen(req, me, u.id);
  const t = now();
  const msgs = Object.values(db.messages).filter(m => m.conv === key && !m.deleted && !(m.expiresAt && m.expiresAt <= t)).sort((a, c) => a.created - c.created);
  const isRequest = msgs.some(m => m.request && m.to === me.id);
  if (!isRequest) markSeen(me, u); // opening a message request does not tell the sender you saw it
  let canMessage = true, why = null;
  if (blockedEither(me.id, u.id)) { canMessage = false; why = L(me).blocked.includes(u.id) ? 'You blocked this account' : "You can't message this account"; }
  else if (!isRequest) { try { const s = settingsOf(u); if (!db.accepted[key] && !isFollowing(u.id, me.id) && s.dmFrom === 'nobody' && !pendingRequest(u.id, me.id)) { canMessage = false; why = u.username + " isn't accepting messages"; } } catch (e) {} }
  const v = (db.vanish || {})[key] || null;
  send(res, 200, { user: Object.assign(publicUser(u, me), presence(u, me)), messages: msgs.slice(-200).map(m => messageView(m, me)), isRequest, canMessage, why,
    folder, chatRef: chatRef(key, me.id), vanish: v ? { mode: v.mode, byMe: v.by === me.id, since: v.since } : null });
});
route('POST', '/api/dm/:username', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me);
  requireChatOpen(req, me, u.id);
  const fields = {};
  if (b.postId) { const post = viewPost(String(b.postId), me); fields.kind = 'post'; fields.postId = post.id; fields.text = clean(b.text, 1000); }
  else if (b.media) { fields.kind = 'image'; fields.text = clean(b.text, 1000); if (b.viewOnce === true) fields.viewOnce = true; }
  else { fields.kind = 'text'; fields.text = clean(b.text, 2000); if (!fields.text) throw httpErr(400, 'Message is empty'); }
  dmLane(me, u); // permission check before storing any photo
  if (b.media && !b.postId) {
    // view-once may be a photo or a video; normal DM media stays photos only
    const st = storeMedia(b.media, me.id, fields.viewOnce ? ['image', 'video'] : ['image'], convKey(me.id, u.id));
    fields.media = st.file; fields.kind = st.kind;
    if (fields.viewOnce) db.media[st.file].viewOnce = true; // never served by /media/ — only POST /api/messages/:id/open, once
  }
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
  requireChatOpen(req, me, u.id);
  if (blockedEither(me.id, u.id)) throw httpErr(403, "You can't message this account");
  const key = convKey(me.id, u.id);
  // typing indicator: only if I allow it, and only inside an accepted chat
  if (settingsOf(me).typing && (db.accepted[key] || isFollowing(u.id, me.id)) && !L(u).restricted.includes(me.id)) push(u.id, { type: 'typing', from: me.username });
  send(res, 200, { ok: true });
});
route('POST', '/api/dm/:username/seen', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); requireChatOpen(req, me, u.id); markSeen(me, u); send(res, 200, { ok: true });
});
// v1.5 vanish mode: either person can switch it for the chat; a line in the chat tells both
const VANISH_LABEL = { seen: 'messages disappear after they are seen', '1h': 'messages disappear after 1 hour', '24h': 'messages disappear after 24 hours' };
route('PUT', '/api/dm/:username/vanish', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); requireChatOpen(req, me, u.id);
  if (blockedEither(me.id, u.id)) throw httpErr(403, "You can't message this account");
  const mode = String(b.mode || '');
  if (mode !== 'off' && !(mode in VANISH_MODES)) throw httpErr(400, 'mode must be off, seen, 1h or 24h');
  const key = convKey(me.id, u.id); db.vanish = db.vanish || {};
  const before = db.vanish[key] ? db.vanish[key].mode : 'off';
  if (before === mode) return send(res, 200, { vanish: db.vanish[key] ? { mode, byMe: db.vanish[key].by === me.id } : null });
  if (mode === 'off') delete db.vanish[key]; else db.vanish[key] = { mode, by: me.id, since: now() };
  const text = mode === 'off' ? me.username + ' turned off vanish mode' : me.username + ' turned on vanish mode — ' + VANISH_LABEL[mode];
  const m = { id: id(), conv: key, from: me.id, to: u.id, created: now(), seen: 0, request: false, kind: 'system', text };
  db.messages[m.id] = m; save();
  for (const [x, y] of [[u, me], [me, u]]) push(x.id, { type: 'vanish', from: y.username, with: y.username, mode, chat: chatRef(key, x.id) });
  send(res, 200, { vanish: mode === 'off' ? null : { mode, byMe: true }, message: messageView(m, me) });
});
// leaving a vanish chat: what you have seen (sent to you) disappears now
route('POST', '/api/dm/:username/close', true, async (req, res, b, me, p) => {
  const u = otherUser(p.username, me); const key = convKey(me.id, u.id); let n = 0;
  for (const m of Object.values(db.messages)) if (m.conv === key && m.to === me.id && m.vanish === 'seen' && m.seen && !m.deleted) { vanishMsg(m); n++; }
  if (n) save();
  send(res, 200, { ok: true, vanished: n });
});
// v1.5 view-once: only the receiver, only once. The file is read, handed over in this answer and deleted from the server.
route('POST', '/api/messages/:id/open', true, async (req, res, b, me, p) => {
  const m = db.messages[p.id];
  if (!m || m.deleted || (m.from !== me.id && m.to !== me.id)) throw httpErr(404, 'Message not found');
  if (!m.viewOnce) throw httpErr(400, 'Not a view-once message');
  requireChatOpen(req, me, m.from === me.id ? m.to : m.from);
  if (m.to !== me.id) throw httpErr(403, 'Only the receiver can open a view-once ' + (m.kind === 'video' ? 'video' : 'photo'));
  if (m.opened || !m.media) throw httpErr(410, 'Already opened — view-once media can only be seen once');
  const file = m.media; let buf;
  try { buf = fs.readFileSync(path.join(MEDIA_DIR, file)); } catch (e) { m.opened = -1; m.media = null; save(); throw httpErr(410, 'This media is no longer available'); }
  const mime = MIME[file.split('.').pop()] || 'application/octet-stream';
  m.opened = now(); m.media = null; if (!m.seen) m.seen = now();
  dropMedia(file); save();
  push(m.from, { type: 'opened', id: m.id, by: me.username });
  send(res, 200, { kind: m.kind, data: 'data:' + mime + ';base64,' + buf.toString('base64'), file: '/media/' + file, opened: m.opened });
});
route('GET', '/api/messages/:id', true, async (req, res, b, me, p) => {
  const m = db.messages[p.id];
  if (!m || m.deleted || (m.from !== me.id && m.to !== me.id) || (m.expiresAt && m.expiresAt <= now())) throw httpErr(404, 'Message not found'); // same answer as "doesn't exist": no IDOR leak
  requireChatOpen(req, me, m.from === me.id ? m.to : m.from);
  send(res, 200, { message: messageView(m, me) });
});
route('DELETE', '/api/messages/:id', true, async (req, res, b, me, p) => {
  const m = db.messages[p.id];
  if (!m || m.deleted || (m.from !== me.id && m.to !== me.id)) throw httpErr(404, 'Message not found');
  if (m.from !== me.id) throw httpErr(403, 'You can only unsend your own messages');
  m.deleted = true; m.text = ''; if (m.media) { dropMedia(m.media); m.media = null; } save();
  push(m.to, { type: 'unsend', id: m.id, from: me.username }); send(res, 200, { ok: true });
});


// ================================================================ v1.5 privacy routes (Chat PIN, Chat Lock, hidden chats, App Lock, Privacy Center)
function privacyView(req, me) {
  privLists(me); const s = sessOf(req); const al = me.appLock;
  const g = (k) => { const st = guardOf(me, k); return st.until > now() ? { lockedOut: true, retryAfter: Math.ceil((st.until - now()) / 1000) } : { lockedOut: false, triesLeft: PIN_MAX_FAILS - st.fails }; };
  const ok = (i) => db.users[i] && !gone(db.users[i]);
  return {
    chatPinSet: !!(me.chatPin && me.chatPin.hash), chatUnlocked: chatUnlocked(req), chatUntil: chatUnlocked(req) ? s.chatUntil : null,
    lockedChats: me.lockedChats.filter(ok).length, hiddenChats: me.hiddenChats.filter(ok).length, chatPin: g('chat'),
    appLock: appLockOn(me) ? { on: true, minutes: al.minutes || 0, fingerprints: (al.bio || []).map(d => ({ id: d.id, name: d.name, created: d.created })), pin: g('app') } : { on: false, minutes: 0, fingerprints: [] },
    settings: settingsOf(me),
  };
}
route('GET', '/api/privacy', true, async (req, res, b, me) => send(res, 200, privacyView(req, me)));
// set or change the Chat PIN. Changing needs the current PIN (or your account password if you forgot it).
route('POST', '/api/chat-lock/pin', true, async (req, res, b, me) => {
  const had = !!(me.chatPin && me.chatPin.hash);
  if (had) {
    if (b.password !== undefined && b.currentPin === undefined) { if (tooMany('pinpw:' + me.id, 10) || !checkPassword(me, String(b.password || ''))) throw httpErr(401, 'Password is wrong'); }
    else checkPin(me, 'chat', b.currentPin);
  }
  me.chatPin = newPin(b.pin); const g = guardOf(me, 'chat'); g.fails = 0; g.until = 0;
  save(); send(res, had ? 200 : 201, { ok: true, changed: had, privacy: privacyView(req, me) });
});
// remove the Chat PIN: every locked / hidden chat goes back to the normal inbox
route('DELETE', '/api/chat-lock/pin', true, async (req, res, b, me) => {
  checkPin(me, 'chat', b.pin);
  privLists(me); const n = me.lockedChats.length + me.hiddenChats.length;
  me.chatPin = null; me.lockedChats = []; me.hiddenChats = [];
  const s = sessOf(req); if (s) delete s.chatUntil;
  save(); send(res, 200, { ok: true, released: n });
});
route('POST', '/api/chat-lock/unlock', true, async (req, res, b, me) => {
  if (tooMany('pinip:' + clientIp(req), 60)) throw httpErr(429, 'Too many tries from this network, wait 10 minutes');
  checkPin(me, 'chat', b.pin);
  const s = sessOf(req); s.chatUntil = now() + CHAT_UNLOCK_MS; save();
  send(res, 200, { ok: true, until: s.chatUntil });
});
route('POST', '/api/chat-lock/lock', true, async (req, res, b, me) => { const s = sessOf(req); if (s && s.chatUntil) { delete s.chatUntil; save(); } send(res, 200, { ok: true }); });
function folderToggle(folder, add) { // lock / hide one of MY chats. The chat is always "me + that user", so nobody can touch someone else's chat.
  return async (req, res, b, me, p) => {
    const u = userByName(p.username);
    if (!u || u.id === me.id || u.isBot) throw httpErr(404, 'User not found');
    privLists(me);
    const key = folder === 'locked' ? 'lockedChats' : 'hiddenChats', other = folder === 'locked' ? 'hiddenChats' : 'lockedChats';
    if (add) {
      if (!(me.chatPin && me.chatPin.hash)) { const e = httpErr(409, 'Set a Chat PIN first'); e.extra = { needPin: true }; throw e; }
      const cur = chatFolder(me, u.id); if (cur && cur !== folder && !chatUnlocked(req)) throw lockedErr(cur); // moving between folders needs the PIN
      me[other] = me[other].filter(x => x !== u.id);
      if (!me[key].includes(u.id)) me[key].push(u.id);
    } else {
      if (!me[key].includes(u.id)) throw httpErr(404, folder === 'locked' ? 'This chat is not locked' : 'This chat is not hidden');
      if (!chatUnlocked(req)) throw lockedErr(folder);                                                                    // taking it out needs the PIN
      me[key] = me[key].filter(x => x !== u.id);
    }
    save(); send(res, 200, { ok: true, folder: chatFolder(me, u.id) });
  };
}
route('POST', '/api/chat-lock/chats/:username', true, folderToggle('locked', true));
route('DELETE', '/api/chat-lock/chats/:username', true, folderToggle('locked', false));
route('POST', '/api/hidden-chats/:username', true, folderToggle('hidden', true));
route('DELETE', '/api/hidden-chats/:username', true, folderToggle('hidden', false));

// App Lock: one PIN for the account, asked on every device / session; auto-locks after X minutes in the background
route('GET', '/api/app-lock', true, async (req, res, b, me) => send(res, 200, { on: appLockOn(me), locked: appLocked(req, me), minutes: appLockOn(me) ? me.appLock.minutes || 0 : 0, fingerprint: appLockOn(me) && (me.appLock.bio || []).length > 0, pin: privacyView(req, me).appLock.pin || null }));
route('POST', '/api/app-lock', true, async (req, res, b, me) => { // turn on, or change the PIN
  const had = appLockOn(me);
  if (had) {
    if (b.password !== undefined && b.currentPin === undefined) { if (tooMany('pinpw:' + me.id, 10) || !checkPassword(me, String(b.password || ''))) throw httpErr(401, 'Password is wrong'); }
    else checkPin(me, 'app', b.currentPin);
  }
  const minutes = b.minutes === undefined ? (had ? me.appLock.minutes || 0 : 1) : Number(b.minutes);
  if (!AUTOLOCK_MIN.includes(minutes)) throw httpErr(400, 'minutes must be one of ' + AUTOLOCK_MIN.join(', '));
  const rec = newPin(b.pin); me.appLock = Object.assign(rec, { minutes, bio: had ? (me.appLock.bio || []) : [] });
  const g = guardOf(me, 'app'); g.fails = 0; g.until = 0;
  appUnlock.set(req.sessKey, { at: now(), last: now() });   // this device stays open; every other session must enter the PIN
  save(); send(res, had ? 200 : 201, { ok: true, on: true, minutes });
});
route('PUT', '/api/app-lock', true, async (req, res, b, me) => {
  if (!appLockOn(me)) throw httpErr(400, 'App Lock is off');
  const minutes = Number(b.minutes); if (!AUTOLOCK_MIN.includes(minutes)) throw httpErr(400, 'minutes must be one of ' + AUTOLOCK_MIN.join(', '));
  me.appLock.minutes = minutes; save(); send(res, 200, { ok: true, minutes });
});
route('DELETE', '/api/app-lock', true, async (req, res, b, me) => {
  if (!appLockOn(me)) throw httpErr(400, 'App Lock is off');
  checkPin(me, 'app', b.pin);
  me.appLock = null; for (const [k, s] of Object.entries(db.sessions)) if (s.uid === me.id) appUnlock.delete(k);
  save(); send(res, 200, { ok: true, on: false });
});
route('POST', '/api/app-lock/verify', true, async (req, res, b, me) => {
  if (!appLockOn(me)) return send(res, 200, { ok: true, on: false });
  if (tooMany('pinip:' + clientIp(req), 60)) throw httpErr(429, 'Too many tries from this network, wait 10 minutes');
  checkPin(me, 'app', b.pin);
  appUnlock.set(req.sessKey, { at: now(), last: now() }); send(res, 200, { ok: true });
});
route('POST', '/api/app-lock/lock', true, async (req, res, b, me) => { appUnlock.delete(req.sessKey); send(res, 200, { ok: true, locked: appLockOn(me) }); });
route('POST', '/api/app-lock/alive', true, async (req, res) => send(res, 200, { ok: true })); // heartbeat while the app is open (keeps the idle timer fresh)
// fingerprint (Android app): the phone keeps a random device key behind its fingerprint prompt; the server only stores its hash
route('POST', '/api/app-lock/bio', true, async (req, res, b, me) => {
  if (!appLockOn(me)) throw httpErr(400, 'Turn on App Lock first');
  const list = me.appLock.bio = (me.appLock.bio || []).slice(-4);
  const secret = id(32), dev = { id: id(8), hash: sha('bio:' + secret), name: clean(b.name, 40) || deviceOf(req.headers['user-agent']), created: now() };
  list.push(dev); save();
  send(res, 201, { deviceId: dev.id, secret });
});
route('DELETE', '/api/app-lock/bio/:id', true, async (req, res, b, me, p) => {
  if (!appLockOn(me)) throw httpErr(404, 'Not found');
  const before = (me.appLock.bio || []).length; me.appLock.bio = (me.appLock.bio || []).filter(d => d.id !== p.id);
  if (me.appLock.bio.length === before) throw httpErr(404, 'Not found');
  save(); send(res, 200, { ok: true });
});
route('POST', '/api/app-lock/bio-verify', true, async (req, res, b, me) => {
  if (!appLockOn(me)) return send(res, 200, { ok: true, on: false });
  if (tooMany('pinip:' + clientIp(req), 60)) throw httpErr(429, 'Too many tries from this network, wait 10 minutes');
  const dev = (me.appLock.bio || []).find(d => d.id === String(b.deviceId || ''));
  checkSecret(me, 'app', () => !!dev && sameHex(sha('bio:' + String(b.secret || '')), dev.hash));
  appUnlock.set(req.sessKey, { at: now(), last: now() }); send(res, 200, { ok: true });
});

// ================================================================ notifications
route('GET', '/api/notifications', true, async (req, res, b, me) => {
  const list = Object.values(db.notifs).filter(n => n.to === me.id && db.users[n.from] && !gone(db.users[n.from]) && !blockedEither(me.id, n.from)).sort((a, c) => c.created - a.created).slice(0, 60)
    .map(n => { const pst = n.pid && db.posts[n.pid]; return { id: n.id, type: n.type, created: n.created, read: n.read, text: n.text || '', user: Object.assign(publicUser(db.users[n.from], me), { isFollowing: isFollowing(me.id, n.from), requested: (db.requests[n.from] || []).includes(me.id) }), post: pst && canView(me, db.users[pst.uid]) && postVisible(pst, me) ? { id: pst.id, media: postMedia(pst), poster: postPoster(pst), type: pst.type } : null }; });
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
    posts: Object.values(db.posts).filter(p => p.type === 'image').length, reels: Object.values(db.posts).filter(p => p.type === 'video' && !p.reel).length, importedReels: importedCount(),
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
  return { id: x.id, type: x.type, media: postMedia(x), poster: postPoster(x), imported: !!x.reel, caption: x.caption.slice(0, 120), created: x.created, user: db.users[x.uid] ? db.users[x.uid].username : '?',
    realLikes: x.likes.filter(i => !isBotId(i)).length, bonusLikes: botLikesOf(x).length + (x.bonusLikes || 0), botLikes: botLikesOf(x).length,
    realComments: Object.values(db.comments).filter(c => c.pid === x.id && !c.bot).length, bonusComments: botCommentsOf(x).length + (x.bonusComments || 0), botComments: botCommentsOf(x).length,
    realViews: (x.views || []).length, bonusViews: x.bonusViews || 0 };
}
adminRoute('GET', '/api/admin/posts', async (req, res, b, me, p, q) => {
  const user = clean(q.get('user'), 30).toLowerCase(); const u = user ? userByName(user) : null;
  let list = Object.values(db.posts); if (user) list = list.filter(x => u && x.uid === u.id); else if (q.get('imported') !== '1') list = list.filter(x => !x.reel); // imported reels have their own section
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
  for (const x of Object.values(db.posts)) if ((!u && !x.reel) || (u && x.uid === u.id)) { delete x.bonusLikes; delete x.bonusComments; delete x.bonusViews; setBotLikes(x, 0, { noCap: true }); setBotComments(x, 0, { noCap: true }); }
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

// ================================================================ v1.3 admin: bulk reels import
adminRoute('GET', '/api/admin/reels', async (req, res, b, me, p, q) => {
  const r = RI(); const files = inboxFiles();
  const recent = Object.values(db.posts).filter(x => x.reel).sort((a, c) => (r.files[c.media] || {}).at - (r.files[a.media] || {}).at || c.created - a.created).slice(0, 20).map(adminPost);
  send(res, 200, { imported: importedCount(), inbox: files.length, pending: files.filter(f => !r.files[f]).length, auto: !!r.auto, every: r.every, batch: r.batch,
    last: r.last || null, busy: importBusy, disk: diskInfo(), mem: { rssMB: Math.round(process.memoryUsage().rss / 1e6), freeMB: Math.round(require('os').freemem() / 1e6), totalMB: Math.round(require('os').totalmem() / 1e6) }, recent,
    records: q.get('files') ? Object.fromEntries(String(q.get('files')).split(',').slice(0, 50).filter(f => REEL_FILE_RE.test(f)).map(f => [f, r.files[f] || null])) : undefined });
});
adminRoute('GET', '/api/admin/reels/inbox', async (req, res) => { // file list with sizes (the uploader skips what is already here)
  const out = {}; for (const f of fs.readdirSync(IMPORT_DIR)) if (REEL_FILE_RE.test(f) || REEL_POSTER_RE.test(f)) { try { out[f] = fs.statSync(path.join(IMPORT_DIR, f)).size; } catch (e) {} }
  send(res, 200, { files: out, manifest: importManifest().size });
});
adminRoute('POST', '/api/admin/reels/import', async (req, res, b, me, p, q) => { // ?limit=N (max 500); ?only=a.mp4,b.mp4 limits it to named files
  const only = q.get('only') ? new Set(String(q.get('only')).split(',').filter(f => REEL_FILE_RE.test(f))) : null;
  send(res, 200, importReels(q.get('limit') || b.limit || 50, 'admin', only));
});
adminRoute('DELETE', '/api/admin/reels/inbox/:file', async (req, res, b, me, p) => { // remove a file from the import folder (the reel itself stays if imported)
  const f = importPath(p.file); if (!f) throw httpErr(400, 'Bad file name');
  let removed = false; try { fs.unlinkSync(f); removed = true; } catch (e) {}
  send(res, 200, { removed });
});
adminRoute('PUT', '/api/admin/reels/settings', async (req, res, b) => {
  const r = RI();
  if (b.auto !== undefined) r.auto = !!b.auto;
  if (b.every !== undefined) r.every = Math.max(1, Math.min(60, parseInt(b.every, 10) || 3));
  if (b.batch !== undefined) r.batch = Math.max(10, Math.min(500, parseInt(b.batch, 10) || 150));
  save(); send(res, 200, { auto: r.auto, every: r.every, batch: r.batch });
});
adminRoute('DELETE', '/api/admin/reels', async (req, res) => send(res, 200, { deleted: removeImportedReels(), auto: false }));
// upload ONE file into IMPORT_DIR (raw body, streamed to disk): PUT /api/admin/reels/inbox/0001.mp4 (+ x-reel-meta: base64 JSON {title, duration, source_name}) or 0001.jpg (poster)
route('PUT', '/api/admin/reels/inbox/:file', true, async (req, res, b, me, p) => {
  requireAdmin(req, me);
  const file = p.file, dst = importPath(file); if (!dst) throw httpErr(400, 'Bad file name');
  const isVid = REEL_FILE_RE.test(file), max = isVid ? MAX_REEL_BYTES : 2 * 1024 * 1024;
  const len = parseInt(req.headers['content-length'] || '0', 10);
  if (!len) throw httpErr(411, 'Content-Length required');
  if (len > max) throw httpErr(413, 'File too large');
  let meta = null;
  if (isVid && req.headers['x-reel-meta']) { try { meta = JSON.parse(Buffer.from(String(req.headers['x-reel-meta']), 'base64').toString('utf8')); } catch (e) { throw httpErr(400, 'Bad x-reel-meta'); } }
  try { if (fs.statSync(dst).size === len) { req.resume(); if (meta) setManifestEntry(file, meta); return send(res, 200, { ok: true, skipped: true }); } } catch (e) {}
  const tmp = path.join(IMPORT_DIR, '.' + file + '.' + id(4) + '.part');
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(tmp); let n = 0, done = false;
    const fail = (err) => { if (done) return; done = true; ws.destroy(); fs.rm(tmp, () => {}); reject(err); };
    req.on('data', c => { n += c.length; if (n > max) { fail(httpErr(413, 'File too large')); req.destroy(); } });
    req.on('aborted', () => fail(httpErr(400, 'Upload aborted')));
    req.on('error', fail); ws.on('error', fail);
    ws.on('finish', () => { if (done) return; if (n !== len) return fail(httpErr(400, 'Upload incomplete')); done = true; resolve(); });
    req.pipe(ws);
  });
  const t = sniffFile(tmp);
  if (!t || t.ext !== (isVid ? 'mp4' : 'jpg')) { fs.rm(tmp, () => {}); throw httpErr(415, isVid ? 'Not an mp4 video' : 'Not a jpg'); }
  fs.renameSync(tmp, dst); if (meta) setManifestEntry(file, meta);
  send(res, 201, { ok: true, bytes: len });
});
routes[routes.length - 1].raw = true;

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
      if (me && appLockOn(me)) { // v1.5 App Lock: a locked session can only see who it is and unlock
        const sig = req.method + ' ' + r.pattern;
        if (!APP_LOCK_OPEN.has(sig) && !r.pattern.startsWith('/api/admin/reels')) { // the reels uploader script keeps working
          if (appLocked(req, me)) { const e = httpErr(423, 'Private Insta is locked. Enter your App Lock PIN.'); e.extra = { appLocked: true }; throw e; }
          appUnlock.get(req.sessKey).last = now();
        }
      }
      const m = r.re.exec(pathname); const params = {}; r.keys.forEach((k, i) => params[k] = m[i + 1]);
      const body = (req.method === 'GET' || r.raw) ? {} : await readBody(req);
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
      if (meta.viewOnce) return deny(404, 'Not found');                                                 // v1.5: view-once files are never served as links
      if (meta.conv) { if (!meta.conv.split(':').includes(me.id)) return deny(404, 'Not found'); } // DM photos: only the two people in that chat
      else if (!mediaAllowed(file, meta, me, req)) return deny(403, 'This account is private');      // private accounts / close friends / blocks
      res.setHeader('Vary', 'Cookie');
      return serveFile(req, res, path.join(MEDIA_DIR, file), MIME[file.split('.').pop()], 'private, max-age=3600');
    }
    if (pathname.startsWith('/reels-media/')) { // imported reels: public (bot pages are public), streamable with HTTP Range, cached by the CDN
      const file = pathname.slice(13); const nf = () => { res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); res.end('Not found'); };
      if (!REEL_FILE_RE.test(file) && !REEL_POSTER_RE.test(file)) return nf();
      const rec = RI().files[file.replace(/\.jpg$/, '.mp4')]; if (!rec || !rec.pid || !db.posts[rec.pid]) return nf();
      return serveFile(req, res, path.join(REELS_DIR, file), file.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', 'public, max-age=31536000, immutable');
    }
    if (pathname === '/healthz') return send(res, 200, { ok: true, app: APP_NAME, version: VERSION, users: Object.values(db.users).filter(u => !u.isBot).length, posts: Object.keys(db.posts).length, importedReels: importedCount() });
    // static files
    let f = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!f.startsWith(PUBLIC_DIR)) { res.writeHead(400); return res.end(); }
    if (pathname === '/' || !path.extname(pathname)) f = path.join(PUBLIC_DIR, 'index.html');
    const ext = path.extname(f);
    return serveFile(req, res, f, STATIC_MIME[ext] || 'application/octet-stream', (ext === '.html' || ext === '.apk' || ext === '.zip') ? 'no-cache' : 'public, max-age=300');
  } catch (e) {
    const code = e.code && Number.isInteger(e.code) ? e.code : 500;
    if (code === 500) console.error(e);
    if (!res.headersSent) send(res, code, Object.assign({ error: code === 500 ? 'Server error' : e.message }, code === 500 ? {} : (e.extra || {})));
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
