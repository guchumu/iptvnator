# Android TV APK

Install this APK on Fire Stick / Android TV / Google Streamer, then **send the
playlist from your phone** (QR or device code). That is the supported TV path.

**The APK opens `https://acortador.vip/iptvnator/`. Deploy the IPTVnator
Docker/PWA at that path (the same way StreamBox already lives at `/player/`).
Until that URL serves this PWA, the APK will not load.**

Do not overwrite StreamBox's `https://acortador.vip/player/downloads/tv.apk`.
Once you copy the artifact to the host, the Fire Stick Downloader URL is:

`https://acortador.vip/iptvnator/downloads/iptvnator.apk`

Package: `com.guchumu.iptvnator` · Name: IPTVnator

## User flow

1. Sideload the APK (Downloader on Fire Stick).
2. Open IPTVnator on the TV. Scan the QR or type the device code (`AB-12-CD`)
   on your phone at `/pair`.
3. The list appears on the TV. Live channels play in LibVLC (TV) / ExoPlayer
   (phone), not the Fire Stick web player.

The 10-foot PWA (`html.is-tv`, D-pad) still works in a TV browser if you skip
the APK. Extreme InfiniTV is optional leftover copy-paste on `/pair` — it has
no phone QR pairing and is not the recommended path.

## Build the APK (GitHub Actions)

You do not need Java, Node, or Android Studio locally.

1. GitHub → **Actions** → **APK Android TV** → **Run workflow**.
2. Download the `iptvnator.apk` artifact.
3. Copy it to the host as `iptvnator/downloads/iptvnator.apk` so Downloader
   always uses the same URL.

The first run also uploads `clave-de-firma-GUARDAR-COMO-SECRETO`. Save its
contents as the repository secret `IPTVNATOR_KEYSTORE_BASE64` (do not reuse
StreamBox's `KEYSTORE_BASE64`). Without that, each build signs with a new key
and the stick rejects the update.

## What `tools/patch_android_tv.py` does

`npx cap add android` generates a phone project. The patch (run by CI) adds:

- `LEANBACK_LAUNCHER` so the app appears on the TV home screen
- optional touchscreen (a stick has no touch panel)
- 320×180 banner (`android-config/tv_banner.png`, regenerate with
  `python3 tools/make_tv_banner.py`)
- cleartext HTTP for IPTV streams
- NativePlayer plugin: LibVLC in a `:vlc` process on TV, ExoPlayer on phone

`native/android/` is not versioned; CI regenerates it.

## Local build (optional)

Node 20, JDK 17, Android SDK 34+:

```bash
cd native
npm install
npx cap add android
cd .. && python3 tools/patch_android_tv.py native/android
cd native/android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

If you move the PWA, change the URL in `capacitor.config.json` **and**
`android-config/network_security_config.xml`.
