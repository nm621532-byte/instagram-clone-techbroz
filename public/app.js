/* InstaGlass client — vanilla JS single-page app. Educational project by Tech Bro Z (not affiliated with Instagram/Meta). */
(() => {
'use strict';
// ------------------------------------------------------------------ tiny helpers
const $app = document.getElementById('app');
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  homeF: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  reels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8.5h18M8 3l3 5.5M14 3l3 5.5"/><path d="m10 12 5 3-5 3z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
  heartF: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21.5 3 10 14.5M21.5 3l-7 18-4.5-6.5L3 10z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  saveF: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="m21 16-5-5L5 21"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3C7 3 3 6.6 3 11.2c0 2.4 1.1 4.6 2.9 6.1L5.5 21l3.6-1.8c.9.3 1.9.4 2.9.4 5 0 9-3.6 9-8.2S17 3 12 3z"/><path d="m7.5 13 3-3 2.5 2 3.5-3" stroke-linecap="round"/></svg>',
  verified: '<svg class="verified" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5 14.6 4l3.5-.4.9 3.4 3.1 1.8-1.3 3.2 1.3 3.2-3.1 1.8-.9 3.4-3.5-.4L12 22.5 9.4 20l-3.5.4-.9-3.4-3.1-1.8L3.2 12 1.9 8.8 5 7l.9-3.4 3.5.4z"/><path d="m8 12 2.7 2.7L16.5 9" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
};
const icon = (n) => { const s = document.createElement('span'); s.style.display = 'contents'; s.innerHTML = ICONS[n]; return s; };
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // only ever used with our own ICONS strings
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const DEFAULT_AV = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="64" height="64" fill="url(#a)"/><circle cx="32" cy="25" r="11" fill="#fff" fill-opacity=".85"/><path d="M12 58c3-12 11-18 20-18s17 6 20 18z" fill="#fff" fill-opacity=".85"/></svg>');
const avatar = (u, cls) => h('img', { class: 'av ' + (cls || ''), src: (u && u.avatar) || DEFAULT_AV, alt: '', loading: 'lazy' });
function ringed(u, size, onclick) {
  const cls = u.hasStory ? (u.storySeen ? 'ring seen' : 'ring') : 'ring none';
  const a = avatar(u); if (size) { a.style.width = a.style.height = size + 'px'; }
  return h('span', { class: cls, onclick }, a);
}
const unameEl = (u) => h('span', { class: 'uname' }, u.username, u.verified ? icon('verified') : null);
function ago(t) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return s + 's'; const m = Math.floor(s / 60); if (m < 60) return m + 'm';
  const hh = Math.floor(m / 60); if (hh < 24) return hh + 'h'; const d = Math.floor(hh / 24); if (d < 7) return d + 'd';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
let toastT;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; t.style.animation = 'none'; t.offsetHeight; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400); }
async function api(method, url, body) {
  const opt = { method, headers: { 'X-IG': '1' }, credentials: 'same-origin' };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let data = {}; try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && !url.startsWith('/api/login') && !url.startsWith('/api/signup')) { state.me = null; go('#/login'); }
  if (!r.ok) throw new Error(data.error || ('Error ' + r.status));
  return data;
}
const GET = (u) => api('GET', u), POST = (u, b) => api('POST', u, b || {}), PUT = (u, b) => api('PUT', u, b), DEL = (u) => api('DELETE', u);
function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms || 10); } catch (e) {} }

