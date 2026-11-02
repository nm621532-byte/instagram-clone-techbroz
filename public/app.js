/* Private Insta (InstaGlass) client — vanilla JS single-page app. Educational project by Tech Bro Z (not affiliated with Instagram/Meta). */
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
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
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
  const cls = u.hasStory ? (u.storySeen ? 'ring seen' : (u.closeStory ? 'ring close' : 'ring')) : 'ring none';
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
  // only the server's auth gate means "logged out"; other 401s (wrong current password, admin re-check) are normal errors
  if (r.status === 401 && data.error === 'Please log in' && !url.startsWith('/api/login') && !url.startsWith('/api/signup')) { state.me = null; go('#/login'); }
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
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
function applyTheme(t) {
  t = t || localStorage.getItem('ig_theme') || 'auto'; localStorage.setItem('ig_theme', t);
  const light = t === 'light' || (t === 'auto' && mq && mq.matches);
  document.documentElement.classList.toggle('light', !!light);
}
function applyAccent(c) { if (c) document.documentElement.style.setProperty('--accent', c); else document.documentElement.style.removeProperty('--accent'); }
applyTheme(); if (mq && mq.addEventListener) mq.addEventListener('change', () => applyTheme());
async function refreshMe() {
  try { const d = await GET('/api/me'); state.me = d.user; state.unreadDm = d.unreadDm; state.unreadNotif = d.unreadNotif; state.msgRequests = d.msgRequests || 0; state.followRequests = d.followRequests || 0; state.version = d.version; applyTheme(d.user.settings && d.user.settings.theme); applyAccent(d.user.accent); updateBadges(); return true; }
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
      else if (ev.request) { state.msgRequests = (state.msgRequests || 0) + 1; if (!ev.quiet) toast('📩 New message request from ' + ev.from); if (/^#\/inbox/.test(location.hash)) render(); }
      else { state.unreadDm++; updateBadges(); if (!ev.quiet) { toast('💬 ' + ev.from + ': ' + (ev.message.kind === 'text' ? ev.message.text.slice(0, 60) : ev.message.kind === 'image' ? 'sent a photo' : 'shared a post')); vib(20); } if (location.hash === '#/inbox') render(); }
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
      state.me = d.user; await refreshMe(); connectStream(); if (d.reactivated) toast('Welcome back! Your account is active again'); go('#/');
    } catch (x) { err.textContent = x.message; } finally { btn.disabled = false; }
  }
  const form = h('form', { onsubmit: submit }, u, mode === 'signup' ? n : null, p, err, btn);
  return h('div', { class: 'auth' },
    h('div', { class: 'card glass' },
      h('h1', { class: 'logo' }, h('img', { src: '/icon.svg', alt: '' }), 'Private Insta'),
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

// ------------------------------------------------------------------ v1.2 paginated people lists (followers / following / liked by)
function pagedList(url, box, emptyMsg, onTotal) {
  let next = 0, busy = false;
  const more = h('div', { class: 'more-row' });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) load(); }) : null;
  async function load() {
    if (busy || next == null) return; busy = true;
    if (next === 0) box.replaceChildren(spinner()); else more.replaceChildren(spinner());
    try {
      const d = await GET(url + (url.includes('?') ? '&' : '?') + 'offset=' + next + '&limit=40');
      if (next === 0) { box.replaceChildren(); if (onTotal) onTotal(d.total != null ? d.total : d.users.length); }
      if (next === 0 && !d.users.length) { box.append(h('div', { class: 'empty' }, emptyMsg)); next = null; return; }
      more.remove(); box.append(...d.users.map(userRow));
      next = d.next == null ? null : d.next;
      if (next != null) { more.replaceChildren(h('button', { class: 'gbtn sm', onclick: load }, 'Load more')); box.append(more); if (io) { io.disconnect(); io.observe(more); } }
      else if (io) io.disconnect();
    } catch (e) { if (next === 0) box.replaceChildren(h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.lock }), e.message)); else { more.replaceChildren(h('button', { class: 'gbtn sm', onclick: load }, 'Retry')); toast(e.message); } }
    finally { busy = false; }
  }
  load();
}
function openLikes(p) {
  const list = h('div', { class: 'scroll list' });
  sheet('Likes', list);
  pagedList('/api/posts/' + p.id + '/likes', list, 'No likes yet');
}

