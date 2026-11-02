#!/usr/bin/env node
// InstaGlass smoke + security test. Run before EVERY publish:
//   node test/smoke.mjs http://localhost:3000        (or the live URL)
// Creates throwaway users (random names), exercises every feature, then tries IDOR / auth attacks that MUST fail.
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const rnd = Math.random().toString(36).slice(2, 8);
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };
// 1x1 JPEG + PNG
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const FAKE = 'data:image/jpeg;base64,' + Buffer.from('<script>alert(1)</script> not really a jpeg').toString('base64');
class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async req(method, path, body, opts = {}) {
    const headers = { 'X-IG': '1' };
    if (opts.noCsrf) delete headers['X-IG'];
    if (this.cookie && !opts.anon) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc && sc.startsWith('ig_sid=')) this.cookie = sc.split(';')[0];
    let data = null; const ct = r.headers.get('content-type') || '';
    if (ct.includes('json')) data = await r.json(); else await r.arrayBuffer();
    return { status: r.status, data, headers: r.headers };
  }
  get(p, o) { return this.req('GET', p, undefined, o); }
  post(p, b, o) { return this.req('POST', p, b || {}, o); }
  put(p, b) { return this.req('PUT', p, b); }
  del(p) { return this.req('DELETE', p); }
}
function stream(client) { // minimal SSE reader
  const events = []; const ctrl = new AbortController();
  const ready = fetch(BASE + '/api/stream', { headers: { Cookie: client.cookie }, signal: ctrl.signal }).then(async r => {
    const reader = r.body.getReader(); let buf = '';
    (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; buf += Buffer.from(value).toString();
      let i; while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const line = chunk.split('\n').find(l => l.startsWith('data: ')); if (line) events.push(JSON.parse(line.slice(6))); } } } catch (e) {} })();
    return r.status;
  });
  return { events, ready, close: () => ctrl.abort() };
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms = 6000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(100); } return false; }