// ------------------------------------------------------------------ media helpers
function pickFile(accept) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, style: 'display:none' });
    i.onchange = () => { res(i.files[0] || null); i.remove(); };
    document.body.append(i); i.click();
  });
}
function fileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
async function prepareMedia(file, max) {
  if (!file) return null;
  if (file.type.startsWith('video/')) {
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error('Use an MP4 or WebM video');
    if (file.size > 15 * 1024 * 1024) throw new Error('Video too large (max 15 MB)');
    return { kind: 'video', data: await fileToDataUrl(file), url: URL.createObjectURL(file) };
  }
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo');
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that image')); i.src = url; });
  const scale = Math.min(1, (max || 1440) / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { kind: 'image', data: c.toDataURL('image/jpeg', 0.86), url };
}

// ------------------------------------------------------------------ state + realtime
const state = { me: null, unreadDm: 0, unreadNotif: 0, es: null, chatWith: null, chatHandler: null, feedCache: null };
if (localStorage.getItem('ig_theme') === 'light') document.documentElement.classList.add('light');
async function refreshMe() {
  try { const d = await GET('/api/me'); state.me = d.user; state.unreadDm = d.unreadDm; state.unreadNotif = d.unreadNotif; updateBadges(); return true; }
  catch (e) { return false; }
}
function updateBadges() {
  document.querySelectorAll('[data-badge=dm]').forEach(b => { b.textContent = state.unreadDm; b.hidden = !state.unreadDm; });
  document.querySelectorAll('[data-badge=notif]').forEach(b => { b.hidden = !state.unreadNotif; });
}
function connectStream() {
  if (state.es) state.es.close();
  if (!window.EventSource) return;
  const es = new EventSource('/api/stream');
  state.es = es;
  es.onmessage = (e) => {
    let ev; try { ev = JSON.parse(e.data); } catch (x) { return; }
    if (ev.type === 'dm') {
      if (state.chatWith === ev.from && state.chatHandler) state.chatHandler(ev);
      else { state.unreadDm++; updateBadges(); toast('💬 ' + ev.from + ': ' + (ev.message.kind === 'text' ? ev.message.text.slice(0, 60) : ev.message.kind === 'image' ? 'sent a photo' : 'shared a post')); vib(20); if (location.hash === '#/inbox') render(); }
    } else if ((ev.type === 'typing' || ev.type === 'seen' || ev.type === 'unsend') && state.chatHandler && state.chatWith === (ev.from || ev.by)) state.chatHandler(ev);
    else if (ev.type === 'dm_echo' && state.chatHandler && state.chatWith === ev.to) state.chatHandler(ev);
    else if (ev.type === 'notif') { state.unreadNotif++; updateBadges(); }
  };
  es.onerror = () => { /* the browser reconnects on its own */ };
}

// ------------------------------------------------------------------ router
const routes = [];
const addRoute = (re, fn, opts) => routes.push({ re, fn, opts: opts || {} });
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener('hashchange', render);
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const hash = location.hash || '#/';
  document.querySelectorAll('.overlay,.sv').forEach(o => o.remove());
  state.chatWith = null; state.chatHandler = null;
  if (state.cleanup) { try { state.cleanup(); } catch (e) {} state.cleanup = null; }
  if (!state.me && !/^#\/(login|signup|about)/.test(hash)) { if (!(await refreshMe())) { if (seq === renderSeq) return go('#/login'); return; } connectStream(); }
  for (const r of routes) {
    const m = hash.match(r.re);
    if (m) {
      const page = await r.fn(...m.slice(1).map(decodeURIComponent));
      if (seq !== renderSeq || !page) return;
      $app.replaceChildren(page);
      if (!r.opts.noTabs && state.me) $app.append(tabbar(r.opts.tab));
      if (!r.opts.keepScroll) window.scrollTo(0, 0);
      return;
    }
  }
  go('#/');
}
function tabbar(active) {
  const me = state.me || {};
  const tabs = [
    ['home', '#/', active === 'home' ? ICONS.homeF : ICONS.home],
    ['explore', '#/explore', ICONS.search],
    ['create', '#/create', null],
    ['reels', '#/reels', ICONS.reels],
    ['profile', '#/u/' + me.username, null],
  ];
  const bar = h('nav', { class: 'tabbar glass' });
  const lens = h('i', { class: 'lens' }); bar.append(lens);
  tabs.forEach(([k, href, svg]) => {
    let inner;
    if (k === 'create') inner = h('span', { class: 'tab-create', html: ICONS.plus });
    else if (k === 'profile') inner = avatar(me);
    else inner = h('span', { style: 'display:contents', html: svg });
    const a = h('a', { class: 'tab' + (active === k ? ' on' : ''), href, 'aria-label': k, 'data-k': k }, inner);
    bar.append(a);
  });
  requestAnimationFrame(() => {
    const on = bar.querySelector('.tab.on');
    if (!on || active === 'create') { lens.style.opacity = 0; return; }
    const prev = sessionStorage.getItem('lensX');
    const target = on.offsetLeft + on.offsetWidth / 2 - 32;
    if (prev !== null) { lens.style.transition = 'none'; lens.style.left = prev + 'px'; lens.offsetHeight; lens.style.transition = ''; }
    requestAnimationFrame(() => { lens.style.left = target + 'px'; sessionStorage.setItem('lensX', target); });
  });
  return bar;
}
function topbar(title, opts) {
  opts = opts || {};
  const bar = h('header', { class: 'topbar glass' });
  if (opts.back) bar.append(h('button', { class: 'icon-btn', onclick: () => history.length > 1 ? history.back() : go('#/'), 'aria-label': 'Back', html: ICONS.back }));
  bar.append(typeof title === 'string' ? h('h1', null, title) : title);
  (opts.right || []).forEach(x => bar.append(x));
  return bar;
}
const pageWrap = (...kids) => h('div', null, ...kids);
const spinner = () => h('div', { class: 'spinner' });

// ------------------------------------------------------------------ auth pages
function authPage(mode) {
  const err = h('div', { class: 'err' });
  const u = h('input', { class: 'field', placeholder: 'Username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: 20 });
  const n = h('input', { class: 'field', placeholder: 'Full name', maxlength: 40 });
  const p = h('input', { class: 'field', placeholder: 'Password', type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password' });
  const btn = h('button', { class: 'gbtn primary block', type: 'submit' }, mode === 'login' ? 'Log in' : 'Sign up');
  async function submit(e, demo) {
    if (e) e.preventDefault(); err.textContent = ''; btn.disabled = true;
    try {
      const body = demo ? { username: 'demo', password: 'demo1234' } : { username: u.value.trim().toLowerCase(), password: p.value, name: n.value };
      const d = await POST(mode === 'login' || demo ? '/api/login' : '/api/signup', body);
      state.me = d.user; await refreshMe(); connectStream(); go('#/');
    } catch (x) { err.textContent = x.message; } finally { btn.disabled = false; }
  }
  const form = h('form', { onsubmit: submit }, u, mode === 'signup' ? n : null, p, err, btn);
  return h('div', { class: 'auth' },
    h('div', { class: 'card glass' },
      h('h1', { class: 'logo' }, h('img', { src: '/icon.svg', alt: '' }), 'InstaGlass'),
      h('p', { class: 'sub' }, mode === 'login' ? 'Share moments. Crystal clear.' : 'Sign up to see photos and stories from your friends.'),
      form,
      h('div', { class: 'or' }, 'OR'),
      h('button', { class: 'gbtn block', onclick: () => submit(null, true) }, '✨ Try the demo account'),
      h('div', { class: 'switch' }, mode === 'login' ? "Don't have an account? " : 'Have an account? ',
        h('button', { onclick: () => go(mode === 'login' ? '#/signup' : '#/login') }, mode === 'login' ? 'Sign up' : 'Log in'))),
    h('div', { class: 'foot' }, 'Educational project by Tech Bro Z — not affiliated with Instagram or Meta.', h('br'), h('a', { href: '#/about', style: 'text-decoration:underline' }, 'About')));
}
addRoute(/^#\/login$/, () => authPage('login'), { noTabs: true });
addRoute(/^#\/signup$/, () => authPage('signup'), { noTabs: true });

// ------------------------------------------------------------------ post card
function postCard(p, opts) {
  opts = opts || {};
  const likeBtn = h('button', { class: 'icon-btn' + (p.liked ? ' liked' : ''), 'aria-label': 'Like', html: p.liked ? ICONS.heartF : ICONS.heart });
  const saveBtn = h('button', { class: 'icon-btn', 'aria-label': 'Save', html: p.saved ? ICONS.saveF : ICONS.save });
  const likesEl = h('div', { class: 'likes' }, fmt(p.likes) + (p.likes === 1 ? ' like' : ' likes'));
  async function setLike(v) {
    if (p.liked === v) return; p.liked = v; p.likes += v ? 1 : -1;
    likeBtn.className = 'icon-btn' + (v ? ' liked' : ''); likeBtn.innerHTML = v ? ICONS.heartF : ICONS.heart;
    likesEl.textContent = fmt(p.likes) + (p.likes === 1 ? ' like' : ' likes');
    try { const d = v ? await POST('/api/posts/' + p.id + '/like') : await DEL('/api/posts/' + p.id + '/like'); p.likes = d.likes; likesEl.textContent = fmt(p.likes) + (p.likes === 1 ? ' like' : ' likes'); }
    catch (e) { toast(e.message); }
  }
  likeBtn.onclick = () => { vib(); setLike(!p.liked); };
  saveBtn.onclick = async () => {
    p.saved = !p.saved; saveBtn.innerHTML = p.saved ? ICONS.saveF : ICONS.save; vib();
    try { p.saved ? await POST('/api/posts/' + p.id + '/save') : await DEL('/api/posts/' + p.id + '/save'); toast(p.saved ? 'Saved to your collection' : 'Removed from saved'); } catch (e) { toast(e.message); }
  };
  let mediaEl;
  if (p.type === 'video') { mediaEl = h('video', { src: p.media, muted: true, loop: true, playsinline: true, autoplay: true, preload: 'metadata', class: 'tall' }); mediaEl.muted = true; }
  else mediaEl = h('img', { src: p.media, alt: p.caption.slice(0, 80), loading: 'lazy' });
  const media = h('div', { class: 'media' }, mediaEl);
  let lastTap = 0;
  media.addEventListener('click', (e) => {
    const t = Date.now();
    if (t - lastTap < 320) {
      const b = h('div', { class: 'burst', html: ICONS.heartF }); media.append(b); setTimeout(() => b.remove(), 950);
      vib(15); setLike(true); lastTap = 0;
    } else { lastTap = t; if (p.type === 'video') setTimeout(() => { if (lastTap === t) { mediaEl.muted = !mediaEl.muted; } }, 330); }
  });
  const capEl = p.caption ? h('div', { class: 'cap' }, h('a', { href: '#/u/' + p.user.username }, unameEl(p.user)), ' ', p.caption) : null;
  const previewEls = (p.preview || []).map(c => h('div', { class: 'cap' }, h('b', null, c.user.username), ' ', c.text));
  const card = h('article', { class: 'post glass' },
    h('div', { class: 'post-head' },
      ringed(p.user, 34, () => p.user.hasStory ? openStories([p.user.username]) : go('#/u/' + p.user.username)),
      h('a', { class: 'meta', href: '#/u/' + p.user.username }, unameEl(p.user), h('small', null, p.type === 'video' ? 'Reel' : ago(p.created) + ' ago')),
      h('button', { class: 'icon-btn', 'aria-label': 'More', html: ICONS.dots, onclick: () => postMenu(p, card) })),
    media,
    h('div', { class: 'actions' }, likeBtn,
      h('button', { class: 'icon-btn', 'aria-label': 'Comment', html: ICONS.comment, onclick: () => openComments(p, card) }),
      h('button', { class: 'icon-btn', 'aria-label': 'Share', html: ICONS.send, onclick: () => openShare(p) }),
      h('span', { class: 'sp' }), saveBtn),
    h('div', { class: 'post-body' }, likesEl, capEl, ...previewEls,
      p.comments > (p.preview || []).length ? h('button', { class: 'more-c', onclick: () => openComments(p, card) }, 'View all ' + p.comments + ' comments') : null,
      h('div', { class: 'time' }, ago(p.created) + ' ago')));
  return card;
}
function sheet(title, ...content) {
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov) close(); } });
  const sh = h('div', { class: 'sheet glass' }, h('div', { class: 'grab' }), title ? h('h3', null, title) : null, ...content);
  ov.append(sh); document.body.append(ov);
  let startY = null;
  sh.addEventListener('touchstart', (e) => { if (sh.querySelector('.scroll') && sh.querySelector('.scroll').scrollTop > 0) return; startY = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', (e) => { if (startY == null) return; const dy = e.touches[0].clientY - startY; if (dy > 0) sh.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
  sh.addEventListener('touchend', (e) => { if (startY == null) return; const dy = e.changedTouches[0].clientY - startY; startY = null; if (dy > 110) close(); else sh.style.transform = ''; });
  function close() { sh.style.transition = 'transform .25s'; sh.style.transform = 'translateY(100%)'; ov.style.opacity = 0; ov.style.transition = 'opacity .25s'; setTimeout(() => ov.remove(), 250); }
  return { ov, sh, close };
}
function postMenu(p, card) {
  const link = location.origin + '/#/p/' + p.id;
  const btns = [h('button', { class: 'menu-btn', onclick: () => { copy(link); s.close(); } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.link }), 'Copy link'),
    h('button', { class: 'menu-btn', onclick: () => { s.close(); go('#/p/' + p.id); } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.grid }), 'Go to post'),
    h('button', { class: 'menu-btn', onclick: () => { s.close(); go('#/u/' + p.user.username); } }, 'About this account')];
  if (p.mine) {
    btns.unshift(
      h('button', { class: 'menu-btn', onclick: async () => {
        s.close(); const c = prompt('Edit caption', p.caption); if (c == null) return;
        try { const d = await PUT('/api/posts/' + p.id, { caption: c }); Object.assign(p, d.post); card.replaceWith(postCard(p)); toast('Caption updated'); } catch (e) { toast(e.message); }
      } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.edit }), 'Edit caption'),
      h('button', { class: 'menu-btn danger', onclick: async () => {
        s.close(); if (!confirm('Delete this post?')) return;
        try { await DEL('/api/posts/' + p.id); card.style.transition = 'all .35s'; card.style.opacity = 0; card.style.transform = 'scale(.95)'; setTimeout(() => card.remove(), 350); toast('Post deleted'); } catch (e) { toast(e.message); }
      } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.trash }), 'Delete'));
  }
  const s = sheet(null, h('div', null, ...btns));
}
function copy(text) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Link copied 🔗')).catch(() => { prompt('Copy this link', text); });
}