// ------------------------------------------------------------------ post card
function postCard(p, opts) {
  opts = opts || {};
  const likeBtn = h('button', { class: 'icon-btn' + (p.liked ? ' liked' : ''), 'aria-label': 'Like', html: p.liked ? ICONS.heartF : ICONS.heart });
  const saveBtn = h('button', { class: 'icon-btn', 'aria-label': 'Save', html: p.saved ? ICONS.saveF : ICONS.save });
  const likeTxt = () => {
    if (p.likes == null) return [p.liked ? 'Liked by you and others' : 'Liked by others'];
    const others = (n) => n.toLocaleString('en-IN') + (n === 1 ? ' other' : ' others');
    if (p.liked && p.likes > 1) return ['Liked by ', h('b', null, 'you'), ' and ', h('b', null, others(p.likes - 1))];
    if (!p.liked && p.likedBy && p.likes > 1) return ['Liked by ', h('b', null, p.likedBy), ' and ', h('b', null, others(p.likes - 1))];
    return [fmt(p.likes) + (p.likes === 1 ? ' like' : ' likes')];
  };
  const likesEl = h('div', { class: 'likes tap', onclick: () => { if (p.likes) openLikes(p); } });
  const paintLikes = () => likesEl.replaceChildren(...likeTxt()); paintLikes();
  async function setLike(v) {
    if (p.liked === v) return; p.liked = v; if (p.likes != null) p.likes += v ? 1 : -1;
    likeBtn.className = 'icon-btn' + (v ? ' liked' : ''); likeBtn.innerHTML = v ? ICONS.heartF : ICONS.heart;
    paintLikes();
    try { const d = v ? await POST('/api/posts/' + p.id + '/like') : await DEL('/api/posts/' + p.id + '/like'); p.likes = d.likes; paintLikes(); }
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
    h('div', { class: 'post-body' }, likesEl, p.views ? h('div', { class: 'views' }, h('span', { style: 'display:inline-flex;width:15px', html: ICONS.eye }), ' ' + fmt(p.views) + (p.views === 1 ? ' view' : ' views')) : null, capEl, ...previewEls,
      p.comments > (p.preview || []).length ? h('button', { class: 'more-c', onclick: () => openComments(p, card) }, 'View all ' + p.comments + ' comments') : null,
      h('div', { class: 'time' }, ago(p.created) + ' ago')));
  watchView(p, card);
  return card;
}
const viewedPosts = new Set();
const viewIO = window.IntersectionObserver ? new IntersectionObserver((ents) => ents.forEach(en => {
  if (!en.isIntersecting || en.intersectionRatio < 0.6) return; const pid = en.target.dataset.pid; viewIO.unobserve(en.target);
  if (!pid || viewedPosts.has(pid)) return; viewedPosts.add(pid); POST('/api/posts/' + pid + '/view').catch(() => {});
}), { threshold: [0.6] }) : null;
function watchView(p, el) { if (viewIO && !p.mine) { el.dataset.pid = p.id; viewIO.observe(el); } }
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
      h('button', { class: 'menu-btn', onclick: async () => {
        s.close();
        try { const d = await PUT('/api/posts/' + p.id, { commentsOff: !p.commentsOff }); Object.assign(p, d.post); card.replaceWith(postCard(p)); toast(p.commentsOff ? 'Commenting turned off' : 'Commenting turned on'); } catch (e) { toast(e.message); }
      } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.comment }), p.commentsOff ? 'Turn on commenting' : 'Turn off commenting'),
      h('button', { class: 'menu-btn', onclick: async () => {
        s.close();
        try { const d = await PUT('/api/posts/' + p.id, { hideLikes: !p.likesHidden }); Object.assign(p, d.post); card.replaceWith(postCard(p)); toast(p.likesHidden ? 'Like count hidden from others' : 'Like count visible'); } catch (e) { toast(e.message); }
      } }, h('span', { style: 'width:22px;display:inline-flex', html: ICONS.heart }), p.likesHidden ? 'Show like count' : 'Hide like count'),
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
  const note = h('div', { class: 'cnote', hidden: true });
  const s = sheet('Comments', list, note, h('form', { class: 'composer', onsubmit: async (e) => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return; sendB.disabled = true;
    try { const d = await POST('/api/posts/' + p.id + '/comments', { text }); input.value = ''; p.comments++; list.querySelector('.empty') && list.replaceChildren(); list.append(cmtRow(d.comment)); list.scrollTop = 1e9; if (card) { const pc = postCard(p); card.replaceWith(pc); card = pc; } }
    catch (x) { toast(x.message); } finally { sendB.disabled = false; }
  } }, avatar(state.me), input, sendB));
  function cmtRow(c) {
    const row = h('div', { class: 'cmt' }, h('a', { href: '#/u/' + c.user.username }, avatar(c.user)),
      h('div', { class: 'meta' }, h('a', { href: '#/u/' + c.user.username }, h('b', null, c.user.username)), ' ', c.text, c.hidden ? h('span', { class: 'tag' }, 'Hidden') : null,
        h('div', null, h('small', null, ago(c.created)), c.canDelete ? h('button', { class: 'del', onclick: async () => {
          try { await DEL('/api/comments/' + c.id); row.remove(); p.comments--; } catch (e) { toast(e.message); }
        } }, 'Delete') : null)));
    return row;
  }
  try {
    const d = await GET('/api/posts/' + p.id + '/comments');
    list.replaceChildren(...(d.comments.length ? d.comments.map(cmtRow) : [h('div', { class: 'empty' }, d.canComment ? 'No comments yet.' : 'No comments.', d.canComment ? h('br') : null, d.canComment ? 'Start the conversation.' : null)]));
    if (!d.canComment) { note.textContent = d.note || 'Comments are turned off'; note.hidden = false; s.sh.querySelector('.composer').hidden = true; }
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
      navigator.share ? h('button', { onclick: () => navigator.share({ title: 'Private Insta post', text: p.caption.slice(0, 80), url: link }).catch(() => {}) }, h('span', { class: 'circ glass', html: ICONS.share }), 'Share to…') : null));
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
    h('span', { class: u.storySeen ? 'ring seen' : (u.closeStory ? 'ring close' : 'ring'), style: 'position:relative' }, avatar(u), u.isMe ? h('span', { class: 'plus', onclick: (e) => { e.stopPropagation(); createStory(); } }, '+') : null),
    h('span', null, u.isMe ? 'Your story' : u.username))));
  if (!d.tray.filter(u => !u.isMe).length) row.append(h('div', { class: 'story-empty' }, 'No stories yet', h('small', null, 'Stories from people you follow show up here')));
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
    const cfBadge = h('span', { class: 'cf-badge', hidden: true }, h('span', { style: 'display:inline-flex;width:12px', html: ICONS.star }), 'Close Friends');
    const top = h('div', { class: 'sv-top' }, bars, h('div', { class: 'sv-user' }, avatar(d.user), h('a', { href: '#/u/' + d.user.username, onclick: close }, h('b', null, d.user.username)), timeEl, cfBadge, h('span', { class: 'sp' }),
      isMe ? h('button', { class: 'icon-btn', style: 'color:#fff', html: ICONS.trash, 'aria-label': 'Delete story', onclick: async (e) => { e.stopPropagation(); if (!confirm('Delete this story?')) return; try { await DEL('/api/stories/' + d.stories[i].id); toast('Story deleted'); close(); } catch (x) { toast(x.message); } } }) : null,
      h('button', { class: 'icon-btn', style: 'color:#fff', html: ICONS.close, onclick: close, 'aria-label': 'Close' })));
    const reply = h('input', { placeholder: 'Reply to ' + d.user.username + '…', maxlength: 500 });
    reply.onfocus = () => paused = true; reply.onblur = () => paused = false;
    const bottom = isMe ? h('div', { class: 'sv-bottom' }, h('button', { class: 'viewers', onclick: () => {
      const v = d.stories[i].viewers || []; paused = true;
      const s = sheet('Seen by ' + (d.stories[i].views != null ? d.stories[i].views : v.length), h('div', { class: 'scroll' }, ...(v.length ? v.map(u => h('a', { class: 'row', href: '#/u/' + u.username }, avatar(u), h('div', { class: 'meta' }, h('b', null, u.username)))) : [h('div', { class: 'empty' }, 'No views yet')])));
      s.ov.style.zIndex = 70; s.ov.addEventListener('click', () => setTimeout(() => { if (!document.body.contains(s.ov)) paused = false; }, 300));
    } }, h('span', { style: 'display:inline-flex', html: ICONS.eye }), 'Activity'))
      : !d.canReply ? h('div', { class: 'sv-bottom' }, h('small', { style: 'color:#fff;opacity:.75;margin:auto' }, 'Replies are turned off'))
      : h('form', { class: 'sv-bottom', onsubmit: async (e) => {
          e.preventDefault(); const t = reply.value.trim(); if (!t) return;
          try { await POST('/api/stories/' + d.stories[i].id + '/reply', { text: t }); reply.value = ''; reply.blur(); toast('Reply sent'); } catch (x) { toast(x.message); }
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
      timeEl.textContent = ago(s.created); cfBadge.hidden = !s.close;
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
  const page = pageWrap(topbar(h('h1', { class: 'logo' }, h('img', { src: '/icon.svg', alt: '' }), 'Private Insta'), { right }), h('main', { class: 'view' }, h('div', { class: 'stories-slot' }), feed));
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
  const b = h('button');
  const paint = () => { b.textContent = u.isFollowing ? 'Following' : u.requested ? 'Requested' : (u.followsYou ? 'Follow back' : 'Follow'); b.className = 'gbtn sm' + (u.isFollowing || u.requested ? '' : ' primary') + (big ? ' block' : ''); };
  paint();
  b.onclick = async (e) => {
    e.preventDefault();
    if (u.isFollowing && u.isPrivate && !confirm('Unfollow ' + u.username + '? This account is private — you will have to request again to see their posts.')) return;
    b.disabled = true;
    try {
      const d = (u.isFollowing || u.requested) ? await DEL('/api/users/' + u.username + '/follow') : await POST('/api/users/' + u.username + '/follow');
      u.isFollowing = d.following; u.requested = !!d.requested; paint(); vib();
      if (d.requested) toast('Follow request sent');
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
    const likeN = h('span', null, p.likes == null ? '' : fmt(p.likes));
    const reel = h('section', { class: 'reel' }, v,
      h('button', { class: 'mute', html: ICONS.mute, onclick: (e) => { muted = !muted; vids.forEach(x => x.muted = muted); document.querySelectorAll('.mute').forEach(m => m.innerHTML = muted ? ICONS.mute : ICONS.vol); } }),
      h('div', { class: 'side' },
        h('button', { onclick: async () => { p.liked = !p.liked; if (p.likes != null) p.likes += p.liked ? 1 : -1; likeIco.innerHTML = p.liked ? ICONS.heartF : ICONS.heart; likeIco.style.color = p.liked ? 'var(--heart)' : ''; likeN.textContent = p.likes == null ? '' : fmt(p.likes); vib(); try { p.liked ? await POST('/api/posts/' + p.id + '/like') : await DEL('/api/posts/' + p.id + '/like'); } catch (e) { toast(e.message); } } }, likeIco, likeN),
        h('button', { onclick: () => openComments(p) }, h('span', { class: 'gl', html: ICONS.comment }), h('span', null, fmt(p.comments))),
        h('button', { onclick: () => openShare(p) }, h('span', { class: 'gl', html: ICONS.send }), h('span', null, 'Share'))),
      h('div', { class: 'info' }, h('a', { class: 'who', href: '#/u/' + p.user.username }, avatar(p.user), unameEl(p.user)), h('div', { class: 'cap' }, p.caption), p.views ? h('small', { style: 'opacity:.85' }, '▶ ' + fmt(p.views) + ' views') : null));
    let lt = 0; v.addEventListener('click', () => { const t = Date.now(); if (t - lt < 320 && !p.liked) { reel.querySelector('.side button').click(); const b = h('div', { class: 'burst', html: ICONS.heartF }); reel.append(b); setTimeout(() => b.remove(), 950); } else if (v.paused) v.play(); else if (t - lt > 320) setTimeout(() => { if (Date.now() - t > 300 && lt === t) v.paused ? v.play() : v.pause(); }, 330); lt = t; });
    if (!p.mine) reel.dataset.pid = p.id;
    wrap.append(reel);
  });
  const io = new IntersectionObserver((ents) => ents.forEach(en => { const v = en.target.querySelector('video'); if (en.isIntersecting && en.intersectionRatio > 0.6) { v.play().catch(() => {}); const pid = en.target.dataset.pid; if (pid && !viewedPosts.has(pid)) { viewedPosts.add(pid); POST('/api/posts/' + pid + '/view').catch(() => {}); } } else v.pause(); }), { root: wrap, threshold: [0, 0.6, 1] });
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
  const opt = { commentsOff: false, hideLikes: false, closeFriends: false };
  const optRow = (k, label, sub) => toggleRow(label, sub, opt[k], (v) => { opt[k] = v; });
  function drawSeg() { seg.replaceChildren(...[['post', 'Post'], ['story', 'Story']].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; drawSeg(); draw(); } }, l))); }
  function draw() {
    if (!media) area.replaceChildren(h('button', { class: 'pick glass', style: 'width:100%', onclick: choose }, h('span', { style: 'display:contents', html: ICONS.image }), h('b', null, 'Tap to choose a photo or video'), h('small', null, 'JPG, PNG, WebP up to 8 MB · MP4/WebM up to 15 MB')));
    else area.replaceChildren(h('div', { class: 'preview glass' }, media.kind === 'video' ? h('video', { src: media.url, controls: true, playsinline: true, autoplay: true, muted: true }) : h('img', { src: media.url, alt: '' })),
      h('button', { class: 'gbtn sm', onclick: choose, style: 'margin-bottom:12px' }, 'Change'), mode === 'post' ? caption : null,
      h('div', { class: 'list glass slist', style: 'margin-bottom:12px' }, ...(mode === 'post'
        ? [optRow('hideLikes', 'Hide like count', 'Only you will see the total number of likes'), optRow('commentsOff', 'Turn off commenting', 'You can change this later from the ••• menu')]
        : [optRow('closeFriends', 'Close Friends only', 'Green ring — only people on your Close Friends list see it')])), shareBtn);
  }
  async function choose() {
    const f = await pickFile('image/*,video/mp4,video/webm,video/quicktime'); if (!f) return;
    try { media = await prepareMedia(f, 1440); draw(); } catch (e) { toast(e.message); }
  }
  shareBtn.onclick = async () => {
    if (!media) return; shareBtn.disabled = true; shareBtn.textContent = 'Sharing…';
    try {
      if (mode === 'post') { const d = await POST('/api/posts', { media: media.data, caption: caption.value, commentsOff: opt.commentsOff, hideLikes: opt.hideLikes }); toast(d.mentionBlocked && d.mentionBlocked.length ? ('Posted ✨ (' + d.mentionBlocked.join(', ') + " doesn't allow mentions)") : 'Posted ✨'); go('#/p/' + d.post.id); }
      else { await POST('/api/stories', { media: media.data, closeFriends: opt.closeFriends }); toast(opt.closeFriends ? 'Shared with Close Friends 💚' : 'Added to your story ✨'); go('#/'); }
    } catch (e) { toast(e.message); shareBtn.disabled = false; shareBtn.textContent = 'Share'; }
  };
  drawSeg(); draw();
  return pageWrap(topbar('New ' + 'post', { back: true }), h('main', { class: 'view create' }, seg, area));
}, { tab: 'create' });

