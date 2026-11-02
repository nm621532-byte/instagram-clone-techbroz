#!/usr/bin/env node
// Private Insta (InstaGlass) smoke + security test, v1.2 (v1.1 + bot boosts). Run before EVERY publish:
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
  for (const [m, u] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/users'], ['PUT', '/api/admin/users/' + ub], ['PUT', '/api/admin/posts/' + ppid], ['DELETE', '/api/admin/posts/' + ppid], ['POST', '/api/admin/reset-boosts'], ['GET', '/api/admin/bots'], ['DELETE', '/api/admin/users/' + ua + '/bots']])
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
    await M.post('/api/logout');
  } else console.log('  (admin positive checks skipped: set IG_ADMIN_USER / IG_ADMIN_PASS)');
  await A.put('/api/settings', { private: false, notif: { likes: true } });
  for (const [cl] of [[D], [E]]) await cl.req('DELETE', '/api/me', { password: pw });

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