// ------------------------------------------------------------------ comments
async function openComments(p, card) {
  const list = h('div', { class: 'scroll' }, spinner());
  const input = h('input', { placeholder: 'Add a comment…', maxlength: 500 });
  const sendB = h('button', { class: 'send' }, 'Post');
  const s = sheet('Comments', list, h('form', { class: 'composer', onsubmit: async (e) => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return; sendB.disabled = true;
    try { const d = await POST('/api/posts/' + p.id + '/comments', { text }); input.value = ''; p.comments++; list.querySelector('.empty') && list.replaceChildren(); list.append(cmtRow(d.comment)); list.scrollTop = 1e9; if (card) { const pc = postCard(p); card.replaceWith(pc); card = pc; } }
    catch (x) { toast(x.message); } finally { sendB.disabled = false; }
  } }, avatar(state.me), input, sendB));
  function cmtRow(c) {
    const row = h('div', { class: 'cmt' }, h('a', { href: '#/u/' + c.user.username }, avatar(c.user)),
      h('div', { class: 'meta' }, h('a', { href: '#/u/' + c.user.username }, h('b', null, c.user.username)), ' ', c.text,
        h('div', null, h('small', null, ago(c.created)), c.canDelete ? h('button', { class: 'del', onclick: async () => {
          try { await DEL('/api/comments/' + c.id); row.remove(); p.comments--; } catch (e) { toast(e.message); }
        } }, 'Delete') : null)));
    return row;
  }
  try {
    const d = await GET('/api/posts/' + p.id + '/comments');
    list.replaceChildren(...(d.comments.length ? d.comments.map(cmtRow) : [h('div', { class: 'empty' }, 'No comments yet.', h('br'), 'Start the conversation.')]));
  } catch (e) { list.replaceChildren(h('div', { class: 'empty' }, e.message)); }
  setTimeout(() => input.focus(), 400);
}

// ------------------------------------------------------------------ share (send to a friend via DM, copy link, native share)
async function openShare(p) {
  const grid = h('div', { class: 'share-grid' }, spinner());
  const search = h('input', { class: 'field', placeholder: 'Search people', style: 'height:42px;margin:4px 0 6px' });
  const note = h('input', { class: 'field', placeholder: 'Write a message…', style: 'height:42px;margin:0', maxlength: 500 });
  const link = location.origin + '/#/p/' + p.id;
  const s = sheet('Share', h('div', { class: 'scroll' }, search, grid, note),
    h('div', { class: 'share-actions' },
      h('button', { onclick: () => copy(link) }, h('span', { class: 'circ glass', html: ICONS.link }), 'Copy link'),
      navigator.share ? h('button', { onclick: () => navigator.share({ title: 'InstaGlass post', text: p.caption.slice(0, 80), url: link }).catch(() => {}) }, h('span', { class: 'circ glass', html: ICONS.share }), 'Share to…') : null));
  let people = [];
  try {
    const [inbox, fol] = await Promise.all([GET('/api/inbox'), GET('/api/users/' + state.me.username + '/following')]);
    const seen = new Set();
    for (const u of inbox.conversations.map(c => c.user).concat(fol.users)) if (!seen.has(u.username) && u.username !== state.me.username) { seen.add(u.username); people.push(u); }
  } catch (e) {}
  function draw(q) {
    const list = people.filter(u => !q || u.username.includes(q) || (u.name || '').toLowerCase().includes(q));
    grid.replaceChildren(...(list.length ? list.map(u => {
      const el = h('button', { class: 'share-u' }, avatar(u), h('span', null, u.name || u.username), h('span', { class: 'gbtn sm primary' }, 'Send'));
      el.onclick = async () => {
        if (el.classList.contains('sent')) return;
        try { await POST('/api/dm/' + u.username, { postId: p.id, text: note.value.trim() }); el.classList.add('sent'); el.lastChild.textContent = 'Sent ✓'; el.lastChild.className = 'gbtn sm'; vib(); }
        catch (e) { toast(e.message); }
      };
      return el;
    }) : [h('div', { class: 'empty', style: 'grid-column:1/-1;padding:20px' }, 'Follow people to share with them')]));
  }
  search.oninput = async () => {
    const q = search.value.trim().toLowerCase(); draw(q);
    if (q.length >= 2) { try { const d = await GET('/api/search?q=' + encodeURIComponent(q)); for (const u of d.users) if (!people.find(x => x.username === u.username)) people.push(u); draw(q); } catch (e) {} }
  };
  draw('');
}