// ------------------------------------------------------------------ profile
addRoute(/^#\/u\/([a-z0-9._]+)$/, async (username) => {
  let d; try { d = await GET('/api/users/' + encodeURIComponent(username)); } catch (e) { return pageWrap(topbar(username, { back: true }), h('main', { class: 'view' }, h('div', { class: 'empty' }, e.message === 'User not found' ? "Sorry, this page isn't available." : e.message))); }
  const u = d.user;
  if (u.isMe) { state.me = Object.assign(state.me || {}, { username: u.username, avatar: u.avatar, name: u.name }); }
  const followersEl = h('b', null, fmt(u.followers));
  const right = u.isMe ? [h('a', { class: 'icon-btn', href: '#/create', html: ICONS.plus, 'aria-label': 'New post' }), h('a', { class: 'icon-btn', href: '#/settings', html: ICONS.gear, 'aria-label': 'Settings' })]
    : [h('button', { class: 'icon-btn', html: ICONS.dots, 'aria-label': 'More', onclick: () => profileMenu(u) })];
  let btns;
  if (u.isMe) btns = h('div', { class: 'pbtns' }, h('a', { class: 'gbtn', href: '#/edit' }, 'Edit profile'), h('button', { class: 'gbtn', onclick: () => copy(location.origin + '/#/u/' + u.username) }, 'Share profile'));
  else if (u.blockedByMe) btns = h('div', { class: 'pbtns' }, h('button', { class: 'gbtn primary', onclick: async () => { try { await DEL('/api/users/' + u.username + '/block'); toast('Unblocked ' + u.username); render(); } catch (e) { toast(e.message); } } }, 'Unblock'));
  else { const fb = followBtn(u); fb.className = fb.className.replace(' sm', ''); fb.onchange2 = (r) => { followersEl.textContent = fmt(r.followers); fb.className = fb.className.replace(' sm', ''); if (r.following && u.locked) render(); }; btns = h('div', { class: 'pbtns' }, fb, h('a', { class: 'gbtn', href: '#/dm/' + u.username }, 'Message')); }
  const content = h('div');
  let tab = 'posts';
  const tabsEl = h('div', { class: 'ptabs glass' });
  async function drawTab() {
    tabsEl.replaceChildren(...[h('button', { class: tab === 'posts' ? 'on' : '', html: ICONS.grid, onclick: () => { tab = 'posts'; drawTab(); }, 'aria-label': 'Posts' }),
      u.isMe ? h('button', { class: tab === 'saved' ? 'on' : '', html: ICONS.save, onclick: () => { tab = 'saved'; drawTab(); }, 'aria-label': 'Saved' }) : null].filter(Boolean));
    if (tab === 'posts') content.replaceChildren(d.posts.length ? h('div', { class: 'grid' }, ...d.posts.map(gridItem)) : h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.cam }), u.isMe ? 'Share your first photo' : 'No posts yet'));
    else { content.replaceChildren(spinner()); try { const s = await GET('/api/saved?limit=30'); content.replaceChildren(s.posts.length ? h('div', { class: 'grid' }, ...s.posts.map(gridItem)) : h('div', { class: 'empty' }, 'Save posts with the bookmark button. Only you can see them.')); } catch (e) { toast(e.message); } }
  }
  const lockedCard = h('div', { class: 'locked glass' }, h('span', { class: 'lk', html: ICONS.lock }),
    h('b', null, u.blockedByMe ? 'You blocked this account' : 'This account is private'),
    h('small', null, u.blockedByMe ? 'Unblock to see their posts and follow them.' : (u.requested ? 'Your follow request is waiting for approval.' : 'Follow this account to see their photos, reels and stories.')));
  if (!u.locked) drawTab();
  const statLink = (href, el, label) => u.locked ? h('div', null, el, h('span', null, label)) : h('a', { href }, el, h('span', null, label));
  const sec = h('section', { class: 'profile glass' + (u.accent ? ' accented' : '') },
    h('div', { class: 'prow' }, ringed(u, 88, () => u.hasStory ? openStories([u.username]) : (u.isMe ? createStory() : null)),
      h('div', { class: 'stats' }, h('div', null, h('b', null, fmt(u.posts)), h('span', null, 'posts')),
        statLink('#/u/' + u.username + '/followers', followersEl, 'followers'),
        statLink('#/u/' + u.username + '/following', h('b', null, fmt(u.following)), 'following'))),
    h('div', { class: 'pname' }, u.name, u.pronouns ? h('small', { class: 'pron' }, u.pronouns) : null),
    u.bio ? h('div', { class: 'bio' }, u.bio) : null,
    u.website ? h('a', { class: 'web', href: u.website, target: '_blank', rel: 'noopener nofollow ugc' }, h('span', { style: 'display:inline-flex;width:15px', html: ICONS.link }), u.website.replace(/^https?:\/\//, '').replace(/\/$/, '')) : null,
    u.followsYou && !u.isMe ? h('small', { style: 'color:var(--muted)' }, 'Follows you') : null, btns);
  if (u.accent) sec.style.setProperty('--pacc', u.accent);
  return pageWrap(topbar(h('h1', null, u.isPrivate ? h('span', { class: 'tlock', html: ICONS.lock }) : null, unameEl(u)), { back: !u.isMe, right }),
    h('main', { class: 'view' }, sec, u.locked ? lockedCard : tabsEl, u.locked ? null : content));
}, { tab: 'profile' });
function profileMenu(u) {
  const mb = (label, fn, cls) => h('button', { class: 'menu-btn' + (cls ? ' ' + cls : ''), onclick: async () => { s.close(); try { await fn(); } catch (e) { toast(e.message); } } }, label);
  const items = [
    mb('🔗  Copy profile link', () => copy(location.origin + '/#/u/' + u.username)),
    u.blockedByMe ? null : mb(u.closeFriend ? '💚  Remove from Close Friends' : '💚  Add to Close Friends', async () => { u.closeFriend ? await DEL('/api/close-friends/' + u.username) : await POST('/api/close-friends/' + u.username); toast(u.closeFriend ? 'Removed from Close Friends' : 'Added to Close Friends'); render(); }),
    u.blockedByMe ? null : mb(u.storyHidden ? '👁  Show your story to ' + u.username : '🙈  Hide your story from ' + u.username, async () => { u.storyHidden ? await DEL('/api/story-hide/' + u.username) : await POST('/api/story-hide/' + u.username); toast(u.storyHidden ? 'They can see your story again' : 'Your story is hidden from ' + u.username); render(); }),
    u.blockedByMe ? null : mb(u.muted.posts ? '🔈  Unmute posts' : '🔇  Mute posts', async () => { await PUT('/api/users/' + u.username + '/mute', { posts: !u.muted.posts }); toast(u.muted.posts ? 'Posts unmuted' : 'Their posts won\'t show in your feed'); render(); }),
    u.blockedByMe ? null : mb(u.muted.stories ? '🔈  Unmute story' : '🔇  Mute story', async () => { await PUT('/api/users/' + u.username + '/mute', { stories: !u.muted.stories }); toast(u.muted.stories ? 'Story unmuted' : 'Their stories won\'t show at the top'); render(); }),
    u.followsYou ? mb('➖  Remove follower', async () => { if (!confirm('Remove ' + u.username + ' from your followers? They won\'t be notified.')) return; await DEL('/api/followers/' + u.username); toast('Follower removed'); render(); }) : null,
    u.blockedByMe ? null : mb(u.restricted ? '🛡️  Unrestrict' : '🛡️  Restrict', async () => { u.restricted ? await DEL('/api/users/' + u.username + '/restrict') : await POST('/api/users/' + u.username + '/restrict'); toast(u.restricted ? 'Unrestricted' : 'Restricted: their comments are only visible to them, chats go to requests'); render(); }),
    mb(u.blockedByMe ? '✅  Unblock' : '⛔  Block', async () => {
      if (u.blockedByMe) { await DEL('/api/users/' + u.username + '/block'); toast('Unblocked'); return render(); }
      if (!confirm('Block ' + u.username + '? They won\'t be able to find your profile, posts or story, or message you. They won\'t be notified.')) return;
      await POST('/api/users/' + u.username + '/block'); toast(u.username + ' blocked'); render();
    }, 'danger'),
  ].filter(Boolean);
  const s = sheet(u.username, h('div', null, ...items));
}
addRoute(/^#\/u\/([a-z0-9._]+)\/(followers|following)$/, async (username, list) => {
  const box = h('div', { class: 'list glass' }, spinner());
  const count = h('p', { class: 'sub fine list-count' }, '');
  pagedList('/api/users/' + username + '/' + list, box, 'Nobody here yet', (n) => { count.textContent = n.toLocaleString('en-IN') + ' ' + (list === 'followers' ? (n === 1 ? 'follower' : 'followers') : 'following'); });
  return pageWrap(topbar(list === 'followers' ? 'Followers' : 'Following', { back: true }), h('main', { class: 'view' }, h('div', { class: 'uname-head' }, '@' + username), count, box));
}, { tab: 'profile' });
const ACCENT_CHOICES = ['', '#a78bfa', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f97316'];
addRoute(/^#\/edit$/, async () => {
  await refreshMe();
  const me = state.me;
  let av = null, removeAv = false, accent = me.accent || '';
  const img = avatar(me); img.style.cssText = 'width:96px;height:96px;margin:0 auto 8px';
  const fld = (label, el, hint) => h('label', { class: 'fld' }, h('small', null, label), el, hint ? h('small', { class: 'hint' }, hint) : null);
  const name = h('input', { class: 'field', value: me.name || '', placeholder: 'Name', maxlength: 40 });
  const uname = h('input', { class: 'field', value: me.username, placeholder: 'Username', maxlength: 20, autocapitalize: 'none', spellcheck: 'false' });
  const uhint = h('small', { class: 'hint' }, me.demo ? 'The shared demo account keeps its username.' : '3-20 characters: a-z, 0-9, . and _');
  if (me.demo) uname.disabled = true;
  uname.oninput = () => { uname.value = uname.value.toLowerCase().replace(/[^a-z0-9._]/g, ''); uhint.textContent = /^[a-z0-9._]{3,20}$/.test(uname.value) ? 'Looks good' : '3-20 characters: a-z, 0-9, . and _'; };
  const pron = h('input', { class: 'field', value: me.pronouns || '', placeholder: 'e.g. he/him, she/her', maxlength: 30 });
  const bio = h('textarea', { class: 'field', placeholder: 'Bio', maxlength: 150 }, me.bio || '');
  const web = h('input', { class: 'field', value: me.website || '', placeholder: 'https://yourwebsite.com', maxlength: 120, inputmode: 'url', autocapitalize: 'none' });
  const gender = h('select', { class: 'field' }, ...[['', 'Prefer not to say'], ['female', 'Female'], ['male', 'Male'], ['custom', 'Custom']].map(([v, l]) => h('option', { value: v }, l)));
  const gcustom = h('input', { class: 'field', placeholder: 'Your gender', maxlength: 30, hidden: true });
  if (['', 'female', 'male'].includes(me.gender || '')) gender.value = me.gender || ''; else { gender.value = 'custom'; gcustom.value = me.gender; gcustom.hidden = false; }
  gender.onchange = () => { gcustom.hidden = gender.value !== 'custom'; };
  const sw = h('div', { class: 'swatches' });
  const drawSw = () => sw.replaceChildren(...ACCENT_CHOICES.map(c => h('button', { type: 'button', class: 'sw' + (accent === c ? ' on' : ''), style: c ? 'background:' + c : '', title: c || 'Default', onclick: () => { accent = c; applyAccent(c); drawSw(); } }, c ? '' : 'Auto')));
  drawSw();
  const btn = h('button', { class: 'gbtn primary block' }, 'Save');
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const body = { name: name.value, bio: bio.value, website: web.value, pronouns: pron.value, gender: gender.value === 'custom' ? gcustom.value : gender.value, accent, avatar: av || undefined, removeAvatar: removeAv && !av ? true : undefined };
      if (!me.demo) body.username = uname.value;
      const d = await PUT('/api/me', body); state.me = Object.assign(state.me, d.user); applyAccent(d.user.accent); toast('Profile updated'); go('#/u/' + d.user.username);
    } catch (e) { toast(e.message); btn.disabled = false; }
  };
  return pageWrap(topbar('Edit profile', { back: true }), h('main', { class: 'view' }, h('div', { class: 'glass', style: 'padding:20px;text-align:center' },
    img, h('div', { style: 'display:flex;gap:8px;justify-content:center' },
      h('button', { class: 'gbtn sm', onclick: async () => { const f = await pickFile('image/*'); if (!f) return; try { const m = await prepareMedia(f, 480); av = m.data; removeAv = false; img.src = m.url; } catch (e) { toast(e.message); } } }, 'Change photo'),
      h('button', { class: 'gbtn sm', onclick: () => { av = null; removeAv = true; img.src = DEFAULT_AV; } }, 'Remove photo')),
    h('div', { style: 'text-align:left;margin-top:16px' },
      fld('Name', name), h('label', { class: 'fld' }, h('small', null, 'Username'), uname, uhint), fld('Pronouns', pron), fld('Bio', bio), fld('Website', web, 'Shown as a link on your profile'),
      fld('Gender', gender, "This won't be part of your public profile"), gcustom,
      h('div', { class: 'fld' }, h('small', null, 'Profile theme colour'), sw)), btn)));
}, { tab: 'profile' });

