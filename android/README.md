# Davinova for Google Play

A Trusted Web Activity: the Play Store app opens https://davinova.com full screen (no browser bar),
in app mode (`?source=app-android`), so every site change reaches the app at once.

Build (needs JDK 17+, Android SDK 36):

    export DAVINOVA_KEYSTORE=/path/davinova-upload.jks DAVINOVA_KEYSTORE_PASSWORD=...
    gradle bundleRelease   # -> app/build/outputs/bundle/release/app-release.aab

Raise `versionCode` in app/build.gradle for each new upload. After the first upload, add the
"App signing key certificate" SHA-256 from Play Console (Test and release → App integrity) to
`public/.well-known/assetlinks.json`, or the app shows a browser bar.