// ------------------------------------------------------------------ stories
async function storiesRow() {
  const row = h('div', { class: 'stories' });
  let d; try { d = await GET('/api/stories'); } catch (e) { return row; }
  const me = state.me;
  if (!d.meHasStory) row.append(h('button', { class: 'story', onclick: () => createStory() },
    h('span', { class: 'ring none', style: 'position:relative' }, avatar(me), h('span', { class: 'plus' }, '+')), h('span', null, 'Your story')));
  const names = d.tray.map(u => u.username);
  d.tray.forEach((u, i) => row.append(h('button', { class: 'story', onclick: () => openStories(names.slice(i)) },
    h('span', { class: u.storySeen ? 'ring seen' : 'ring', style: 'position:relative' }, avatar(u), u.isMe ? h('span', { class: 'plus', onclick: (e) => { e.stopPropagation(); createStory(); } }, '+') : null),
    h('span', null, u.isMe ? 'Your story' : u.username))));
  return row;
}
async function createStory() {
  const f = await pickFile('image/*,video/mp4,video/webm');
  if (!f) return;
  try {
    toast('Uploading story…');
    const m = await prepareMedia(f, 1440);
    await POST('/api/stories', { media: m.data });
    toast('Story shared ✨'); render();
  } catch (e) { toast(e.message); }
}
async function openStories(queue) {
  queue = queue.slice();
  const ov = h('div', { class: 'sv' });
  const inner = h('div', { class: 'sv-inner' }); ov.append(inner); document.body.append(ov);
  let timer = null, raf = null, paused = false, closed = false;
  const close = () => { closed = true; cancelAnimationFrame(raf); clearTimeout(timer); ov.style.transition = 'opacity .2s, transform .2s'; ov.style.opacity = 0; ov.style.transform = 'scale(.95)'; setTimeout(() => { ov.remove(); if (location.hash === '#/' || location.hash === '') render(); }, 200); };
  async function playUser() {
    if (closed) return;
    const name = queue.shift(); if (!name) return close();
    let d; try { d = await GET('/api/stories/' + encodeURIComponent(name)); } catch (e) { return playUser(); }
    if (!d.stories.length) return playUser();
    let i = d.stories.findIndex(s => !s.seen); if (i < 0) i = 0;
    const isMe = d.user.username === state.me.username;
    const bars = h('div', { class: 'bars' }, ...d.stories.map(() => h('i', null, h('b'))));
    const timeEl = h('small');
    const mediaBox = h('div', { class: 'sv-media' });
    const top = h('div', { class: 'sv-top' }, bars, h('div', { class: 'sv-user' }, avatar(d.user), h('a', { href: '#/u/' + d.user.username, onclick: close }, h('b', null, d.user.username)), timeEl, h('span', { class: 'sp' }),
      isMe ? h('button', { class: 'icon-btn', style: 'color:#fff', html: ICONS.trash, 'aria-label': 'Delete story', onclick: async (e) => { e.stopPropagation(); if (!confirm('Delete this story?')) return; try { await DEL('/api/stories/' + d.stories[i].id); toast('Story deleted'); close(); } catch (x) { toast(x.message); } } }) : null,
      h('button', { class: 'icon-btn', style: 'color:#fff', html: ICONS.close, onclick: close, 'aria-label': 'Close' })));
    const reply = h('input', { placeholder: 'Reply to ' + d.user.username + '…', maxlength: 500 });
    reply.onfocus = () => paused = true; reply.onblur = () => paused = false;
    const bottom = isMe ? h('div', { class: 'sv-bottom' }, h('button', { class: 'viewers', onclick: () => {
      const v = d.stories[i].viewers || []; paused = true;
      const s = sheet('Seen by ' + v.length, h('div', { class: 'scroll' }, ...(v.length ? v.map(u => h('a', { class: 'row', href: '#/u/' + u.username }, avatar(u), h('div', { class: 'meta' }, h('b', null, u.username)))) : [h('div', { class: 'empty' }, 'No views yet')])));
      s.ov.style.zIndex = 70; s.ov.addEventListener('click', () => setTimeout(() => { if (!document.body.contains(s.ov)) paused = false; }, 300));
    } }, h('span', { style: 'display:inline-flex', html: ICONS.eye }), 'Activity'))
      : h('form', { class: 'sv-bottom', onsubmit: async (e) => {
          e.preventDefault(); const t = reply.value.trim(); if (!t) return;
          try { await POST('/api/dm/' + d.user.username, { text: '↩️ Replied to your story: ' + t }); reply.value = ''; reply.blur(); toast('Reply sent'); } catch (x) { toast(x.message); }
        } }, reply, h('button', { class: 'icon-btn', html: ICONS.send, 'aria-label': 'Send' }));
    const tapL = h('div', { class: 'sv-tap l' }), tapR = h('div', { class: 'sv-tap r' });
    inner.replaceChildren(mediaBox, top, tapL, tapR, bottom);
    let startT = 0, elapsed = 0, dur = 5000, vid = null;
    const show = (k) => {
      cancelAnimationFrame(raf);
      if (k < 0) { k = 0; }
      if (k >= d.stories.length) return playUser();
      i = k; const s = d.stories[i];
      [...bars.children].forEach((b, j) => b.firstChild.style.width = j < i ? '100%' : '0%');
      timeEl.textContent = ago(s.created);
      if (s.type === 'video') { vid = h('video', { class: 'main', src: s.media, autoplay: true, playsinline: true }); vid.muted = false; vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); }); mediaBox.replaceChildren(vid); dur = 15000; vid.onloadedmetadata = () => { dur = Math.min(60, vid.duration || 15) * 1000; }; }
      else { vid = null; mediaBox.replaceChildren(h('img', { class: 'bgblur', src: s.media, alt: '' }), h('img', { class: 'main', src: s.media, alt: '' })); dur = 5000; }
      if (!s.seen && !isMe) { POST('/api/stories/' + s.id + '/seen').catch(() => {}); s.seen = true; }
      elapsed = 0; startT = performance.now(); tick();
    };
    let last = performance.now();
    function tick() {
      raf = requestAnimationFrame((t) => {
        if (closed) return;
        const dt = t - last; last = t;
        if (!paused) elapsed += dt;
        const pct = Math.min(1, elapsed / dur);
        bars.children[i].firstChild.style.width = (pct * 100) + '%';
        if (pct >= 1) return show(i + 1);
        tick();
      });
    }
    let holdT;
    const hold = (el, fn) => {
      el.addEventListener('pointerdown', () => { holdT = Date.now(); paused = true; vid && vid.pause(); });
      el.addEventListener('pointerup', () => { paused = false; vid && vid.play().catch(() => {}); if (Date.now() - holdT < 220) fn(); });
      el.addEventListener('pointerleave', () => { if (paused && !reply.matches(':focus')) { paused = false; vid && vid.play().catch(() => {}); } });
    };
    hold(tapL, () => { if (i === 0) { queue.unshift(name); /* restart user */ show(0); } else show(i - 1); });
    hold(tapR, () => show(i + 1));
    last = performance.now(); show(i);
  }
  let sy = null;
  ov.addEventListener('touchstart', e => sy = e.touches[0].clientY, { passive: true });
  ov.addEventListener('touchend', e => { if (sy != null && e.changedTouches[0].clientY - sy > 120) close(); sy = null; });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  playUser();
}

