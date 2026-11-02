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
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M19 3v4M17 5h4"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5.5"/><circle cx="15" cy="9" r="5.5"/><circle cx="12" cy="15" r="5.5"/></svg>',
  scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21a9 9 0 1 1 9-9"/><path d="m12 12 4-4"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  cover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m4 16 5-5 4 4 2-2 5 5"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.8.8.8-2.7-.2-.3A7.8 7.8 0 1 1 12 19.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.8 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></svg>',
  finger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 11v3.5c0 2 .6 3.8 1.6 5.3"/><path d="M8.6 9.4A3.5 3.5 0 0 1 15.5 11v2.5c0 1.4.2 2.7.7 4"/><path d="M5.6 7.4A7 7 0 0 1 19 11v1.5"/><path d="M8.5 13.5c0 2.6.8 5 2.2 7"/><path d="M5 11.2v1.3c0 1.8.4 3.5 1 5"/><path d="M8 3.6a9 9 0 0 1 10.5 1.6"/></svg>',
  ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-1.6L14.4 21 12 19.4 9.6 21l-2.3-1.6z"/><circle cx="9.5" cy="10.5" r="1" fill="currentColor"/><circle cx="14.5" cy="10.5" r="1" fill="currentColor"/></svg>',
  draft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4" stroke-linecap="round"/></svg>',
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
  if (r.status === 423 && data.appLocked) showAppLock();                  // v1.5 App Lock: the server says this session is locked
  if (!r.ok) { const err = new Error(data.error || ('Error ' + r.status)); err.status = r.status; err.data = data; throw err; }
  return data;
}
const GET = (u) => api('GET', u), POST = (u, b) => api('POST', u, b || {}), PUT = (u, b) => api('PUT', u, b), DEL = (u) => api('DELETE', u);
function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms || 10); } catch (e) {} }

