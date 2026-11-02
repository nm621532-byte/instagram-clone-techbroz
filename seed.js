// Demo data so a fresh InstaGlass doesn't look empty. Runs once on an empty database,
// and keeps the demo accounts' stories fresh (stories expire after 24 h).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SEED = path.join(__dirname, 'seed');

const USERS = [
  { u: 'techbroz', name: 'Tech Bro Z', verified: true, bio: 'Coding videos in Hinglish 💻\nYouTube @techbrozdeveloper · IG @tech_bro_z_1\nThis app is our open-source project 👇' },
  { u: 'aarav.travels', name: 'Aarav Mehta', bio: 'Mountains > everything 🏔️\nBackpacking India & beyond' },
  { u: 'priya.foodie', name: 'Priya Sharma', bio: 'Chai, cafes & cake 🍰\nMumbai | food stories daily' },
  { u: 'zoya.art', name: 'Zoya Khan', bio: 'Artist 🎨 flowers, colours & calm' },
  { u: 'rahul.clicks', name: 'Rahul Verma', bio: '📷 Street + travel photography\nDM for collabs' },
  { u: 'demo', name: 'Demo User', bio: 'Just exploring InstaGlass ✨', password: 'demo1234' },
];
const POSTS = [
  ['techbroz', 'p20', 'Late night coding setup 🌙 Who else codes better after midnight? #coding #setup'],
  ['techbroz', 'p48', 'This whole app (InstaGlass) runs on plain Node.js — zero packages. Code is on GitHub, link in bio 🔥'],
  ['techbroz', 'p119', 'Laptop + chai = productivity 😄 Comment your favourite programming language 👇'],
  ['techbroz', 'p60', 'Simple desk, big dreams. Keep learning every day 💪'],
  ['aarav.travels', 'p29', 'Woke up to this view 🏔️ worth every km of the trek'],
  ['aarav.travels', 'p49', 'Blue doors, white walls 💙 Santorini vibes'],
  ['aarav.travels', 'p16', 'Sea, sky and silence 🌊'],
  ['aarav.travels', 'p77', 'Sunset walks on the pier 🌅'],
  ['aarav.travels', 'p116', 'Rolling hills and golden light ☀️'],
  ['priya.foodie', 'p42', 'Found the cosiest cafe in town ☕ who wants to come along?'],
  ['priya.foodie', 'p63', 'Monday fuel: one strong coffee ☕'],
  ['priya.foodie', 'p102', 'Fresh raspberries 🍓 smoothie bowl loading...'],
  ['priya.foodie', 'p113', 'Slow mornings are the best mornings'],
  ['zoya.art', 'p82', 'Spring is here 🌸'],
  ['zoya.art', 'p106', 'Painting this next 🎨 which colours should I use?'],
  ['zoya.art', 'p104', 'Little things that make my room feel like home ✨'],
  ['zoya.art', 'p39', 'Vinyl + sketchbook kind of evening 🎶'],
  ['rahul.clicks', 'p84', 'Lines and light 🌉'],
  ['rahul.clicks', 'p57', 'City stories 🏙️ #streetphotography'],
  ['rahul.clicks', 'p111', 'Classic beauty 🚗'],
  ['rahul.clicks', 'p110', 'Golden hour never disappoints 🌇'],
  ['rahul.clicks', 'p96', 'Weekend = gaming mode 🎮'],
  ['demo', 'p103', 'My first post on InstaGlass 👋'],
];
const REELS = [
  ['aarav.travels', 'reel1', 'Waterfall day 💦 #reels #travel'],
  ['zoya.art', 'reel2', 'Forest walk for inspiration 🌲'],
  ['rahul.clicks', 'reel3', 'Slow pan, fast heartbeat 📷'],
];
const STORIES = { 'aarav.travels': ['p100', 'p54'], 'priya.foodie': ['p24'], 'zoya.art': ['p37'], 'rahul.clicks': ['p112', 'p11'], techbroz: ['p36'] };
const COMMENTS = [
  ['aarav.travels', 'techbroz', 0, 'Bro this setup is 🔥'], ['priya.foodie', 'techbroz', 1, 'Zero packages?? Respect 🙌'],
  ['rahul.clicks', 'aarav.travels', 0, 'Insane shot! Which camera?'], ['aarav.travels', 'rahul.clicks', 0, 'Phone only 😄'],
  ['zoya.art', 'priya.foodie', 0, 'Take me there ☕'], ['demo', 'zoya.art', 0, 'So pretty 🌸'],
  ['priya.foodie', 'zoya.art', 1, 'Pastel pink and lilac!'], ['techbroz', 'rahul.clicks', 1, 'Frame-worthy 👌'],
];