// ------------------------------------------------------------------ notifications
addRoute(/^#\/notifications$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  const reqSlot = h('div');
  GET('/api/notifications').then(d => {
    state.unreadNotif = 0; updateBadges(); POST('/api/notifications/read').catch(() => {});
    if (d.followRequests) reqSlot.replaceChildren(h('a', { class: 'row glass reqrow', href: '#/requests' }, h('span', { class: 'reqic', html: ICONS.user }), h('div', { class: 'meta' }, h('b', null, 'Follow requests'), h('small', null, 'Approve or ignore requests')), h('i', { class: 'cnt' }, String(d.followRequests)), h('span', { class: 'chev', html: ICONS.chev })));
    const txt = { like: 'liked your post.', comment: 'commented: ', follow: 'started following you.', request: 'requested to follow you.', accept: 'accepted your follow request.', mention: 'mentioned you: ' };
    box.replaceChildren(...(d.notifications.length ? d.notifications.map(n => h('div', { class: 'row notif' + (n.read ? '' : ' unread') },
      h('a', { href: '#/u/' + n.user.username }, avatar(n.user)),
      h('div', { class: 'meta' }, h('a', { href: '#/u/' + n.user.username }, h('b', { style: 'display:inline' }, n.user.username)), ' ', txt[n.type] || '', (n.type === 'comment' || n.type === 'mention') ? n.text : '', ' ', h('small', null, ago(n.created))),
      n.post ? h('a', { href: '#/p/' + n.post.id }, n.post.type === 'video' ? h('video', { class: 'thumb', src: n.post.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { class: 'thumb', src: n.post.media, alt: '' }))
        : n.type === 'request' ? h('a', { class: 'gbtn sm primary', href: '#/requests' }, 'Review')
        : (n.type === 'follow' || n.type === 'accept') ? followBtn(n.user) : null))
      : [h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.heart }), 'Activity on your posts will show here')]));
  }).catch(e => toast(e.message));
  return pageWrap(topbar('Notifications', { back: true }), h('main', { class: 'view' }, reqSlot, box));
}, { tab: '' });
addRoute(/^#\/requests$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  const draw = async () => {
    try {
      const d = await GET('/api/requests');
      box.replaceChildren(...(d.requests.length ? d.requests.map(u => {
        const acts = h('div', { class: 'acts' },
          h('button', { class: 'gbtn sm primary', onclick: async () => { try { await POST('/api/requests/' + u.username + '/accept'); acts.replaceChildren(u.isFollowing ? h('small', null, 'Accepted') : followBtn(u)); toast(u.username + ' can now see your posts'); } catch (e) { toast(e.message); } } }, 'Confirm'),
          h('button', { class: 'gbtn sm', onclick: async () => { try { await DEL('/api/requests/' + u.username); row.remove(); } catch (e) { toast(e.message); } } }, 'Delete'));
        const row = h('div', { class: 'row' }, h('a', { href: '#/u/' + u.username }, avatar(u)), h('a', { class: 'meta', href: '#/u/' + u.username }, h('b', null, unameEl(u)), h('small', null, u.name)), acts);
        return row;
      }) : [h('div', { class: 'empty' }, 'No pending follow requests')]));
    } catch (e) { box.replaceChildren(h('div', { class: 'empty' }, e.message)); }
  };
  draw();
  return pageWrap(topbar('Follow requests', { back: true }), h('main', { class: 'view' }, box));
}, { tab: '' });