// ------------------------------------------------------------------ media helpers
function pickFile(accept) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, style: 'display:none' });
    state.picking = true; setTimeout(() => { state.picking = false; }, 120000); // the file picker sends the app to the background: don't App-Lock mid-upload
    i.onchange = () => { setTimeout(() => { state.picking = false; }, 1500); res(i.files[0] || null); i.remove(); };
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
  if (document.documentElement.classList.contains('classic')) applyClassic(true);
}
function applyClassic(on) { // v1.4 Classic mode: flat Instagram look (no glass/blur/glow); remembered on this phone + saved on the server
  if (on === undefined) on = localStorage.getItem('ig_classic') === '1';
  localStorage.setItem('ig_classic', on ? '1' : '0');
  document.documentElement.classList.toggle('classic', !!on);
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = on ? (document.documentElement.classList.contains('light') ? '#ffffff' : '#000000') : '#0b0b1a';
}
applyClassic();
function applyAccent(c) { if (c) document.documentElement.style.setProperty('--accent', c); else document.documentElement.style.removeProperty('--accent'); }
applyTheme(); if (mq && mq.addEventListener) mq.addEventListener('change', () => applyTheme());
async function refreshMe() {
  try { const d = await GET('/api/me'); state.appLock = d.appLock || null; if (d.appLocked) showAppLock(); state.me = d.user; state.unreadDm = d.unreadDm; state.unreadNotif = d.unreadNotif; state.msgRequests = d.msgRequests || 0; state.followRequests = d.followRequests || 0; state.version = d.version; applyTheme(d.user.settings && d.user.settings.theme); applyClassic(!!(d.user.settings && d.user.settings.classic)); applyAccent(d.user.accent); updateBadges(); return true; }
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
    if (ev.type === 'dm' && ev.private) { // v1.5: locked / hidden chat -> "New message" only
      if (state.chatRef && state.chatRef === ev.chat && state.chatHandler) state.chatHandler(ev);
      else if (!ev.quiet) { toast('🔒 New message'); vib(20); }
    } else if (ev.type === 'dm') {
      if (state.chatWith === ev.from && state.chatHandler) state.chatHandler(ev);
      else if (ev.request) { state.msgRequests = (state.msgRequests || 0) + 1; if (!ev.quiet) toast('📩 New message request from ' + ev.from); if (/^#\/inbox/.test(location.hash)) render(); }
      else { state.unreadDm++; updateBadges(); if (!ev.quiet) { toast('💬 ' + ev.from + ': ' + msgPreview(ev.message)); vib(20); } if (location.hash === '#/inbox') render(); }
    } else if ((ev.type === 'typing' || ev.type === 'seen' || ev.type === 'unsend') && state.chatHandler && state.chatWith === (ev.from || ev.by)) state.chatHandler(ev);
    else if (ev.type === 'dm_echo' && state.chatHandler && state.chatWith === ev.to) state.chatHandler(ev);
    else if ((ev.type === 'vanished' || ev.type === 'opened' || ev.type === 'vanish') && state.chatHandler) state.chatHandler(ev);
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
  state.chatWith = null; state.chatHandler = null; state.chatRef = null;
  if (state.cleanup) { try { state.cleanup(); } catch (e) {} state.cleanup = null; }
  leavePrivateArea(hash);
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
    // v1.4: tapping Home / Reels again (while already there) jumps to the top and loads a fresh feed, like Instagram
    if (k === 'home' || k === 'reels') a.addEventListener('click', (e) => { if (active === k && ((location.hash || '#/') === href || (href === '#/' && location.hash === '#'))) { e.preventDefault(); freshTab(k); } });
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
state.seeds = { home: Math.random().toString(36).slice(2, 10), reels: Math.random().toString(36).slice(2, 10) };
function freshTab(k) {
  vib(12);
  state.seeds[k] = Math.random().toString(36).slice(2, 10);
  if (k === 'home') state.justPosted = null; // v1.6: a refresh never re-pins your own post
  const top = () => { const r = document.querySelector('.reels'); if (r) r.scrollTo({ top: 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  top(); state.freshPulse = k;
  setTimeout(render, window.scrollY > 40 ? 260 : 0);
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
      h('h1', { class: 'logo' }, h('img', { src: '/logo-v15.svg', alt: '' }), 'Private Insta'),
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

// ------------------------------------------------------------------ v1.4 edits (filters, speed, trim, text, music) — applied by the player, never baked into videos
const FILTERS = {
  normal: '', clarendon: 'contrast(1.2) saturate(1.35)', gingham: 'brightness(1.05) hue-rotate(-10deg) sepia(.1)', moon: 'grayscale(1) contrast(1.1) brightness(1.1)',
  lark: 'contrast(.9) brightness(1.1) saturate(1.2)', reyes: 'sepia(.22) brightness(1.1) contrast(.85) saturate(.75)', juno: 'saturate(1.6) contrast(1.1) hue-rotate(-8deg)',
  slumber: 'saturate(.66) brightness(1.05) sepia(.2)', crema: 'sepia(.35) contrast(.95) brightness(1.05) saturate(.9)', ludwig: 'saturate(1.25) contrast(1.05) brightness(1.05) sepia(.08)', aden: 'hue-rotate(-20deg) contrast(.9) saturate(.85) brightness(1.2)',
};
const FILTER_NAMES = Object.keys(FILTERS);
const TEXT_STYLES = { classic: 'font-weight:600', bold: 'font-weight:900;text-transform:uppercase;letter-spacing:.5px', neon: 'font-weight:800', box: 'font-weight:800;padding:.15em .45em;border-radius:.3em' };
function textOverlay(t, wrap) {
  const el = h('div', { class: 'txt-ov ' + (t.style || 'bold') });
  el.textContent = t.t;
  el.style.cssText = TEXT_STYLES[t.style || 'bold'] + ';left:' + t.x + '%;top:' + t.y + '%;color:' + t.color + (t.style === 'neon' ? ';text-shadow:0 0 6px ' + t.color + ',0 0 18px ' + t.color : '') + (t.style === 'box' ? ';background:' + (t.color.toLowerCase() === '#ffffff' ? 'rgba(0,0,0,.6)' : '#fff') : '');
  const fit = () => { el.style.fontSize = Math.max(10, t.size * (wrap.clientWidth || 360) / 360) + 'px'; };
  fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
  return el;
}
// sound: "on" = the viewer wants sound. Original audio follows it unless the creator muted it; added music follows it too.
function setSound(v, on) { v._soundOn = !!on; v.muted = !(on && v._orig !== false); if (v._music) v._music.muted = !on; }
function applyEdits(v, wrap, e) {
  if (!e) return;
  if (e.filter && FILTERS[e.filter]) v.style.filter = FILTERS[e.filter];
  if (e.text && wrap) wrap.append(textOverlay(e.text, wrap));
  if (v.tagName !== 'VIDEO') return;
  const a = e.trim ? e.trim[0] : 0, z = e.trim ? e.trim[1] : 0;
  const rate = () => { if (e.speed) v.playbackRate = e.speed; };
  v.addEventListener('loadedmetadata', () => { rate(); if (a && v.currentTime < a) v.currentTime = a; });
  v.addEventListener('play', () => { rate(); if (e.trim && (v.currentTime < a || v.currentTime > z)) v.currentTime = a; if (v._music) { v._music.play().catch(() => {}); } });
  v.addEventListener('pause', () => { if (v._music) v._music.pause(); });
  if (e.trim) v.addEventListener('timeupdate', () => { if (v.currentTime >= z - 0.05 || v.currentTime < a - 0.3) { v.currentTime = a; if (v._music) v._music.currentTime = (e.music && e.music.start) || 0; } });
  if (e.orig === false) { v._orig = false; v.muted = true; }
  if (e.music) {
    const m = h('audio', { src: e.music.file, loop: true, preload: 'none' }); m.volume = e.music.vol == null ? 0.8 : e.music.vol; m.muted = !v._soundOn; m.currentTime = e.music.start || 0;
    v._music = m; (wrap || v.parentNode || document.body).append(m);
    if (wrap) wrap.append(h('div', { class: 'music-tag' }, h('span', { style: 'display:contents', html: ICONS.music }), ' ' + e.music.title + ' · Private Insta Audio'));
  }
}
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
  if (p.type === 'video') { mediaEl = h('video', { src: p.media, poster: p.poster, muted: true, loop: true, playsinline: true, preload: p.poster ? 'none' : 'metadata', class: 'tall' }); mediaEl.muted = true; onScreenPlay(mediaEl); }
  else mediaEl = h('img', { src: p.media, alt: p.caption.slice(0, 80), loading: 'lazy' });
  const media = h('div', { class: 'media' }, mediaEl);
  applyEdits(mediaEl, media, p.edit);
  if (p.tags && p.tags.length) media.append(h('button', { class: 'tag-pill', 'aria-label': 'Tagged people', onclick: (e) => { e.stopPropagation(); taggedSheet(p.tags); }, html: ICONS.tag }));
  let lastTap = 0;
  media.addEventListener('click', (e) => {
    const t = Date.now();
    if (t - lastTap < 320) {
      const b = h('div', { class: 'burst', html: ICONS.heartF }); media.append(b); setTimeout(() => b.remove(), 950);
      vib(15); setLike(true); lastTap = 0;
    } else { lastTap = t; if (p.type === 'video') setTimeout(() => { if (lastTap === t) { if (opts.noReelJump) setSound(mediaEl, !mediaEl._soundOn); else go('#/reels/' + p.id); } }, 330); }
  });
  const capEl = p.caption ? h('div', { class: 'cap' }, h('a', { href: '#/u/' + p.user.username }, unameEl(p.user)), ' ', richText(p.caption)) : null;
  const tagsEl = p.tags && p.tags.length ? h('div', { class: 'tagged' }, 'with ', ...p.tags.map((u, i) => [i ? ', ' : '', h('a', { href: '#/u/' + u }, h('b', null, u))])) : null;
  const previewEls = (p.preview || []).map(c => h('div', { class: 'cap' }, h('b', null, c.user.username), ' ', c.text));
  const card = h('article', { class: 'post glass' },
    h('div', { class: 'post-head' },
      ringed(p.user, 34, () => p.user.hasStory ? openStories([p.user.username]) : go('#/u/' + p.user.username)),
      h('a', { class: 'meta', href: '#/u/' + p.user.username }, unameEl(p.user), h('small', null, p.location ? ('📍 ' + p.location) : (p.type === 'video' ? 'Reel' : ago(p.created) + ' ago'), p.mine && p.vis === 'close' ? h('i', { class: 'vis-badge close' }, ' Close Friends') : p.mine && p.vis === 'followers' ? h('i', { class: 'vis-badge' }, ' Followers') : null)),
      h('button', { class: 'icon-btn', 'aria-label': 'More', html: ICONS.dots, onclick: () => postMenu(p, card) })),
    media,
    h('div', { class: 'actions' }, likeBtn,
      h('button', { class: 'icon-btn', 'aria-label': 'Comment', html: ICONS.comment, onclick: () => openComments(p, card) }),
      h('button', { class: 'icon-btn', 'aria-label': 'Share', html: ICONS.send, onclick: () => openShare(p) }),
      h('span', { class: 'sp' }), saveBtn),
    h('div', { class: 'post-body' }, likesEl, p.views ? h('div', { class: 'views' }, h('span', { style: 'display:inline-flex;width:15px', html: ICONS.eye }), ' ' + fmt(p.views) + (p.views === 1 ? ' view' : ' views')) : null, capEl, tagsEl, ...previewEls,
      p.comments > (p.preview || []).length ? h('button', { class: 'more-c', onclick: () => openComments(p, card) }, 'View all ' + p.comments + ' comments') : null,
      h('div', { class: 'time' }, ago(p.created) + ' ago')));
  watchView(p, card);
  return card;
}
function richText(s) { // caption with tappable @mentions and highlighted #hashtags
  const out = []; let last = 0;
  for (const m of String(s || '').matchAll(/([@#])([\p{L}\p{N}._]{1,40})/gu)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[1] === '@' ? h('a', { class: 'mention', href: '#/u/' + m[2].toLowerCase().replace(/\.+$/, '') }, m[0]) : h('span', { class: 'hashtag' }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < String(s || '').length) out.push(s.slice(last));
  return out;
}
function taggedSheet(names) {
  const s = sheet('Tagged in this post', h('div', { class: 'scroll list' }, ...names.map(u => h('a', { class: 'urow', href: '#/u/' + u, onclick: () => s.close() }, h('span', { class: 'sic', html: ICONS.user }), h('b', null, u)))));
}
const viewedPosts = new Set();
// v1.3: feed videos autoplay (muted) only while at least 60% on screen; nothing is preloaded until it comes near
const playIO = window.IntersectionObserver ? new IntersectionObserver((ents) => ents.forEach(en => {
  const v = en.target;
  if (en.isIntersecting && en.intersectionRatio >= 0.6) { if (v.preload === 'none') v.preload = 'metadata'; setSound(v, false); v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}), { threshold: [0, 0.6] }) : null;
function onScreenPlay(v) { if (playIO) playIO.observe(v); else v.autoplay = true; }
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
  // v1.4: the outside-share buttons sit at the TOP of the sheet (always visible, never under the keyboard or the phone's nav bar)
  const msg = (p.caption ? p.caption.slice(0, 80) + ' — ' : '') + link;
  const ext = (url) => { const a = h('a', { href: url, target: '_blank', rel: 'noopener' }); document.body.append(a); a.click(); a.remove(); };
  const s = sheet('Share',
    h('div', { class: 'share-actions top' },
      h('button', { onclick: () => ext('https://wa.me/?text=' + encodeURIComponent(msg)) }, h('span', { class: 'circ glass wa', html: ICONS.wa }), 'WhatsApp'),
      h('button', { onclick: () => ext('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link)) }, h('span', { class: 'circ glass fb', html: ICONS.fb }), 'Facebook'),
      h('button', { onclick: () => copy(link) }, h('span', { class: 'circ glass', html: ICONS.link }), 'Copy link'),
      navigator.share ? h('button', { onclick: () => navigator.share({ title: 'Private Insta post', text: p.caption.slice(0, 80), url: link }).catch(() => {}) }, h('span', { class: 'circ glass', html: ICONS.share }), 'More…') : null),
    h('div', { class: 'scroll' }, search, grid, note));
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
  // v1.4: coming back to Home (e.g. from a reel) shows the same feed at the same scroll position; tapping Home again makes it fresh
  const hv0 = state.homeView;
  if (hv0 && hv0.seed === state.seeds.home && Date.now() - hv0.at < 15 * 60 * 1000 && state.freshPulse !== 'home') { hv0.attach(); const y = hv0.y; requestAnimationFrame(() => window.scrollTo(0, y)); setTimeout(() => window.scrollTo(0, y), 60); return hv0.page; }
  const feed = h('div');
  const right = [
    h('a', { class: 'icon-btn', href: '#/notifications', 'aria-label': 'Notifications', style: 'position:relative' }, h('span', { style: 'display:contents', html: ICONS.heart }), h('i', { class: 'dot-badge', 'data-badge': 'notif', hidden: !state.unreadNotif })),
    h('a', { class: 'icon-btn', href: '#/inbox', 'aria-label': 'Messages', style: 'position:relative' }, h('span', { style: 'display:contents', html: ICONS.msg }), h('i', { class: 'badge', 'data-badge': 'dm', hidden: !state.unreadDm }, String(state.unreadDm))),
  ];
  const page = pageWrap(topbar(h('h1', { class: 'logo' }, h('img', { src: '/logo-v15.svg', alt: '' }), 'Private Insta'), { right }), h('main', { class: 'view' }, h('div', { class: 'stories-slot' }), feed));
  storiesRow().then(r => page.querySelector('.stories-slot').replaceWith(r));
  feed.append(spinner());
  if (state.freshPulse === 'home') { state.freshPulse = null; page.querySelector('main').prepend(h('div', { class: 'fresh-pill' }, '✨ Fresh feed')); }
  // v1.4: a "seed" gives a new mix every time Home is tapped again (followed posts from the last days stay on top)
  // v1.6: your own new post shows on top ONCE, right after you share it; any refresh after that (tap Home again, reopen) doesn't pin it
  let offset = 0, loading = false, more = true; const seed = state.seeds.home;
  const jp = state.justPosted; state.justPosted = null;
  const pin = jp && Date.now() - jp.at < 10 * 60 * 1000 ? '&pin=' + encodeURIComponent(jp.id) : '';
  async function load() {
    if (loading || !more) return; loading = true;
    try {
      const d = await GET('/api/feed?limit=8&seed=' + seed + pin + '&offset=' + offset);
      feed.querySelector('.spinner') && feed.querySelector('.spinner').remove();
      if (!offset && !d.posts.length) feed.append(await suggestions(true));
      d.posts.forEach(p => feed.append(postCard(p)));
      const had = offset; offset = d.next || (offset + d.posts.length);
      more = d.more;
      if (!more && had + d.posts.length) feed.append(h('div', { class: 'empty' }, "✨ You're all caught up"), await suggestions(false));
    } catch (e) { toast(e.message); }
    loading = false;
  }
  const onScroll = () => { if (window.innerHeight + window.scrollY > document.body.offsetHeight - 900) load(); };
  const hv = { page, seed, y: 0, at: Date.now() };
  hv.attach = () => { window.addEventListener('scroll', onScroll, { passive: true }); state.cleanup = () => { window.removeEventListener('scroll', onScroll); hv.y = window.scrollY; hv.at = Date.now(); page.querySelectorAll('video').forEach(v => v.pause()); }; };
  state.homeView = hv; hv.attach();
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
  return h('a', { href: '#/p/' + p.id }, p.type === 'video' ? (p.poster ? h('img', { src: p.poster, loading: 'lazy', alt: '' }) : h('video', { src: p.media + '#t=0.5', muted: true, preload: 'metadata', playsinline: true })) : h('img', { src: p.media, loading: 'lazy', alt: '' }),
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
  // v1.3: paginated grid (thousands of reels) — the next page loads when the bottom comes near
  let before = 0, busy = false, more = true;
  const sentinel = h('div', { class: 'more-row' });
  async function loadMore() {
    if (busy || !more) return; busy = true; sentinel.replaceChildren(spinner());
    try { const d = await GET('/api/explore?limit=30' + (before ? '&before=' + before : '')); d.posts.forEach(p => grid.append(gridItem(p))); if (d.posts.length) before = d.posts[d.posts.length - 1].created; more = d.more; }
    catch (e) { toast(e.message); }
    sentinel.replaceChildren(); busy = false;
  }
  page.querySelector('main').append(sentinel);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !grid.hidden) loadMore(); }, { rootMargin: '800px' }); io.observe(sentinel); state.cleanup = () => io.disconnect(); }
  loadMore();
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
addRoute(/^#\/reels(?:\/([a-f0-9]+))?$/, async (startId) => {
  // v1.4: every open of Reels is a new shuffle (unseen reels first); #/reels/<id> starts AT that reel (tapped on Home)
  const start = /^[a-f0-9]+$/.test(startId || '') ? startId : '';
  state.seeds.reels = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now(), have = new Set();
  const q = (off) => '/api/reels?limit=10&seed=' + state.seeds.reels + '&t0=' + t0 + (start ? '&start=' + start : '') + (off ? '&offset=' + off : '');
  // v1.3: thousands of reels — pages of 10 load as you scroll; only the reels near the screen keep a video source
  // (others are unloaded to save memory/data); a reel plays (muted until you tap 🔈) only while it fills the screen
  const wrap = h('div', { class: 'reels' });
  let d; try { d = await GET(q(0)); } catch (e) { toast(e.message); return null; }
  let muted = true, offset = d.next || d.posts.length, more = d.more, busy = false;
  if (!d.posts.length) wrap.append(h('div', { class: 'empty', style: 'color:#fff;padding-top:40vh' }, 'No reels yet. Post a video with the + button!'));
  const reels = [];
  const setSrc = (r, on) => { const v = r.v; if (on && !v.getAttribute('src')) { v.src = r.p.media; v.preload = 'metadata'; } else if (!on && v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); if (v._music) v._music.pause(); } };
  function windowAround(i) { reels.forEach((r, k) => setSrc(r, Math.abs(k - i) <= 2)); if (more && i >= reels.length - 4) loadMore(); }
  function addReel(p) {
    if (have.has(p.id)) return; have.add(p.id); // never the same reel twice in one session
    const v = h('video', { loop: true, playsinline: true, preload: 'none', poster: p.poster }); setSound(v, !muted);
    const likeIco = h('span', { class: 'gl', html: p.liked ? ICONS.heartF : ICONS.heart, style: p.liked ? 'color:var(--heart)' : '' });
    const likeN = h('span', null, p.likes == null ? '' : fmt(p.likes));
    const reel = h('section', { class: 'reel', 'data-id': p.id }, v,
      h('button', { class: 'mute', html: muted ? ICONS.mute : ICONS.vol, onclick: () => { muted = !muted; reels.forEach(x => setSound(x.v, !muted)); document.querySelectorAll('.mute').forEach(m => m.innerHTML = muted ? ICONS.mute : ICONS.vol); } }),
      h('div', { class: 'side' },
        h('button', { onclick: async () => { p.liked = !p.liked; if (p.likes != null) p.likes += p.liked ? 1 : -1; likeIco.innerHTML = p.liked ? ICONS.heartF : ICONS.heart; likeIco.style.color = p.liked ? 'var(--heart)' : ''; likeN.textContent = p.likes == null ? '' : fmt(p.likes); vib(); try { p.liked ? await POST('/api/posts/' + p.id + '/like') : await DEL('/api/posts/' + p.id + '/like'); } catch (e) { toast(e.message); } } }, likeIco, likeN),
        h('button', { onclick: () => openComments(p) }, h('span', { class: 'gl', html: ICONS.comment }), h('span', null, fmt(p.comments))),
        h('button', { 'aria-label': 'Share', onclick: () => openShare(p) }, h('span', { class: 'gl', html: ICONS.send }), h('span', null, 'Share'))),
      h('div', { class: 'info' }, h('a', { class: 'who', href: '#/u/' + p.user.username }, avatar(p.user), unameEl(p.user)), h('div', { class: 'cap', onclick: (e) => e.currentTarget.classList.toggle('open') }, richText(p.caption)), p.location ? h('small', { class: 'loc' }, '📍 ' + p.location) : null, p.tags && p.tags.length ? h('small', { class: 'loc', onclick: () => taggedSheet(p.tags) }, '👤 ' + p.tags.join(', ')) : null, p.views ? h('small', { style: 'opacity:.85' }, '▶ ' + fmt(p.views) + ' views') : null));
    applyEdits(v, reel, p.edit);
    let lt = 0; v.addEventListener('click', () => { const t = Date.now(); if (t - lt < 320 && !p.liked) { reel.querySelector('.side button').click(); const b = h('div', { class: 'burst', html: ICONS.heartF }); reel.append(b); setTimeout(() => b.remove(), 950); } else if (v.paused) v.play(); else if (t - lt > 320) setTimeout(() => { if (Date.now() - t > 300 && lt === t) v.paused ? v.play() : v.pause(); }, 330); lt = t; });
    if (!p.mine) reel.dataset.pid = p.id;
    reel.dataset.i = reels.length; reels.push({ p, v, el: reel });
    wrap.append(reel); io.observe(reel);
  }
  const io = new IntersectionObserver((ents) => ents.forEach(en => {
    const r = reels[+en.target.dataset.i]; if (!r) return;
    if (en.isIntersecting && en.intersectionRatio > 0.6) {
      windowAround(+en.target.dataset.i); setSound(r.v, !muted); r.v.play().catch(() => {});
      const pid = en.target.dataset.pid; if (pid && !viewedPosts.has(pid)) { viewedPosts.add(pid); POST('/api/posts/' + pid + '/view').catch(() => {}); }
    } else r.v.pause();
  }), { root: wrap, threshold: [0, 0.6, 1] });
  async function loadMore() {
    if (busy || !more) return; busy = true;
    try { const n = await GET(q(offset)); n.posts.forEach(addReel); offset = n.next || (offset + n.posts.length); more = n.more; } catch (e) { toast(e.message); }
    busy = false;
  }
  d.posts.forEach(addReel);
  if (reels.length) windowAround(0);
  if (state.freshPulse === 'reels') { state.freshPulse = null; toast('✨ Fresh reels'); }
  state.cleanup = () => { io.disconnect(); reels.forEach(r => { r.v.pause(); r.v.removeAttribute('src'); if (r.v._music) { r.v._music.pause(); r.v._music.removeAttribute('src'); } }); };
  return pageWrap(h('div', { class: 'reels-title' }, start ? h('button', { class: 'reels-back', 'aria-label': 'Back', html: ICONS.back, onclick: () => history.length > 1 ? history.back() : go('#/') }) : null, 'Reels'), wrap);
}, { tab: 'reels' });

// ------------------------------------------------------------------ create post / reel / story (v1.4 editor)
function uploadJSON(url, body, onProgress) { // XHR (not fetch) so the upload shows a real progress bar
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open('POST', url); x.withCredentials = true;
    x.setRequestHeader('Content-Type', 'application/json'); x.setRequestHeader('X-IG', '1');
    if (x.upload && onProgress) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch (e) {} if (x.status >= 200 && x.status < 300) res(d); else rej(new Error(d.error || ('Error ' + x.status))); };
    x.onerror = () => rej(new Error('Network problem — check your internet and try again'));
    x.send(JSON.stringify(body));
  });
}
function captureFrame(src, t, filter, maxW) { // a JPEG of the video frame at t seconds (used for the reel cover and filter thumbnails)
  return new Promise((res, rej) => {
    const v = h('video', { muted: true, playsinline: true, preload: 'auto' }); v.muted = true; v.src = src;
    const done = () => { try {
      const w = Math.min(maxW || 720, v.videoWidth || 720), s = w / (v.videoWidth || w), c = document.createElement('canvas');
      c.width = Math.round(w); c.height = Math.round((v.videoHeight || w * 16 / 9) * s);
      const ctx = c.getContext('2d'); if (filter) ctx.filter = filter; ctx.drawImage(v, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.82)); } catch (e) { rej(e); } finally { v.removeAttribute('src'); v.load(); } };
    v.onloadeddata = () => { const tt = Math.min(Math.max(0, t || 0), Math.max(0, (v.duration || 1) - 0.05)); if (Math.abs(v.currentTime - tt) < 0.01) done(); else v.currentTime = tt; };
    v.onseeked = done; v.onerror = () => rej(new Error('Could not read the video'));
    setTimeout(() => rej(new Error('Video frame timeout')), 15000);
  });
}
function bakeImage(url, filter, text) { // photo + filter + text overlay -> one JPEG (done on the phone, before upload)
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1440 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d'); if (filter) ctx.filter = filter; ctx.drawImage(img, 0, 0, c.width, c.height); ctx.filter = 'none';
      if (text && text.t) {
        const fs = text.size * c.width / 360, x = text.x / 100 * c.width, y = text.y / 100 * c.height;
        ctx.font = (text.style === 'classic' ? '600 ' : '900 ') + fs + 'px -apple-system,Segoe UI,Roboto,Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const t = text.style === 'bold' ? text.t.toUpperCase() : text.t;
        if (text.style === 'box') { const w = ctx.measureText(t).width + fs * 0.9; ctx.fillStyle = text.color.toLowerCase() === '#ffffff' ? 'rgba(0,0,0,.6)' : '#fff'; ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x - w / 2, y - fs * 0.7, w, fs * 1.4, fs * 0.3) : ctx.rect(x - w / 2, y - fs * 0.7, w, fs * 1.4)); ctx.fill(); }
        if (text.style === 'neon') { ctx.shadowColor = text.color; ctx.shadowBlur = fs * 0.6; } else { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = fs * 0.15; }
        ctx.fillStyle = text.color; ctx.fillText(t, x, y);
      }
      res(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => rej(new Error('Could not read that image')); img.src = url;
  });
}
const tfmt = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s * 10) % 10); };
const TEXT_COLORS = ['#ffffff', '#000000', '#ff3b6b', '#fbbf24', '#22c55e', '#22d3ee', '#8b5cf6', '#f97316'];
function captionSuggest(ta, box) { // #hashtag and @mention suggestions while typing the caption
  let seq = 0;
  const run = async () => {
    const pos = ta.selectionStart || ta.value.length, before = ta.value.slice(0, pos);
    const m = /(^|\s)([@#])([\p{L}\p{N}._]{0,30})$/u.exec(before); const my = ++seq;
    if (!m || (m[2] === '@' && !m[3])) { box.replaceChildren(); box.hidden = true; return; }
    let items = [];
    try {
      if (m[2] === '@') { const d = await GET('/api/search?q=' + encodeURIComponent(m[3])); items = d.users.slice(0, 8).map(u => ({ ins: '@' + u.username, el: [avatar(u), h('b', null, u.username), h('small', null, u.name || '')] })); }
      else { const d = await GET('/api/hashtags?q=' + encodeURIComponent(m[3])); items = d.tags.map(t => ({ ins: '#' + t.tag, el: [h('b', null, '#' + t.tag), h('small', null, fmt(t.posts) + ' posts')] })); if (m[3] && !items.find(i => i.ins === '#' + m[3].toLowerCase())) items.push({ ins: '#' + m[3], el: [h('b', null, '#' + m[3]), h('small', null, 'new tag')] }); }
    } catch (e) { return; }
    if (my !== seq) return;
    box.hidden = !items.length;
    box.replaceChildren(...items.map(it => h('button', { type: 'button', class: 'sug', onclick: () => {
      const start = pos - m[2].length - m[3].length; ta.value = ta.value.slice(0, start) + it.ins + ' ' + ta.value.slice(pos);
      const np = start + it.ins.length + 1; ta.focus(); ta.setSelectionRange(np, np); ta.dispatchEvent(new Event('input')); box.hidden = true;
    } }, ...it.el)));
  };
  ta.addEventListener('input', run); ta.addEventListener('click', run);
}
function tagPeopleSheet(tags, onDone) {
  const chosen = tags.slice();
  const chips = h('div', { class: 'chips' }), list = h('div', { class: 'scroll list' });
  const q = h('input', { class: 'field', placeholder: 'Search people to tag', style: 'height:42px;margin:4px 0 8px' });
  const drawChips = () => chips.replaceChildren(...(chosen.length ? chosen.map(u => h('button', { type: 'button', class: 'chip on', onclick: () => { chosen.splice(chosen.indexOf(u), 1); drawChips(); search(); } }, '@' + u, ' ✕')) : [h('small', { class: 'muted' }, 'Nobody tagged yet')]));
  let seq = 0;
  async function search() {
    const my = ++seq; let d; try { d = await GET('/api/search?q=' + encodeURIComponent(q.value.trim())); } catch (e) { return; } if (my !== seq) return;
    list.replaceChildren(...d.users.filter(u => u.username !== state.me.username).slice(0, 20).map(u => h('button', { type: 'button', class: 'urow' + (chosen.includes(u.username) ? ' on' : ''), onclick: () => {
      if (chosen.includes(u.username)) chosen.splice(chosen.indexOf(u.username), 1); else if (chosen.length < 20) chosen.push(u.username); else toast('Up to 20 people');
      drawChips(); search();
    } }, avatar(u), h('div', { class: 'st' }, h('b', null, u.username), h('small', null, u.name || '')), h('span', { class: 'gbtn sm' + (chosen.includes(u.username) ? '' : ' primary') }, chosen.includes(u.username) ? 'Tagged ✓' : 'Tag'))));
  }
  q.oninput = search;
  const s = sheet('Tag people', h('div', { style: 'padding:0 14px' }, q, chips), list, h('div', { style: 'padding:8px 14px 0' }, h('button', { class: 'gbtn primary block', onclick: () => { onDone(chosen); s.close(); } }, 'Done')));
  drawChips(); search();
}
async function draftsSheet(onOpen) {
  const list = h('div', { class: 'scroll list' }, spinner());
  const s = sheet('Drafts', list);
  async function draw() {
    let d; try { d = await GET('/api/drafts'); } catch (e) { toast(e.message); return; }
    if (!d.drafts.length) { list.replaceChildren(h('div', { class: 'empty' }, 'No drafts yet. Use "Save draft" while making a post or reel.')); return; }
    list.replaceChildren(...d.drafts.map(dr => h('div', { class: 'draft-row' },
      h('button', { type: 'button', class: 'dthumb', onclick: () => { s.close(); onOpen(dr); } }, dr.cover || dr.type === 'image' ? h('img', { src: dr.cover || dr.media, alt: '', style: dr.edit && dr.edit.filter ? 'filter:' + FILTERS[dr.edit.filter] : '' }) : h('video', { src: dr.media + '#t=0.5', muted: true, preload: 'metadata', playsinline: true })),
      h('button', { type: 'button', class: 'st', onclick: () => { s.close(); onOpen(dr); } }, h('b', null, (dr.kind === 'reel' ? '🎬 Reel' : '🖼️ Post') + ' draft'), h('small', null, (dr.caption || 'No caption').slice(0, 60)), h('small', null, 'Saved ' + ago(dr.updated) + ' ago')),
      h('button', { class: 'icon-btn', 'aria-label': 'Delete draft', html: ICONS.trash, onclick: async () => { if (!confirm('Delete this draft?')) return; try { await DEL('/api/drafts/' + dr.id); toast('Draft deleted'); draw(); } catch (e) { toast(e.message); } } }))));
  }
  draw();
}
addRoute(/^#\/create(?:\/(post|reel|story))?$/, async (want) => {
  let mode = ['post', 'reel', 'story'].includes(want) ? want : 'post', media = null, draftId = null, busy = false, dur = 0, tool = null, tracks = null;
  const ed = { filter: 'normal', speed: 1, trim: null, text: null, music: null, orig: true, coverT: null };
  const meta = { location: '', tags: [], vis: 'everyone', hideLikes: false, commentsOff: false, closeFriends: false };
  const seg = h('div', { class: 'seg glass' });
  const draftsBtn = h('button', { class: 'gbtn sm drafts-btn', hidden: true, onclick: () => draftsSheet(openDraft) }, h('span', { style: 'display:contents', html: ICONS.draft }), 'Drafts');
  const area = h('div');
  const caption = h('textarea', { class: 'field', placeholder: 'Write a caption… use #hashtags and @mentions', maxlength: 2200 });
  const sugBox = h('div', { class: 'sug-box glass', hidden: true }); captionSuggest(caption, sugBox);
  const shareTop = h('button', { class: 'top-share', onclick: () => share() }, 'Share');
  const shareBtn = h('button', { class: 'gbtn primary', onclick: () => share() }, 'Share');
  const draftBtn = h('button', { class: 'gbtn', onclick: () => saveDraft() }, 'Save draft');
  const bar = h('div', { class: 'create-bar glass' }, draftBtn, shareBtn);
  const prog = h('div', { class: 'upload-prog', hidden: true }, h('div', { class: 'box glass' }, h('b', null, 'Uploading…'), h('div', { class: 'track' }, h('i')), h('small', null, '0%')));
  const setProg = (f, label) => { prog.hidden = false; prog.querySelector('i').style.width = Math.round(f * 100) + '%'; prog.querySelector('small').textContent = Math.round(f * 100) + '%'; if (label) prog.querySelector('b').textContent = label; };
  let stage = null, mv = null, ov = null, prevAudio = null, thumbUrl = null;
  const isVideo = () => media && media.kind === 'video';
  const titleEl = h('h1', null, 'New post');
  function drawSeg() { titleEl.textContent = 'New ' + mode; seg.replaceChildren(...[['post', 'Post'], ['reel', 'Reel'], ['story', 'Story']].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { if (k === 'reel' && media && media.kind !== 'video') { toast('A reel needs a video — choose one'); } mode = k; drawSeg(); draw(); } }, l))); }
  GET('/api/drafts').then(d => { if (d.drafts.length) { draftsBtn.hidden = false; draftsBtn.lastChild.textContent = 'Drafts (' + d.drafts.length + ')'; } }).catch(() => {});
  // ---- live preview: filter, speed, trim loop, text overlay, music
  function applyPreview() {
    if (!mv) return;
    mv.style.filter = FILTERS[ed.filter] || '';
    if (isVideo()) { mv.playbackRate = ed.speed; mv.muted = !ed.orig; if (prevAudio) prevAudio.volume = ed.music ? ed.music.vol : 0.8; }
    if (ov) ov.remove(); ov = null;
    if (ed.text && ed.text.t) { ov = textOverlay(ed.text, stage); ov.classList.add('drag'); stage.append(ov); makeDraggable(ov); }
  }
  function makeDraggable(el) {
    let drag = false;
    el.addEventListener('pointerdown', (e) => { drag = true; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (!drag) return; const r = stage.getBoundingClientRect(); ed.text.x = Math.min(95, Math.max(5, (e.clientX - r.left) / r.width * 100)); ed.text.y = Math.min(95, Math.max(5, (e.clientY - r.top) / r.height * 100)); el.style.left = ed.text.x + '%'; el.style.top = ed.text.y + '%'; });
    el.addEventListener('pointerup', () => { drag = false; }); el.addEventListener('pointercancel', () => { drag = false; });
  }
  function setMusic(t) {
    if (prevAudio) { prevAudio.pause(); prevAudio.remove(); prevAudio = null; }
    ed.music = t ? { id: t.id, title: t.title, file: t.file, vol: ed.music ? ed.music.vol : 0.8 } : null;
    if (t && mv) { prevAudio = h('audio', { src: t.file, loop: true }); prevAudio.volume = ed.music.vol; stage.append(prevAudio); if (!mv.paused) prevAudio.play().catch(() => {}); }
    applyPreview();
  }
  function buildStage() {
    stage = h('div', { class: 'stage' + (isVideo() ? ' tall' : '') });
    if (isVideo()) {
      mv = h('video', { src: media.url, playsinline: true, loop: true, autoplay: true, muted: true }); mv.muted = true;
      mv.addEventListener('loadedmetadata', () => { dur = mv.duration || 0; if (ed.trim && ed.trim[1] > dur) ed.trim = null; if (tool) drawTool(); if (!thumbUrl) captureFrame(media.url, Math.min(dur * 0.3, 3), '', 160).then(u => { thumbUrl = u; if (tool === 'filter') drawTool(); }).catch(() => {}); });
      mv.addEventListener('timeupdate', () => { if (ed.trim && (mv.currentTime >= ed.trim[1] || mv.currentTime < ed.trim[0] - 0.3)) { mv.currentTime = ed.trim[0]; if (prevAudio) prevAudio.currentTime = 0; } });
      mv.addEventListener('play', () => { mv.playbackRate = ed.speed; if (prevAudio) prevAudio.play().catch(() => {}); });
      mv.addEventListener('pause', () => { if (prevAudio) prevAudio.pause(); });
      stage.addEventListener('click', (e) => { if (e.target === mv) { if (mv.paused) mv.play().catch(() => {}); else mv.pause(); } });
    } else { mv = h('img', { src: media.url, alt: '' }); thumbUrl = media.url; }
    stage.append(mv);
    if (ed.music) { const t = ed.music; ed.music = null; setTimeout(() => setMusic(t), 0); }
    applyPreview();
    return stage;
  }
  const toolDefs = () => [['filter', 'Filters', 'filter']].concat(isVideo() && mode !== 'story' ? [['trim', 'Trim', 'scissors'], ['speed', 'Speed', 'speed'], ['cover', 'Cover', 'cover'], ['music', 'Music', 'music']] : []).concat(mode !== 'story' ? [['text', 'Text', 'text']] : []);
  const toolRow = h('div', { class: 'tool-row' }), panel = h('div', { class: 'tool-panel glass', hidden: true });
  function drawTools() { toolRow.replaceChildren(...toolDefs().map(([k, l, ic]) => h('button', { type: 'button', class: 'tool' + (tool === k ? ' on' : ''), onclick: () => { tool = tool === k ? null : k; drawTools(); drawTool(); } }, h('span', { class: 'ti', html: ICONS[ic] }), l))); }
  function rangeRow(label, min, max, step, val, oninput, fmtv) { const out = h('b', null, fmtv(val)); const r = h('input', { type: 'range', min, max, step, value: val }); r.oninput = () => { out.textContent = fmtv(+r.value); oninput(+r.value); }; return h('label', { class: 'rrow' }, h('span', null, label), r, out); }
  async function drawTool() {
    panel.hidden = !tool; if (!tool) return panel.replaceChildren();
    if (tool === 'filter') panel.replaceChildren(h('div', { class: 'filter-strip' }, ...FILTER_NAMES.map(f => h('button', { type: 'button', class: 'fl' + (ed.filter === f ? ' on' : ''), onclick: () => { ed.filter = f; applyPreview(); drawTool(); } }, thumbUrl ? h('img', { src: thumbUrl, alt: '', style: 'filter:' + FILTERS[f] }) : h('i', { class: 'ph', style: 'filter:' + FILTERS[f] }), h('span', null, f[0].toUpperCase() + f.slice(1))))));
    else if (tool === 'speed') panel.replaceChildren(h('div', { class: 'chips' }, ...[0.5, 0.75, 1, 1.5, 2].map(sp => h('button', { type: 'button', class: 'chip' + (ed.speed === sp ? ' on' : ''), onclick: () => { ed.speed = sp; applyPreview(); drawTool(); } }, sp + 'x'))), h('small', { class: 'muted' }, 'Viewers see the reel at this speed.'));
    else if (tool === 'trim') {
      if (!dur) return panel.replaceChildren(spinner());
      const t = ed.trim || [0, dur]; const info = h('small', { class: 'muted' }, 'Length ' + tfmt(t[1] - t[0]));
      const upd = () => { info.textContent = 'Length ' + tfmt(ed.trim[1] - ed.trim[0]); };
      panel.replaceChildren(
        rangeRow('Start', 0, dur, 0.1, t[0], (v) => { ed.trim = [Math.min(v, (ed.trim || t)[1] - 0.5), (ed.trim || t)[1]]; mv.currentTime = ed.trim[0]; upd(); }, tfmt),
        rangeRow('End', 0, dur, 0.1, t[1], (v) => { ed.trim = [(ed.trim || t)[0], Math.max(v, (ed.trim || t)[0] + 0.5)]; mv.currentTime = Math.max(ed.trim[0], ed.trim[1] - 1); upd(); }, tfmt),
        info, h('button', { type: 'button', class: 'gbtn sm', onclick: () => { ed.trim = null; drawTool(); } }, 'Reset trim'));
    } else if (tool === 'cover') {
      if (!dur) return panel.replaceChildren(spinner());
      const img = h('img', { class: 'cover-prev', alt: 'Cover' }); let tm = null;
      const grab = (v) => { clearTimeout(tm); tm = setTimeout(() => captureFrame(media.url, v, FILTERS[ed.filter], 240).then(u => { img.src = u; }).catch(() => {}), 150); };
      const t0 = ed.coverT == null ? coverTime() : ed.coverT;
      panel.replaceChildren(h('div', { class: 'cover-wrap' }, img, h('div', { style: 'flex:1' }, h('b', null, 'Choose the cover frame'), h('small', { class: 'muted', style: 'display:block' }, 'This picture shows in the grid and before the reel plays.'),
        rangeRow('Frame', 0, Math.max(0.1, dur - 0.05), 0.05, t0, (v) => { ed.coverT = v; mv.pause(); mv.currentTime = v; grab(v); }, tfmt))));
      grab(t0);
    } else if (tool === 'music') {
      if (!tracks) { panel.replaceChildren(spinner()); try { tracks = (await GET('/api/music')).tracks; } catch (e) { toast(e.message); return; } if (tool !== 'music') return; }
      let pv = null;
      panel.replaceChildren(
        h('div', { class: 'music-list' }, h('button', { type: 'button', class: 'mrow' + (!ed.music ? ' on' : ''), onclick: () => { setMusic(null); drawTool(); } }, h('span', { class: 'ti', html: ICONS.mute }), h('div', { class: 'st' }, h('b', null, 'No music'), h('small', null, 'Only the original sound'))),
          ...tracks.map(t => h('div', { class: 'mrow' + (ed.music && ed.music.id === t.id ? ' on' : '') },
            h('button', { type: 'button', class: 'icon-btn play', 'aria-label': 'Preview ' + t.title, html: ICONS.play, onclick: (e) => { e.stopPropagation(); if (pv) { pv.pause(); pv = null; return; } pv = new Audio(t.file); pv.volume = 0.8; pv.play().catch(() => {}); setTimeout(() => { if (pv) { pv.pause(); pv = null; } }, 8000); } }),
            h('button', { type: 'button', class: 'st', onclick: () => { if (pv) { pv.pause(); pv = null; } setMusic(t); mv.currentTime = ed.trim ? ed.trim[0] : 0; mv.play().catch(() => {}); drawTool(); } }, h('b', null, t.title), h('small', null, t.artist + ' · royalty-free · ' + t.dur + 's')),
            ed.music && ed.music.id === t.id ? h('span', { class: 'ok' }, '✓') : null))),
        ed.music ? rangeRow('Music volume', 0, 1, 0.05, ed.music.vol, (v) => { ed.music.vol = v; if (prevAudio) prevAudio.volume = v; }, (v) => Math.round(v * 100) + '%') : null,
        toggleRow('Original sound', ed.orig ? 'The video\'s own sound plays' : 'Original sound is muted', ed.orig, (v) => { ed.orig = v; applyPreview(); }));
    } else if (tool === 'text') {
      if (!ed.text) { ed.text = { t: '', color: '#ffffff', style: 'bold', x: 50, y: 40, size: 28 }; }
      const inp = h('input', { class: 'field', placeholder: 'Type your text…', maxlength: 120, value: ed.text.t, style: 'height:42px;margin:0 0 8px' });
      inp.oninput = () => { ed.text.t = inp.value; applyPreview(); };
      panel.replaceChildren(inp,
        h('div', { class: 'chips' }, ...['classic', 'bold', 'neon', 'box'].map(st => h('button', { type: 'button', class: 'chip' + (ed.text.style === st ? ' on' : ''), onclick: () => { ed.text.style = st; applyPreview(); drawTool(); } }, st[0].toUpperCase() + st.slice(1)))),
        h('div', { class: 'swatches' }, ...TEXT_COLORS.map(c => h('button', { type: 'button', class: 'sw' + (ed.text.color === c ? ' on' : ''), style: 'background:' + c, 'aria-label': 'Colour ' + c, onclick: () => { ed.text.color = c; applyPreview(); drawTool(); } }))),
        rangeRow('Size', 14, 64, 1, ed.text.size, (v) => { ed.text.size = v; applyPreview(); }, (v) => v + ''),
        h('small', { class: 'muted' }, 'Drag the text on the picture to move it.'),
        h('button', { type: 'button', class: 'gbtn sm', onclick: () => { ed.text = null; applyPreview(); tool = null; drawTools(); drawTool(); } }, 'Remove text'));
      setTimeout(() => inp.focus(), 50);
    }
  }
  function optRow(k, label, sub) { return toggleRow(label, sub, meta[k], (v) => { meta[k] = v; }); }
  const tagsRow = () => h('button', { type: 'button', class: 'srow', onclick: () => tagPeopleSheet(meta.tags, (t) => { meta.tags = t; draw(); }) }, h('span', { class: 'sic', html: ICONS.tag }), h('div', { class: 'st' }, h('b', null, 'Tag people'), h('small', null, meta.tags.length ? meta.tags.map(u => '@' + u).join(', ') : 'Tag friends who are in this')), h('span', { class: 'chev', html: ICONS.chev }));
  function locRow() { const i = h('input', { class: 'field inline', placeholder: 'Add location', maxlength: 80, value: meta.location }); i.oninput = () => { meta.location = i.value; }; return h('label', { class: 'srow' }, h('span', { class: 'sic', html: ICONS.pin }), i); }
  function draw() {
    if (!media) {
      stage = mv = ov = null; tool = null;
      area.replaceChildren(h('button', { class: 'pick glass', style: 'width:100%', onclick: choose }, h('span', { style: 'display:contents', html: ICONS.image }), h('b', null, mode === 'reel' ? 'Tap to choose a video for your reel' : 'Tap to choose a photo or video'), h('small', null, 'JPG, PNG, WebP up to 8 MB · MP4/WebM up to 15 MB')));
      bar.hidden = true; shareTop.disabled = true; return;
    }
    bar.hidden = false; shareTop.disabled = false;
    draftBtn.hidden = mode === 'story';
    if (!stage) buildStage();
    drawTools(); drawTool();
    area.replaceChildren(stage, h('div', { class: 'row-btns' }, h('button', { class: 'gbtn sm', onclick: choose }, 'Change'), isVideo() ? h('small', { class: 'muted' }, 'Tap the video to play / pause') : null), toolRow, panel,
      mode === 'story' ? null : h('div', { class: 'cap-wrap' }, caption, sugBox),
      h('div', { class: 'list glass slist', style: 'margin-bottom:12px' }, ...(mode === 'story'
        ? [optRow('closeFriends', 'Close Friends only', 'Green ring — only people on your Close Friends list see it')]
        : [tagsRow(), locRow()])),
      mode === 'story' ? null : section('Audience', choiceRow('Who can see this', meta.vis === 'close' ? 'Only your Close Friends list' : meta.vis === 'followers' ? 'Only your followers' : 'Everyone who can see your profile', meta.vis, [['everyone', 'Everyone'], ['followers', 'Followers'], ['close', 'Close Friends']], (v) => { meta.vis = v; })),
      mode === 'story' ? null : section('Advanced settings', optRow('hideLikes', 'Hide like count', 'Only you will see the total number of likes'), optRow('commentsOff', 'Turn off commenting', 'You can change this later from the ••• menu')),
      h('div', { style: 'height:90px' }));
  }
  async function choose() {
    const f = await pickFile(mode === 'reel' ? 'video/mp4,video/webm,video/quicktime' : 'image/*,video/mp4,video/webm,video/quicktime'); if (!f) return;
    try {
      const m = await prepareMedia(f, 1440);
      if (mode === 'reel' && m.kind !== 'video') return toast('A reel needs a video');
      if (prevAudio) { prevAudio.pause(); prevAudio = null; }
      media = m; draftId = null; stage = null; thumbUrl = null; dur = 0; ed.trim = null; ed.coverT = null; ed.speed = 1;
      if (m.kind === 'video' && mode === 'post') mode = 'reel';
      drawSeg(); draw();
    } catch (e) { toast(e.message); }
  }
  function openDraft(d) {
    if (prevAudio) { prevAudio.pause(); prevAudio = null; }
    media = { kind: d.type, url: d.media, draftId: d.id }; draftId = d.id; stage = null; thumbUrl = d.cover || null; dur = 0;
    const e = d.edit || {};
    Object.assign(ed, { filter: e.filter || 'normal', speed: e.speed || 1, trim: e.trim || null, text: e.text || null, music: e.music || null, orig: e.orig !== false, coverT: null });
    Object.assign(meta, { location: d.location || '', tags: d.tags || [], vis: d.vis || 'everyone', hideLikes: !!d.hideLikes, commentsOff: !!d.commentsOff });
    caption.value = d.caption || ''; mode = d.kind === 'reel' ? 'reel' : 'post'; drawSeg(); draw(); toast('Draft opened');
  }
  const editPayload = () => ({ filter: ed.filter, speed: ed.speed, trim: ed.trim, text: ed.text && ed.text.t ? ed.text : null, music: ed.music ? { id: ed.music.id, vol: ed.music.vol } : null, orig: ed.orig });
  const fields = () => ({ kind: mode === 'reel' ? 'reel' : 'post', caption: caption.value, location: meta.location, tags: meta.tags, visibility: meta.vis, hideLikes: meta.hideLikes, commentsOff: meta.commentsOff });
  const coverTime = () => ed.coverT != null ? ed.coverT : (ed.trim ? ed.trim[0] + Math.min((ed.trim[1] - ed.trim[0]) * 0.3, 3) : Math.min((dur || 1) * 0.3, 3));
  function lock(on) { busy = on; [shareBtn, shareTop, draftBtn].forEach(b => { b.disabled = on; }); }
  async function saveDraft() {
    if (!media || busy) return; lock(true); setProg(0, 'Saving draft…');
    try {
      const body = Object.assign(fields(), { edit: editPayload() });
      if (isVideo()) body.cover = await captureFrame(media.url, coverTime(), FILTERS[ed.filter]).catch(() => null);
      if (draftId) { await PUT('/api/drafts/' + draftId, body); setProg(1); }
      else { body.media = media.data; const d = await uploadJSON('/api/drafts', body, (f) => setProg(f * 0.98)); draftId = d.draft.id; media.draftId = d.draft.id; setProg(1); }
      toast('Saved to drafts 📝'); draftsBtn.hidden = false;
    } catch (e) { toast(e.message); }
    prog.hidden = true; lock(false);
  }
  async function share() {
    if (!media) return toast('Choose a photo or video first');
    if (busy) return;
    if (mode === 'reel' && !isVideo()) return toast('A reel needs a video');
    lock(true); setProg(0, mode === 'story' ? 'Sharing to your story…' : 'Preparing…');
    try {
      if (mode === 'story') {
        if (!media.data && media.kind === 'video') throw new Error('Drafts can be shared as a Post or Reel');
        const sd = media.kind === 'image' ? await bakeImage(media.url, FILTERS[ed.filter]) : media.data;
        await uploadJSON('/api/stories', { media: sd, closeFriends: meta.closeFriends }, (f) => setProg(f, 'Uploading…'));
        toast(meta.closeFriends ? 'Shared with Close Friends 💚' : 'Added to your story ✨'); prog.hidden = true; go('#/'); return;
      }
      const body = fields();
      if (media.kind === 'image') { body.media = await bakeImage(media.url, FILTERS[ed.filter], ed.text && ed.text.t ? ed.text : null); }
      else {
        body.edit = editPayload();
        body.cover = await captureFrame(media.url, coverTime(), FILTERS[ed.filter]).catch(() => null);
        if (media.draftId && !media.data) body.draftId = media.draftId; else body.media = media.data;
      }
      setProg(0.02, 'Uploading…');
      const d = await uploadJSON('/api/posts', body, (f) => setProg(Math.min(0.98, f)));
      setProg(1, 'Done ✓');
      if (draftId && media.kind === 'image') DEL('/api/drafts/' + draftId).catch(() => {}); // image drafts are re-uploaded baked, so the draft copy goes
      toast((mode === 'reel' ? 'Reel shared 🎬' : 'Posted ✨') + (d.mentionBlocked && d.mentionBlocked.length ? ' (' + d.mentionBlocked.join(', ') + " doesn't allow mentions)" : ''));
      prog.hidden = true; state.homeView = null; state.justPosted = { id: d.post.id, at: Date.now() }; go('#/p/' + d.post.id);
    } catch (e) { toast(e.message); prog.hidden = true; lock(false); }
  }
  state.cleanup = () => { if (prevAudio) prevAudio.pause(); if (mv && mv.pause) mv.pause(); };
  drawSeg(); draw();
  return pageWrap(topbar(titleEl, { back: true, right: [shareTop] }), h('main', { class: 'view create' }, h('div', { class: 'create-head' }, seg, draftsBtn), area), bar, prog);
}, { tab: 'create', noTabs: true });

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
    const txt = { like: 'liked your post.', comment: 'commented: ', follow: 'started following you.', request: 'requested to follow you.', accept: 'accepted your follow request.', mention: 'mentioned you: ', tag: 'tagged you in a post.' };
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


