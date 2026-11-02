#!/usr/bin/env node
// Private Insta (InstaGlass) smoke + security test, v1.5 (v1.4 + Chat Lock, hidden chats, vanish mode, view-once, App Lock, privacy toggles). Run before EVERY publish:
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
  async raw(method, path, buf, extra = {}) { // binary upload (v1.3 reels inbox)
    const headers = Object.assign({ 'X-IG': '1', 'Content-Type': 'application/octet-stream' }, extra); if (this.cookie) headers.Cookie = this.cookie;
    const r = await fetch(BASE + path, { method, headers, body: buf }); const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : (await r.arrayBuffer(), null) };
  }
}
import { readFileSync } from 'node:fs';
const FIX = new URL('./fixtures/', import.meta.url);
const SAMPLE_MP4 = readFileSync(new URL('sample.mp4', FIX)), SAMPLE_JPG = readFileSync(new URL('sample.jpg', FIX));
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
  console.log('Private Insta smoke test against ' + BASE);
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

  
  // ================================================================ v1.1: settings / privacy / safety
  const D = new Client('d'); const ud = 'td_' + rnd;
  ok((await D.post('/api/signup', { username: ud, password: pw, name: 'Test D' })).status === 201, 'signup user D (stranger)');
  const JPG2 = JPG;

  console.log('— v1.1 edit profile');
  ok((await C.put('/api/me', { username: ua })).status === 409, 'username already taken is rejected');
  ok((await C.put('/api/me', { username: 'Bad Name!' })).status === 400, 'invalid username is rejected');
  ok((await C.put('/api/me', { website: 'javascript:alert(1)' })).status === 400, 'bad website link rejected');
  const ucNew = 'tc2_' + rnd;
  const ed = await C.put('/api/me', { username: ucNew, website: 'example.com', pronouns: 'he/him', gender: 'male', accent: '#22d3ee', name: 'Test C2' });
  ok(ed.status === 200 && ed.data.user.username === ucNew && ed.data.user.website === 'https://example.com' && ed.data.user.accent === '#22d3ee', 'C edits username, website, pronouns, gender, accent');
  const vC = await A.get('/api/users/' + ucNew); ok(vC.status === 200 && vC.data.user.pronouns === 'he/him' && vC.data.user.gender === undefined, 'others see pronouns but not gender');
  ok((await A.get('/api/users/' + uc)).status === 404, 'old username no longer resolves');
  const uc2 = ucNew;
  ok((await C.put('/api/me', { accent: 'red;}' })).status === 400, 'invalid accent colour rejected');

  console.log('— v1.1 private account + follow requests');
  const pA = await A.post('/api/posts', { media: JPG2, caption: 'private post ' + rnd }); const ppid = pA.data.post.id;
  const ppMedia = new URL(pA.data.post.media, BASE).pathname;
  ok((await C.get(ppMedia)).status === 200, 'public account: C can open A photo');
  ok((await A.put('/api/settings', { private: true })).data.settings.private === true, 'A switches to a private account');
  const lockedView = await C.get('/api/users/' + ua);
  ok(lockedView.status === 200 && lockedView.data.user.locked === true && lockedView.data.posts.length === 0, 'non-follower C sees a locked profile with no posts');
  ok((await C.get('/api/posts/' + ppid)).status === 403, 'C cannot open A post by id');
  ok((await C.get(ppMedia)).status === 403, 'C cannot open A photo URL');
  ok((await C.get('/api/posts/' + ppid + '/comments')).status === 403, 'C cannot read A post comments');
  ok((await C.post('/api/posts/' + ppid + '/like')).status === 403, 'C cannot like A post');
  ok((await C.get('/api/users/' + ua + '/followers')).status === 403 && (await C.get('/api/users/' + ua + '/following')).status === 403, 'C cannot see A followers/following lists');
  ok(!(await C.get('/api/explore?limit=30')).data.posts.some(p => p.user.username === ua), 'A posts are not in C explore');
  ok((await Bc.get('/api/posts/' + ppid)).status === 200 && (await Bc.get(ppMedia)).status === 200, 'existing follower B still sees A posts');
  const fr = await C.post('/api/users/' + ua + '/follow'); ok(fr.data.requested === true && fr.data.following === false, 'C follow becomes a follow request');
  ok((await A.get('/api/requests')).data.requests.some(u => u.username === uc2), 'A sees C in follow requests');
  ok((await A.get('/api/notifications')).data.notifications.some(n => n.type === 'request' && n.user.username === uc2), 'A got a follow-request notification');
  ok((await Bc.post('/api/requests/' + uc2 + '/accept')).status === 404, 'B cannot accept a request sent to A');
  ok((await C.get('/api/posts/' + ppid)).status === 403, 'still locked while the request is pending');
  ok((await A.post('/api/requests/' + uc2 + '/accept')).status === 200, 'A accepts C request');
  ok((await C.get('/api/posts/' + ppid)).status === 200 && (await C.get(ppMedia)).status === 200, 'after accept C sees A post + photo');
  ok((await C.get('/api/users/' + ua)).data.user.locked === false, 'A profile unlocked for C');
  ok((await D.post('/api/users/' + ua + '/follow')).data.requested === true && (await A.req('DELETE', '/api/requests/' + ud)).status === 200, 'A declines D request');
  ok((await D.get('/api/posts/' + ppid)).status === 403, 'declined D still locked out');

  console.log('— v1.1 stories: close friends, hide story, replies');
  const cf = await A.post('/api/stories', { media: JPG2, closeFriends: true }); const cfid = cf.data.story.id;
  ok(cf.status === 201 && cf.data.story.close === true, 'A posts a Close Friends story');
  ok(!(await Bc.get('/api/stories/' + ua)).data.stories.some(s => s.id === cfid), 'B (not close friend) cannot see it');
  ok((await Bc.post('/api/stories/' + cfid + '/seen')).status === 403, 'B cannot open it by id');
  ok((await Bc.get(new URL(cf.data.story.media, BASE).pathname)).status === 403, 'B cannot open its media URL');
  ok((await A.post('/api/close-friends/' + ub)).status === 200, 'A adds B to Close Friends');
  ok((await Bc.get('/api/stories/' + ua)).data.stories.some(s => s.id === cfid && s.close), 'now B sees the green-ring story');
  ok((await Bc.get('/api/stories')).data.tray.some(u => u.username === ua && u.closeStory), 'B tray marks it as Close Friends');
  ok((await Bc.post('/api/stories/' + cfid + '/reply', { text: 'nice' })).status === 201, 'B replies to the story');
  ok((await A.put('/api/settings', { storyReplies: 'off' })).status === 200 && (await Bc.post('/api/stories/' + cfid + '/reply', { text: 'again' })).status === 403, 'story replies off -> reply rejected');
  const ns = await A.post('/api/stories', { media: JPG2 });
  ok((await A.post('/api/story-hide/' + ub)).status === 200 && (await Bc.get('/api/stories/' + ua)).data.stories.length === 0, 'hide story from B -> B sees no A stories');
  ok((await Bc.post('/api/stories/' + ns.data.story.id + '/seen')).status === 403, 'hidden B cannot open A story by id');
  ok((await C.get('/api/stories/' + ua)).data.stories.some(s => s.id === ns.data.story.id), 'C (follower) still sees the normal story');
  await A.del('/api/story-hide/' + ub);

  console.log('— v1.1 messages: permissions, requests, receipts');
  ok((await A.put('/api/settings', { dmFrom: 'followers' })).status === 200, 'A: only followers can message directly');
  const dmD = await D.post('/api/dm/' + ua, { text: 'hello stranger ' + rnd });
  ok(dmD.status === 201 && dmD.data.request === true, 'stranger D message lands as a request');
  ok(!(await A.get('/api/inbox')).data.conversations.some(c => c.user.username === ud), 'D is not in A main inbox');
  ok((await A.get('/api/inbox/requests')).data.conversations.some(c => c.user.username === ud), 'D is in A Message requests');
  ok((await A.get('/api/dm/' + ud)).data.isRequest === true, 'A opens it as a request');
  ok((await D.get('/api/dm/' + ua)).data.messages.every(m => !m.seen), 'opening a request does not send "Seen"');
  ok((await Bc.post('/api/dm/' + ud + '/accept')).status === 404, 'B cannot accept a request in A inbox');
  ok((await A.post('/api/dm/' + ud + '/accept')).status === 200 && (await A.get('/api/inbox')).data.conversations.some(c => c.user.username === ud), 'A accepts -> chat moves to inbox');
  ok((await A.put('/api/settings', { dmFrom: 'nobody' })).status === 200, 'A: nobody can message');
  const E = new Client('e'); const ue = 'te_' + rnd; await E.post('/api/signup', { username: ue, password: pw });
  ok((await E.post('/api/dm/' + ua, { text: 'hi' })).status === 403, 'nobody -> new stranger E is refused');
  ok((await D.post('/api/dm/' + ua, { text: 'still ok?' })).status === 201, 'already-accepted chat keeps working');
  await A.put('/api/settings', { dmFrom: 'everyone' });
  ok((await A.put('/api/settings', { readReceipts: false })).status === 200, 'A turns read receipts off');
  const rr = await Bc.post('/api/dm/' + ua, { text: 'receipt test' }); await A.get('/api/dm/' + ub);
  ok((await Bc.get('/api/dm/' + ua)).data.messages.find(m => m.id === rr.data.message.id).seen === false, 'B does not see "Seen" when receipts are off');
  await A.put('/api/settings', { readReceipts: true, typing: false });
  const sAt = stream(A); await sAt.ready; await wait(300);
  await Bc.put('/api/settings', { typing: false }); await Bc.post('/api/dm/' + ua + '/typing'); await wait(700);
  ok(!sAt.events.some(e => e.type === 'typing'), 'typing indicator off -> nothing pushed');
  sAt.close(); await Bc.put('/api/settings', { typing: true }); await A.put('/api/settings', { typing: true });
  await Bc.put('/api/settings', { activityStatus: false });
  ok((await A.get('/api/dm/' + ub)).data.user.online === false && (await A.get('/api/dm/' + ub)).data.user.lastActive === null, 'activity status off -> online/last active hidden');

  console.log('— v1.1 comments: off, who can comment, hidden words, likes hidden, restrict');
  ok((await A.put('/api/posts/' + ppid, { commentsOff: true })).data.post.commentsOff === true, 'A turns off commenting on a post');
  ok((await Bc.post('/api/posts/' + ppid + '/comments', { text: 'hi' })).status === 403, 'comment on a comments-off post is rejected');
  await A.put('/api/posts/' + ppid, { commentsOff: false });
  await A.put('/api/settings', { commentsFrom: 'off' });
  ok((await Bc.post('/api/posts/' + ppid + '/comments', { text: 'hi' })).status === 403, 'account-wide comments off rejects comments');
  await A.put('/api/settings', { commentsFrom: 'followers' });
  ok((await Bc.post('/api/posts/' + ppid + '/comments', { text: 'follower comment' })).status === 201, 'followers-only: follower B can comment');
  ok((await A.put('/api/settings', { hiddenWords: ['spamword', 'Bad'] })).data.settings.hiddenWords.includes('bad'), 'A sets hidden words');
  const hc = await Bc.post('/api/posts/' + ppid + '/comments', { text: 'buy SPAMWORD now' });
  ok(hc.status === 201 && hc.data.comment.hidden === true, 'comment with a hidden word is stored as hidden');
  ok(!(await C.get('/api/posts/' + ppid + '/comments')).data.comments.some(c => c.id === hc.data.comment.id), 'hidden comment is invisible to others');
  ok((await Bc.get('/api/posts/' + ppid + '/comments')).data.comments.some(c => c.id === hc.data.comment.id), 'the writer still sees it');
  await Bc.post('/api/posts/' + ppid + '/like');
  ok((await A.put('/api/posts/' + ppid, { hideLikes: true })).status === 200 && (await C.get('/api/posts/' + ppid)).data.post.likes === null, 'hide like count -> others get no number');
  ok((await A.get('/api/posts/' + ppid)).data.post.likes >= 1, 'owner still sees the like count');
  ok((await A.post('/api/users/' + ub + '/restrict')).status === 200, 'A restricts B');
  const rc = await Bc.post('/api/posts/' + ppid + '/comments', { text: 'restricted comment' });
  ok(!(await C.get('/api/posts/' + ppid + '/comments')).data.comments.some(c => c.id === rc.data.comment.id), 'restricted B comment hidden from others');
  await A.del('/api/users/' + ub + '/restrict'); await A.put('/api/settings', { commentsFrom: 'everyone' });

  console.log('— v1.1 block, mute, mentions, notification prefs, views');
  ok((await A.post('/api/users/' + uc2 + '/block')).status === 200, 'A blocks C');
  ok((await C.get('/api/users/' + ua)).status === 404, 'blocked C cannot find A profile');
  ok(!(await C.get('/api/search?q=' + ua)).data.users.some(u => u.username === ua), 'blocked C cannot find A in search');
  ok((await C.get('/api/posts/' + ppid)).status === 404 && (await C.get(ppMedia)).status === 403, 'blocked C cannot view A post or photo');
  ok([403, 404].includes((await C.post('/api/dm/' + ua, { text: 'hey' })).status), 'blocked C cannot message A');
  ok((await C.post('/api/users/' + ua + '/follow')).status === 404, 'blocked C cannot follow A');
  ok((await A.get('/api/settings/lists')).data.blocked.some(u => u.username === uc2), 'C is in A blocked list');
  ok((await A.del('/api/users/' + uc2 + '/block')).status === 200 && (await C.get('/api/users/' + ua)).status === 200, 'unblock restores access to the profile');
  ok((await A.put('/api/users/' + ub + '/mute', { posts: true })).data.muted.posts === true, 'A mutes B posts');
  const bp = await Bc.post('/api/posts', { media: JPG2, caption: 'b post' });
  ok(!(await A.get('/api/feed?limit=30')).data.posts.some(p => p.id === bp.data.post.id), 'muted B post not in A feed');
  await A.put('/api/users/' + ub + '/mute', { posts: false });
  await Bc.put('/api/settings', { mentionsFrom: 'nobody' });
  const mp = await A.post('/api/posts', { media: JPG2, caption: 'hey @' + ub });
  ok(mp.data.mentionBlocked.includes(ub), 'mentions off -> B cannot be mentioned');
  await A.put('/api/settings', { notif: { likes: false } });
  const before = (await A.get('/api/notifications')).data.notifications.filter(n => n.type === 'like').length;
  await Bc.post('/api/posts/' + mp.data.post.id + '/like');
  ok((await A.get('/api/notifications')).data.notifications.filter(n => n.type === 'like').length === before, 'likes notifications off -> no new like notification');
  ok((await Bc.post('/api/posts/' + mp.data.post.id + '/view')).data.views === 1, 'post view is counted once per viewer');

  console.log('— v1.1 settings belong to their owner (no IDOR)');
  await Bc.put('/api/settings', { private: true, dmFrom: 'nobody' });
  const setA = (await A.get('/api/settings')).data.settings;
  ok(setA.private === true && setA.dmFrom === 'everyone', 'B changing settings never touches A settings');
  ok((await Bc.put('/api/users/' + ua + '/settings', { private: false })).status === 404, 'no route to change another user settings');
  ok((await Bc.put('/api/settings', { private: 'yes' })).status === 400 && (await Bc.put('/api/settings', { dmFrom: 'hackers' })).status === 400, 'invalid setting values rejected');
  ok((await new Client('anon').req('PUT', '/api/settings', { private: false })).status === 401, 'logged-out visitor cannot change settings');
  await Bc.put('/api/settings', { private: false, dmFrom: 'everyone', mentionsFrom: 'everyone', activityStatus: true });

  console.log('— v1.1 data export');
  const ex = await fetch(BASE + '/api/me/export', { headers: { Cookie: A.cookie } }); const zb = Buffer.from(await ex.arrayBuffer());
  ok(ex.status === 200 && (ex.headers.get('content-type') || '').includes('zip') && zb.slice(0, 2).toString() === 'PK', 'A downloads a zip of own data');
  ok(zb.includes(Buffer.from(ua)) && zb.includes(Buffer.from('private post ' + rnd)), 'zip has A profile + posts');
  ok(!zb.includes(Buffer.from('test-pass-')) && !zb.includes(Buffer.from('"pass"')), 'zip never contains passwords/hashes');
  ok((await new Client('anon').get('/api/me/export')).status === 401, 'export needs login');

  console.log('— v1.1 security: password change + sessions');
  const A2 = new Client('a2'); await A2.post('/api/login', { username: ua, password: pw });
  const ses = await A.get('/api/me/sessions'); ok(ses.data.sessions.length >= 2 && ses.data.sessions.some(s => s.current) && ses.data.logins.length >= 2, 'login activity lists A devices');
  ok(!JSON.stringify(ses.data).includes(A2.cookie.split('=')[1]), 'session list never exposes tokens');
  ok((await A.post('/api/me/password', { oldPassword: 'wrong', newPassword: 'whatever1' })).status === 401, 'change password needs the old password');
  const pw2 = pw + 'X';
  ok((await A.post('/api/me/password', { oldPassword: pw, newPassword: pw2 })).status === 200, 'A changes password');
  ok((await A2.get('/api/me')).status === 401, 'other old session is logged out');
  ok((await A.get('/api/me')).status === 200, 'current session stays logged in');
  ok((await new Client('x').post('/api/login', { username: ua, password: pw })).status === 401, 'old password no longer works');
  const A3 = new Client('a3'); ok((await A3.post('/api/login', { username: ua, password: pw2 })).status === 200, 'new password works');
  ok((await A.post('/api/me/logout-others')).data.loggedOut >= 1 && (await A3.get('/api/me')).status === 401, 'log out other devices');
  const A4 = new Client('a4'); await A4.post('/api/login', { username: ua, password: pw2 });
  const sid4 = (await A.get('/api/me/sessions')).data.sessions.find(s => !s.current).id;
  ok((await Bc.req('DELETE', '/api/me/sessions/' + sid4)).status === 404, 'B cannot end A session');
  ok((await A.req('DELETE', '/api/me/sessions/' + sid4)).status === 200 && (await A4.get('/api/me')).status === 401, 'A ends one session from login activity');

  console.log('— v1.1 deactivate');
  ok((await D.post('/api/me/deactivate', { password: 'nope' })).status === 401, 'deactivate needs the password');
  ok((await D.post('/api/me/deactivate', { password: pw })).status === 200 && (await D.get('/api/me')).status === 401, 'D deactivates (logged out)');
  ok((await A.get('/api/users/' + ud)).status === 404 && !(await A.get('/api/search?q=' + ud)).data.users.length, 'deactivated D is hidden');
  const Dl = await D.post('/api/login', { username: ud, password: pw }); ok(Dl.status === 200 && Dl.data.reactivated === true, 'logging in again reactivates D');
  ok((await A.get('/api/users/' + ud)).status === 200, 'D visible again');

  console.log('— v1.1 admin panel is admin-only');
  for (const [m, u] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/users'], ['PUT', '/api/admin/users/' + ub], ['PUT', '/api/admin/posts/' + ppid], ['DELETE', '/api/admin/posts/' + ppid], ['POST', '/api/admin/reset-boosts'], ['GET', '/api/admin/bots'], ['DELETE', '/api/admin/users/' + ua + '/bots'], ['GET', '/api/admin/reels'], ['GET', '/api/admin/reels/inbox'], ['POST', '/api/admin/reels/import?limit=3'], ['PUT', '/api/admin/reels/settings'], ['DELETE', '/api/admin/reels'], ['DELETE', '/api/admin/reels/inbox/1.mp4']])
    ok((await Bc.req(m, u, m === 'GET' ? undefined : { verified: true, addLikes: 5 })).status === 403, 'normal user: ' + m + ' ' + u + ' -> 403');
  ok((await Bc.post('/api/admin/unlock', { password: pw })).status === 403, 'normal user cannot unlock the admin panel');
  ok((await A.get('/api/posts/' + ppid)).status === 200, 'post untouched by those attempts');
  const AU = process.env.IG_ADMIN_USER, AP = process.env.IG_ADMIN_PASS;
  if (AU && AP) {
    const M = new Client('admin'); ok((await M.post('/api/login', { username: AU, password: AP })).status === 200, 'admin logs in');
    ok((await M.get('/api/admin/stats')).status === 401, 'admin panel locked until password re-check');
    ok((await M.post('/api/admin/unlock', { password: 'wrong' })).status === 401, 'unlock with a wrong password fails');
    ok((await M.post('/api/admin/unlock', { password: AP })).status === 200, 'admin unlocks the panel');
    ok((await M.get('/api/admin/stats')).data.stats.users >= 4, 'admin sees stats');
    const realF = (await A.get('/api/users/' + ua + '/followers')).data.users.length;
    ok((await M.put('/api/admin/users/' + ua, { addFollowers: 100, verified: true })).data.user.bonusFollowers === 100, 'admin boosts A followers +100 and verifies A');
    const pv = (await C.get('/api/users/' + ua)).data.user; ok(pv.followers === realF + 100 && pv.verified === true, 'profile shows real followers + boost and the badge');
    ok((await A.get('/api/users/' + ua + '/followers')).data.total === realF + 100, 'v1.2: followers list now holds the 100 boosted (bot) followers too');
    await M.put('/api/admin/posts/' + mp.data.post.id, { addLikes: 50, addViews: 1000, addComments: 7 });
    const bpv = (await Bc.get('/api/posts/' + mp.data.post.id)).data.post; ok(bpv.likes >= 51 && bpv.views === 1001 && bpv.comments === 7, 'admin boosts post likes/views/comments');
    ok((await M.post('/api/admin/reset-boosts', { username: ua })).status === 200 && (await Bc.get('/api/posts/' + mp.data.post.id)).data.post.views === 1, 'admin resets boosts to 0');
    console.log('— v1.2 bot followers / likes / comments');
    await M.post('/api/admin/reset-boosts', { username: ua });
    const listAll = async (cl, path) => { let out = [], off = 0; for (let i = 0; i < 20 && off != null; i++) { const r = await cl.get(path + (path.includes('?') ? '&' : '?') + 'offset=' + off + '&limit=100'); if (r.status !== 200) return null; out = out.concat(r.data.users); off = r.data.next; } return out; };
    const realList = await listAll(A, '/api/users/' + ua + '/followers'); const realIds = new Set(realList.map(u => u.id));
    ok(realIds.size >= 1, 'A has real followers before boosting (' + realIds.size + ')');
    const b50 = await M.put('/api/admin/users/' + ua, { addFollowers: 50 });
    ok(b50.status === 200 && b50.data.user.botFollowers === 50 && b50.data.user.realFollowers === realIds.size, 'admin boosts A +50 bot followers (real count unchanged)');
    ok((await A.get('/api/users/' + ua)).data.user.followers === realIds.size + 50, 'profile count = real + 50');
    const boosted = await listAll(A, '/api/users/' + ua + '/followers'); const bots = boosted.filter(u => !realIds.has(u.id));
    ok(boosted.length === realIds.size + 50 && bots.length === 50, 'followers list returns all real + 50 bot entries');
    ok(bots.every(u => u.username && /^[a-z0-9._]{3,20}$/.test(u.username) && u.name && u.name.length >= 2), 'every bot entry has a name and a valid username');
    ok(new Set(bots.map(u => u.username)).size === 50, 'bot usernames are unique');
    ok(bots.some(u => u.avatar) && bots.every(u => !u.avatar || u.avatar.startsWith('/bot-avatar/')), 'bots carry generated avatars');
    const av = bots.find(u => u.avatar); const avr = await fetch(BASE + av.avatar);
    ok(avr.status === 200 && (avr.headers.get('content-type') || '').includes('image/svg+xml') && (await avr.text()).startsWith('<svg'), 'bot avatar image is served (SVG)');
    ok(boosted.slice(0, realIds.size).every(u => realIds.has(u.id)), 'real followers are listed before bots');
    const pg = await A.get('/api/users/' + ua + '/followers?offset=0&limit=20');
    ok(pg.data.users.length === 20 && pg.data.next === 20 && pg.data.total === realIds.size + 50, 'followers list paginates (20 per page, next=20)');
    const bname = bots[0].username;
    ok((await new Client('x').post('/api/login', { username: bname, password: 'anything123' })).status === 401, 'a bot cannot log in');
    ok((await C.get('/api/search?q=' + bname)).data.users.some(u => u.username === bname), 'bots appear in search like normal users');
    ok(!(await M.get('/api/admin/users?q=' + bname)).data.users.some(u => u.username === bname), 'admin Users tab does not list bots');
    const ab = await M.get('/api/admin/bots');
    ok(ab.status === 200 && ab.data.total >= 50 && ab.data.boosted.some(u => u.username === ua && u.botFollowers === 50), 'admin Bots tab shows the pool and A with 50 bots');
    const st = (await M.get('/api/admin/stats')).data.stats; ok(st.bots >= 50 && st.users < st.users + st.bots, 'stats count bots separately from real users');
    ok((await Bc.put('/api/admin/users/' + ua, { addFollowers: 5 })).status === 403 && (await Bc.req('DELETE', '/api/admin/users/' + ua + '/bots')).status === 403, 'normal user cannot add/remove bots (403)');
    ok((await M.put('/api/admin/users/' + ua, { addFollowers: 10001 })).status === 400, 'per-action cap (10,000) enforced');
    ok((await M.put('/api/admin/users/' + ua, { bonusFollowers: 10 })).data.user.botFollowers === 10 && (await A.get('/api/users/' + ua)).data.user.followers === realIds.size + 10, 'set boost lower (10) removes 40 bots');
    const after10 = await listAll(A, '/api/users/' + ua + '/followers'); ok([...realIds].every(i => after10.some(u => u.id === i)), 'lowering the boost kept every real follower');
    ok((await M.post('/api/admin/reset-boosts', { username: ua })).status === 200, 'reset A boosts');
    const afterReset = await listAll(A, '/api/users/' + ua + '/followers');
    ok(afterReset.length === realIds.size && afterReset.every(u => realIds.has(u.id)), 'after reset only the real followers remain (real follows untouched)');
    ok((await A.get('/api/users/' + ua)).data.user.followers === realIds.size, 'after reset profile count = real followers');
    ok((await C.get('/api/users/' + ua)).data.user.locked === true && (await C.get('/api/users/' + ua + '/followers')).status === 403, 'private A: bot boosts do not open A to non-followers');
    // likes + comments
    const pidM = mp.data.post.id; const realLikes = (await Bc.get('/api/posts/' + pidM)).data.post.likes;
    const cBefore = new Set((await Bc.get('/api/posts/' + pidM + '/comments')).data.comments.map(c => c.id));
    const notifCount = async () => { const r = await A.get('/api/notifications'); return r.status === 200 ? r.data.notifications.map(n => n.id).join(',') : null; };
    const n0 = await notifCount();
    ok((await M.put('/api/admin/posts/' + pidM, { addLikes: 30, addComments: 6 })).data.post.botLikes === 30, 'admin adds 30 bot likes + 6 bot comments');
    const pv2 = (await Bc.get('/api/posts/' + pidM)).data.post; ok(pv2.likes === realLikes + 30 && typeof pv2.likedBy === 'string' && pv2.likedBy.length >= 3, 'post shows likes + "Liked by <name>"');
    const likers = await listAll(Bc, '/api/posts/' + pidM + '/likes'); ok(likers && likers.length === realLikes + 30 && likers.filter(u => u.name).length === likers.length, '"Liked by" list shows all likers with names');
    const cm = (await Bc.get('/api/posts/' + pidM + '/comments')).data.comments; const bc = cm.filter(c => !cBefore.has(c.id));
    ok(bc.length === 6 && new Set(bc.map(c => c.user.username)).size === 6, '6 bot comments, each from a different bot');
    ok(bc.every((c, i) => i === 0 || c.text !== bc[i - 1].text) && bc.every(c => c.text.length > 0), 'bot comment texts never repeat back-to-back');
    ok(pv2.comments >= 6, 'comment count includes bot comments');
    ok(n0 != null && (await notifCount()) === n0, 'bot likes/comments send no notifications');
    ok((await Bc.put('/api/admin/posts/' + pidM, { addLikes: 5 })).status === 403 && (await Bc.put('/api/admin/posts/' + pidM, { addComments: 5 })).status === 403, 'normal user cannot add bot likes/comments (403)');
    ok((await M.put('/api/admin/posts/' + pidM, { bonusLikes: 0, bonusComments: 0 })).status === 200, 'admin resets post likes/comments');
    const pv3 = (await Bc.get('/api/posts/' + pidM)).data.post; ok(pv3.likes === realLikes && pv3.comments === pv2.comments - 6, 'reset removes only bot likes + bot comments');
    ok((await Bc.get('/api/posts/' + pidM + '/likes')).data.total === realLikes, 'liked-by list back to real likers');
    await M.put('/api/admin/users/' + ua, { addFollowers: 5 }); const rm = await M.req('DELETE', '/api/admin/users/' + ua + '/bots');
    ok(rm.status === 200 && rm.data.removed.followers === 5 && rm.data.user.realFollowers === realIds.size, '"Remove all bots from this user" removes bots, keeps real followers');
    await M.put('/api/admin/users/' + ua, { verified: false });
    ok((await M.put('/api/admin/users/' + ud, { suspended: true })).status === 200 && (await D.get('/api/me')).status === 401, 'admin suspends D (logged out)');
    ok((await new Client('x').post('/api/login', { username: ud, password: pw })).status === 403, 'suspended D cannot log in');
    ok((await M.put('/api/admin/users/' + ud, { suspended: false })).status === 200 && (await D.post('/api/login', { username: ud, password: pw })).status === 200, 'admin un-suspends D');
    ok((await M.req('DELETE', '/api/admin/comments/' + hc.data.comment.id)).status === 200, 'admin deletes any comment');
    ok((await M.req('DELETE', '/api/admin/posts/' + bp.data.post.id)).status === 200 && (await Bc.get('/api/posts/' + bp.data.post.id)).status === 404, 'admin deletes any post');

    console.log('— v1.3 bulk reels import');
    const tag = String(1000 + Math.floor(Math.random() * 8999)); const names = [1, 2, 3].map(i => '9' + tag + i + '.mp4'); // 6-digit test names (real reels are 4 digits)
    const meta = (i) => ({ 'x-reel-meta': Buffer.from(JSON.stringify({ title: 'Smoke test reel ' + i + ' 🔥 #anime', duration: 2, source_name: 'test ' + i })).toString('base64') });
    ok((await Bc.raw('PUT', '/api/admin/reels/inbox/' + names[0], SAMPLE_MP4, meta(1))).status === 403, 'non-admin cannot upload to the reels import folder (403)');
    ok((await Bc.post('/api/admin/reels/import?limit=3')).status === 403 && (await Bc.req('DELETE', '/api/admin/reels')).status === 403, 'non-admin cannot run or delete the import (403)');
    for (let i = 0; i < 3; i++) ok((await M.raw('PUT', '/api/admin/reels/inbox/' + names[i], SAMPLE_MP4, meta(i + 1))).status === 201 && (await M.raw('PUT', '/api/admin/reels/inbox/' + names[i].replace('.mp4', '.jpg'), SAMPLE_JPG)).status === 201, 'admin uploads sample reel ' + (i + 1) + ' (+ poster) to the import folder');
    ok((await M.raw('PUT', '/api/admin/reels/inbox/' + names[0], SAMPLE_MP4, meta(1))).data.skipped === true, 'same upload again is skipped (idempotent)');
    ok((await M.raw('PUT', '/api/admin/reels/inbox/9' + tag + '9.mp4', Buffer.from('not a video at all, just text bytes here'))).status === 415, 'non-mp4 bytes rejected (415)');
    ok([400, 404].includes((await M.raw('PUT', '/api/admin/reels/inbox/..%2F..%2Fdb.json', SAMPLE_MP4)).status) && (await M.raw('PUT', '/api/admin/reels/inbox/evil.mp4', SAMPLE_MP4)).status === 400, 'path traversal / bad names rejected');
    const im1 = await M.post('/api/admin/reels/import?limit=10&only=' + names.join(','));
    const recs = (await M.get('/api/admin/reels?files=' + names.join(','))).data.records;
    ok(im1.status === 200 && names.every(n => recs[n] && recs[n].pid), 'admin imports the 3 sample files as reels');
    const before3 = (await M.get('/api/admin/reels')).data.imported;
    const im2 = await M.post('/api/admin/reels/import?limit=10&only=' + names.join(','));
    ok(im2.status === 200 && im2.data.imported === 0 && (await M.get('/api/admin/reels')).data.imported === before3, 're-running the import adds nothing (idempotent by file name)');
    const rp = (await Bc.get('/api/posts/' + recs[names[0]].pid)).data.post;
    ok(rp && rp.type === 'video' && rp.media === '/reels-media/' + names[0] && rp.poster === '/reels-media/' + names[0].replace('.mp4', '.jpg') && /Smoke test reel 1/.test(rp.caption), 'imported reel has video URL, poster and manifest caption');
    ok(rp.likes >= 20 && rp.likes <= 800 && rp.comments <= 5 && rp.views > rp.likes && rp.user && rp.user.username && !rp.user.isPrivate, 'reel has 20–800 bot likes, 0–5 bot comments, views, a public bot owner');
    ok(Date.now() - rp.created < 31 * 864e5 && rp.created <= Date.now(), 'reel time is backdated inside the last 30 days');
    ok((await Bc.get('/api/posts/' + rp.id + '/likes?limit=5')).data.users.length === 5, 'liked-by list of an imported reel shows named bots');
    const rg = await fetch(BASE + '/reels-media/' + names[0], { headers: { Range: 'bytes=0-99' } }); const rgb = Buffer.from(await rg.arrayBuffer());
    ok(rg.status === 206 && rgb.length === 100 && /^bytes 0-99\/\d+$/.test(rg.headers.get('content-range') || '') && (rg.headers.get('content-type') || '').startsWith('video/mp4'), 'reel video streams with HTTP Range (206)');
    ok(/max-age=\d+/.test(rg.headers.get('cache-control') || '') && rgb.slice(4, 8).toString() === 'ftyp', 'reel video has cache headers and is the real mp4');
    ok((await fetch(BASE + '/reels-media/' + names[1].replace('.mp4', '.jpg'))).status === 200, 'reel poster image is served');
    ok((await fetch(BASE + '/reels-media/..%2Fdb.json')).status === 404 && (await fetch(BASE + '/reels-media/12345678.mp4?nc=' + rnd)).status === 404, 'reels-media serves only imported files (no traversal)');
    // feed pagination: a brand-new account (follows nobody) already gets reels in Home, Reels and Explore, page by page
    const N = new Client('n'); await N.post('/api/signup', { username: 'tn_' + rnd, password: pw, name: 'Test N' });
    const f1 = await N.get('/api/feed?limit=2'); ok(f1.status === 200 && f1.data.posts.length === 2 && f1.data.more === true, 'new user home feed is not empty (reels mixed in), page 1');
    const f2 = await N.get('/api/feed?limit=2&before=' + f1.data.posts[1].created);
    ok(f2.data.posts.length >= 1 && !f2.data.posts.some(x => f1.data.posts.some(y => y.id === x.id)) && f2.data.posts[0].created <= f1.data.posts[1].created, 'home feed page 2 continues without repeats');
    const r1 = await N.get('/api/reels?limit=2'), r2 = await N.get('/api/reels?limit=2&before=' + r1.data.posts[1].created);
    ok(r1.data.posts.length === 2 && r1.data.more && r2.data.posts.length >= 1 && !r2.data.posts.some(x => r1.data.posts.some(y => y.id === x.id)), 'reels tab paginates');
    const e1 = await N.get('/api/explore?limit=2'); ok(e1.data.posts.length === 2 && e1.data.more === true, 'explore paginates');
    ok((await N.get('/api/reels?limit=500')).data.posts.length <= 30, 'page size is capped (no 3,000-item responses)');
    await N.req('DELETE', '/api/me', { password: pw });
    const ad = await M.get('/api/admin/reels'); ok(ad.status === 200 && ad.data.imported >= 3 && typeof ad.data.auto === 'boolean' && ad.data.recent.length >= 1, 'admin Reels import tab: count, auto flag, latest list');
    const auto0 = ad.data.auto;
    ok((await M.put('/api/admin/reels/settings', { auto: !auto0 })).data.auto === !auto0 && (await M.put('/api/admin/reels/settings', { auto: auto0 })).data.auto === auto0, 'admin can switch auto-import off/on');
    ok((await M.get('/api/admin/posts')).data.posts.every(x => !x.imported), 'admin Posts tab lists real posts only');
    if (process.env.IG_DESTRUCTIVE === '1') { // local only: wipes every imported reel
      const dl = await M.req('DELETE', '/api/admin/reels'); ok(dl.status === 200 && dl.data.deleted >= 3 && (await M.get('/api/admin/reels')).data.imported === 0 && (await Bc.get('/api/posts/' + rp.id)).status === 404, '"Delete all imported reels" removes them all (and turns auto-import off)');
      ok((await M.post('/api/admin/reels/import?limit=10&only=' + names.join(','))).data.imported === 3, 'after delete-all the files can be imported again');
      await M.put('/api/admin/reels/settings', { auto: auto0 });
    }
    const recs2 = (await M.get('/api/admin/reels?files=' + names.join(','))).data.records;
    let cleaned = 0; for (const n of names) { if (recs2[n] && recs2[n].pid && (await M.req('DELETE', '/api/admin/posts/' + recs2[n].pid)).status === 200) cleaned++; await M.req('DELETE', '/api/admin/reels/inbox/' + n); await M.req('DELETE', '/api/admin/reels/inbox/' + n.replace('.mp4', '.jpg')); }
    ok(cleaned === 3 && (await M.get('/api/admin/reels/inbox')).data.files[names[0]] === undefined, 'test reels + test files removed');
    ok((await M.post('/api/admin/reels/import?limit=10&only=' + names.join(','))).data.imported === 0 && (await fetch(BASE + '/reels-media/' + names[0] + '?nc=' + rnd)).status === 404, 'a deleted reel is not imported again and its file is gone');
    await M.post('/api/logout');
  } else console.log('  (admin positive checks skipped: set IG_ADMIN_USER / IG_ADMIN_PASS)');
  await A.put('/api/settings', { private: false, notif: { likes: true } });
  for (const [cl] of [[D], [E]]) await cl.req('DELETE', '/api/me', { password: pw });


  console.log('— v1.4 classic mode, richer upload (cover, trim, speed, filter, text, music, tags, location, audience), drafts, fresh feed');
  {
    const P = new Client('p'), Q = new Client('q'), R = new Client('r'), S = new Client('s');
    const up = 'tp_' + rnd, uq = 'tq_' + rnd, ur = 'tr_' + rnd, us = 'ts_' + rnd;
    for (const [cl, n] of [[P, up], [Q, uq], [R, ur], [S, us]]) await cl.post('/api/signup', { username: n, password: pw, name: 'V14 ' + n });
    // classic mode is a per-user server-side setting
    const cs = await P.put('/api/settings', { classic: true });
    ok(cs.status === 200 && cs.data.settings.classic === true && (await P.get('/api/me')).data.user.settings.classic === true, 'Classic mode saves on the server (per user)');
    ok((await Q.get('/api/me')).data.user.settings.classic === false, "Classic mode of one user doesn't change another user");
    ok((await P.put('/api/settings', { classic: 'yes' })).status === 400, 'Classic mode must be true/false');
    ok((await new Client('anon').put('/api/settings', { classic: true })).status === 401, 'Classic mode needs login');
    ok((await P.put('/api/settings', { classic: false })).data.settings.classic === false, 'Classic mode switches back to Liquid Glass');
    // built-in music
    const mu = await P.get('/api/music');
    ok(mu.status === 200 && mu.data.tracks.length >= 6 && mu.data.filters.includes('clarendon'), 'music library + filter list');
    const mr = await fetch(BASE + mu.data.tracks[0].file, { headers: { Range: 'bytes=0-99' } });
    ok((mr.status === 206 || mr.status === 200) && /audio/.test(mr.headers.get('content-type') || ''), 'music track streams (audio)');
    // a reel with every editor option
    const MP4 = 'data:video/mp4;base64,' + SAMPLE_MP4.toString('base64'), COVER = 'data:image/jpeg;base64,' + SAMPLE_JPG.toString('base64');
    await Q.post('/api/users/' + up + '/follow'); await R.post('/api/users/' + up + '/follow');
    const edit = { filter: 'clarendon', speed: 1.5, trim: [0, 1], text: { t: 'Hello 👋', color: '#ff3b6b', x: 30, y: 40, size: 30, style: 'neon' }, music: { id: 'desi-beat', vol: 0.5 }, orig: false };
    const rl = await P.post('/api/posts', { kind: 'reel', media: MP4, cover: COVER, caption: 'My reel #v14test' + rnd + ' @' + uq, edit, tags: [uq], location: 'Mumbai, India' });
    const rp = rl.data && rl.data.post;
    ok(rl.status === 201 && rp.type === 'video' && rp.isReel && rp.edit.speed === 1.5 && rp.edit.filter === 'clarendon' && rp.edit.trim[1] === 1 && rp.edit.music.id === 'desi-beat' && rp.edit.orig === false && rp.edit.text.t === 'Hello 👋', 'reel posted with trim, speed, filter, text, music, original sound off');
    ok(rp && rp.tags[0] === uq && rp.location === 'Mumbai, India' && /^\/media\//.test(rp.poster || ''), 'reel has tagged people, location and its chosen cover');
    ok((await Q.get(rp.poster)).status === 200 && (await S.get(rp.poster)).status === 200, 'cover of a public reel loads for viewers');
    ok((await Q.get('/api/notifications')).data.notifications.some(n => n.type === 'tag' && n.post && n.post.id === rp.id), 'tagged person gets a "tagged you" notification');
    for (const [bad, why] of [[{ edit: { filter: 'xyz' } }, 'unknown filter'], [{ edit: { speed: 3 } }, 'speed outside 0.5x–2x'], [{ edit: { music: { id: 'nope' } } }, 'unknown music track'], [{ edit: { trim: [2, 2.1] } }, 'trim shorter than 0.5 s'], [{ tags: ['no_such_user_' + rnd] }, 'tagging a missing user'], [{ visibility: 'secret' }, 'unknown audience']])
      ok((await P.post('/api/posts', Object.assign({ media: MP4 }, bad))).status === 400, 'rejected: ' + why);
    ok((await P.post('/api/posts', { kind: 'reel', media: JPG })).status === 400, 'a reel must be a video');
    const nul = await P.post('/api/posts', { kind: 'reel', media: MP4, edit: { filter: 'normal', speed: 1, trim: null, text: null, music: null, orig: true } });
    ok(nul.status === 201 && (await P.del('/api/posts/' + nul.data.post.id)).status === 200, 'editor defaults (no trim / text / music) are accepted');
    ok((await P.post('/api/posts', { media: MP4, cover: FAKE })).status === 415, 'a fake cover image is refused');
    // audience: followers-only and Close Friends posts are enforced on the server
    const fo = (await P.post('/api/posts', { media: JPG, caption: 'followers only', visibility: 'followers' })).data.post;
    await P.post('/api/close-friends/' + ur);
    const cf = (await P.post('/api/posts', { media: JPG, caption: 'close friends only', visibility: 'close' })).data.post;
    ok(fo.vis === 'followers' && cf.vis === 'close', 'posts saved with their audience');
    ok((await Q.get('/api/posts/' + fo.id)).status === 200 && (await S.get('/api/posts/' + fo.id)).status === 404, 'followers-only post: follower sees it, stranger gets 404');
    ok((await R.get('/api/posts/' + cf.id)).status === 200 && (await Q.get('/api/posts/' + cf.id)).status === 404 && (await S.get('/api/posts/' + cf.id)).status === 404, 'Close Friends post: only the Close Friend sees it');
    ok((await S.get(fo.media)).status !== 200 && (await Q.get(cf.media)).status !== 200, 'hidden posts\' photo files are refused too (no IDOR)');
    ok((await S.get('/api/posts/' + cf.id + '/comments')).status === 404 && (await S.post('/api/posts/' + cf.id + '/like')).status === 404, 'cannot like/comment-read a post you are not allowed to see');
    const sgrid = (await S.get('/api/users/' + up)).data.posts.map(x => x.id), qgrid = (await Q.get('/api/users/' + up)).data.posts.map(x => x.id), pgrid = (await P.get('/api/users/' + up)).data.posts.map(x => x.id);
    ok(!sgrid.includes(fo.id) && !sgrid.includes(cf.id) && qgrid.includes(fo.id) && !qgrid.includes(cf.id) && pgrid.includes(cf.id) && pgrid.includes(fo.id), 'profile grid shows each viewer only what they may see');
    const sfeed = (await S.get('/api/explore?limit=30')).data.posts.map(x => x.id), qfeed = (await Q.get('/api/feed?limit=30')).data.posts.map(x => x.id);
    ok(!sfeed.includes(fo.id) && !sfeed.includes(cf.id) && qfeed.includes(fo.id) && !qfeed.includes(cf.id), 'feed / explore respect the audience');
    for (let i = 0; i < 4; i++) await P.post('/api/posts', { kind: 'reel', media: MP4, caption: 'extra reel ' + i });
    // fresh feed (tap Home / Reels again): seeded shuffle with offset pages
    const r1 = (await Q.get('/api/reels?limit=3&seed=aa' + rnd)).data, r1b = (await Q.get('/api/reels?limit=3&seed=aa' + rnd)).data;
    ok(r1.seed && typeof r1.next === 'number' && JSON.stringify(r1.posts.map(x => x.id)) === JSON.stringify(r1b.posts.map(x => x.id)), 'seeded reels: same seed = same order (stable paging)');
    const pg2 = (await Q.get('/api/reels?limit=3&seed=aa' + rnd + '&offset=' + r1.next)).data;
    ok(!pg2.posts.some(x => r1.posts.some(y => y.id === x.id)), 'seeded reels: next page has no repeats');
    // every Reels open starts somewhere new: a watched reel drops behind unseen ones, and #/reels/<id> starts AT that reel
    const t0a = Date.now() - 1000, o1 = (await Q.get('/api/reels?limit=3&seed=o1' + rnd + '&t0=' + t0a)).data.posts;
    ok(o1.length >= 2, 'reels feed has reels to shuffle');
    await Q.post('/api/posts/' + o1[0].id + '/view'); await new Promise(r => setTimeout(r, 30));
    const o2 = (await Q.get('/api/reels?limit=3&seed=o2' + rnd + '&t0=' + Date.now())).data.posts;
    ok(o2.length && o2[0].id !== o1[0].id, 'two Reels opens start with different reels (watched one goes back)');
    const w1 = (await Q.get('/api/reels?limit=10&seed=w1' + rnd + '&t0=' + Date.now())).data.posts.map(x => x.id), w2 = (await Q.get('/api/reels?limit=10&seed=w2' + rnd + '&t0=' + Date.now())).data.posts.map(x => x.id);
    const same = w1.filter((x, i) => w2[i] === x).length;
    ok(w1.length >= 5 && same <= 3 && JSON.stringify(w1) !== JSON.stringify(w2), 'two Reels opens give a different whole order, not just a different first reel (' + same + '/' + w1.length + ' same spots)');
    const all = []; let off = 0; for (let i = 0; i < 4; i++) { const pg = (await Q.get('/api/reels?limit=5&seed=w3' + rnd + '&t0=1&offset=' + off)).data; all.push(...pg.posts.map(x => x.id)); off = pg.next; if (!pg.more) break; }
    ok(new Set(all).size === all.length, 'no reel repeats while paging one session (' + all.length + ' reels)');
    const target = pg2.posts[0] || o1[1];
    const st1 = (await Q.get('/api/reels?limit=3&seed=s1' + rnd + '&start=' + target.id)).data;
    ok(st1.posts[0].id === target.id, 'deep link /reels/<id> starts with that reel');
    const st2 = (await Q.get('/api/reels?limit=3&seed=s1' + rnd + '&start=' + target.id + '&offset=' + st1.next)).data;
    ok(!st2.posts.some(x => x.id === target.id), '…and that reel is not repeated on the next page');
    ok((await S.get('/api/reels?limit=3&seed=s1' + rnd + '&start=' + cf.id)).data.posts.every(x => x.id !== cf.id), 'start=<id> cannot reveal a post you may not see');
    const fd = (await Q.get('/api/feed?limit=5&seed=zz' + rnd)).data;
    ok(fd.posts.length > 0 && fd.posts[0].user.username === up, 'fresh home feed keeps new posts from people you follow on top');
    // hashtags
    const ht = await Q.get('/api/hashtags?q=v14test');
    ok(ht.status === 200 && ht.data.tags.some(x => x.tag === 'v14test' + rnd), '#hashtag suggestions come from public captions');
    // drafts: private to their owner
    const dr = await P.post('/api/drafts', { kind: 'reel', media: MP4, cover: COVER, caption: 'draft caption', edit: { speed: 2, filter: 'moon' }, visibility: 'followers', location: 'Delhi' });
    const did = dr.data && dr.data.draft && dr.data.draft.id;
    ok(dr.status === 201 && dr.data.draft.kind === 'reel' && dr.data.draft.edit.speed === 2 && dr.data.draft.vis === 'followers', 'save a reel as a draft');
    ok((await P.get('/api/drafts')).data.drafts.some(d => d.id === did), 'drafts list shows it to the owner');
    ok(!(await Q.get('/api/drafts')).data.drafts.some(d => d.id === did), "another user's drafts list doesn't show it");
    ok((await Q.get('/api/drafts/' + did)).status === 404 && (await Q.put('/api/drafts/' + did, { caption: 'hacked' })).status === 404 && (await Q.del('/api/drafts/' + did)).status === 404, "another user can't read, edit or delete the draft (404)");
    ok((await Q.get(dr.data.draft.media)).status !== 200 && (await S.get(dr.data.draft.cover)).status !== 200, "draft video + cover files are private");
    ok((await Q.post('/api/posts', { draftId: did })).status === 404, "another user can't publish someone's draft");
    ok((await new Client('anon').get('/api/drafts')).status === 401, 'drafts need login');
    ok((await P.put('/api/drafts/' + did, { caption: 'final caption #v14' })).data.draft.caption === 'final caption #v14', 'owner edits the draft');
    const pub = await P.post('/api/posts', { draftId: did, kind: 'reel', caption: 'final caption #v14', visibility: 'everyone', edit: { speed: 2, filter: 'moon' } });
    ok(pub.status === 201 && pub.data.post.type === 'video' && pub.data.post.edit.speed === 2 && /^\/media\//.test(pub.data.post.poster || ''), 'publish the draft as a reel (no re-upload)');
    ok((await P.get('/api/drafts/' + did)).status === 404, 'a published draft leaves the drafts list');
    ok((await S.get(pub.data.post.media)).status === 200, 'published reel video is now visible');
    ok((await P.del('/api/posts/' + rp.id)).status === 200 && (await Q.get(rp.poster)).status !== 200, 'deleting a reel removes its cover too');
    const d2 = (await P.post('/api/drafts', { media: JPG, caption: 'x' })).data.draft;
    for (const [cl, n] of [[P, up], [Q, uq], [R, ur], [S, us]]) await cl.req('DELETE', '/api/me', { password: pw });
    ok((await new Client('x').get(d2.media)).status !== 200, 'deleting the account removes its drafts');
  }


  console.log('— v1.5 privacy: Chat Lock, hidden chats, vanish mode, view-once, privacy toggles, App Lock');
  {
    const V1 = new Client('v1'), V2 = new Client('v2'), V3 = new Client('v3');
    const u1 = 'v1_' + rnd, u2 = 'v2_' + rnd, u3 = 'v3_' + rnd;
    for (const [cl, n] of [[V1, u1], [V2, u2], [V3, u3]]) await cl.post('/api/signup', { username: n, password: pw, name: n });
    await V1.post('/api/users/' + u2 + '/follow'); await V2.post('/api/users/' + u1 + '/follow');
    const m1 = (await V1.post('/api/dm/' + u2, { text: 'hello v2' })).data.message;
    await V2.post('/api/dm/' + u1, { text: 'hi v1' });
    ok((await V2.get('/api/privacy')).data.chatPinSet === false, 'privacy center: no Chat PIN yet');
    const np = await V2.post('/api/chat-lock/chats/' + u1);
    ok(np.status === 409 && np.data.needPin, 'locking a chat needs a Chat PIN first');
    ok((await V2.post('/api/chat-lock/pin', { pin: '12a4' })).status === 400 && (await V2.post('/api/chat-lock/pin', { pin: '123' })).status === 400 && (await V2.post('/api/chat-lock/pin', { pin: '1234567' })).status === 400, 'Chat PIN must be 4-6 digits');
    const sp = await V2.post('/api/chat-lock/pin', { pin: '4826' });
    ok(sp.status === 201 && sp.data.privacy.chatPinSet === true, 'set a 4-digit Chat PIN');
    ok(!/4826|"hash"|"salt"/.test(JSON.stringify(sp.data) + JSON.stringify((await V2.get('/api/privacy')).data) + JSON.stringify((await V2.get('/api/me')).data)), 'the PIN and its hash never come back from the API');
    ok((await V2.post('/api/chat-lock/pin', { pin: '1111' })).status === 401, 'changing the Chat PIN needs the current PIN');
    ok((await V2.post('/api/chat-lock/chats/' + u1)).data.folder === 'locked', 'lock the chat with ' + u1);
    await V2.post('/api/chat-lock/lock');
    let ib = (await V2.get('/api/inbox')).data;
    ok(!ib.conversations.some(c => c.user.username === u1) && ib.locked.count === 1, 'locked chat is gone from the normal inbox API (shows only in the Locked chats count)');
    const lk = await V2.get('/api/dm/' + u1);
    ok(lk.status === 423 && lk.data.chatLocked && !JSON.stringify(lk.data).includes('hello v2'), 'opening the locked chat without the PIN = 423, no messages');
    ok((await V2.get('/api/inbox/locked')).status === 423, 'Locked chats folder needs the PIN');
    ok((await V2.get('/api/messages/' + m1.id)).status === 423 && (await V2.post('/api/dm/' + u1, { text: 'x' })).status === 423, 'a locked chat message cannot be read or answered without the PIN');
    ok((await V1.get('/api/inbox')).data.conversations.some(c => c.user.username === u2), 'the other person still sees the chat normally (the lock is only yours)');
    // outsider: cannot read or lock someone else's chat
    const o1 = await V3.get('/api/dm/' + u1);
    ok(o1.status === 200 && !JSON.stringify(o1.data).includes('hello v2'), "an outsider opening /dm/<user> only gets their own (empty) chat, never someone else's");
    ok((await V3.get('/api/messages/' + m1.id)).status === 404 && (await V3.post('/api/messages/' + m1.id + '/open')).status === 404, "an outsider can't read a message of someone else's chat (404)");
    await V3.post('/api/chat-lock/pin', { pin: '9090' });
    ok((await V3.post('/api/chat-lock/chats/' + u1)).status === 200 && (await V1.get('/api/inbox')).data.conversations.some(c => c.user.username === u2) && (await V2.get('/api/inbox')).data.locked.count === 1, "an outsider locking 'their chat with u1' changes nothing for u1 or u2");
    // notification preview + unread
    const sv2 = stream(V2); await sv2.ready;
    await V1.post('/api/dm/' + u2, { text: 'secret text 123' });
    ok(await waitFor(() => sv2.events.some(e => e.type === 'dm')), 'locked chat: live notification still arrives');
    const ev = sv2.events.find(e => e.type === 'dm'); sv2.close();
    ok(ev && ev.private === true && !ev.from && !JSON.stringify(sv2.events).includes('secret text') && !JSON.stringify(sv2.events).includes(u1), 'locked chat notification is "New message" only (no name, no text)');
    ok((await V2.get('/api/me')).data.unreadDm === 0 && (await V2.get('/api/inbox')).data.locked.unread === true, 'locked chats are left out of the unread badge (folder shows a dot)');
    // wrong PIN counter + lockout (on the outsider's own PIN, so the test can continue)
    const w1 = await V3.post('/api/chat-lock/unlock', { pin: '0000' });
    ok(w1.status === 401 && w1.data.triesLeft === 4, 'wrong Chat PIN rejected (4 tries left)');
    for (let i = 0; i < 3; i++) await V3.post('/api/chat-lock/unlock', { pin: '0000' });
    const w5 = await V3.post('/api/chat-lock/unlock', { pin: '0000' });
    ok(w5.status === 429 && w5.data.lockedOut && w5.data.retryAfter > 0, '5th wrong PIN locks it out for a few minutes (429)');
    ok((await V3.post('/api/chat-lock/unlock', { pin: '9090' })).status === 429, 'during the lockout even the right PIN is refused');
    const V3b = new Client('v3b'); await V3b.post('/api/login', { username: u3, password: pw });
    ok((await V3b.post('/api/chat-lock/unlock', { pin: '9090' })).status === 429, 'the lockout is on the account (a new login is locked out too)');
    // right PIN opens the folder
    const un = await V2.post('/api/chat-lock/unlock', { pin: '4826' });
    ok(un.status === 200 && un.data.until > Date.now(), 'right Chat PIN unlocks for a few minutes');
    const lf = (await V2.get('/api/inbox/locked')).data;
    ok(lf.conversations.length === 1 && lf.conversations[0].user.username === u1, 'Locked chats folder lists the chat');
    const op = await V2.get('/api/dm/' + u1);
    ok(op.status === 200 && op.data.folder === 'locked' && op.data.messages.some(m => m.text === 'secret text 123'), 'with the PIN the locked chat opens with its messages');
    // hidden chats
    ok((await V2.post('/api/hidden-chats/' + u1)).data.folder === 'hidden', 'move the chat to Hidden chats');
    ib = (await V2.get('/api/inbox')).data;
    ok(!ib.conversations.some(c => c.user.username === u1) && ib.locked.count === 0, 'hidden chat is not in the inbox and not in the Locked count');
    ok((await V2.get('/api/inbox/hidden')).data.conversations.some(c => c.user.username === u1), 'Hidden chats folder lists it (PIN open)');
    await V2.post('/api/chat-lock/lock');
    ok((await V2.get('/api/inbox/hidden')).status === 423 && (await V2.get('/api/dm/' + u1)).status === 423, 'hidden chat + Hidden chats folder need the PIN');
    ok((await V2.del('/api/hidden-chats/' + u1)).status === 423, 'unhiding needs the PIN');
    await V2.post('/api/chat-lock/unlock', { pin: '4826' });
    ok((await V2.del('/api/hidden-chats/' + u1)).status === 200 && (await V2.get('/api/inbox')).data.conversations.some(c => c.user.username === u1), 'unhide -> back in the normal inbox');
    ok((await V2.post('/api/chat-lock/pin', { pin: '5555', currentPin: '4826' })).status === 200 && (await V2.post('/api/chat-lock/pin', { pin: '6666', password: pw })).status === 200, 'change the PIN with the current PIN, or with your password if forgotten');
    await V2.post('/api/chat-lock/chats/' + u1);
    ok((await V2.req('DELETE', '/api/chat-lock/pin', { pin: '1234' })).status === 401, 'removing the PIN needs the right PIN');
    const rm = await V2.req('DELETE', '/api/chat-lock/pin', { pin: '6666' });
    ok(rm.status === 200 && rm.data.released === 1 && (await V2.get('/api/inbox')).data.conversations.some(c => c.user.username === u1), 'removing the PIN puts locked chats back in the inbox');
    // vanish mode
    ok((await V1.put('/api/dm/' + u2 + '/vanish', { mode: 'forever' })).status === 400, 'vanish mode: unknown timer rejected');
    const vm = await V1.put('/api/dm/' + u2 + '/vanish', { mode: 'seen' });
    ok(vm.status === 200 && vm.data.vanish.mode === 'seen', 'turn on vanish mode (after seen)');
    const v2view = (await V2.get('/api/dm/' + u1)).data;
    ok(v2view.vanish && v2view.vanish.mode === 'seen' && v2view.vanish.byMe === false && v2view.messages.some(m => m.kind === 'system' && /vanish mode/.test(m.text)), 'the other person sees the vanish banner + a "turned on vanish mode" line');
    await V3.put('/api/dm/' + u2 + '/vanish', { mode: '24h' });
    ok((await V1.get('/api/dm/' + u2)).data.vanish.mode === 'seen', "someone else's vanish switch doesn't touch this chat");
    const poof = (await V1.post('/api/dm/' + u2, { text: 'poof message' })).data.message;
    ok(poof.vanish === 'seen', 'messages sent in vanish mode are marked to vanish');
    await V1.post('/api/dm/' + u2 + '/close');
    ok((await V1.get('/api/dm/' + u2)).data.messages.some(m => m.id === poof.id), 'unseen vanish message stays until the other person sees it');
    ok((await V2.get('/api/dm/' + u1)).data.messages.some(m => m.id === poof.id), 'receiver sees the vanish message');
    const cl = await V2.post('/api/dm/' + u1 + '/close');
    ok(cl.data.vanished >= 1, 'leaving the chat after seeing it deletes it');
    ok(!(await V1.get('/api/dm/' + u2)).data.messages.some(m => m.id === poof.id) && (await V1.get('/api/messages/' + poof.id)).status === 404, 'vanished message is gone for both people (404)');
    await V1.put('/api/dm/' + u2 + '/vanish', { mode: '1h' });
    const tick = (await V1.post('/api/dm/' + u2, { text: 'tick' })).data.message;
    const life = tick.expiresAt - tick.created;
    if (life > 10000) ok(Math.abs(life - 3600000) < 2000, '1 hour vanish timer set on the message (expires in 1 h)');
    else { await wait(life + 2500); ok((await V1.get('/api/messages/' + tick.id)).status === 404 && !(await V2.get('/api/dm/' + u1)).data.messages.some(m => m.id === tick.id), '1 hour vanish timer: message deleted when the timer runs out (fast test clock)'); }
    const off = await V1.put('/api/dm/' + u2 + '/vanish', { mode: 'off' });
    const after = (await V1.post('/api/dm/' + u2, { text: 'normal again' })).data.message;
    ok(off.data.vanish === null && !after.vanish && !after.expiresAt, 'vanish mode off -> messages stay');
    // view-once
    const vo = await V1.post('/api/dm/' + u2, { media: JPG, viewOnce: true });
    ok(vo.status === 201 && vo.data.message.viewOnce === true && !vo.data.message.media, 'send a view-once photo (no file link in the message)');
    const voId = vo.data.message.id;
    const inV2 = (await V2.get('/api/dm/' + u1)).data.messages.find(m => m.id === voId);
    ok(inV2 && inV2.viewOnce && !inV2.opened && !inV2.media, 'receiver sees an unopened view-once bubble without a link');
    ok((await V1.post('/api/messages/' + voId + '/open')).status === 403, "the sender can't open their own view-once photo");
    const opn = await V2.post('/api/messages/' + voId + '/open');
    ok(opn.status === 200 && /^data:image\/jpeg;base64,/.test(opn.data.data), 'receiver opens it once (photo delivered)');
    ok((await V2.get(opn.data.file)).status === 404 && (await V1.get(opn.data.file)).status === 404, 'view-once file is deleted from the server after viewing (404)');
    ok((await V2.post('/api/messages/' + voId + '/open')).status === 410, 'opening it a second time = 410 Gone');
    ok((await V1.get('/api/messages/' + voId)).data.message.opened === true, 'sender sees "Opened"');
    const MP4b = 'data:video/mp4;base64,' + SAMPLE_MP4.toString('base64');
    const vv = await V1.post('/api/dm/' + u2, { media: MP4b, viewOnce: true });
    ok(vv.status === 201 && vv.data.message.kind === 'video' && vv.data.message.viewOnce, 'send a view-once video');
    ok((await V1.post('/api/dm/' + u2, { media: MP4b })).status === 415, 'normal (not view-once) DM media stays photos only');
    const ov = await V2.post('/api/messages/' + vv.data.message.id + '/open');
    ok(ov.status === 200 && /^data:video\/mp4;base64,/.test(ov.data.data) && (await V2.get(ov.data.file)).status === 404, 'view-once video plays once, then its file is gone');
    // privacy toggles
    ok((await V1.put('/api/settings', { hideFollowLists: 'yes' })).status === 400, 'privacy toggles only take true/false');
    await V1.put('/api/settings', { hideFollowLists: true });
    ok((await V2.get('/api/users/' + u1 + '/followers')).status === 403 && (await V2.get('/api/users/' + u1 + '/following')).status === 403, 'hidden followers/following lists: others get 403');
    ok((await V1.get('/api/users/' + u1 + '/followers')).status === 200 && typeof (await V2.get('/api/users/' + u1)).data.user.followers === 'number', 'you still see your own lists; counts stay visible');
    await V1.put('/api/settings', { lastSeen: false, screenshotBlock: true });
    ok((await V2.get('/api/dm/' + u1)).data.user.lastActive === null && (await V1.get('/api/settings')).data.settings.screenshotBlock === true, 'last seen hidden; screenshot block setting saved');
    await V1.put('/api/settings', { hideFollowLists: false, lastSeen: true, screenshotBlock: false });
    // App Lock
    ok((await V1.post('/api/app-lock', { pin: '12' })).status === 400 && (await V1.post('/api/app-lock', { pin: '2468', minutes: 7 })).status === 400, 'App Lock: bad PIN / bad auto-lock time rejected');
    ok((await V1.post('/api/app-lock', { pin: '2468', minutes: 5 })).status === 201, 'turn on App Lock (auto-lock after 5 min)');
    ok((await V1.get('/api/feed?limit=3')).status === 200, 'the device that turned it on stays open');
    const V1b = new Client('v1b'); await V1b.post('/api/login', { username: u1, password: pw });
    const lf1 = await V1b.get('/api/feed?limit=3');
    ok(lf1.status === 423 && lf1.data.appLocked && (await V1b.get('/api/inbox')).status === 423 && (await V1b.get('/api/dm/' + u2)).status === 423, 'another device/session is locked: feed, inbox and chats answer 423');
    ok((await V1b.get('/api/me')).data.appLocked === true, '/api/me tells the app to show the lock screen');
    ok((await V1b.post('/api/app-lock/verify', { pin: '1357' })).status === 401, 'wrong App Lock PIN rejected');
    ok((await V1b.post('/api/app-lock/verify', { pin: '2468' })).status === 200 && (await V1b.get('/api/feed?limit=3')).status === 200, 'right PIN opens the app');
    await V1b.post('/api/app-lock/lock');
    ok((await V1b.get('/api/feed?limit=3')).status === 423, 'auto-lock (app went to background) locks the session again');
    const bio = await V1.post('/api/app-lock/bio', { name: 'Test phone' });
    ok(bio.status === 201 && bio.data.secret && bio.data.deviceId, 'fingerprint device key created (server keeps only its hash)');
    ok((await V1b.post('/api/app-lock/bio-verify', { deviceId: bio.data.deviceId, secret: 'nope' })).status === 401, 'wrong fingerprint key rejected');
    ok((await V1b.post('/api/app-lock/bio-verify', { deviceId: bio.data.deviceId, secret: bio.data.secret })).status === 200 && (await V1b.get('/api/feed?limit=3')).status === 200, 'fingerprint key unlocks the app');
    ok((await V2.del('/api/app-lock/bio/' + bio.data.deviceId)).status === 404, "another user can't remove your fingerprint device");
    ok(!/2468|"hash"|"salt"/.test(JSON.stringify((await V1.get('/api/app-lock')).data) + JSON.stringify((await V1.get('/api/privacy')).data)), 'App Lock PIN / hashes never leak');
    ok((await V1.req('DELETE', '/api/app-lock', { pin: '0000' })).status === 401, 'turning App Lock off needs the PIN');
    ok((await V1.req('DELETE', '/api/app-lock', { pin: '2468' })).status === 200, 'turn App Lock off');
    await V1b.post('/api/app-lock/lock');
    ok((await V1b.get('/api/feed?limit=3')).status === 200, 'with App Lock off nothing is locked');
    for (const [cl] of [[V1], [V2], [V3]]) await cl.req('DELETE', '/api/me', { password: pw });
    ok((await V1b.get('/api/me')).status === 401, 'v1.5 test accounts deleted');
  }

  console.log('— cleanup');
  ok((await Bc.del('/api/messages/' + share.data.message.id)).status === 200, 'B unsends own message');
  ok((await A.del('/api/stories/' + sid)).status === 200, 'A deletes own story');
  ok((await A.del('/api/posts/' + pid)).status === 200, 'A deletes own post');
  ok((await A.req('DELETE', '/api/me', { password: 'wrong' })).status === 401, 'delete account needs the right password');
  ok((await A.post('/api/logout')).status === 200 && (await A.get('/api/me')).status === 401, 'logout ends the session');
  await A.post('/api/login', { username: ua, password: pw + 'X' });
  ok((await A.req('DELETE', '/api/me', { password: pw + 'X' })).status === 200, 'test account ' + ua + ' deleted');
  for (const [cl, n] of [[Bc, ub], [C, uc]]) ok((await cl.req('DELETE', '/api/me', { password: pw })).status === 200, 'test account ' + n + ' deleted');
  ok((await relog.get('/api/me')).status === 401, 'other sessions of a deleted account stop working');

  console.log(`\n${fail ? '❌' : '✅'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
