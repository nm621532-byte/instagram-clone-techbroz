# Changelog

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