// ------------------------------------------------------------------ home feed
addRoute(/^#\/?$/, async () => {
  const feed = h('div');
  const right = [
    h('a', { class: 'icon-btn', href: '#/notifications', 'aria-label': 'Notifications', style: 'position:relative' }, h('span', { style: 'display:contents', html: ICONS.heart }), h('i', { class: 'dot-badge', 'data-badge': 'notif', hidden: !state.unreadNotif })),
    h('a', { class: 'icon-btn', href: '#/inbox', 'aria-label': 'Messages', style: 'position:relative' }, h('span', { style: 'display:contents', html: ICONS.msg }), h('i', { class: 'badge', 'data-badge': 'dm', hidden: !state.unreadDm }, String(state.unreadDm))),
  ];
  const page = pageWrap(topbar(h('h1', { class: 'logo' }, h('img', { src: '/icon.svg', alt: '' }), 'InstaGlass'), { right }), h('main', { class: 'view' }, h('div', { class: 'stories-slot' }), feed));
  storiesRow().then(r => page.querySelector('.stories-slot').replaceWith(r));
  feed.append(spinner());
  let before = 0, loading = false, more = true;
  async function load() {
    if (loading || !more) return; loading = true;
    try {
      const d = await GET('/api/feed?limit=8' + (before ? '&before=' + before : ''));
      feed.querySelector('.spinner') && feed.querySelector('.spinner').remove();
      if (!before && !d.posts.length) feed.append(await suggestions(true));
      d.posts.forEach(p => feed.append(postCard(p)));
      if (d.posts.length) before = d.posts[d.posts.length - 1].created;
      more = d.more;
      if (!more && before) feed.append(h('div', { class: 'empty' }, "✨ You're all caught up"), await suggestions(false));
    } catch (e) { toast(e.message); }
    loading = false;
  }
  const onScroll = () => { if (window.innerHeight + window.scrollY > document.body.offsetHeight - 900) load(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  state.cleanup = () => window.removeEventListener('scroll', onScroll);
  load();
  return page;
}, { tab: 'home' });
async function suggestions(big) {
  let d; try { d = await GET('/api/search'); } catch (e) { return h('div'); }
  if (!d.users.length) return h('div');
  return h('div', null, h('div', { class: 'section-t' }, big ? 'Welcome! Follow people to fill your feed' : 'Suggested for you'),
    h('div', { class: 'sugg' }, ...d.users.slice(0, 10).map(u => {
      const b = h('button', { class: 'gbtn sm primary' }, 'Follow');
      b.onclick = async () => { try { if (b.textContent === 'Follow') { await POST('/api/users/' + u.username + '/follow'); b.textContent = 'Following'; b.className = 'gbtn sm'; } else { await DEL('/api/users/' + u.username + '/follow'); b.textContent = 'Follow'; b.className = 'gbtn sm primary'; } } catch (e) { toast(e.message); } };
      return h('div', { class: 'card glass' }, h('a', { href: '#/u/' + u.username }, avatar(u)), h('b', null, u.username), h('small', null, u.name), b);
    })));
}

// ------------------------------------------------------------------ explore + search
function gridItem(p) {
  return h('a', { href: '#/p/' + p.id }, p.type === 'video' ? h('video', { src: p.media + '#t=0.5', muted: true, preload: 'metadata', playsinline: true }) : h('img', { src: p.media, loading: 'lazy', alt: '' }),
    p.type === 'video' ? h('span', { class: 'video-badge', html: ICONS.reels }) : null);
}
addRoute(/^#\/explore$/, async () => {
  const results = h('div');
  const input = h('input', { placeholder: 'Search people', autocapitalize: 'none', spellcheck: 'false' });
  const grid = h('div', { class: 'grid explore-grid' });
  const page = pageWrap(h('main', { class: 'view' }, h('label', { class: 'search glass' }, h('span', { style: 'display:contents', html: ICONS.search }), input), results, grid));
  let t;
  input.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const q = input.value.trim();
    if (!q) { results.replaceChildren(); grid.hidden = false; return; }
    grid.hidden = true;
    try { const d = await GET('/api/search?q=' + encodeURIComponent(q)); results.replaceChildren(h('div', { class: 'list glass' }, ...(d.users.length ? d.users.map(userRow) : [h('div', { class: 'empty' }, 'No users found')]))); } catch (e) { toast(e.message); }
  }, 220); };
  GET('/api/explore?limit=30').then(d => grid.replaceChildren(...d.posts.map(gridItem))).catch(e => toast(e.message));
  return page;
}, { tab: 'explore' });
function userRow(u) {
  const right = u.isMe ? null : followBtn(u);
  return h('div', { class: 'row' }, h('a', { href: '#/u/' + u.username }, ringed(u, 50)), h('a', { class: 'meta', href: '#/u/' + u.username }, h('b', null, unameEl(u)), h('small', null, u.name + (u.followers != null ? ' • ' + fmt(u.followers) + ' followers' : ''))), right);
}
function followBtn(u, big) {
  const b = h('button', { class: 'gbtn sm' + (u.isFollowing ? '' : ' primary') + (big ? ' block' : '') }, u.isFollowing ? 'Following' : 'Follow');
  b.onclick = async (e) => {
    e.preventDefault(); b.disabled = true;
    try {
      const d = u.isFollowing ? await DEL('/api/users/' + u.username + '/follow') : await POST('/api/users/' + u.username + '/follow');
      u.isFollowing = d.following; b.textContent = u.isFollowing ? 'Following' : 'Follow'; b.className = 'gbtn sm' + (u.isFollowing ? '' : ' primary') + (big ? ' block' : ''); vib();
      if (b.onchange2) b.onchange2(d);
    } catch (x) { toast(x.message); } finally { b.disabled = false; }
  };
  return b;
}

// ------------------------------------------------------------------ single post
addRoute(/^#\/p\/([a-f0-9]+)$/, async (id) => {
  try { const d = await GET('/api/posts/' + id); return pageWrap(topbar('Post', { back: true }), h('main', { class: 'view' }, postCard(d.post))); }
  catch (e) { return pageWrap(topbar('Post', { back: true }), h('main', { class: 'view' }, h('div', { class: 'empty glass', style: 'border-radius:22px' }, e.message))); }
}, { tab: '' });