// ------------------------------------------------------------------ inbox + chat
function convRows(list, empty) {
  return list.length ? list.map(c => {
    const l = c.last; const prev = (l.mine ? 'You: ' : '') + (l.kind === 'text' ? l.text : l.kind === 'image' ? 'sent a photo' : 'shared a post');
    return h('a', { class: 'row' + (c.unread ? ' unread' : ''), href: '#/dm/' + c.user.username }, ringed(c.user, 52),
      h('div', { class: 'meta' }, h('b', null, c.user.name || c.user.username), h('small', null, prev.slice(0, 60) + ' · ' + ago(l.created))), c.unread ? h('i', { class: 'udot' }) : null);
  }) : [empty];
}
addRoute(/^#\/inbox$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  const reqLink = h('a', { class: 'req-link', href: '#/inbox/requests', hidden: true });
  const newBtn = h('button', { class: 'icon-btn', html: ICONS.edit, 'aria-label': 'New message', onclick: newMessage });
  GET('/api/inbox').then(d => {
    state.unreadDm = d.conversations.reduce((a, c) => a + c.unread, 0); updateBadges();
    if (d.requests) { reqLink.textContent = 'Requests (' + d.requests + ')'; reqLink.hidden = false; }
    box.replaceChildren(...convRows(d.conversations, h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.msg }), 'No messages yet', h('br'), h('button', { class: 'gbtn primary sm', style: 'margin-top:12px', onclick: newMessage }, 'Send message'))));
  }).catch(e => toast(e.message));
  return pageWrap(topbar(state.me.username, { back: true, right: [newBtn] }), h('main', { class: 'view' }, h('div', { class: 'section-t inbox-h' }, h('span', null, 'Messages'), reqLink), box));
}, { tab: '' });
addRoute(/^#\/inbox\/requests$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  GET('/api/inbox/requests').then(d => box.replaceChildren(...convRows(d.conversations, h('div', { class: 'empty' }, 'No message requests')))).catch(e => toast(e.message));
  return pageWrap(topbar('Message requests', { back: true }), h('main', { class: 'view' },
    h('p', { class: 'sub', style: 'text-align:left;margin:8px 6px 12px' }, "Messages from people you don't follow (or who you restricted) arrive here. They won't know you've seen them until you accept."), box));
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
  const lastSeenTxt = () => u.online ? 'Active now' : (u.lastActive ? 'Active ' + ago(u.lastActive) + ' ago' : '@' + u.username);
  const status = h('small', null, lastSeenTxt());
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
    if (ev.type === 'dm') { typingEl.hidden = true; ev.message.mine = false; addMsg(ev.message, true); scrollDown(); if (!d.isRequest) POST('/api/dm/' + u.username + '/seen').catch(() => {}); status.textContent = u.lastActive !== null || u.online ? 'Active now' : '@' + u.username; }
    else if (ev.type === 'dm_echo') { addMsg(ev.message, true); scrollDown(); }
    else if (ev.type === 'typing') { typingEl.hidden = false; status.textContent = 'typing…'; clearTimeout(typingT); typingT = setTimeout(() => { typingEl.hidden = true; status.textContent = lastSeenTxt(); }, 3500); scrollDown(); }
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
    try { const r = await POST('/api/dm/' + u.username, { text }); addMsg(r.message, true); scrollDown(); if (r.request) toast('Sent as a message request'); } catch (x) { toast(x.message); input.value = text; }
  };
  const bar = h('form', { class: 'chat-bar glass', onsubmit: sendText },
    h('button', { type: 'button', class: 'cam', html: ICONS.cam, 'aria-label': 'Send photo', onclick: async () => {
      const f = await pickFile('image/*'); if (!f) return;
      try { toast('Sending photo…'); const m = await prepareMedia(f, 1280); if (m.kind !== 'image') throw new Error('Only photos in chat'); const r = await POST('/api/dm/' + u.username, { media: m.data }); addMsg(r.message, true); scrollDown(); } catch (x) { toast(x.message); }
    } }), input, h('button', { class: 'send', type: 'submit' }, 'Send'));
  const head = h('a', { class: 'chat-head', href: '#/u/' + u.username, style: 'flex:1;min-width:0' }, ringed(u, 34), h('div', { style: 'min-width:0' }, h('b', null, u.name || u.username), status));
  let footer = bar;
  if (d.isRequest) footer = h('div', { class: 'chat-bar glass reqbar' }, h('div', { class: 'rq' }, h('b', null, (u.name || u.username) + ' wants to send you a message'), h('small', null, "They won't know you've seen it until you accept.")),
    h('div', { class: 'acts' },
      h('button', { class: 'gbtn sm', onclick: async () => { try { await POST('/api/users/' + u.username + '/block'); toast('Blocked'); go('#/inbox/requests'); } catch (e) { toast(e.message); } } }, 'Block'),
      h('button', { class: 'gbtn sm', onclick: async () => { if (!confirm('Delete this message request?')) return; try { await DEL('/api/dm/' + u.username + '/request'); toast('Request deleted'); go('#/inbox/requests'); } catch (e) { toast(e.message); } } }, 'Delete'),
      h('button', { class: 'gbtn sm primary', onclick: async () => { try { await POST('/api/dm/' + u.username + '/accept'); toast('Accepted'); render(); } catch (e) { toast(e.message); } } }, 'Accept')));
  else if (!d.canMessage) footer = h('div', { class: 'chat-bar glass reqbar' }, h('small', { style: 'margin:auto;color:var(--muted)' }, d.why || "You can't message this account"));
  const page = pageWrap(topbar(head, { back: true }), h('main', null, chat), footer);
  state.unreadDm = 0; refreshMe();
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  return page;
}, { noTabs: true, keepScroll: true });

// ------------------------------------------------------------------ about (+ hidden admin entry)
addRoute(/^#\/about$/, async () => {
  const logo = h('h2', { class: 'logo about-logo', style: 'justify-content:flex-start' }, h('img', { src: '/icon.svg', alt: '', draggable: 'false' }), 'Private Insta');
  // secret gesture: 5 quick taps on the logo, then a ~2 s long-press. Only an admin account (checked by the server) gets anywhere.
  let taps = [], armedUntil = 0, holdT = null, downAt = 0;
  logo.addEventListener('contextmenu', e => e.preventDefault());
  logo.addEventListener('pointerdown', () => {
    downAt = Date.now();
    if (Date.now() < armedUntil) holdT = setTimeout(() => { armedUntil = 0; taps = []; openAdmin(); }, 1900);
  });
  const up = () => {
    clearTimeout(holdT); holdT = null;
    if (Date.now() - downAt > 350) return;
    const t = Date.now(); taps = taps.filter(x => t - x < 2500).concat(t);
    if (taps.length >= 5) { armedUntil = t + 4000; taps = []; }
  };
  logo.addEventListener('pointerup', up); logo.addEventListener('pointerleave', () => { clearTimeout(holdT); holdT = null; });
  return pageWrap(topbar('About', { back: true }), h('main', { class: 'view' }, h('div', { class: 'about glass' },
    logo, h('div', { class: 'ver' }, 'Version ' + (state.version || '1.2.0')),
    h('p', null, 'A liquid glass photo-sharing app: posts, stories that vanish after 24 hours, Close Friends, reels, likes, comments, saves, notifications, private accounts and real-time direct messages.'),
    h('p', null, h('b', { style: 'color:var(--text)' }, 'Educational project by Tech Bro Z, not affiliated with Instagram/Meta.'), ' Built for learning. All names, logos and designs here are original.'),
    h('p', null, 'YouTube: @techbrozdeveloper · Instagram: @tech_bro_z_1'),
    h('p', null, 'Source code: github.com/nm621532-byte/instagram-clone-techbroz'),
    state.me ? null : h('a', { class: 'gbtn primary', href: '#/login' }, 'Log in'))));
}, { noTabs: false, tab: '' });
async function openAdmin() {
  if (!state.me || !state.me.admin) return; // nothing happens for everyone else (and the server says 403 anyway)
  try { await GET('/api/admin/stats'); return go('#/admin'); } catch (e) {}
  const pw = await askPassword('Admin', 'Confirm your password', 'Unlock');
  if (!pw) return;
  try { await POST('/api/admin/unlock', { password: pw }); vib(30); go('#/admin'); } catch (e) { toast(e.message); }
}
function askPassword(title, msg, btnLabel, danger) {
  return new Promise((resolve) => {
    const input = h('input', { class: 'field', type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
    let done = false;
    const finish = (v) => { if (done) return; done = true; s.close(); resolve(v); };
    const s = sheet(title, h('div', { style: 'padding:0 18px 18px' }, msg ? h('p', { class: 'sub', style: 'text-align:left;margin:0 0 12px' }, msg) : null,
      h('form', { onsubmit: (e) => { e.preventDefault(); finish(input.value); } }, input, h('button', { class: 'gbtn block ' + (danger ? 'dangerb' : 'primary'), type: 'submit' }, btnLabel || 'Continue'))));
    s.ov.addEventListener('click', (e) => { if (e.target === s.ov) setTimeout(() => finish(null), 0); });
    setTimeout(() => input.focus(), 350);
  });
}

// ------------------------------------------------------------------ settings (v1.1)
async function saveSetting(patch) {
  try { const d = await PUT('/api/settings', patch); state.me.settings = d.settings; return d.settings; }
  catch (e) { toast(e.message); throw e; }
}
function toggleRow(label, sub, on, onchange) {
  const inp = h('input', { type: 'checkbox', class: 'tgl' }); inp.checked = !!on;
  inp.onchange = async () => { inp.disabled = true; try { await onchange(inp.checked); } catch (e) { inp.checked = !inp.checked; } finally { inp.disabled = false; } };
  return h('label', { class: 'srow' }, h('div', { class: 'st' }, h('b', null, label), sub ? h('small', null, sub) : null), inp);
}
function linkRow(ic, label, sub, href, badge) {
  return h('a', { class: 'srow', href }, ic ? h('span', { class: 'sic', html: ICONS[ic] || '' }) : null, h('div', { class: 'st' }, h('b', null, label), sub ? h('small', null, sub) : null),
    badge ? h('i', { class: 'cnt' }, String(badge)) : null, h('span', { class: 'chev', html: ICONS.chev }));
}
function choiceRow(label, sub, value, options, onchange) {
  const seg = h('div', { class: 'seg glass mini' });
  const draw = () => seg.replaceChildren(...options.map(([v, l]) => h('button', { type: 'button', class: value === v ? 'on' : '', onclick: async () => { const old = value; value = v; draw(); try { await onchange(v); } catch (e) { value = old; draw(); } } }, l)));
  draw();
  return h('div', { class: 'srow col' }, h('div', { class: 'st' }, h('b', null, label), sub ? h('small', null, sub) : null), seg);
}
const section = (title, ...rows) => h('div', null, title ? h('div', { class: 'section-t' }, title) : null, h('div', { class: 'list glass slist' }, ...rows.filter(Boolean)));
const settingsPage = (title, ...kids) => pageWrap(topbar(title, { back: true }), h('main', { class: 'view settings' }, ...kids));

addRoute(/^#\/settings$/, async () => {
  await refreshMe();
  const me = state.me, s = me.settings;
  return settingsPage('Settings and privacy',
    h('a', { class: 'me-card glass', href: '#/edit' }, avatar(me), h('div', { class: 'st' }, h('b', null, me.name || me.username), h('small', null, '@' + me.username + ' · Edit profile')), h('span', { class: 'chev', html: ICONS.chev })),
    section('Who can see your content',
      toggleRow('Private account', s.private ? 'Only followers you approve can see your posts, reels, stories and lists.' : 'Anyone can see your posts and reels. Turn on to approve every new follower.', s.private, async (v) => { await saveSetting({ private: v }); toast(v ? 'Your account is now private 🔒' : 'Your account is now public'); }),
      linkRow('user', 'Follow requests', 'Approve or delete', '#/requests', state.followRequests),
      linkRow('star', 'Close Friends', 'Who sees your green-ring stories', '#/settings/people/close-friends'),
      linkRow('shield', 'Blocked', "They can't find you, see your content or message you", '#/settings/people/blocked')),
    section('How others can interact with you',
      linkRow('reels', 'Story', 'Hide story, replies, Close Friends', '#/settings/story'),
      linkRow('msg', 'Messages', 'Who can message you, requests, read receipts', '#/settings/messages', state.msgRequests),
      linkRow('comment', 'Comments', 'Who can comment, hidden words', '#/settings/comments'),
      linkRow('eye', 'Activity status, tags and mentions', 'Online status, who can @mention you', '#/settings/activity'),
      linkRow('shield', 'Restricted accounts', 'Limit interactions quietly', '#/settings/people/restricted'),
      linkRow('mute', 'Muted accounts', 'Posts and stories you muted', '#/settings/people/muted')),
    section('Your app',
      linkRow('bell', 'Notifications', 'Likes, comments, follows, messages', '#/settings/notifications'),
      linkRow('gear', 'Theme and language', 'Dark, light or automatic', '#/settings/account')),
    section('Security and account',
      linkRow('lock', 'Password and security', 'Change password, login activity, devices', '#/settings/security'),
      linkRow('user', 'Your account', 'Download your data, deactivate or delete', '#/settings/account')),
    section('About',
      linkRow('menu', 'About Private Insta', 'Version ' + (state.version || '1.2.0'), '#/about')),
    h('button', { class: 'gbtn block logout', onclick: async () => { await POST('/api/logout').catch(() => {}); state.me = null; state.es && state.es.close(); go('#/login'); } }, 'Log out ' + me.username));
}, { tab: 'profile' });

addRoute(/^#\/settings\/story$/, async () => {
  await refreshMe(); const s = state.me.settings;
  return settingsPage('Story',
    section('Viewing',
      linkRow('eye', 'Hide story from', 'People you choose will not see your story', '#/settings/people/story-hidden'),
      linkRow('star', 'Close Friends', 'Share some stories only with them (green ring)', '#/settings/people/close-friends')),
    section('Replying',
      choiceRow('Allow replies', 'Who can reply to your story', s.storyReplies, [['everyone', 'Everyone'], ['following', 'People you follow'], ['off', 'Off']], (v) => saveSetting({ storyReplies: v }))),
    h('p', { class: 'sub fine' }, 'Your stories are only shown to your followers. Replies arrive in your messages.'));
}, { tab: 'profile' });