(async () => {
  console.log('InstaGlass smoke test against ' + BASE);
  const A = new Client('a'), Bc = new Client('b'), C = new Client('c');
  const ua = 'ta_' + rnd, ub = 'tb_' + rnd, uc = 'tc_' + rnd, pw = 'test-pass-' + rnd;
  console.log('— accounts');
  ok((await A.get('/api/me')).status === 401, 'not logged in -> /api/me is 401');
  ok((await A.post('/api/signup', { username: ua, password: pw, name: 'Test A' })).status === 201, 'signup user A');
  ok((await Bc.post('/api/signup', { username: ub, password: pw, name: 'Test B' })).status === 201, 'signup user B');
  ok((await C.post('/api/signup', { username: uc, password: pw, name: 'Test C' })).status === 201, 'signup user C (outsider)');
  ok((await new Client('x').post('/api/signup', { username: ua, password: pw })).status === 409, 'duplicate username rejected');
  ok((await new Client('x').post('/api/signup', { username: 'Bad Name!', password: pw })).status === 400, 'invalid username rejected');
  ok((await new Client('x').post('/api/login', { username: ua, password: 'wrong' })).status === 401, 'wrong password rejected');
  const relog = new Client('a2'); ok((await relog.post('/api/login', { username: ua, password: pw })).status === 200, 'login with correct password');
  ok((await A.get('/api/me')).data.user.username === ua, '/api/me returns own user');
  ok(!JSON.stringify((await A.get('/api/users/' + ub)).data).match(/pass|salt/), 'profile JSON never leaks password hash/salt');

  console.log('— follow + profile');
  ok((await A.post('/api/users/' + ub + '/follow')).data.following === true, 'A follows B');
  ok((await Bc.post('/api/users/' + ua + '/follow')).data.following === true, 'B follows A');
  ok((await A.put('/api/me', { bio: 'hello from A', avatar: JPG })).status === 200, 'A edits own profile + avatar');
  ok((await Bc.get('/api/users/' + ua)).data.user.bio === 'hello from A', 'B sees A bio');

  console.log('— posts, likes, comments');
  const pr = await A.post('/api/posts', { media: JPG, caption: 'smoke test post ' + rnd });
  ok(pr.status === 201, 'A creates a post with an image'); const pid = pr.data.post.id;
  ok((await A.post('/api/posts', { media: FAKE, caption: 'x' })).status === 415, 'fake image (script bytes) rejected');
  ok((await A.post('/api/posts', { media: 'not a data url' })).status === 400, 'non-data-url upload rejected');
  ok((await A.post('/api/posts', { media: 'data:image/png;base64,' + Buffer.alloc(9 * 1024 * 1024, 1).toString('base64') })).status >= 413, 'oversized upload rejected');
  const feedB = await Bc.get('/api/feed'); ok(feedB.data.posts.some(p => p.id === pid), "A's post is in B's feed");
  ok((await Bc.post('/api/posts/' + pid + '/like')).data.likes === 1, 'B likes the post');
  ok((await Bc.post('/api/posts/' + pid + '/like')).data.likes === 1, 'double like is idempotent');
  const cm = await Bc.post('/api/posts/' + pid + '/comments', { text: 'nice one 🔥' }); ok(cm.status === 201, 'B comments');
  ok((await A.get('/api/posts/' + pid + '/comments')).data.comments.length === 1, 'A sees the comment');
  ok((await Bc.post('/api/posts/' + pid + '/save')).data.saved === true, 'B saves the post');
  ok((await Bc.get('/api/saved')).data.posts.some(p => p.id === pid), 'post in B saved list');
  const notifs = await A.get('/api/notifications');
  ok(['like', 'comment', 'follow'].every(t => notifs.data.notifications.some(n => n.type === t)), 'A got like + comment + follow notifications');

  console.log('— stories');
  const st = await A.post('/api/stories', { media: JPG }); ok(st.status === 201, 'A posts a story'); const sid = st.data.story.id;
  const trayB = await Bc.get('/api/stories'); ok(trayB.data.tray.some(u => u.username === ua && !u.storySeen), 'B sees A in story tray (unseen ring)');
  ok((await Bc.post('/api/stories/' + sid + '/seen')).status === 200, 'B views the story');
  ok((await Bc.get('/api/stories')).data.tray.some(u => u.username === ua && u.storySeen), 'ring turns seen for B');
  ok((await A.get('/api/stories/' + ua)).data.stories[0].viewers.some(v => v.username === ub), 'A sees B in story viewers');
  ok((await Bc.get('/api/stories/' + ua)).data.stories[0].viewers === undefined, 'B cannot see the viewer list of A story');

  console.log('— direct messages (realtime)');
  const sB = stream(Bc); const sA = stream(A);
  ok((await sB.ready) === 200 && (await sA.ready) === 200, 'realtime streams open');
  await wait(300);
  const m1 = await A.post('/api/dm/' + ub, { text: 'hi B 👋' }); ok(m1.status === 201, 'A -> B text message');
  ok(await waitFor(() => sB.events.some(e => e.type === 'dm' && e.message.text === 'hi B 👋')), 'B receives it in real time');
  await Bc.post('/api/dm/' + ua + '/typing'); ok(await waitFor(() => sA.events.some(e => e.type === 'typing' && e.from === ub)), 'A sees B typing…');
  const m2 = await Bc.post('/api/dm/' + ua, { text: 'hey A!' }); ok(m2.status === 201, 'B -> A reply');
  ok(await waitFor(() => sA.events.some(e => e.type === 'dm' && e.message.text === 'hey A!')), 'A receives reply in real time');
  const inboxB = await Bc.get('/api/inbox'); ok(inboxB.data.conversations.find(c => c.user.username === ua).unread >= 1, 'B inbox shows unread');
  await Bc.get('/api/dm/' + ua); ok(await waitFor(() => sA.events.some(e => e.type === 'seen' && e.by === ub)), 'A gets "Seen" when B opens chat');
  const img = await A.post('/api/dm/' + ub, { media: JPG }); ok(img.status === 201 && img.data.message.media, 'A sends a photo in DM');
  const share = await Bc.post('/api/dm/' + ua, { postId: pid, text: 'look at this' }); ok(share.status === 201 && share.data.message.post.id === pid, 'B shares a post to A via DM');
  ok((await A.get('/api/dm/' + ub)).data.messages.some(m => m.kind === 'post' && m.post && m.post.id === pid), 'A sees the shared post card');
  sA.close(); sB.close();

  console.log('— security: IDOR / auth attacks (all must FAIL)');
  ok((await Bc.del('/api/posts/' + pid)).status === 403, 'B cannot delete A post');
  ok((await Bc.put('/api/posts/' + pid, { caption: 'hacked' })).status === 403, 'B cannot edit A caption');
  ok((await A.get('/api/posts/' + pid)).data.post.caption.startsWith('smoke test post'), 'caption unchanged');
  ok((await C.del('/api/comments/' + cm.data.comment.id)).status === 403, 'C cannot delete B comment');
  ok((await C.del('/api/stories/' + sid)).status === 403, 'C cannot delete A story');
  ok((await C.post('/api/stories/' + sid + '/seen')).status === 403, 'C (not following) cannot open A story');
  ok((await C.get('/api/messages/' + m1.data.message.id)).status === 404, 'C cannot read a message of the A-B chat by id');
  ok((await Bc.del('/api/messages/' + m1.data.message.id)).status === 403, 'B cannot unsend A message');
  const inboxC = await C.get('/api/inbox'); ok(inboxC.data.conversations.length === 0, 'C inbox does not contain A-B chat');
  const mediaPath = new URL(img.data.message.media, BASE).pathname;
  ok((await C.get(mediaPath)).status === 404, 'C cannot open the DM photo URL of the A-B chat');
  ok((await Bc.get(mediaPath)).status === 200, 'B (participant) can open that DM photo');
  ok((await new Client('anon').get(mediaPath)).status === 401, 'logged-out visitor cannot open media');
  ok((await new Client('anon').get('/api/feed')).status === 401, 'logged-out visitor cannot read the feed');
  ok((await A.post('/api/posts/' + pid + '/like', {}, { noCsrf: true })).status === 403, 'request without CSRF header rejected');
  ok((await C.put('/api/me', { bio: 'C bio' })).status === 200 && (await A.get('/api/users/' + ua)).data.user.bio === 'hello from A', 'PUT /api/me only changes the caller (A bio intact)');
  ok((await A.post('/api/dm/' + ua, { text: 'me' })).status === 400, 'cannot DM yourself');
  const forged = new Client('f'); forged.cookie = 'ig_sid=' + 'a'.repeat(64);
  ok((await forged.get('/api/me')).status === 401, 'forged session token rejected');
  const trav = await fetch(BASE + '/%2e%2e/server.js'); const travText = await trav.text(); ok(!travText.includes('require('), 'path traversal does not leak server code');

  console.log('— cleanup');
  ok((await Bc.del('/api/messages/' + share.data.message.id)).status === 200, 'B unsends own message');
  ok((await A.del('/api/stories/' + sid)).status === 200, 'A deletes own story');
  ok((await A.del('/api/posts/' + pid)).status === 200, 'A deletes own post');
  ok((await A.req('DELETE', '/api/me', { password: 'wrong' })).status === 401, 'delete account needs the right password');
  ok((await A.post('/api/logout')).status === 200 && (await A.get('/api/me')).status === 401, 'logout ends the session');
  await A.post('/api/login', { username: ua, password: pw });
  for (const [cl, n] of [[A, ua], [Bc, ub], [C, uc]]) ok((await cl.req('DELETE', '/api/me', { password: pw })).status === 200, 'test account ' + n + ' deleted');
  ok((await relog.get('/api/me')).status === 401, 'other sessions of a deleted account stop working');

  console.log(`\n${fail ? '❌' : '✅'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