// ------------------------------------------------------------------ reels
addRoute(/^#\/reels$/, async () => {
  const wrap = h('div', { class: 'reels' });
  let d; try { d = await GET('/api/reels?limit=30'); } catch (e) { toast(e.message); return null; }
  let muted = true;
  if (!d.posts.length) wrap.append(h('div', { class: 'empty', style: 'color:#fff;padding-top:40vh' }, 'No reels yet. Post a video with the + button!'));
  const vids = [];
  d.posts.forEach(p => {
    const v = h('video', { src: p.media, loop: true, playsinline: true, preload: 'metadata' }); v.muted = true; vids.push(v);
    const likeIco = h('span', { class: 'gl', html: p.liked ? ICONS.heartF : ICONS.heart, style: p.liked ? 'color:var(--heart)' : '' });
    const likeN = h('span', null, fmt(p.likes));
    const reel = h('section', { class: 'reel' }, v,
      h('button', { class: 'mute', html: ICONS.mute, onclick: (e) => { muted = !muted; vids.forEach(x => x.muted = muted); document.querySelectorAll('.mute').forEach(m => m.innerHTML = muted ? ICONS.mute : ICONS.vol); } }),
      h('div', { class: 'side' },
        h('button', { onclick: async () => { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; likeIco.innerHTML = p.liked ? ICONS.heartF : ICONS.heart; likeIco.style.color = p.liked ? 'var(--heart)' : ''; likeN.textContent = fmt(p.likes); vib(); try { p.liked ? await POST('/api/posts/' + p.id + '/like') : await DEL('/api/posts/' + p.id + '/like'); } catch (e) { toast(e.message); } } }, likeIco, likeN),
        h('button', { onclick: () => openComments(p) }, h('span', { class: 'gl', html: ICONS.comment }), h('span', null, fmt(p.comments))),
        h('button', { onclick: () => openShare(p) }, h('span', { class: 'gl', html: ICONS.send }), h('span', null, 'Share'))),
      h('div', { class: 'info' }, h('a', { class: 'who', href: '#/u/' + p.user.username }, avatar(p.user), unameEl(p.user)), h('div', { class: 'cap' }, p.caption)));
    let lt = 0; v.addEventListener('click', () => { const t = Date.now(); if (t - lt < 320 && !p.liked) { reel.querySelector('.side button').click(); const b = h('div', { class: 'burst', html: ICONS.heartF }); reel.append(b); setTimeout(() => b.remove(), 950); } else if (v.paused) v.play(); else if (t - lt > 320) setTimeout(() => { if (Date.now() - t > 300 && lt === t) v.paused ? v.play() : v.pause(); }, 330); lt = t; });
    wrap.append(reel);
  });
  const io = new IntersectionObserver((ents) => ents.forEach(en => { const v = en.target.querySelector('video'); if (en.isIntersecting && en.intersectionRatio > 0.6) v.play().catch(() => {}); else v.pause(); }), { root: wrap, threshold: [0, 0.6, 1] });
  wrap.querySelectorAll('.reel').forEach(r => io.observe(r));
  state.cleanup = () => { io.disconnect(); vids.forEach(v => v.pause()); };
  return pageWrap(h('div', { class: 'reels-title' }, 'Reels'), wrap);
}, { tab: 'reels' });

// ------------------------------------------------------------------ create post / story
addRoute(/^#\/create$/, async () => {
  let mode = 'post', media = null;
  const seg = h('div', { class: 'seg glass' });
  const body = h('div');
  const caption = h('textarea', { class: 'field', placeholder: 'Write a caption…', maxlength: 2200 });
  const shareBtn = h('button', { class: 'gbtn primary block' }, 'Share');
  const area = h('div');
  function drawSeg() { seg.replaceChildren(...[['post', 'Post'], ['story', 'Story']].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; drawSeg(); draw(); } }, l))); }
  function draw() {
    if (!media) area.replaceChildren(h('button', { class: 'pick glass', style: 'width:100%', onclick: choose }, h('span', { style: 'display:contents', html: ICONS.image }), h('b', null, 'Tap to choose a photo or video'), h('small', null, 'JPG, PNG, WebP up to 8 MB · MP4/WebM up to 15 MB')));
    else area.replaceChildren(h('div', { class: 'preview glass' }, media.kind === 'video' ? h('video', { src: media.url, controls: true, playsinline: true, autoplay: true, muted: true }) : h('img', { src: media.url, alt: '' })),
      h('button', { class: 'gbtn sm', onclick: choose, style: 'margin-bottom:12px' }, 'Change'), mode === 'post' ? caption : null, shareBtn);
  }
  async function choose() {
    const f = await pickFile('image/*,video/mp4,video/webm,video/quicktime'); if (!f) return;
    try { media = await prepareMedia(f, 1440); draw(); } catch (e) { toast(e.message); }
  }
  shareBtn.onclick = async () => {
    if (!media) return; shareBtn.disabled = true; shareBtn.textContent = 'Sharing…';
    try {
      if (mode === 'post') { const d = await POST('/api/posts', { media: media.data, caption: caption.value }); toast('Posted ✨'); go('#/p/' + d.post.id); }
      else { await POST('/api/stories', { media: media.data }); toast('Added to your story ✨'); go('#/'); }
    } catch (e) { toast(e.message); shareBtn.disabled = false; shareBtn.textContent = 'Share'; }
  };
  drawSeg(); draw();
  return pageWrap(topbar('New ' + 'post', { back: true }), h('main', { class: 'view create' }, seg, area));
}, { tab: 'create' });