addRoute(/^#\/settings\/messages$/, async () => {
  await refreshMe(); const s = state.me.settings;
  return settingsPage('Messages',
    section('Message controls',
      choiceRow('Who can message you', 'Others go to Message requests (or are blocked if Nobody)', s.dmFrom, [['everyone', 'Everyone'], ['followers', 'Followers'], ['nobody', 'Nobody']], (v) => saveSetting({ dmFrom: v })),
      linkRow('msg', 'Message requests', 'From people you don\'t follow', '#/inbox/requests', state.msgRequests)),
    section('Privacy',
      toggleRow('Show read receipts', 'If off, people won\'t see "Seen" when you read their messages', s.readReceipts, (v) => saveSetting({ readReceipts: v })),
      toggleRow('Show typing indicator', 'Let people see when you are typing', s.typing, (v) => saveSetting({ typing: v }))),
    h('p', { class: 'sub fine' }, 'People you follow can always message you. Nobody = only people you follow and chats you already accepted.'));
}, { tab: 'profile' });

addRoute(/^#\/settings\/comments$/, async () => {
  await refreshMe(); const s = state.me.settings;
  const words = h('textarea', { class: 'field', placeholder: 'Words or emojis, separated by commas', maxlength: 3000 }, (s.hiddenWords || []).join(', '));
  const saveW = h('button', { class: 'gbtn sm primary' }, 'Save words');
  saveW.onclick = async () => { saveW.disabled = true; try { const st = await saveSetting({ hiddenWords: words.value }); words.value = st.hiddenWords.join(', '); toast('Hidden words saved (' + st.hiddenWords.length + ')'); } catch (e) {} saveW.disabled = false; };
  return settingsPage('Comments',
    section('Who can comment',
      choiceRow('Allow comments from', 'On all your posts and reels', s.commentsFrom, [['everyone', 'Everyone'], ['followers', 'Followers'], ['off', 'Off']], (v) => saveSetting({ commentsFrom: v }))),
    section('Hidden words',
      h('div', { class: 'srow col' }, h('div', { class: 'st' }, h('b', null, 'Hide comments containing'), h('small', null, 'Comments with these words are hidden from everyone except the person who wrote them.')), words, saveW)),
    h('p', { class: 'sub fine' }, 'Per post: open a post\'s ••• menu to turn off commenting or hide its like count.'));
}, { tab: 'profile' });

addRoute(/^#\/settings\/activity$/, async () => {
  await refreshMe(); const s = state.me.settings;
  return settingsPage('Activity and mentions',
    section('Activity status',
      toggleRow('Show activity status', 'People you message can see when you were last active. If off, you can\'t see theirs either.', s.activityStatus, (v) => saveSetting({ activityStatus: v }))),
    section('Tags and mentions',
      choiceRow('Who can @mention you', 'In captions and comments', s.mentionsFrom, [['everyone', 'Everyone'], ['followers', 'Followers'], ['nobody', 'Nobody']], (v) => saveSetting({ mentionsFrom: v }))));
}, { tab: 'profile' });

addRoute(/^#\/settings\/notifications$/, async () => {
  await refreshMe(); const n = state.me.settings.notif;
  const row = (k, label, sub) => toggleRow(label, sub, n[k], async (v) => { await saveSetting({ notif: { [k]: v } }); });
  return settingsPage('Notifications',
    section('Push me about',
      row('likes', 'Likes', 'When someone likes your post'), row('comments', 'Comments', 'Comments on your posts'),
      row('follows', 'Follows and requests', 'New followers, follow requests, accepted requests'), row('mentions', 'Mentions', 'When someone @mentions you'),
      row('messages', 'Messages', 'Pop-up alerts for new messages (messages still arrive)')));
}, { tab: 'profile' });

addRoute(/^#\/settings\/security$/, async () => {
  await refreshMe(); const me = state.me;
  const oldp = h('input', { class: 'field', type: 'password', placeholder: 'Current password', autocomplete: 'current-password' });
  const newp = h('input', { class: 'field', type: 'password', placeholder: 'New password (6+ characters)', autocomplete: 'new-password' });
  const newp2 = h('input', { class: 'field', type: 'password', placeholder: 'Re-type new password', autocomplete: 'new-password' });
  const chBtn = h('button', { class: 'gbtn primary block' }, 'Change password');
  chBtn.onclick = async () => {
    if (newp.value !== newp2.value) return toast("New passwords don't match");
    chBtn.disabled = true;
    try { const d = await POST('/api/me/password', { oldPassword: oldp.value, newPassword: newp.value }); oldp.value = newp.value = newp2.value = ''; toast('Password changed. ' + d.loggedOut + ' other device(s) logged out.'); drawSessions(); }
    catch (e) { toast(e.message); } finally { chBtn.disabled = false; }
  };
  const sessBox = h('div', { class: 'list glass slist' }, spinner());
  const logBox = h('div', { class: 'list glass slist' });
  async function drawSessions() {
    try {
      const d = await GET('/api/me/sessions');
      sessBox.replaceChildren(...d.sessions.map(s => h('div', { class: 'srow' }, h('span', { class: 'sic', html: ICONS.lock }), h('div', { class: 'st' }, h('b', null, s.device + (s.current ? ' · This device' : '')), h('small', null, 'IP ' + s.ip + ' · active ' + ago(s.last) + ' ago')),
        s.current ? h('i', { class: 'cnt on' }, 'Active') : h('button', { class: 'gbtn sm', onclick: async () => { try { await DEL('/api/me/sessions/' + s.id); toast('Logged out that device'); drawSessions(); } catch (e) { toast(e.message); } } }, 'Log out'))));
      logBox.replaceChildren(...(d.logins.length ? d.logins.slice(0, 12).map(l => h('div', { class: 'srow' }, h('div', { class: 'st' }, h('b', null, l.device), h('small', null, new Date(l.t).toLocaleString() + ' · IP ' + l.ip)))) : [h('div', { class: 'empty' }, 'No logins recorded yet')]));
    } catch (e) { sessBox.replaceChildren(h('div', { class: 'empty' }, e.message)); }
  }
  drawSessions();
  const bulk = (label, url, all) => h('button', { class: 'gbtn block' + (all ? ' dangerb' : ''), onclick: async () => {
    if (!confirm(all ? 'Log out of every device, including this one?' : 'Log out of all other devices?')) return;
    try { const d = await POST(url); toast(d.loggedOut + ' device(s) logged out'); if (all) { state.me = null; go('#/login'); } else drawSessions(); } catch (e) { toast(e.message); }
  } }, label);
  return settingsPage('Password and security',
    section('Change password', h('div', { class: 'pad' }, me.demo ? h('p', { class: 'sub fine' }, 'The shared demo account keeps its password. Sign up to try this.') : null, oldp, newp, newp2, chBtn, h('small', { class: 'hint' }, 'Changing your password logs out every other device.'))),
    h('div', { class: 'section-t' }, 'Where you\'re logged in'), sessBox,
    h('div', { class: 'pad2' }, bulk('Log out other devices', '/api/me/logout-others'), bulk('Log out all devices', '/api/me/logout-all', true)),
    h('div', { class: 'section-t' }, 'Login activity'), logBox);
}, { tab: 'profile' });

