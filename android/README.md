# Private Insta Android app (Capacitor)

The APK is a thin native shell around the live Private Insta server (`server.url` in `capacitor.config.json`), so posts, stories and chats are the same as on the website.

```bash
cd android
npm install
npx cap add android        # creates native/ (Android Studio project)
npx cap sync android
cd native && ./gradlew assembleRelease   # needs JDK 17 + Android SDK
```

Signing: create a keystore with `keytool`, then add a `signingConfigs.release` block in `native/app/build.gradle`
that reads a `keystore.properties` file kept OUTSIDE the repo (never commit `*.jks` or passwords).

Using your own server? Change `server.url` and `allowNavigation` in `capacitor.config.json`, then sync and build again.


## v1.5 native bridge
`native-src/MainActivity.java` replaces the default Capacitor `MainActivity` (copy it to `native/app/src/main/java/com/techbroz/instaglass/`). It adds `window.PrivateInstaNative` for the web app: fingerprint / face unlock for App Lock (Android BiometricPrompt, Android 9+; the phone keeps a server-made device key and releases it only after a fingerprint) and `FLAG_SECURE` screenshot blocking for locked chats, vanish chats, view-once and the "Block screenshots" setting. versionCode 6 / versionName 1.5.

v1.5 icon: launcher icon "Ghosty" = `docs/brand/logo_09.svg` (adaptive foreground = the ghost on transparent, background = gradient drawable `ic_launcher_bg_v15.xml` #5B21B6→#A855F7; legacy + round PNGs for all densities; splash screens redrawn).