// ------------------------------------------------------------------ v1.5 privacy: PIN pad, Chat Lock, App Lock, native bridge (Android app)
const NATIVE_ = () => window.PrivateInstaNative || null; // added by the Android app (fingerprint + screenshot block); absent on the web
function nativeSecure(on) { try { if (NATIVE_() && NATIVE_().setSecure) NATIVE_().setSecure(!!on); } catch (e) {} }
function wantSecure(extra) { nativeSecure(extra || !!(state.me && state.me.settings && state.me.settings.screenshotBlock)); }
function msgPreview(m) {
  if (!m) return '';
  if (m.kind === 'system') return m.text;
  if (m.viewOnce) return m.kind === 'video' ? '📹 View-once video' : '📷 View-once photo';
  return m.kind === 'text' ? String(m.text).slice(0, 60) : m.kind === 'image' ? 'sent a photo' : m.kind === 'video' ? 'sent a video' : 'shared a post';
}
// full-screen number pad. submit(pin) resolves = done, throws = show the server's words (wrong PIN / tries left / lockout countdown)
function pinPad(opts) {
  return new Promise((resolve) => {
    let pin = '', busy = false, lockT = null, done = false;
    const dots = h('div', { class: 'pin-dots' });
    const msg = h('div', { class: 'pin-msg' }, opts.sub || '');
    const drawDots = () => dots.replaceChildren(...Array.from({ length: 6 }, (_, i) => h('i', { class: (i < pin.length ? 'on' : '') + (i >= 4 ? ' opt' : '') })));
    const ov = h('div', { class: 'pin-ov' + (opts.lockscreen ? ' lockscreen' : ''), role: 'dialog', 'aria-label': opts.title });
    const finish = (v) => { if (done) return; done = true; clearInterval(lockT); document.removeEventListener('keydown', onKey); ov.classList.add('out'); setTimeout(() => ov.remove(), 220); resolve(v); };
    const okBtn = h('button', { class: 'pin-ok', type: 'button', disabled: true }, opts.okLabel || 'OK');
    const setMsg = (t, bad) => { msg.textContent = t || ''; msg.classList.toggle('bad', !!bad); };
    const lockout = (sec) => {
      clearInterval(lockT); ov.classList.add('locked-out'); let left = sec;
      const tick = () => { if (left <= 0) { clearInterval(lockT); ov.classList.remove('locked-out'); setMsg('Try again now'); return; } setMsg('Too many wrong tries. Try again in ' + (left > 90 ? Math.ceil(left / 60) + ' min' : left + ' s'), true); left--; };
      tick(); lockT = setInterval(tick, 1000);
    };
    async function submit() {
      if (busy || pin.length < 4 || ov.classList.contains('locked-out')) return;
      busy = true; ov.classList.add('busy');
      try { const v = await opts.submit(pin); finish(v === undefined ? pin : v); }
      catch (e) {
        vib(60); dots.classList.remove('shake'); dots.offsetWidth; dots.classList.add('shake'); pin = ''; drawDots(); okBtn.disabled = true;
        if (e.data && e.data.lockedOut) lockout(e.data.retryAfter || 60); else setMsg(e.message, true);
      } finally { busy = false; ov.classList.remove('busy'); }
    }
    const press = (k) => {
      if (busy || ov.classList.contains('locked-out')) return;
      if (k === '⌫') pin = pin.slice(0, -1); else if (/^\d$/.test(k) && pin.length < 6) { pin += k; vib(8); }
      drawDots(); okBtn.disabled = pin.length < 4;
      if (pin.length === 6) submit();
    };
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter') submit(); else if (e.key === 'Escape' && opts.cancel !== false) finish(null); };
    document.addEventListener('keydown', onKey);
    okBtn.onclick = submit;
    const keys = h('div', { class: 'pin-keys' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => h('button', { type: 'button', onclick: () => press(k) }, k)),
      opts.extra ? h('button', { type: 'button', class: 'pin-x', onclick: async () => { try { const v = await opts.extra.run(); if (v) finish(v); } catch (e) { setMsg(e.message, true); } }, html: opts.extra.html, 'aria-label': opts.extra.label }) : h('span'),
      h('button', { type: 'button', onclick: () => press('0') }, '0'),
      h('button', { type: 'button', class: 'pin-del', onclick: () => press('⌫'), 'aria-label': 'Delete' }, '⌫'));
    ov.append(h('div', { class: 'pin-box' },
      opts.cancel === false ? null : h('button', { class: 'icon-btn pin-close', type: 'button', html: ICONS.close, 'aria-label': 'Cancel', onclick: () => finish(null) }),
      opts.top || null,
      h('div', { class: 'pin-ic', html: ICONS.lock }), h('h2', null, opts.title), dots, msg, keys, okBtn,
      opts.foot || null));
    drawDots(); document.body.append(ov);
    if (opts.lockedOut) lockout(opts.lockedOut);
    if (opts.autoExtra && opts.extra) setTimeout(() => keys.querySelector('.pin-x') && keys.querySelector('.pin-x').click(), 350);
  });
}
async function createPin(kind) { // asks twice; returns the new PIN or null
  const label = kind === 'app' ? 'App Lock PIN' : 'Chat PIN';
  const first = await pinPad({ title: 'Create a ' + label, sub: '4 to 6 digits. ' + (kind === 'app' ? 'Asked every time Private Insta opens.' : 'Opens your locked and hidden chats.'), submit: async (p) => p });
  if (!first) return null;
  return pinPad({ title: 'Confirm your ' + label, sub: 'Type the same PIN again', submit: async (p) => { if (p !== first) throw new Error("PINs don't match — try again"); return p; } });
}
async function setupChatPin() {
  const pin = await createPin('chat'); if (!pin) return false;
  try { await POST('/api/chat-lock/pin', { pin }); toast('Chat PIN set 🔒'); return true; } catch (e) { toast(e.message); return false; }
}
// opens locked + hidden chats on this session (server keeps them open ~10 min; leaving the private area locks them again)
async function unlockChats(title) {
  const ok = await pinPad({ title: title || 'Enter Chat PIN', sub: 'Locked and hidden chats need your PIN', submit: (pin) => POST('/api/chat-lock/unlock', { pin }),
    foot: h('button', { class: 'pin-forgot', type: 'button', onclick: async () => {
      const pw = await askPassword('Forgot Chat PIN?', 'Enter your account password, then choose a new Chat PIN.', 'Continue'); if (!pw) return;
      const pin = await createPin('chat'); if (!pin) return;
      try { await POST('/api/chat-lock/pin', { pin, password: pw }); toast('New Chat PIN set ✓ — enter it now'); } catch (e) { toast(e.message); }
    } }, 'Forgot PIN?') });
  if (ok) state.chatArea = true;
  return !!ok;
}
function leavePrivateArea(hash) {
  if (state.chatArea && !/^#\/(inbox\/(locked|hidden)|dm\/)/.test(hash)) { state.chatArea = false; POST('/api/chat-lock/lock').catch(() => {}); }
  if (!/^#\/dm\//.test(hash)) wantSecure(false);
}
async function chatFolderAction(username, action) { // action: lock | unlock | hide | unhide
  try {
    if ((action === 'lock' || action === 'hide') && !(await GET('/api/privacy')).chatPinSet) { toast('First create a Chat PIN'); if (!(await setupChatPin())) return false; }
    const url = (action === 'lock' || action === 'unlock' ? '/api/chat-lock/chats/' : '/api/hidden-chats/') + encodeURIComponent(username);
    const call = () => (action === 'lock' || action === 'hide') ? POST(url) : DEL(url);
    try { await call(); } catch (e) { if (e.status === 423 && (await unlockChats())) await call(); else throw e; }
    if (!state.chatArea) POST('/api/chat-lock/lock').catch(() => {}); // locking from the normal inbox: the folder asks for the PIN next time
    toast({ lock: '🔒 Chat locked — find it in Locked chats', unlock: 'Chat unlocked — back in your inbox', hide: '🙈 Chat hidden — open it from Privacy Center → Hidden chats', unhide: 'Chat is visible again' }[action]);
    return true;
  } catch (e) { if (e.message) toast(e.message); return false; }
}
function chatMenu(username, d, onChange) { // ••• on a chat row / chat header
  const f = d && d.folder;
  const s = sheet('Chat options',
    h('div', { class: 'scroll menu-list' },
      f === 'locked' ? h('button', { class: 'mi', onclick: async () => { s.close(); if (await chatFolderAction(username, 'unlock')) onChange && onChange(); } }, '🔓 Unlock chat')
        : h('button', { class: 'mi', onclick: async () => { s.close(); if (await chatFolderAction(username, 'lock')) onChange && onChange(); } }, '🔒 Lock chat', h('small', null, 'Move to Locked chats, opens with your Chat PIN')),
      f === 'hidden' ? h('button', { class: 'mi', onclick: async () => { s.close(); if (await chatFolderAction(username, 'unhide')) onChange && onChange(); } }, '👁 Unhide chat')
        : h('button', { class: 'mi', onclick: async () => { s.close(); if (await chatFolderAction(username, 'hide')) onChange && onChange(); } }, '🙈 Hide chat', h('small', null, 'Disappears from your inbox, opens with your Chat PIN')),
      d && 'vanish' in d ? h('button', { class: 'mi', onclick: () => { s.close(); vanishSheet(username, d.vanish, onChange); } }, '👻 Vanish mode', h('small', null, d.vanish ? 'On — ' + VANISH_TXT[d.vanish.mode] : 'Off')) : null,
      h('a', { class: 'mi', href: '#/u/' + username, onclick: () => s.close() }, '👤 View profile')));
}
const VANISH_TXT = { seen: 'messages disappear after they are seen', '1h': 'messages disappear after 1 hour', '24h': 'messages disappear after 24 hours' };
function vanishSheet(username, cur, onChange) {
  const mode = cur ? cur.mode : 'off';
  const opt = (v, label, sub) => h('button', { class: 'mi' + (mode === v ? ' on' : ''), onclick: async () => {
    s.close();
    try { await PUT('/api/dm/' + encodeURIComponent(username) + '/vanish', { mode: v }); toast(v === 'off' ? 'Vanish mode off' : '👻 Vanish mode on'); onChange && onChange(); } catch (e) { toast(e.message); }
  } }, label, sub ? h('small', null, sub) : null, mode === v ? h('b', { class: 'tick' }, '✓') : null);
  const s = sheet('Vanish mode',
    h('div', { class: 'scroll menu-list' },
      h('p', { class: 'sub', style: 'text-align:left;margin:0 6px 10px' }, 'New messages delete themselves from the server. Both of you see a banner. Screenshots can\'t be detected on the web, so the chat blurs when the app goes to the background (the Android app also blocks screenshots in vanish chats).'),
      opt('seen', 'After seen', 'Gone when they have seen it and leave the chat'), opt('1h', '1 hour', 'Deleted 1 hour after sending'), opt('24h', '24 hours', 'Deleted 24 hours after sending'), opt('off', 'Off', 'Messages stay')));
}
// view-once: the server sends the file once and deletes it; we show it from memory and forget it on close
async function openViewOnce(m, onDone) {
  let r; try { r = await POST('/api/messages/' + m.id + '/open'); } catch (e) { toast(e.message); onDone && onDone(); return; }
  let blobUrl = r.data; // decode in memory (no network request; the page's security policy blocks fetch(data:))
  try { const [hd, b64] = r.data.split(','); const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); blobUrl = URL.createObjectURL(new Blob([arr], { type: hd.slice(5).split(';')[0] })); } catch (e) {}
  wantSecure(true);
  const media = r.kind === 'video' ? h('video', { src: blobUrl, autoplay: true, playsinline: true, controls: false }) : h('img', { src: blobUrl, alt: 'view-once photo', draggable: 'false' });
  media.addEventListener('contextmenu', (e) => e.preventDefault());
  const close = () => { try { URL.revokeObjectURL(blobUrl); } catch (e) {} ov.remove(); onDone && onDone(); wantSecure(state.secureChat); };
  const ov = h('div', { class: 'vo-viewer', onclick: (e) => { if (e.target === ov || e.target === media) close(); } },
    h('div', { class: 'vo-top' }, h('span', null, r.kind === 'video' ? '📹 View-once video' : '📷 View-once photo'), h('button', { class: 'icon-btn', html: ICONS.close, onclick: close, 'aria-label': 'Close' })),
    media, h('div', { class: 'vo-foot' }, 'Opens once. When you close it, it\'s gone from the server.'));
  if (r.kind === 'video') media.onended = close;
  document.body.append(ov);
}
// App Lock lock screen (sits above everything; the server refuses data until the PIN or fingerprint is right)
async function showAppLock() {
  if (state.appLockShown) return; state.appLockShown = true;
  if (state.es) { try { state.es.close(); } catch (e) {} state.es = null; }
  document.documentElement.classList.add('app-locked');
  const bioKey = (() => { try { return NATIVE_() && NATIVE_().hasKey && NATIVE_().hasKey() ? true : false; } catch (e) { return false; } })();
  const me = state.me || {};
  const ok = await pinPad({ title: 'Private Insta is locked', sub: me.username ? 'Enter your App Lock PIN, @' + me.username : 'Enter your App Lock PIN', lockscreen: true, cancel: false,
    submit: (pin) => POST('/api/app-lock/verify', { pin }),
    extra: bioKey ? { label: 'Use fingerprint', html: ICONS.finger, run: bioUnlock } : null, autoExtra: bioKey,
    foot: h('button', { class: 'pin-forgot', type: 'button', onclick: async () => { if (!confirm('Forgot your App Lock PIN? Log out and log in again with your password, then turn App Lock off in Privacy Center.')) return; await POST('/api/logout').catch(() => {}); location.hash = '#/login'; location.reload(); } }, 'Forgot PIN? Log out') });
  state.appLockShown = false; document.documentElement.classList.remove('app-locked');
  if (ok) { state.bgAt = 0; connectStream(); render(); }
}
function bioUnlock() { // Android app: fingerprint prompt -> device key -> server
  return new Promise((resolve, reject) => {
    const cb = '__bio' + Date.now();
    window[cb] = async (okk, payload) => {
      delete window[cb];
      if (!okk) return reject(new Error(payload || 'Fingerprint not recognised'));
      try { const k = JSON.parse(payload); await POST('/api/app-lock/bio-verify', { deviceId: k.deviceId, secret: k.secret }); resolve(true); } catch (e) { reject(e); }
    };
    try { NATIVE_().authenticate(cb); } catch (e) { delete window[cb]; reject(new Error('Fingerprint is not available')); }
  });
}
// auto-lock after X minutes in the background + blur chats while the app is in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { state.bgAt = Date.now(); document.documentElement.classList.add('bg-blur'); return; }
  document.documentElement.classList.remove('bg-blur');
  const al = state.appLock; if (!al || !state.me || state.appLockShown || state.picking) return;
  const away = Date.now() - (state.bgAt || Date.now());
  if (state.bgAt && away >= Math.max(5000, (al.minutes || 0) * 60000)) POST('/api/app-lock/lock').catch(() => {}).then(() => showAppLock());
});
window.addEventListener('blur', () => document.documentElement.classList.add('bg-blur'));
window.addEventListener('focus', () => document.documentElement.classList.remove('bg-blur'));
setInterval(() => { if (state.appLock && state.me && !document.hidden && !state.appLockShown) POST('/api/app-lock/alive').catch(() => {}); }, 60000);