function copyMedia(api, srcFile, owner) {
  const ext = path.extname(srcFile).slice(1);
  const file = crypto.randomBytes(16).toString('hex') + '.' + ext;
  fs.copyFileSync(srcFile, path.join(api.MEDIA_DIR, file));
  api.db.media[file] = { owner, conv: null, created: Date.now() };
  return file;
}
function refreshStories(api) {
  const { db } = api; const t = Date.now(); let changed = false;
  for (const [uname, imgs] of Object.entries(STORIES)) {
    const u = Object.values(db.users).find(x => x.username === uname && x.demo); if (!u) continue;
    const active = Object.values(db.stories).some(s => s.uid === u.id && t - s.created < api.STORY_TTL);
    if (active) continue;
    imgs.forEach((img, i) => {
      const sid = api.id();
      db.stories[sid] = { id: sid, uid: u.id, media: copyMedia(api, path.join(SEED, 'img', img + '.jpg'), u.id), type: 'image', created: t - (imgs.length - i) * 600000 - Math.floor(Math.random() * 3600000), seen: [] };
    });
    changed = true;
  }
  if (changed) api.save();
}
function run(api) {
  const { db } = api;
  if (!db.seeded && Object.keys(db.users).length === 0) {
    const ids = {};
    const T = Date.now();
    for (const x of USERS) {
      const salt = api.id(16); const uid = api.id();
      ids[x.u] = uid;
      db.users[uid] = { id: uid, username: x.u, name: x.name, bio: x.bio, verified: !!x.verified, demo: true, salt,
        pass: api.hashPassword(x.password || crypto.randomBytes(18).toString('hex'), salt), created: T - 30 * 864e5,
        avatar: copyMedia(api, path.join(SEED, 'avatars', x.u + '.jpg'), uid) };
      db.follows[uid] = [];
    }
    const all = Object.keys(ids);
    for (const a of all) for (const b of all) if (a !== b && (b === 'techbroz' || a === 'demo' || Math.random() < 0.6)) db.follows[ids[a]].push(ids[b]);
    const byUser = {};
    const items = POSTS.map(p => [p[0], 'img', p[1] + '.jpg', p[2], 'image']);
    REELS.forEach((r, k) => items.splice(4 + k * 6, 0, [r[0], 'reels', r[1] + '.mp4', r[2], 'video']));
    items.push(items.splice(items.findIndex(x => x[2] === 'p48.jpg'), 1)[0]); // newest post: the techbroz announcement
    items.forEach((p, i) => {
      const pid = api.id(); const uid = ids[p[0]];
      const likers = all.filter(n => n !== p[0] && n !== 'demo' && Math.random() < 0.7).map(n => ids[n]);
      db.posts[pid] = { id: pid, uid, media: copyMedia(api, path.join(SEED, p[1], p[2]), uid), type: p[4], caption: p[3], created: T - (items.length - i) * 3.1 * 3600e3 - Math.floor(Math.random() * 3e6), likes: likers, saves: [] };
      (byUser[p[0]] = byUser[p[0]] || []).push(pid);
    });
    COMMENTS.forEach(([who, owner, idx, text], i) => {
      const pid = (byUser[owner] || [])[idx]; if (!pid) return;
      const cid = api.id(); db.comments[cid] = { id: cid, pid, uid: ids[who], text, created: db.posts[pid].created + (i + 1) * 600000 };
    });
    const dm = (from, to, text, extra, ago) => { const mid = api.id(); db.messages[mid] = Object.assign({ id: mid, conv: [ids[from], ids[to]].sort().join(':'), from: ids[from], to: ids[to], kind: 'text', text, created: T - ago, seen: 0 }, extra || {}); };
    dm('techbroz', 'demo', 'Welcome to InstaGlass! 👋 Try sending me a message, a photo, or share a post with the ✈️ button.', null, 3600e3);
    dm('aarav.travels', 'demo', 'Check this view 😍', { kind: 'post', postId: byUser['aarav.travels'][0] }, 1800e3);
    dm('priya.foodie', 'demo', 'Cafe this weekend? ☕', null, 900e3);
    const nid = api.id(); db.notifs[nid] = { id: nid, to: ids.demo, from: ids['zoya.art'], type: 'follow', created: T - 7200e3, read: false };
    db.seeded = true;
    api.save();
    console.log('seeded demo data');
  }
  refreshStories(api);
  setInterval(() => refreshStories(api), 30 * 60 * 1000).unref();
}
module.exports = { run };