// ------------------------------------------------------------------ profile
addRoute(/^#\/u\/([a-z0-9._]+)$/, async (username) => {
  let d; try { d = await GET('/api/users/' + encodeURIComponent(username)); } catch (e) { return pageWrap(topbar(username, { back: true }), h('main', { class: 'view' }, h('div', { class: 'empty' }, e.message))); }
  const u = d.user;
  const followersEl = h('b', null, fmt(u.followers));
  const right = u.isMe ? [h('a', { class: 'icon-btn', href: '#/create', html: ICONS.plus, 'aria-label': 'New post' }), h('button', { class: 'icon-btn', html: ICONS.menu, 'aria-label': 'Menu', onclick: settingsMenu })] : [h('button', { class: 'icon-btn', html: ICONS.dots, onclick: () => copy(location.origin + '/#/u/' + u.username) })];
  let btns;
  if (u.isMe) btns = h('div', { class: 'pbtns' }, h('a', { class: 'gbtn', href: '#/edit' }, 'Edit profile'), h('button', { class: 'gbtn', onclick: () => copy(location.origin + '/#/u/' + u.username) }, 'Share profile'));
  else { const fb = followBtn(u); fb.className = fb.className.replace(' sm', ''); fb.onchange2 = (r) => { followersEl.textContent = fmt(r.followers); fb.className = fb.className.replace(' sm', ''); }; btns = h('div', { class: 'pbtns' }, fb, h('a', { class: 'gbtn', href: '#/dm/' + u.username }, 'Message')); }
  const content = h('div');
  let tab = 'posts';
  const tabsEl = h('div', { class: 'ptabs glass' });
  async function drawTab() {
    tabsEl.replaceChildren(...[h('button', { class: tab === 'posts' ? 'on' : '', html: ICONS.grid, onclick: () => { tab = 'posts'; drawTab(); }, 'aria-label': 'Posts' }),
      u.isMe ? h('button', { class: tab === 'saved' ? 'on' : '', html: ICONS.save, onclick: () => { tab = 'saved'; drawTab(); }, 'aria-label': 'Saved' }) : null].filter(Boolean));
    if (tab === 'posts') content.replaceChildren(d.posts.length ? h('div', { class: 'grid' }, ...d.posts.map(gridItem)) : h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.cam }), u.isMe ? 'Share your first photo' : 'No posts yet'));
    else { content.replaceChildren(spinner()); try { const s = await GET('/api/saved?limit=30'); content.replaceChildren(s.posts.length ? h('div', { class: 'grid' }, ...s.posts.map(gridItem)) : h('div', { class: 'empty' }, 'Save posts with the bookmark button. Only you can see them.')); } catch (e) { toast(e.message); } }
  }
  drawTab();
  return pageWrap(topbar(h('h1', null, unameEl(u)), { back: !u.isMe, right }),
    h('main', { class: 'view' },
      h('section', { class: 'profile glass' },
        h('div', { class: 'prow' }, ringed(u, 88, () => u.hasStory ? openStories([u.username]) : (u.isMe ? createStory() : null)),
          h('div', { class: 'stats' }, h('div', null, h('b', null, fmt(u.posts)), h('span', null, 'posts')),
            h('a', { href: '#/u/' + u.username + '/followers' }, followersEl, h('span', null, 'followers')),
            h('a', { href: '#/u/' + u.username + '/following' }, h('b', null, fmt(u.following)), h('span', null, 'following')))),
        h('div', { class: 'pname' }, u.name), u.bio ? h('div', { class: 'bio' }, u.bio) : null,
        u.followsYou && !u.isMe ? h('small', { style: 'color:var(--muted)' }, 'Follows you') : null, btns),
      tabsEl, content));
}, { tab: 'profile' });
addRoute(/^#\/u\/([a-z0-9._]+)\/(followers|following)$/, async (username, list) => {
  const box = h('div', { class: 'list glass' }, spinner());
  GET('/api/users/' + username + '/' + list).then(d => box.replaceChildren(...(d.users.length ? d.users.map(userRow) : [h('div', { class: 'empty' }, 'Nobody here yet')]))).catch(e => toast(e.message));
  return pageWrap(topbar(list === 'followers' ? 'Followers' : 'Following', { back: true }), h('main', { class: 'view' }, box));
}, { tab: 'profile' });
function settingsMenu() {
  const light = document.documentElement.classList.contains('light');
  const s = sheet(null, h('div', null,
    h('button', { class: 'menu-btn', onclick: () => { document.documentElement.classList.toggle('light'); localStorage.setItem('ig_theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); s.close(); } }, light ? '🌙  Dark mode' : '☀️  Light mode'),
    h('button', { class: 'menu-btn', onclick: () => { s.close(); go('#/edit'); } }, '✏️  Edit profile'),
    h('button', { class: 'menu-btn', onclick: () => { s.close(); go('#/notifications'); } }, '❤️  Notifications'),
    h('button', { class: 'menu-btn', onclick: () => { s.close(); go('#/about'); } }, 'ℹ️  About InstaGlass'),
    h('button', { class: 'menu-btn danger', onclick: async () => { s.close(); await POST('/api/logout').catch(() => {}); state.me = null; state.es && state.es.close(); go('#/login'); } }, '↪️  Log out')));
}
addRoute(/^#\/edit$/, async () => {
  const me = state.me;
  let av = null;
  const img = avatar(me); img.style.cssText = 'width:96px;height:96px;margin:0 auto 8px';
  const name = h('input', { class: 'field', value: me.name || '', placeholder: 'Name', maxlength: 40 });
  const bio = h('textarea', { class: 'field', placeholder: 'Bio', maxlength: 150 }, me.bio || '');
  const btn = h('button', { class: 'gbtn primary block' }, 'Save');
  btn.onclick = async () => {
    btn.disabled = true;
    try { const d = await PUT('/api/me', { name: name.value, bio: bio.value, avatar: av || undefined }); state.me = Object.assign(state.me, d.user); toast('Profile updated'); go('#/u/' + me.username); }
    catch (e) { toast(e.message); btn.disabled = false; }
  };
  return pageWrap(topbar('Edit profile', { back: true }), h('main', { class: 'view' }, h('div', { class: 'glass', style: 'padding:20px;text-align:center' },
    img, h('button', { class: 'gbtn sm', onclick: async () => { const f = await pickFile('image/*'); if (!f) return; try { const m = await prepareMedia(f, 480); av = m.data; img.src = m.url; } catch (e) { toast(e.message); } } }, 'Change photo'),
    h('div', { style: 'text-align:left;margin-top:16px' }, h('small', { style: 'color:var(--muted)' }, 'Name'), name, h('small', { style: 'color:var(--muted)' }, 'Bio'), bio), btn)));
}, { tab: 'profile' });

// ------------------------------------------------------------------ notifications
addRoute(/^#\/notifications$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  GET('/api/notifications').then(d => {
    state.unreadNotif = 0; updateBadges(); POST('/api/notifications/read').catch(() => {});
    const txt = { like: 'liked your post.', comment: 'commented: ', follow: 'started following you.' };
    box.replaceChildren(...(d.notifications.length ? d.notifications.map(n => h('div', { class: 'row notif' + (n.read ? '' : ' unread') },
      h('a', { href: '#/u/' + n.user.username }, avatar(n.user)),
      h('div', { class: 'meta' }, h('a', { href: '#/u/' + n.user.username }, h('b', { style: 'display:inline' }, n.user.username)), ' ', txt[n.type] || '', n.type === 'comment' ? n.text : '', ' ', h('small', null, ago(n.created))),
      n.post ? h('a', { href: '#/p/' + n.post.id }, n.post.type === 'video' ? h('video', { class: 'thumb', src: n.post.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { class: 'thumb', src: n.post.media, alt: '' })) : n.type === 'follow' ? followBtn(n.user) : null))
      : [h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.heart }), 'Activity on your posts will show here')]));
  }).catch(e => toast(e.message));
  return pageWrap(topbar('Notifications', { back: true }), h('main', { class: 'view' }, box));
}, { tab: '' });

