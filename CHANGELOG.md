# Changelog

## v1.5 — 2026-11-02 · Privacy update 🔒
- **Privacy Center** (Settings → Privacy Center): every privacy control in one screen with plain-English descriptions.
- **Chat Lock:** lock any chat (••• on a chat, or long-press it). Locked chats leave the inbox and live in a **Locked chats** folder that opens only with a 4–6 digit **Chat PIN**. The PIN is stored as a salted scrypt hash; 5 wrong tries lock it out for 5 minutes (counted on the account, so a new login doesn't reset it). Forgot PIN → reset with your account password.
- Locked chats are enforced by the server: the inbox API leaves them out, and opening, reading or answering one without the PIN answers 423. Notifications from them say only **"New message"**, with no name and no text, and they don't count in the unread badge.
- **Hidden chats:** hide a chat completely (not even a folder in the inbox); open it from Privacy Center → Hidden chats with the same PIN.
- **App Lock:** optional PIN for the whole app, asked on every phone and browser you're logged in on. Auto-lock after Now / 1 / 5 / 15 / 60 minutes in the background. The server refuses data to a locked session (423), not just the screen. **Fingerprint / face unlock** in the Android app (Android 9+); in a browser App Lock uses the PIN.
- **Vanish mode** per chat: messages disappear after they're seen, or after 1 hour / 24 hours. They are hard-deleted on the server. Both people see a banner and a "turned on vanish mode" line.
- **View-once photos & videos** in DMs: the receiver can open one once, then the server deletes the file (the old link answers 404). The sender sees "Opened"; unopened ones expire after 14 days.
- **Screen privacy:** chats blur when the app goes to the background or app switcher. The Android app blocks screenshots and screen recording (FLAG_SECURE) in locked chats, vanish chats and view-once, and everywhere if "Block screenshots" is on. Screenshots can't be detected or blocked on the web.
- **New privacy toggles:** Show last seen (separate from online status), Hide followers & following lists (the counts stay visible), Block screenshots. Private account + follow requests, read receipts, typing, restrict, block and Close Friends stay as before.
- Database migrated in place (schema 6, backup `db.backup-v1.4.json` written first).
- Smoke test grows from 321 to 395 checks: wrong PIN rejected, lockout, locked chat left out of the inbox API, other users can't read or lock someone else's chat, vanish messages deleted, view-once file 404 after viewing, App Lock on other sessions.
- **New logo "Ghosty" 👻🔒** (Noor picked logo 9): Android adaptive launcher icon (all densities + round icon), splash screens, web favicon, apple-touch-icon, PWA icons (192/512 + maskable) and the in-app logo.
- Android app v1.5 (versionCode 6, same signing key — installs over v1.4).

## v1.4 — 2026-11-02 · Upload editor, Classic mode, fresh feeds ✨
- **Fresh feeds:** re-tap Home or Reels → scroll to top + new order. Every Reels open is a whole new shuffle (seeded server-side, paging never repeats), reels you already watched go after unseen ones.
- **Reels from Home:** tap a video on Home → Reels starts at that reel and continues with more; Back returns to Home at the same scroll position.
- **Classic mode** under Settings → Customise: flat Instagram look (no glass / blur / glow, solid backgrounds, thin borders), light + dark, saved per user, default off.
- **Upload editor** (Post / Reel / Story): Share button top-right + sticky Save draft / Share bar (bottom nav hidden while creating), cover frame, trim, speed 0.5–2x, 11 filters, draggable coloured text, 6 royalty-free music tracks or original sound / mute, #hashtag + @mention suggestions, tag people, location, audience (everyone / followers / close friends), hide likes, comments off, drafts, upload progress bar.
- Reel share sheet (WhatsApp / Facebook / Copy link / More) fully visible on small phones; reel actions sit above the caption; long captions clamp to 2 lines (tap to expand).
- Server validates every new field; audience enforced on posts, feeds, profile grid, comments, likes and media files; drafts are owner-only (others get 404); tagged people get a notification.
- Database migrated in place (schema 5, backup `db.backup-v1.3.json` written first).
- Smoke test grows from 270 to 321 checks.
- Android app v1.4 (versionCode 5, same signing key — installs over v1.3).

## v1.3 — 2026-11-02 · Anime reels import 🎬
- **Reels importer** (admin only, server side): imports reel videos from an import folder + `manifest.json`, hard-linked (no copy), mp4 checked, once per file name (deleted reels are never re-imported), in batches (`?limit=`).
- Each reel is posted by one of 240 generated "anime page" bot accounts, backdated over ~30 days, with the manifest caption, 20–800 bot likes, views and 0–5 bot comments.
- Reel videos stream with HTTP Range (206) and long-lived cache headers; every reel has a poster image.
- **Auto-import**: a server watcher keeps importing new files every few minutes (on/off in the admin panel). `tools/push-reels.mjs` uploads new videos (with posters and captions) to a server on another machine and keeps watching the folder.
- Admin panel: new **Reels import 🎬** tab — imported count, inbox, disk, auto-import toggle, "Import next batch", "Delete all imported reels", latest reels with Open/Delete.
- Home feed, Reels and Explore paginate and lazy-load (fast with thousands of reels); videos autoplay muted only while on screen, others pause.
- Database migrated in place (schema 4, backup `db.backup-v1.2.json` written first); user ids are shared in memory so thousands of reels stay small.
- Smoke test grows from 234 to 270 checks (import, idempotent re-run, non-admin 403, path traversal, Range 206, posters, pagination).
- Android app v1.3 (versionCode 4, same signing key — installs over v1.2).

## v1.2 — 2026-11-02 · Bot boosts
- Admin follower boosts now create **real follow edges from bot accounts** (Indian names, Hinglish-style usernames, generated avatars, short bios), so the followers list shows every boosted follower with name, photo and Follow button — not just a bigger number.
- Likes boost = bot likes ("Liked by aman.v_21 and 120 others" + a paginated Likes list). Comments boost = short positive bot comments, each from a different bot, never the same text back-to-back, owner's hidden words respected.
- Set boost lower / Reset / "Remove all bots from this user" remove only bot entries; real follows, likes and comments are never touched.
- Bots: no password (cannot log in), no sessions, never send messages or notifications; shown in search like normal accounts; counted separately in admin stats; new admin **Bots** tab.
- Followers / following / likes lists are paginated with lazy loading (fast with 10,000+ followers). Caps: 10,000 per action, 30,000 bot followers per account (bot likes per post), 300 bot comments per post.
- v1.1 boost numbers are migrated into bot entries on first start (totals unchanged).
- Smoke test grows from 197 to 234 checks.
- Android app v1.2 (versionCode 3, same signing key — installs over v1.1).

## v1.1 — 2026-11-02 · "Private Insta"
- Renamed the app to **Private Insta** (repo name and live link unchanged).
- New **Settings and privacy** screen (gear icon on your profile): edit profile (username, website, pronouns, gender, accent colour, photo), private account + follow requests, Close Friends and hide-story, story replies, message permissions + message requests, read receipts, typing indicator, comment controls, hidden words, block / restrict / mute, activity status, mentions, notification preferences, password change + login activity + log out devices, theme, language, download your data, deactivate and delete.
- Per-post "Turn off commenting" and "Hide like count"; post/reel view counts.
- Hidden owner admin panel (server-side role check): users, verified badge, suspend/delete, delete any post/comment, stats, display boosts.
- Removed the v1.0 fake demo accounts and their posts/stories; one plain test login remains.
- Smoke test grows from 70 to 197 checks.
- Android app v1.1 (versionCode 2, same signing key — installs over v1.0).

## v1.0 — 2026-11-02 · "InstaGlass"
- First release: feed, posts, likes, comments, saves, stories, reels, real-time DMs, notifications, explore, profiles, Android APK.