// ------------------------------------------------------------------ inbox + chat
function convRows(list, empty, folder) {
  return list.length ? list.map(c => {
    const l = c.last; const prev = l.kind === 'system' ? l.text : (l.mine ? 'You: ' : '') + msgPreview(l);
    const row = h('a', { class: 'row' + (c.unread ? ' unread' : ''), href: '#/dm/' + c.user.username }, ringed(c.user, 52),
      h('div', { class: 'meta' }, h('b', null, c.user.name || c.user.username, l.vanish ? h('span', { class: 'vtag', title: 'Vanish mode' }, ' 👻') : null), h('small', null, prev.slice(0, 60) + ' · ' + ago(l.created))), c.unread ? h('i', { class: 'udot' }) : null,
      h('button', { class: 'icon-btn row-more', type: 'button', html: ICONS.dots, 'aria-label': 'Chat options', onclick: (e) => { e.preventDefault(); e.stopPropagation(); chatMenu(c.user.username, { folder: folder || null }, render); } }));
    // long-press a chat = same options (lock / hide), like Instagram
    let pt; row.addEventListener('pointerdown', () => { pt = setTimeout(() => { vib(25); row.dataset.lp = '1'; chatMenu(c.user.username, { folder: folder || null }, render); }, 600); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => row.addEventListener(ev, () => clearTimeout(pt)));
    row.addEventListener('click', (e) => { if (row.dataset.lp) { e.preventDefault(); delete row.dataset.lp; } });
    row.addEventListener('contextmenu', (e) => e.preventDefault());
    return row;
  }) : [empty];
}
// v1.5: Locked chats / Hidden chats folders (PIN)
function folderPage(kind) {
  return async () => {
    let d;
    try { d = await GET('/api/inbox/' + kind); }
    catch (e) {
      if (e.status !== 423) { toast(e.message); return null; }
      if (!(await unlockChats(kind === 'hidden' ? 'Hidden chats' : 'Locked chats'))) { history.length > 1 ? history.back() : go('#/inbox'); return null; }
      try { d = await GET('/api/inbox/' + kind); } catch (x) { toast(x.message); return null; }
    }
    state.chatArea = true; wantSecure(true);
    const info = kind === 'hidden' ? 'Hidden chats never show in your inbox. New messages here notify you as "New message" only.' : 'Locked chats open only with your Chat PIN. Notifications from them say "New message" — no name, no text.';
    const box = h('div', { class: 'list glass' }, ...convRows(d.conversations, h('div', { class: 'empty' }, kind === 'hidden' ? 'No hidden chats. Use ••• on a chat → Hide chat.' : 'No locked chats. Use ••• on a chat → Lock chat.'), kind));
    const lockNow = h('button', { class: 'gbtn sm', onclick: async () => { await POST('/api/chat-lock/lock').catch(() => {}); state.chatArea = false; toast('Locked 🔒'); go('#/inbox'); } }, 'Lock now');
    return pageWrap(topbar(kind === 'hidden' ? '🙈 Hidden chats' : '🔒 Locked chats', { back: true, right: [lockNow] }), h('main', { class: 'view' }, h('p', { class: 'sub folder-info' }, info), box));
  };
}
addRoute(/^#\/inbox\/locked$/, folderPage('locked'), { tab: '' });
addRoute(/^#\/inbox\/hidden$/, folderPage('hidden'), { tab: '' });
addRoute(/^#\/inbox$/, async () => {
  const box = h('div', { class: 'list glass' }, spinner());
  const reqLink = h('a', { class: 'req-link', href: '#/inbox/requests', hidden: true });
  const newBtn = h('button', { class: 'icon-btn', html: ICONS.edit, 'aria-label': 'New message', onclick: newMessage });
  const lockedRow = h('div', { class: 'locked-slot' });
  GET('/api/inbox').then(d => {
    state.unreadDm = d.conversations.reduce((a, c) => a + c.unread, 0); updateBadges();
    if (d.requests) { reqLink.textContent = 'Requests (' + d.requests + ')'; reqLink.hidden = false; }
    if (d.locked && d.locked.count) lockedRow.replaceChildren(h('a', { class: 'row locked-row', href: '#/inbox/locked' }, h('span', { class: 'lk-ic', html: ICONS.lock }),
      h('div', { class: 'meta' }, h('b', null, 'Locked chats'), h('small', null, d.locked.count + (d.locked.count === 1 ? ' chat' : ' chats') + ' · opens with your Chat PIN')), d.locked.unread ? h('i', { class: 'udot' }) : null, h('span', { class: 'chev', html: ICONS.chev })));
    box.replaceChildren(...convRows(d.conversations, h('div', { class: 'empty' }, h('span', { style: 'display:block', html: ICONS.msg }), 'No messages yet', h('br'), h('button', { class: 'gbtn primary sm', style: 'margin-top:12px', onclick: newMessage }, 'Send message'))));
  }).catch(e => toast(e.message));
  return pageWrap(topbar(state.me.username, { back: true, right: [newBtn] }), h('main', { class: 'view' }, lockedRow, h('div', { class: 'section-t inbox-h' }, h('span', null, 'Messages'), reqLink), box));
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
  let d; try { d = await GET('/api/dm/' + encodeURIComponent(username)); } catch (e) {
    let err = e;
    if (e.status === 423 && e.data && e.data.chatLocked) { // v1.5: locked / hidden chat -> Chat PIN, then open
      if (await unlockChats(e.data.folder === 'hidden' ? 'Hidden chat' : 'Locked chat')) { try { d = await GET('/api/dm/' + encodeURIComponent(username)); err = null; } catch (x) { err = x; } }
      else { history.length > 1 ? history.back() : go('#/inbox'); return null; }
    }
    if (err) { toast(err.message); return pageWrap(topbar('Chat', { back: true }), h('main', { class: 'view' }, h('div', { class: 'empty' }, err.message))); }
  }
  const u = d.user;
  if (d.folder) state.chatArea = true;
  state.secureChat = !!(d.folder || d.vanish); wantSecure(state.secureChat); // Android app: no screenshots in locked / vanish chats
  const chat = h('div', { class: 'chat' + (d.vanish ? ' vanish' : '') });
  const expT = [];
  const lastSeenTxt = () => u.online ? 'Active now' : (u.lastActive ? 'Active ' + ago(u.lastActive) + ' ago' : '@' + u.username);
  const status = h('small', null, lastSeenTxt());
  const typingEl = h('div', { class: 'msg them typing', hidden: true }, h('i'), h('i'), h('i'));
  const seenEl = h('div', { class: 'seen-l', hidden: true }, 'Seen');
  let lastT = 0;
  function bubble(m) {
    const cls = 'msg ' + (m.mine ? 'me' : 'them');
    let el;
    if (m.kind === 'system') { el = h('div', { class: 'msg-sys' }, h('span', { html: ICONS.ghost }), m.text); el.dataset.id = m.id; return el; }
    if (m.viewOnce) { // v1.5 view-once bubble: no file link ever reaches the page until the receiver taps it (once)
      const what = m.kind === 'video' ? 'Video' : 'Photo', ic = m.kind === 'video' ? '📹' : '📷';
      const label = m.mine ? (m.opened ? 'Opened' : 'Delivered') : (m.opened ? 'Opened' : m.expired ? 'Expired' : 'Tap to view');
      el = h('div', { class: cls + ' vonce' + (m.opened || m.expired ? ' used' : '') }, h('span', { class: 'vo-ic' }, ic), h('div', null, h('b', null, what + ' · view once'), h('small', null, label)));
      if (!m.mine && !m.opened && !m.expired) el.onclick = () => { el.classList.add('used'); el.onclick = null; el.querySelector('small').textContent = 'Opening…'; openViewOnce(m, () => { el.querySelector('small').textContent = 'Opened'; }); };
    }
    else if (m.kind === 'image') el = h('div', { class: cls + ' media' }, h('img', { src: m.media, alt: 'photo', onclick: () => window.open(m.media, '_blank') }), m.text ? h('div', { class: 't' }, m.text) : null);
    else if (m.kind === 'video') el = h('div', { class: cls + ' media' }, h('video', { src: m.media, controls: true, playsinline: true, preload: 'metadata' }));
    else if (m.kind === 'post') {
      el = h('div', { class: cls + ' media' }, m.post ? h('a', { class: 'shared', href: '#/p/' + m.post.id }, h('div', { class: 'sh-h' }, avatar(m.post.user), m.post.user.username),
        m.post.type === 'video' ? h('video', { src: m.post.media + '#t=0.5', muted: true, preload: 'metadata' }) : h('img', { src: m.post.media, alt: '' }), m.post.caption ? h('p', null, m.post.caption) : null) : h('div', { class: 't' }, 'Post unavailable'),
        m.text ? h('div', { class: 't' }, m.text) : null);
    } else el = h('div', { class: cls }, m.text);
    el.dataset.id = m.id;
    if (m.vanish) { el.classList.add('vmsg'); if (m.expiresAt) expT.push(setTimeout(() => el.remove(), Math.max(0, m.expiresAt - Date.now()))); }
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
  state.chatWith = u.username; state.chatRef = d.chatRef;
  const refetch = async () => { try { const r = await GET('/api/dm/' + encodeURIComponent(u.username)); r.messages.forEach(m => addMsg(m, true)); scrollDown(); } catch (e) {} };
  state.chatHandler = (ev) => {
    if (ev.type === 'dm' && ev.private) { refetch(); return; }
    if (ev.type === 'vanished') { (ev.ids || []).forEach(i => { const el = chat.querySelector('[data-id="' + i + '"]'); if (el) el.remove(); }); return; }
    if (ev.type === 'opened') { const el = chat.querySelector('[data-id="' + ev.id + '"]'); if (el) { el.classList.add('used'); const s = el.querySelector('small'); if (s) s.textContent = 'Opened'; } return; }
    if (ev.type === 'vanish') { if (ev.with === u.username) render(); return; }
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
  const closeVanish = () => { if (d.vanish && d.vanish.mode === 'seen') fetch('/api/dm/' + encodeURIComponent(u.username) + '/close', { method: 'POST', headers: { 'X-IG': '1' }, keepalive: true, credentials: 'same-origin' }).catch(() => {}); };
  window.addEventListener('pagehide', closeVanish);
  state.cleanup = () => { clearInterval(poll); expT.forEach(clearTimeout); window.removeEventListener('pagehide', closeVanish); closeVanish(); };
  const input = h('input', { placeholder: 'Message…', maxlength: 2000, enterkeyhint: 'send' });
  let lastTyping = 0;
  input.oninput = () => { if (Date.now() - lastTyping > 2000) { lastTyping = Date.now(); POST('/api/dm/' + u.username + '/typing').catch(() => {}); } };
  const sendText = async (e) => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return; input.value = '';
    try { const r = await POST('/api/dm/' + u.username, { text }); addMsg(r.message, true); scrollDown(); if (r.request) toast('Sent as a message request'); } catch (x) { toast(x.message); input.value = text; }
  };
  const bar = h('form', { class: 'chat-bar glass', onsubmit: sendText },
    h('button', { type: 'button', class: 'cam', html: ICONS.cam, 'aria-label': 'Send photo', onclick: () => {
      const send = async (viewOnce) => {
        s.close(); const f = await pickFile(viewOnce ? 'image/*,video/mp4,video/webm' : 'image/*'); if (!f) return;
        try {
          toast(viewOnce ? 'Sending view-once…' : 'Sending photo…'); const m = await prepareMedia(f, 1280);
          if (m.kind !== 'image' && !viewOnce) throw new Error('Only photos in chat (videos can be sent as view once)');
          const r = await POST('/api/dm/' + u.username, { media: m.data, viewOnce }); addMsg(r.message, true); scrollDown(); if (viewOnce) toast('Sent — it can be opened once 👁');
        } catch (x) { toast(x.message); }
      };
      const s = sheet('Send',
        h('div', { class: 'scroll menu-list' },
          h('button', { class: 'mi', onclick: () => send(false) }, '🖼 Photo', h('small', null, 'Stays in the chat')),
          h('button', { class: 'mi', onclick: () => send(true) }, '👁 View once — photo or video', h('small', null, 'Opens one time, then it is deleted from the server'))));
    } }), input, h('button', { class: 'send', type: 'submit' }, 'Send'));
  const head = h('a', { class: 'chat-head', href: '#/u/' + u.username, style: 'flex:1;min-width:0' }, ringed(u, 34), h('div', { style: 'min-width:0' }, h('b', null, u.name || u.username), status));
  let footer = bar;
  const more = h('button', { class: 'icon-btn', type: 'button', html: ICONS.dots, 'aria-label': 'Chat options', onclick: () => chatMenu(u.username, d, render) });
  const banner = d.vanish ? h('div', { class: 'vanish-banner' }, h('span', { html: ICONS.ghost }), h('div', null, h('b', null, 'Vanish mode'), h('small', null, (d.vanish.byMe ? 'You turned it on · ' : (u.username + ' turned it on · ')) + VANISH_TXT[d.vanish.mode])),
    h('button', { class: 'gbtn sm', onclick: async () => { try { await PUT('/api/dm/' + u.username + '/vanish', { mode: 'off' }); render(); } catch (e) { toast(e.message); } } }, 'Turn off')) : null;
  const lockTag = d.folder ? h('div', { class: 'lock-tag' }, d.folder === 'hidden' ? '🙈 Hidden chat · only you can find it with your PIN' : '🔒 Locked chat · opens only with your Chat PIN') : null;
  if (d.isRequest) footer = h('div', { class: 'chat-bar glass reqbar' }, h('div', { class: 'rq' }, h('b', null, (u.name || u.username) + ' wants to send you a message'), h('small', null, "They won't know you've seen it until you accept.")),
    h('div', { class: 'acts' },
      h('button', { class: 'gbtn sm', onclick: async () => { try { await POST('/api/users/' + u.username + '/block'); toast('Blocked'); go('#/inbox/requests'); } catch (e) { toast(e.message); } } }, 'Block'),
      h('button', { class: 'gbtn sm', onclick: async () => { if (!confirm('Delete this message request?')) return; try { await DEL('/api/dm/' + u.username + '/request'); toast('Request deleted'); go('#/inbox/requests'); } catch (e) { toast(e.message); } } }, 'Delete'),
      h('button', { class: 'gbtn sm primary', onclick: async () => { try { await POST('/api/dm/' + u.username + '/accept'); toast('Accepted'); render(); } catch (e) { toast(e.message); } } }, 'Accept')));
  else if (!d.canMessage) footer = h('div', { class: 'chat-bar glass reqbar' }, h('small', { style: 'margin:auto;color:var(--muted)' }, d.why || "You can't message this account"));
  const page = pageWrap(topbar(head, { back: true, right: [more] }), h('main', null, lockTag, banner, chat), footer);
  state.unreadDm = 0; refreshMe();
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  return page;
}, { noTabs: true, keepScroll: true });

// ------------------------------------------------------------------ about (+ hidden admin entry)
addRoute(/^#\/about$/, async () => {
  const logo = h('h2', { class: 'logo about-logo', style: 'justify-content:flex-start' }, h('img', { src: '/logo-v15.svg', alt: '', draggable: 'false' }), 'Private Insta');
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
    logo, h('div', { class: 'ver' }, 'Version ' + (state.version || '1.4.0')),
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
function classicRow() { // v1.4: one tap switches the whole app between Liquid Glass and Classic (applied instantly, saved to your account)
  const on = !!(state.me && state.me.settings && state.me.settings.classic);
  return toggleRow('Classic mode', 'Plain classic Instagram look — no glass, blur or glow. Turn off to get Liquid Glass back.', on, async (v) => {
    applyClassic(v);
    try { await saveSetting({ classic: v }); toast(v ? 'Classic mode on ✓' : 'Liquid Glass is back ✨'); } catch (e) { applyClassic(!v); throw e; }
  });
}
const section = (title, ...rows) => h('div', null, title ? h('div', { class: 'section-t' }, title) : null, h('div', { class: 'list glass slist' }, ...rows.filter(Boolean)));
const settingsPage = (title, ...kids) => pageWrap(topbar(title, { back: true }), h('main', { class: 'view settings' }, ...kids));

addRoute(/^#\/settings$/, async () => {
  await refreshMe();
  const me = state.me, s = me.settings;
  return settingsPage('Settings and privacy',
    h('a', { class: 'me-card glass', href: '#/edit' }, avatar(me), h('div', { class: 'st' }, h('b', null, me.name || me.username), h('small', null, '@' + me.username + ' · Edit profile')), h('span', { class: 'chev', html: ICONS.chev })),
    h('a', { class: 'pc-link glass', href: '#/settings/privacy' }, h('span', { class: 'pc-ic', html: ICONS.shield }), h('div', { class: 'st' }, h('b', null, 'Privacy Center'), h('small', null, 'Chat Lock, App Lock, vanish mode, view once, hidden chats')), h('span', { class: 'chev', html: ICONS.chev })),
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
    section('Customise',
      classicRow(),
      linkRow('gear', 'Theme and language', 'Dark, light or automatic', '#/settings/account')),
    section('Your app',
      linkRow('bell', 'Notifications', 'Likes, comments, follows, messages', '#/settings/notifications')),
    section('Security and account',
      linkRow('lock', 'Password and security', 'Change password, login activity, devices', '#/settings/security'),
      linkRow('user', 'Your account', 'Download your data, deactivate or delete', '#/settings/account')),
    section('About',
      linkRow('menu', 'About Private Insta', 'Version ' + (state.version || '1.5.0'), '#/about')),
    h('button', { class: 'gbtn block logout', onclick: async () => { await POST('/api/logout').catch(() => {}); state.me = null; state.es && state.es.close(); go('#/login'); } }, 'Log out ' + me.username));
}, { tab: 'profile' });


// ------------------------------------------------------------------ v1.5 Privacy Center: every privacy control in one place
addRoute(/^#\/settings\/privacy$/, async () => {
  await refreshMe();
  let p; try { p = await GET('/api/privacy'); } catch (e) { toast(e.message); return null; }
  const s = p.settings;
  const again = () => render();
  const chatPinRows = p.chatPinSet ? [
    linkRow('lock', 'Locked chats', p.lockedChats + (p.lockedChats === 1 ? ' chat' : ' chats') + ' · opens with your Chat PIN', '#/inbox/locked'),
    linkRow('eye', 'Hidden chats', p.hiddenChats + (p.hiddenChats === 1 ? ' chat' : ' chats') + ' · not shown in your inbox at all', '#/inbox/hidden'),
    h('button', { class: 'srow', onclick: async () => {
      const cur = await pinPad({ title: 'Current Chat PIN', sub: 'Enter your current PIN first', submit: async (x) => x }); if (!cur) return;
      const nw = await createPin('chat'); if (!nw) return;
      try { await POST('/api/chat-lock/pin', { pin: nw, currentPin: cur }); toast('Chat PIN changed ✓'); } catch (e) { toast(e.message); }
    } }, h('span', { class: 'sic', html: ICONS.edit }), h('div', { class: 'st' }, h('b', null, 'Change Chat PIN'), h('small', null, 'Forgot it? Use "Forgot PIN?" on the PIN screen (needs your password)'))),
    h('button', { class: 'srow danger-row', onclick: async () => {
      await pinPad({ title: 'Remove Chat PIN?', sub: 'All locked and hidden chats go back to your inbox', okLabel: 'Remove', submit: async (pin) => { const r = await api('DELETE', '/api/chat-lock/pin', { pin }); toast('Chat PIN removed · ' + r.released + ' chats back in your inbox'); } });
      again();
    } }, h('span', { class: 'sic', html: ICONS.trash }), h('div', { class: 'st' }, h('b', null, 'Remove Chat PIN'), h('small', null, 'Unlocks and unhides every chat'))),
  ] : [h('button', { class: 'srow', onclick: async () => { if (await setupChatPin()) again(); } }, h('span', { class: 'sic', html: ICONS.lock }), h('div', { class: 'st' }, h('b', null, 'Create Chat PIN'), h('small', null, 'A 4–6 digit PIN for Chat Lock and Hidden chats')), h('span', { class: 'chev', html: ICONS.chev }))];
  const al = p.appLock;
  const appRows = [toggleRow('App Lock', al.on ? 'PIN is asked every time Private Insta opens — on every phone and browser you are logged in on.' : 'Ask for a PIN when the app opens.', al.on, async (v) => {
    if (v) { const pin = await createPin('app'); if (!pin) throw new Error('cancelled'); await POST('/api/app-lock', { pin, minutes: 1 }); state.appLock = { minutes: 1, fingerprint: false }; toast('App Lock on 🔐'); again(); }
    else { const ok = await pinPad({ title: 'Turn off App Lock', sub: 'Enter your App Lock PIN', okLabel: 'Turn off', submit: (pin) => api('DELETE', '/api/app-lock', { pin }) }); if (!ok) throw new Error('cancelled'); state.appLock = null; try { NATIVE_() && NATIVE_().clearKey && NATIVE_().clearKey(); } catch (e) {} toast('App Lock off'); again(); }
  })];
  if (al.on) {
    appRows.push(choiceRow('Auto-lock', 'Lock again after the app has been in the background for', String(al.minutes), [['0', 'Now'], ['1', '1 min'], ['5', '5 min'], ['15', '15 min'], ['60', '1 h']], async (v) => { await PUT('/api/app-lock', { minutes: Number(v) }); state.appLock = Object.assign(state.appLock || {}, { minutes: Number(v) }); toast('Saved'); }));
    const canBio = (() => { try { return !!(NATIVE_() && NATIVE_().isBiometricAvailable && NATIVE_().isBiometricAvailable()); } catch (e) { return false; } })();
    const hasKey = (() => { try { return !!(NATIVE_() && NATIVE_().hasKey && NATIVE_().hasKey()); } catch (e) { return false; } })();
    if (canBio) appRows.push(toggleRow('Unlock with fingerprint', 'Uses this phone\'s fingerprint / face unlock. The PIN always works too.', hasKey, async (v) => {
      if (v) { const k = await POST('/api/app-lock/bio', { name: 'Android phone' }); NATIVE_().saveKey(JSON.stringify({ deviceId: k.deviceId, secret: k.secret })); toast('Fingerprint unlock on 👆'); }
      else { const k = (() => { try { return JSON.parse(NATIVE_().peekId ? NATIVE_().peekId() : '{}'); } catch (e) { return {}; } })(); NATIVE_().clearKey(); if (k.deviceId) await DEL('/api/app-lock/bio/' + k.deviceId).catch(() => {}); toast('Fingerprint unlock off'); }
    }));
    else appRows.push(h('div', { class: 'srow' }, h('span', { class: 'sic', html: ICONS.finger }), h('div', { class: 'st' }, h('b', null, 'Fingerprint unlock'), h('small', null, NATIVE_() ? 'No fingerprint / face unlock is set up on this phone (Android 9+ needed).' : 'Available in the Android app. In a browser, App Lock uses your PIN.'))));
    if (al.fingerprints.length) appRows.push(h('div', { class: 'srow col' }, h('div', { class: 'st' }, h('b', null, 'Fingerprint devices'), h('small', null, 'Phones that can unlock with a fingerprint')),
      ...al.fingerprints.map(f => h('div', { class: 'fp-dev' }, h('span', null, '👆 ' + f.name + ' · ' + new Date(f.created).toLocaleDateString()), h('button', { class: 'gbtn sm', onclick: async () => { try { await DEL('/api/app-lock/bio/' + f.id); toast('Removed'); again(); } catch (e) { toast(e.message); } } }, 'Remove')))));
    appRows.push(h('button', { class: 'srow', onclick: async () => {
      const cur = await pinPad({ title: 'Current App Lock PIN', submit: async (x) => x }); if (!cur) return;
      const nw = await createPin('app'); if (!nw) return;
      try { await POST('/api/app-lock', { pin: nw, currentPin: cur }); toast('App Lock PIN changed ✓'); } catch (e) { toast(e.message); }
    } }, h('span', { class: 'sic', html: ICONS.edit }), h('div', { class: 'st' }, h('b', null, 'Change App Lock PIN'))));
    appRows.push(h('button', { class: 'srow', onclick: async () => { await POST('/api/app-lock/lock').catch(() => {}); showAppLock(); } }, h('span', { class: 'sic', html: ICONS.lock }), h('div', { class: 'st' }, h('b', null, 'Lock now'), h('small', null, 'Test it: locks the app right away'))));
  }
  const info = (ic, title, sub) => h('div', { class: 'srow' }, h('span', { class: 'sic big' }, ic), h('div', { class: 'st' }, h('b', null, title), h('small', null, sub)));
  return settingsPage('Privacy Center',
    h('div', { class: 'pc-hero glass' }, h('span', { class: 'pc-ic', html: ICONS.shield }), h('div', null, h('b', null, 'Your privacy, your rules'), h('small', null, 'Lock chats, lock the app, send messages that vanish. Everything here is enforced by the server, not just hidden on screen.'))),
    section('Chat Lock', ...chatPinRows,
      info('🔒', 'How to lock or hide a chat', 'In Messages, tap ••• on a chat (or long-press it) → Lock chat / Hide chat. Locked chats sit in a "Locked chats" folder; hidden chats don\'t show at all. Notifications from them say only "New message". 5 wrong PINs = locked out for 5 minutes.')),
    section('App Lock', ...appRows),
    section('Secret messages',
      info('👻', 'Vanish mode', 'Open a chat → ••• → Vanish mode: messages disappear after they are seen, or after 1 hour / 24 hours. Both people see a banner.'),
      info('👁', 'View-once photos & videos', 'In a chat tap the camera → View once. It opens one time, then the file is deleted from the server.'),
      toggleRow('Read receipts', 'If off, people won\'t see "Seen" when you read their messages (and you won\'t see theirs)', s.readReceipts, (v) => saveSetting({ readReceipts: v })),
      toggleRow('Typing indicator', 'Let people see when you are typing', s.typing, (v) => saveSetting({ typing: v }))),
    section('Online status',
      toggleRow('Show when you\'re online', '"Active now" under your name in chats. If off, you can\'t see others\' either.', s.activityStatus, (v) => saveSetting({ activityStatus: v })),
      toggleRow('Show last seen', '"Active 5m ago". If off, you can\'t see others\' last seen either.', s.lastSeen !== false, (v) => saveSetting({ lastSeen: v }))),
    section('Your profile',
      toggleRow('Private account', 'Only followers you approve see your posts, reels, stories and lists', s.private, async (v) => { await saveSetting({ private: v }); toast(v ? 'Your account is now private 🔒' : 'Your account is now public'); }),
      linkRow('user', 'Follow requests', 'Approve or delete', '#/requests', state.followRequests),
      toggleRow('Hide followers & following', 'Only you can open your followers and following lists. The numbers stay visible.', !!s.hideFollowLists, (v) => saveSetting({ hideFollowLists: v })),
      linkRow('star', 'Close Friends', 'Who sees your green-ring stories and close-friends posts', '#/settings/people/close-friends')),
    section('People',
      linkRow('shield', 'Restricted accounts', 'Their comments and messages are limited quietly', '#/settings/people/restricted'),
      linkRow('shield', 'Blocked accounts', "They can't find you, see your content or message you", '#/settings/people/blocked'),
      linkRow('msg', 'Who can message you', 'Everyone, followers or nobody', '#/settings/messages')),
    section('Screen privacy',
      toggleRow('Block screenshots (Android app)', NATIVE_() ? 'Stops screenshots and screen recording everywhere in the app. Locked chats, vanish chats and view-once are always protected.' : 'Works in the Android app. On the web screenshots can\'t be blocked or detected.', !!s.screenshotBlock, async (v) => { await saveSetting({ screenshotBlock: v }); wantSecure(false); }),
      info('🌫', 'Blur in background', 'Chats are blurred whenever the app goes to the background or app switcher, so nobody peeks at them.')),
    h('p', { class: 'sub fine' }, 'Your PINs are never stored — only a salted hash. Tip: use a PIN that isn\'t your phone lock code.'));
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
      choiceRow('Appearance', 'Auto follows your phone', s.theme || 'auto', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']], async (v) => { await saveSetting({ theme: v }); applyTheme(v); }),
      classicRow()),
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
  const drawSeg = () => segEl.replaceChildren(...[['stats', 'Stats'], ['users', 'Users'], ['bots', 'Bots 🤖'], ['imports', 'Reels import 🎬'], ['posts', 'Posts'], ['stories', 'Stories'], ['comments', 'Comments']].map(([k, l]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; drawSeg(); draw(); } }, l)));
  const fmtN = (n) => Number(n || 0).toLocaleString('en-IN');
  const num = (msg, def) => { const v = prompt(msg, def == null ? '' : String(def)); if (v == null || v.trim() === '') return null; const n = Number(v); if (!Number.isFinite(n)) { toast('Enter a number'); return null; } return n; };
  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); draw(); } catch (e) { toast(e.message); if (/locked/.test(e.message)) { const pw = await askPassword('Admin', 'Session expired — confirm your password', 'Unlock'); if (pw) { await POST('/api/admin/unlock', { password: pw }).catch(x => toast(x.message)); draw(); } } } };
  async function draw() {
    body.replaceChildren(spinner());
    try {
      if (tab === 'stats') {
        const { stats } = await GET('/api/admin/stats');
        const lbl = { users: 'Real users', bots: 'Bot accounts', importedReels: 'Imported reels', activeToday: 'Active today', onlineNow: 'Online now', posts: 'Photo posts', reels: 'Reels', stories: 'Live stories', comments: 'Comments', messages: 'Messages', likes: 'Real likes', botFollows: 'Bot follows', botLikes: 'Bot likes', botComments: 'Bot comments', privateAccounts: 'Private accounts', suspended: 'Suspended' };
        body.replaceChildren(h('div', { class: 'stat-grid' }, ...Object.entries(lbl).map(([k, l]) => h('div', { class: 'glass stat' }, h('b', null, fmt(stats[k] || 0)), h('small', null, l)))),
          h('button', { class: 'gbtn block dangerb', style: 'margin-top:14px', onclick: () => { if (confirm('Reset ALL boosts (followers, likes, comments, views) to 0?')) act(() => POST('/api/admin/reset-boosts', {}), 'All boosts reset'); } }, 'Reset all boosts to 0'));
      } else if (tab === 'imports') {
        const d = await GET('/api/admin/reels');
        const last = d.last ? 'Last import: ' + fmtN(d.last.imported) + ' reels, ' + ago(d.last.at) + ' (' + (d.last.by === 'auto' ? 'automatic' : 'manual') + ')' : 'No import yet';
        body.replaceChildren(
          h('div', { class: 'stat-grid' },
            h('div', { class: 'glass stat' }, h('b', null, fmtN(d.imported)), h('small', null, 'Imported reels')),
            h('div', { class: 'glass stat' }, h('b', null, fmtN(d.pending)), h('small', null, 'Waiting to import')),
            h('div', { class: 'glass stat' }, h('b', null, fmtN(d.inbox)), h('small', null, 'Videos in import folder')),
            h('div', { class: 'glass stat' }, h('b', null, d.disk ? d.disk.freeGB + ' GB' : '—'), h('small', null, 'Server disk free'))),
          h('p', { class: 'sub fine' }, last + '. Each reel is posted by a bot anime page, with bot likes and a few bot comments.'),
          toggleRow('Auto-import', 'Every ' + d.every + ' min, new videos in the import folder are added automatically (' + d.batch + ' at a time)', d.auto, (v) => act(() => PUT('/api/admin/reels/settings', { auto: v }), v ? 'Auto-import ON' : 'Auto-import OFF')),
          h('button', { class: 'gbtn block primary', style: 'margin-top:12px', disabled: !d.pending, onclick: () => act(async () => { const r = await POST('/api/admin/reels/import?limit=100', {}); toast(fmtN(r.imported) + ' reels imported'); }) }, d.pending ? 'Import next batch (100)' : 'Nothing new to import'),
          h('button', { class: 'gbtn block dangerb', style: 'margin-top:10px', disabled: !d.imported, onclick: () => { if (confirm('Delete ALL ' + fmtN(d.imported) + ' imported reels? Auto-import will be switched off. Real users\' posts are not touched.')) act(() => DEL('/api/admin/reels'), 'Imported reels deleted'); } }, 'Delete all imported reels'),
          h('h3', { class: 'sec', style: 'margin-top:18px' }, 'Latest imported'),
          h('div', { class: 'alist' }, ...(d.recent.length ? d.recent.map(p => h('div', { class: 'glass arow' },
            h('div', { class: 'srow' }, p.poster ? h('img', { class: 'athumb', src: p.poster, alt: '' }) : h('video', { class: 'athumb', src: p.media + '#t=0.5', muted: true, preload: 'metadata' }),
              h('div', { class: 'st' }, h('b', null, '@' + p.user), h('small', null, p.caption))),
            h('div', { class: 'abtns' }, h('a', { class: 'gbtn sm', href: '#/p/' + p.id }, 'Open'),
              h('button', { class: 'gbtn sm dangerb', onclick: () => { if (confirm('Delete this reel?')) act(() => DEL('/api/admin/posts/' + p.id), 'Reel deleted'); } }, 'Delete')))) : [h('div', { class: 'empty' }, 'No imported reels yet')])));
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
