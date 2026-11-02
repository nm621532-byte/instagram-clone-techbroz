// Private Insta v1.1 seed: NO fake content (Noor, Nov 2 2026: "faltu ki ring se add mat karo jab tak user add nahin hote").
// A fresh database gets exactly one plain test login (demo / demo1234) with no posts, stories or followers.
// Upgrading from v1.0 removes the five seeded demo accounts (and everything they posted, liked, commented or sent)
// and the demo account's seeded post/photo, once. Accounts real people created are never touched.
'use strict';
const crypto = require('crypto');
const OLD_DEMO = ['techbroz', 'aarav.travels', 'priya.foodie', 'zoya.art', 'rahul.clicks'];

function run(api) {
  const { db } = api;
  if (!db.seedPurged) {
    let n = 0;
    for (const u of Object.values(db.users)) if (u.demo && OLD_DEMO.includes(u.username)) { api.deleteUserData(u); n++; }
    const demo = Object.values(db.users).find(u => u.demo && u.username === 'demo');
    if (demo) {
      for (const p of Object.values(db.posts)) if (p.uid === demo.id) {
        for (const c of Object.values(db.comments)) if (c.pid === p.id) delete db.comments[c.id];
        for (const x of Object.values(db.notifs)) if (x.pid === p.id) delete db.notifs[x.id];
        delete db.media[p.media]; try { require('fs').rmSync(require('path').join(api.MEDIA_DIR, p.media), { force: true }); } catch (e) {}
        delete db.posts[p.id];
      }
      for (const s of Object.values(db.stories)) if (s.uid === demo.id) delete db.stories[s.id];
      if (demo.avatar) { delete db.media[demo.avatar]; try { require('fs').rmSync(require('path').join(api.MEDIA_DIR, demo.avatar), { force: true }); } catch (e) {} demo.avatar = null; }
      demo.bio = 'Test account — sign up to make your own ✨'; demo.verified = false;
    }
    db.seedPurged = true; db.seeded = true; api.save();
    if (n) console.log('removed', n, 'seeded demo accounts');
  }
  if (!db.seeded && Object.keys(db.users).length === 0) {
    const salt = api.id(16); const uid = api.id();
    db.users[uid] = { id: uid, username: 'demo', name: 'Demo User', bio: 'Test account — sign up to make your own ✨', demo: true, salt,
      pass: api.hashPassword('demo1234', salt), created: Date.now(), avatar: null, logins: [] };
    api.settingsOf(db.users[uid]); api.L(db.users[uid]);
    db.follows[uid] = [];
    db.seeded = true; db.seedPurged = true; api.save();
    console.log('created test login demo / demo1234');
  }
}
module.exports = { run };
