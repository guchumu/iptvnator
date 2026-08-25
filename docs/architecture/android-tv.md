# Android TV, Fire Stick, and Google Streamer

Install **one IPTVnator APK**, scan the QR on the TV, and send the playlist
from the phone. That is the product path. Extreme InfiniTV is a separate GPL
app — do not vendor it here, and do not tell users to paste login fields into
InfiniTV as the main setup.

## Why StreamBox fails on Google Streamer

StreamBox wraps a remote web UI in Capacitor. On Google TV Streamer (MediaTek):

- The WebView user-agent looks like mobile Chrome, so a TV layout never
  activates unless native code injects `window.StreamBoxNative.isTv`
- Loading ExoPlayer or LibVLC **in the same process as the WebView** aborts
  when the remote moves
- `--aout=opensles` and `--avcodec-hw=none` abort LibVLC on Streamer
- Thousands of remote channel logos saturate the WebView

IPTVnator's APK keeps those Streamer-safe rules and does **not** share
StreamBox's package id or `downloads/tv.apk` URL.

## What you get

| Piece | Behavior |
| --- | --- |
| APK | Capacitor 6, `com.guchumu.iptvnator`, LEANBACK launcher + 320×180 banner |
| TV playback | LibVLC in process `:vlc` (`VlcPlayerActivity`), never overlaid on the WebView |
| Phone playback | ExoPlayer overlay on the same APK |
| Look | Cinematic 10-foot IPTVnator skin (`html.is-tv`, cyan focus, slate chrome) — inspired by InfiniTV, original CSS |
| Playlist | QR + device code on the TV; phone opens `/pair` and POSTs to `/api/pair/:deviceId` |
| Logos | Channel rows skip remote `<img>` src on TV so Streamer is not flooded |

## How to use it

1. Host the PWA at `https://acortador.vip/iptvnator/` (Docker, `BACKEND_URL=/api`,
   port 4333 behind that path). The APK's `server.url` points there.
2. Sideload `iptvnator.apk` (GitHub Actions artifact **APK Android TV**).
3. Open the app on the stick. Scan the QR with a phone on the same LAN (or
   type the device id on `/pair`).
4. The TV imports M3U URL or Xtream credentials. Play a channel: LibVLC opens
   full screen. Back closes the player.

Local Docker without the public host:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

Open `http://<LAN-IP>:4333` in a TV browser (`?tv=1` if detection misses).
Pairing still works; native LibVLC only exists inside the APK.

## Build the APK

The parent directory name contains a space; prefer CI over a local Android
Studio path:

```bash
cd native
npm install
npx cap add android
python3 ../tools/make_tv_banner.py
python3 ../tools/patch_android_tv.py android
```

Workflow: `.github/workflows/android-tv.yml`. Artifact `iptvnator.apk`. Signing
secrets: `IPTVNATOR_KEYSTORE_BASE64`, `IPTVNATOR_KEYSTORE_PASSWORD`,
`IPTVNATOR_KEY_ALIAS`, `IPTVNATOR_KEY_PASSWORD`.

## License boundary

IPTVnator is MIT. Extreme InfiniTV is GPL-3.0-or-later. This repo must not
copy InfiniTV source, assets, or package id (`com.infinitel8p.xtream`). The
optional InfiniTV field mapping on `/pair` remains a convenience for people
who already use that app — it is not the supported TV install path.