addRoute(/^#\/settings\/account$/, async () => {
  await refreshMe(); const me = state.me, s = me.settings;
  const lang = h('select', { class: 'field', style: 'margin:8px 0 0' }, h('option', { value: 'en' }, 'English'), h('option', { value: 'hi' }, 'हिन्दी Hindi (coming soon)'));
  lang.value = s.language || 'en';
  lang.onchange = async () => { await saveSetting({ language: lang.value }).catch(() => {}); toast(lang.value === 'en' ? 'Language: English' : 'Saved — Hindi app text is coming in a future update'); };
  return settingsPage('Your account',
    section('Theme',
      choiceRow('Appearance', 'Auto follows your phone', s.theme || 'auto', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']], async (v) => { await saveSetting({ theme: v }); applyTheme(v); })),
    section('Language', h('div', { class: 'srow col' }, h('div', { class: 'st' }, h('b', null, 'App language')), lang)),
    section('Your information',
      h('a', { class: 'srow', href: '/api/me/export', download: 'private-insta-data.zip', onclick: () => toast('Preparing your data… the zip download will start') }, h('span', { class: 'sic', html: ICONS.save }), h('div', { class: 'st' }, h('b', null, 'Download your data'), h('small', null, 'A zip with your profile, settings, posts, comments, messages and photos')), h('span', { class: 'chev', html: ICONS.chev }))),
    section('Deactivate or delete',
      h('button', { class: 'srow', onclick: async () => {
        const pw = await askPassword('Deactivate account', 'Your profile, posts and comments will be hidden until you log in again.', 'Deactivate', true); if (!pw) return;
        try { await POST('/api/me/deactivate', { password: pw }); state.me = null; toast('Account deactivated. Log in any time to come back.'); go('#/login'); } catch (e) { toast(e.message); }
      } }, h('div', { class: 'st' }, h('b', null, 'Deactivate account'), h('small', null, 'Temporary — log in again to reactivate'))),
      h('button', { class: 'srow danger', onclick: async () => {
        const pw = await askPassword('Delete account', 'This permanently deletes your account, posts, stories, comments and messages. This cannot be undone.', 'Delete forever', true); if (!pw) return;
        try { await api('DELETE', '/api/me', { password: pw }); state.me = null; toast('Account deleted'); go('#/signup'); } catch (e) { toast(e.message); }
      } }, h('div', { class: 'st' }, h('b', null, 'Delete account'), h('small', null, 'Permanent')))));
}, { tab: 'profile' });

const PEOPLE = {
  'close-friends': { title: 'Close Friends', key: 'closeFriends', add: (u) => POST('/api/close-friends/' + u), del: (u) => DEL('/api/close-friends/' + u), delLabel: 'Remove', addLabel: 'Add', pick: true, note: 'Only these people see stories you share to Close Friends (green ring). They are not notified.' },
  'story-hidden': { title: 'Hide story from', key: 'storyHidden', add: (u) => POST('/api/story-hide/' + u), del: (u) => DEL('/api/story-hide/' + u), delLabel: 'Show', addLabel: 'Hide', pick: true, note: 'These people won\'t see any of your stories.' },
  blocked: { title: 'Blocked accounts', key: 'blocked', del: (u) => DEL('/api/users/' + u + '/block'), delLabel: 'Unblock', note: 'Blocked people can\'t find your profile, see your posts or stories, follow you or message you. Block someone from the ••• on their profile.' },
  restricted: { title: 'Restricted accounts', key: 'restricted', add: (u) => POST('/api/users/' + u + '/restrict'), del: (u) => DEL('/api/users/' + u + '/restrict'), delLabel: 'Unrestrict', addLabel: 'Restrict', pick: true, note: 'Their new comments on your posts are visible only to them, their chats go to Message requests, and they can\'t see when you\'re online or have read their messages.' },
  muted: { title: 'Muted accounts', key: 'muted', note: 'Muted people don\'t know. Mute from the ••• on their profile.' },
};
addRoute(/^#\/settings\/people\/(close-friends|story-hidden|blocked|restricted|muted)$/, async (kind) => {
  const cfg = PEOPLE[kind];
  const box = h('div', { class: 'list glass slist' }, spinner());
  const pickBox = h('div', { class: 'list glass slist' });
  const search = h('input', { class: 'field', placeholder: 'Search people to ' + (cfg.addLabel || 'add').toLowerCase(), autocapitalize: 'none', spellcheck: 'false', style: 'margin:0' });
  let current = [];
  const row = (u, btn) => h('div', { class: 'srow' }, h('a', { href: '#/u/' + u.username }, avatar(u)), h('a', { class: 'st', href: '#/u/' + u.username }, h('b', null, unameEl(u)), h('small', null, u.name || '')), btn);
  async function draw() {
    try {
      const d = await GET('/api/settings/lists');
      if (kind === 'muted') {
        const all = new Map(); d.mutedPosts.forEach(u => all.set(u.username, Object.assign(u, { mp: true }))); d.mutedStories.forEach(u => all.set(u.username, Object.assign(all.get(u.username) || u, { ms: true })));
        current = [...all.values()];
        box.replaceChildren(...(current.length ? current.map(u => row(u, h('button', { class: 'gbtn sm', onclick: async () => { try { await PUT('/api/users/' + u.username + '/mute', { posts: false, stories: false }); toast('Unmuted'); draw(); } catch (e) { toast(e.message); } } }, 'Unmute ' + (u.mp && u.ms ? 'all' : u.mp ? 'posts' : 'story')))) : [h('div', { class: 'empty' }, 'Nobody muted')]));
        return;
      }
      current = d[cfg.key];
      box.replaceChildren(...(current.length ? current.map(u => row(u, h('button', { class: 'gbtn sm', onclick: async () => { try { await cfg.del(u.username); draw(); drawPick(); } catch (e) { toast(e.message); } } }, cfg.delLabel))) : [h('div', { class: 'empty' }, 'Nobody here yet')]));
      drawPick();
    } catch (e) { box.replaceChildren(h('div', { class: 'empty' }, e.message)); }
  }
  let pickList = [];
  async function loadPick() {
    if (!cfg.pick) return;
    try {
      const q = search.value.trim();
      if (q) pickList = (await GET('/api/search?q=' + encodeURIComponent(q))).users;
      else { const [a, b] = await Promise.all([GET('/api/users/' + state.me.username + '/followers'), GET('/api/users/' + state.me.username + '/following')]); const m = new Map(); a.users.concat(b.users).forEach(u => { if (!u.isMe) m.set(u.username, u); }); pickList = [...m.values()]; }
    } catch (e) { pickList = []; }
    drawPick();
  }
  function drawPick() {
    if (!cfg.pick) return;
    const have = new Set(current.map(u => u.username));
    const list = pickList.filter(u => !have.has(u.username)).slice(0, 30);
    pickBox.replaceChildren(...(list.length ? list.map(u => row(u, h('button', { class: 'gbtn sm primary', onclick: async () => { try { await cfg.add(u.username); toast(cfg.addLabel === 'Add' ? 'Added' : 'Done'); draw(); } catch (e) { toast(e.message); } } }, cfg.addLabel))) : [h('div', { class: 'empty', style: 'padding:18px' }, search.value ? 'No one found' : 'Your followers and people you follow appear here')]));
  }
  let t; search.oninput = () => { clearTimeout(t); t = setTimeout(loadPick, 250); };
  draw(); loadPick();
  return settingsPage(cfg.title, h('p', { class: 'sub fine' }, cfg.note), box,
    cfg.pick ? h('div', null, h('div', { class: 'section-t' }, 'Suggested'), h('div', { style: 'margin:0 0 8px' }, search), pickBox) : null);
}, { tab: 'profile' });