// ------------------------------------------------------------------ inbox + chat
addRoute(/^#\/inbox$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  const newBtn = h('button', { class: 'icon-btn', html: ICONS.edit, 'aria-label': 'New message', onclick: newMessage });
  GET('/api/inbox').then(d => {
    state.unreadDm = d.conversations.reduce((a, c) => a + c.unread, 0); updateBadges();
    box.replaceChildren(...(d.conversations.length ? d.conversations.map(c => {
      const l = c.last; const prev = (l.mine ? 'You: ' : '') + (l.kind === 'text' ? l.text : l.kind === 'image' ? 'sent a photo' : 'shared a post');
      return h('a', { class: 'row' + (c.unread ? ' unread' : ''), href: '#/dm/' + c.user.username }, ringed(c.user, 52),
        h('div', { class: 'meta' }, h('b', null, c.user.name || c.user.username), h('small', null, prev.slice(0, 60) + ' · ' + ago(l.created))), c.unread ? h('i', { class: 'udot' }) : null);
    }) : [h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.msg }), 'No messages yet', h('br'), h('button', { class: 'gbtn primary sm', style: 'margin-top:12px', onclick: newMessage }, 'Send message'))]));
  }).catch(e => toast(e.message));
  return pageWrap(topbar(state.me.username, { back: true, right: [newBtn] }), h('main', { class: 'view' }, h('div', { class: 'section-t' }, 'Messages'), box));
}, { tab: '' });
async function newMessage() {
  const input = h('input', { class: 'field', placeholder: 'Search…', autocapitalize: 'none' });
  const list = h('div');
  const s = sheet('New message', h('div', { class: 'scroll' }, input, list));
  async function q() { try { const d = await GET('/api/search?q=' + encodeURIComponent(input.value.trim())); list.replaceChildren(...d.users.map(u => h('a', { class: 'row', href: '#/dm/' + u.username, onclick: () => s.close() }, avatar(u), h('div', { class: 'meta' }, h('b', null, u.username), h('small', null, u.name))))); } catch (e) {} }
  input.oninput = q; q();
}
addRoute(/^#\/dm\/([a-z0-9._]+)$/, async (username) => {
  let d; try { d = await GET('/api/dm/' + encodeURIComponent(username)); } catch (e) { toast(e.message); return pageWrap(topbar('Chat', { back: true }), h('main', { class: 'view' }, h('div', { class: 'empty' }, e.message))); }
  const u = d.user;
  const chat = h('div', { class: 'chat' });
  const status = h('small', null, u.online ? 'Active now' : '@' + u.username);
  const typingEl = h('div', { class: 'msg them typing', hidden: true }, h('i'), h('i'), h('i'));
  const seenEl = h('div', { class: 'seen-l', hidden: true }, 'Seen');
  let lastT = 0;
  function bubble(m) {
    const cls = 'msg ' + (m.mine ? 'me' : 'them');
    let el;
    if (m.kind === 'image') el = h('div', { class: cls + ' media' }, h('img', { src: m.media, alt: 'photo', onclick: () => window.open(m.media, '_blank') }), m.text ? h('div', { class: 't' }, m.text) : null);
    else if (m.kind === 'post') {
      el = h('div', { class: cls + ' media' }, m.post ? h('a', { class: 'shared', href: '#/p/' + m.post.id }, h('div', { class: 'sh-h' }, avatar(m.post.user), m.post.user.username),
        m.post.type === 'video' ? h('video', { src: m.post.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { src: m.post.media, alt: '' }), m.post.caption ? h('p', null, m.post.caption) : null) : h('div', { class: 't' }, 'Post unavailable'),
        m.text ? h('div', { class: 't' }, m.text) : null);
    } else el = h('div', { class: cls }, m.text);
    el.dataset.id = m.id;
    if (m.mine) {
      let pt; const start = () => { pt = setTimeout(async () => { vib(30); if (confirm('Unsend this message?')) { try { await DEL('/api/messages/' + m.id); el.remove(); } catch (e) { toast(e.message); } } }, 550); };
      el.addEventListener('pointerdown', start); el.addEventListener('pointerup', () => clearTimeout(pt)); el.addEventListener('pointerleave', () => clearTimeout(pt));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    return el;
  }
  function addMsg(m, animate) {
    if (chat.querySelector('[data-id="' + m.id + '"]')) return;
    if (m.created - lastT > 15 * 60 * 1000) chat.insertBefore(h('div', { class: 'msg-time' }, new Date(m.created).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })), typingEl);
    lastT = m.created;
    const b = bubble(m); if (!animate) b.style.animation = 'none';
    chat.insertBefore(b, typingEl);
    seenEl.hidden = true;
    if (m.mine) { chat.insertBefore(seenEl, typingEl); seenEl.hidden = !m.seen; seenEl.textContent = m.seen ? 'Seen' : 'Sent'; seenEl.hidden = false; }
  }
  chat.append(typingEl);
  d.messages.forEach(m => addMsg(m, false));
  if (!d.messages.length) chat.prepend(h('div', { class: 'empty' }, avatar(u, ''), h('div', { style: 'margin-top:10px;font-weight:700;color:var(--text)' }, u.name), '@' + u.username, h('br'), h('a', { class: 'gbtn sm', style: 'margin-top:10px', href: '#/u/' + u.username }, 'View profile')));
  const scrollDown = () => requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  let typingT;
  state.chatWith = u.username;
  state.chatHandler = (ev) => {
    if (ev.type === 'dm') { typingEl.hidden = true; ev.message.mine = false; addMsg(ev.message, true); scrollDown(); POST('/api/dm/' + u.username + '/seen').catch(() => {}); status.textContent = 'Active now'; }
    else if (ev.type === 'dm_echo') { addMsg(ev.message, true); scrollDown(); }
    else if (ev.type === 'typing') { typingEl.hidden = false; status.textContent = 'typing…'; clearTimeout(typingT); typingT = setTimeout(() => { typingEl.hidden = true; status.textContent = 'Active now'; }, 3500); scrollDown(); }
    else if (ev.type === 'seen') { seenEl.textContent = 'Seen'; seenEl.hidden = false; }
    else if (ev.type === 'unsend') { const el = chat.querySelector('[data-id="' + ev.id + '"]'); if (el) el.remove(); }
  };
  // safety net if the realtime stream is blocked by a network: light polling while the chat is open
  const poll = setInterval(async () => {
    if (!state.es || state.es.readyState !== 1) {
      try { const r = await GET('/api/dm/' + encodeURIComponent(u.username)); r.messages.forEach(m => addMsg(m, true)); const lm = r.messages.filter(m => m.mine).pop(); if (lm && lm.seen) { seenEl.textContent = 'Seen'; } } catch (e) {}
    }
  }, 4000);
  state.cleanup = () => clearInterval(poll);
  const input = h('input', { placeholder: 'Message…', maxlength: 2000, enterkeyhint: 'send' });
  let lastTyping = 0;
  input.oninput = () => { if (Date.now() - lastTyping > 2000) { lastTyping = Date.now(); POST('/api/dm/' + u.username + '/typing').catch(() => {}); } };
  const sendText = async (e) => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return; input.value = '';
    try { const r = await POST('/api/dm/' + u.username, { text }); addMsg(r.message, true); scrollDown(); } catch (x) { toast(x.message); input.value = text; }
  };
  const bar = h('form', { class: 'chat-bar glass', onsubmit: sendText },
    h('button', { type: 'button', class: 'cam', html: ICONS.cam, 'aria-label': 'Send photo', onclick: async () => {
      const f = await pickFile('image/*'); if (!f) return;
      try { toast('Sending photo…'); const m = await prepareMedia(f, 1280); if (m.kind !== 'image') throw new Error('Only photos in chat'); const r = await POST('/api/dm/' + u.username, { media: m.data }); addMsg(r.message, true); scrollDown(); } catch (x) { toast(x.message); }
    } }), input, h('button', { class: 'send', type: 'submit' }, 'Send'));
  const head = h('a', { class: 'chat-head', href: '#/u/' + u.username, style: 'flex:1;min-width:0' }, ringed(u, 34), h('div', { style: 'min-width:0' }, h('b', null, u.name || u.username), status));
  const page = pageWrap(topbar(head, { back: true }), h('main', null, chat), bar);
  state.unreadDm = 0; refreshMe();
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  return page;
}, { noTabs: true, keepScroll: true });

// ------------------------------------------------------------------ about
addRoute(/^#\/about$/, async () => pageWrap(topbar('About', { back: true }), h('main', { class: 'view' }, h('div', { class: 'about glass' },
  h('h2', { class: 'logo', style: 'justify-content:flex-start' }, h('img', { src: '/icon.svg', alt: '' }), 'InstaGlass'),
  h('p', null, 'A liquid glass photo-sharing app: posts, stories that vanish after 24 hours, reels, likes, comments, saves, notifications and real-time direct messages.'),
  h('p', null, h('b', { style: 'color:var(--text)' }, 'Educational project by Tech Bro Z'), ' — built for learning. Not affiliated with, endorsed by, or connected to Instagram or Meta. All names, logos and designs here are original.'),
  h('p', null, 'YouTube: @techbrozdeveloper · Instagram: @tech_bro_z_1'),
  h('p', null, 'Source code: github.com/nm621532-byte/instagram-clone-techbroz'),
  h('p', null, 'Demo photos: Lorem Picsum / Unsplash (free to use).'),
  state.me ? null : h('a', { class: 'gbtn primary', href: '#/login' }, 'Log in')))), { noTabs: false, tab: '' });

render();
})();
