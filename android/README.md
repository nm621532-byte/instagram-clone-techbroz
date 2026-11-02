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