// ------------------------------------------------------------------ admin panel (hidden; every call is checked on the server)
addRoute(/^#\/admin$/, async () => {
  if (!state.me || !state.me.admin) { go('#/'); return null; }
  let tab = 'stats';
  const body = h('div');
  const segEl = h('div', { class: 'seg glass mini admin-seg' });
  const drawSeg = () => segEl.replaceChildren(...[['stats', 'Stats'], ['users', 'Users'], ['bots', 'Bots 🤖'], ['posts', 'Posts'], ['stories', 'Stories'], ['comments', 'Comments']].map(([k, l]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; drawSeg(); draw(); } }, l)));
  const fmtN = (n) => Number(n || 0).toLocaleString('en-IN');
  const num = (msg, def) => { const v = prompt(msg, def == null ? '' : String(def)); if (v == null || v.trim() === '') return null; const n = Number(v); if (!Number.isFinite(n)) { toast('Enter a number'); return null; } return n; };
  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); draw(); } catch (e) { toast(e.message); if (/locked/.test(e.message)) { const pw = await askPassword('Admin', 'Session expired — confirm your password', 'Unlock'); if (pw) { await POST('/api/admin/unlock', { password: pw }).catch(x => toast(x.message)); draw(); } } } };
  async function draw() {
    body.replaceChildren(spinner());
    try {
      if (tab === 'stats') {
        const { stats } = await GET('/api/admin/stats');
        const lbl = { users: 'Real users', bots: 'Bot accounts', activeToday: 'Active today', onlineNow: 'Online now', posts: 'Photo posts', reels: 'Reels', stories: 'Live stories', comments: 'Comments', messages: 'Messages', likes: 'Real likes', botFollows: 'Bot follows', botLikes: 'Bot likes', botComments: 'Bot comments', privateAccounts: 'Private accounts', suspended: 'Suspended' };
        body.replaceChildren(h('div', { class: 'stat-grid' }, ...Object.entries(lbl).map(([k, l]) => h('div', { class: 'glass stat' }, h('b', null, fmt(stats[k] || 0)), h('small', null, l)))),
          h('button', { class: 'gbtn block dangerb', style: 'margin-top:14px', onclick: () => { if (confirm('Reset ALL boosts (followers, likes, comments, views) to 0?')) act(() => POST('/api/admin/reset-boosts', {}), 'All boosts reset'); } }, 'Reset all boosts to 0'));
      } else if (tab === 'users') {
        const q = h('input', { class: 'field', placeholder: 'Search users', autocapitalize: 'none' });
        const list = h('div', { class: 'list glass slist' });
        const load = async () => {
          const d = await GET('/api/admin/users?q=' + encodeURIComponent(q.value.trim()));
          list.replaceChildren(...d.users.map(u => h('div', { class: 'arow' },
            h('div', { class: 'srow' }, avatar(u), h('div', { class: 'st' }, h('b', null, u.username, u.verified ? h('span', { style: 'display:inline-flex', html: ICONS.verified }) : null, u.admin ? ' 👑' : '', u.suspended ? ' ⛔' : '', u.private ? ' 🔒' : ''),
              h('small', null, u.posts + ' posts · ' + fmtN(u.realFollowers) + ' real + ' + fmtN(u.botFollowers) + ' bots' + (u.extraFollowers ? ' + ' + fmtN(u.extraFollowers) : '') + ' = ' + fmtN(u.shownFollowers) + ' followers'))),
            h('div', { class: 'abtns' },
              h('button', { class: 'gbtn sm', onclick: () => act(() => PUT('/api/admin/users/' + u.username, { verified: !u.verified }), u.verified ? 'Badge removed' : 'Blue badge given ✔') }, u.verified ? 'Remove badge' : 'Verify ✔'),
              h('button', { class: 'gbtn sm primary', onclick: () => { const n = num('Add how many bot followers to ' + u.username + '? (max 10,000 at a time)', 100); if (n != null) act(() => PUT('/api/admin/users/' + u.username, { addFollowers: n }), fmtN(n) + ' followers added (with names)'); } }, '+ Followers'),
              h('button', { class: 'gbtn sm', onclick: () => { const n = num('Set bot followers for ' + u.username + ' (0 = remove all bots; real followers stay)', u.bonusFollowers); if (n != null) act(() => PUT('/api/admin/users/' + u.username, { bonusFollowers: n }), 'Boost set to ' + fmtN(n)); } }, 'Set boost'),
              h('button', { class: 'gbtn sm', onclick: () => act(() => POST('/api/admin/reset-boosts', { username: u.username }), 'Boosts reset for ' + u.username) }, 'Reset boosts'),
              u.admin ? null : h('button', { class: 'gbtn sm', onclick: () => { if (confirm((u.suspended ? 'Unsuspend ' : 'Suspend ') + u.username + '?')) act(() => PUT('/api/admin/users/' + u.username, { suspended: !u.suspended }), u.suspended ? 'Unsuspended' : 'Suspended'); } }, u.suspended ? 'Unsuspend' : 'Suspend'),
              u.admin || u.demo ? null : h('button', { class: 'gbtn sm dangerb', onclick: () => { if (confirm('Delete ' + u.username + ' and everything they posted? This cannot be undone.')) act(() => DEL('/api/admin/users/' + u.username), 'Account deleted'); } }, 'Delete')))));
        };
        let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => load().catch(e => toast(e.message)), 250); };
        await load(); body.replaceChildren(q, list);
      } else if (tab === 'bots') {
        const d = await GET('/api/admin/bots');
        const head = h('div', { class: 'glass bot-head' }, h('b', null, fmtN(d.total) + ' bot accounts'),
          h('small', null, 'Bots are created automatically when you boost. They have names + photos, show up in followers / likes lists and search, but cannot log in, post or message anyone. Max ' + fmtN(d.actionCap) + ' per action, ' + fmtN(d.poolCap) + ' per account.'));
        const boosted = h('div', { class: 'list glass slist' }, ...(d.boosted.length ? d.boosted.map(u => h('div', { class: 'arow' },
          h('div', { class: 'srow' }, avatar(u), h('div', { class: 'st' }, h('b', null, u.username), h('small', null, '🤖 ' + fmtN(u.botFollowers) + ' bot followers · ' + fmtN(u.realFollowers) + ' real' + (u.botLikes ? ' · ❤ ' + fmtN(u.botLikes) + ' bot likes' : '') + (u.botComments ? ' · 💬 ' + u.botComments : '')))),
          h('div', { class: 'abtns' }, h('a', { class: 'gbtn sm', href: '#/u/' + u.username + '/followers' }, 'See followers'),
            h('button', { class: 'gbtn sm dangerb', onclick: () => { if (confirm('Remove ALL bots from ' + u.username + '? (bot followers, bot likes and bot comments). Real followers stay.')) act(() => DEL('/api/admin/users/' + u.username + '/bots'), 'Bots removed from ' + u.username); } }, 'Remove all bots from this user')))) : [h('div', { class: 'empty' }, 'No one has bot followers yet. Use + Followers in the Users tab.')]));
        const bl = h('div', { class: 'list glass slist' }, ...d.bots.map(b => h('div', { class: 'srow' }, avatar(b), h('div', { class: 'st' }, h('b', null, b.username, b.private ? ' 🔒' : ''), h('small', null, b.name + (b.bio ? ' · ' + b.bio : ''))))));
        body.replaceChildren(head, h('div', { class: 'section-t' }, 'Users with bots'), boosted, h('div', { class: 'section-t' }, 'Newest bots' + (d.total > d.bots.length ? ' (showing ' + d.bots.length + ')' : '')), d.bots.length ? bl : h('div', { class: 'empty' }, 'No bots yet'));
      } else if (tab === 'posts') {
        const d = await GET('/api/admin/posts');
        const boost = (p, k, label) => h('button', { class: 'gbtn sm primary', onclick: () => { const n = num('Add how many ' + label + '?', 100); if (n != null) act(() => PUT('/api/admin/posts/' + p.id, { ['add' + k]: n }), label + ' boosted'); } }, '+ ' + label);
        body.replaceChildren(h('div', { class: 'list glass slist' }, ...(d.posts.length ? d.posts.map(p => h('div', { class: 'arow' },
          h('div', { class: 'srow' }, h('a', { href: '#/p/' + p.id }, p.type === 'video' ? h('video', { class: 'thumb', src: p.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { class: 'thumb', src: p.media, alt: '' })),
            h('div', { class: 'st' }, h('b', null, p.user + (p.type === 'video' ? ' · Reel' : '')), h('small', null, '❤ ' + fmtN(p.realLikes) + ' real + ' + fmtN(p.bonusLikes) + ' bots · 💬 ' + p.realComments + ' + ' + p.bonusComments + ' bots · 👁 ' + fmtN(p.realViews) + ' + ' + fmtN(p.bonusViews)), h('small', null, p.caption))),
          h('div', { class: 'abtns' }, boost(p, 'Likes', 'Likes'), boost(p, 'Views', 'Views'), boost(p, 'Comments', 'Comments'),
            h('button', { class: 'gbtn sm', onclick: () => act(() => PUT('/api/admin/posts/' + p.id, { bonusLikes: 0, bonusViews: 0, bonusComments: 0 }), 'Boosts reset') }, 'Reset'),
            h('button', { class: 'gbtn sm dangerb', onclick: () => { if (confirm('Delete this post?')) act(() => DEL('/api/admin/posts/' + p.id), 'Post deleted'); } }, 'Delete')))) : [h('div', { class: 'empty' }, 'No posts yet')])));
      } else if (tab === 'stories') {
        const d = await GET('/api/admin/stories');
        body.replaceChildren(h('div', { class: 'list glass slist' }, ...(d.stories.length ? d.stories.map(s => h('div', { class: 'arow' },
          h('div', { class: 'srow' }, s.type === 'video' ? h('video', { class: 'thumb', src: s.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { class: 'thumb', src: s.media, alt: '' }),
            h('div', { class: 'st' }, h('b', null, s.user + (s.close ? ' · Close Friends' : '')), h('small', null, '👁 ' + s.realViews + ' real + ' + s.bonusViews + ' boost · ' + ago(s.created) + ' ago'))),
          h('div', { class: 'abtns' }, h('button', { class: 'gbtn sm primary', onclick: () => { const n = num('Add how many story views?', 100); if (n != null) act(() => PUT('/api/admin/stories/' + s.id, { addViews: n }), 'Views boosted'); } }, '+ Views'),
            h('button', { class: 'gbtn sm', onclick: () => act(() => PUT('/api/admin/stories/' + s.id, { bonusViews: 0 }), 'Reset') }, 'Reset')))) : [h('div', { class: 'empty' }, 'No live stories')])));
      } else {
        const d = await GET('/api/admin/comments');
        body.replaceChildren(h('div', { class: 'list glass slist' }, ...(d.comments.length ? d.comments.map(c => h('div', { class: 'srow' }, h('div', { class: 'st' }, h('b', null, c.user + (c.hidden ? ' · hidden' : '')), h('small', null, c.text), h('small', null, ago(c.created) + ' ago')),
          h('button', { class: 'gbtn sm dangerb', onclick: () => { if (confirm('Delete this comment?')) act(() => DEL('/api/admin/comments/' + c.id), 'Comment deleted'); } }, 'Delete'))) : [h('div', { class: 'empty' }, 'No comments yet')])));
      }
    } catch (e) {
      if (/locked/.test(e.message)) { const pw = await askPassword('Admin', 'Confirm your password', 'Unlock'); if (pw) { try { await POST('/api/admin/unlock', { password: pw }); return draw(); } catch (x) { toast(x.message); } } go('#/about'); return; }
      body.replaceChildren(h('div', { class: 'empty' }, e.message));
    }
  }
  drawSeg(); draw();
  return pageWrap(topbar('Admin panel', { back: true }), h('main', { class: 'view settings' }, h('p', { class: 'sub fine' }, 'Boosts add bot accounts with names + photos: they show in the followers list, “Liked by” and comments. Reset removes only bots, never real people.'), segEl, body));
}, { tab: '' });

render();
})();
