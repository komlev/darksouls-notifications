# darksouls-notifications

A browser extension (Chrome + Firefox) that plays a Dark Souls "YOU DIED" style notification whenever you send an email. Detects sends by intercepting XHR requests in the background service worker.

## Architecture

```
background.js          — service worker; intercepts network requests, detects sends
script.js              — content script; shows the overlay + plays sound on emailSent message
chrome/manifest.json   — Chrome MV3 manifest
firefox/manifest.json  — Firefox MV2 manifest
scripts/pack.js        — build script: copies shared files + browser-specific files into a zip/xpi
```

The detection pipeline:
1. `background.js` registers `chrome.webRequest.onBeforeRequest` listeners per provider
2. Each listener calls a provider-specific `is<Provider>SendRequest()` function
3. On match, sends `{ action: "emailSent" }` to the tab via `chrome.tabs.sendMessage`
4. `script.js` receives the message and renders the overlay + plays `sound.mp3`

## Supported providers

| Provider    | Endpoint pattern                                      | Detection key                                   |
|-------------|-------------------------------------------------------|-------------------------------------------------|
| Gmail       | `mail.google.com/sync/u/*/i/s*` and `/i/fd*`         | JSON smartlabels: `^f_bt`/`^pfg`, no `^r`/`^r_bt` |
| Outlook     | `outlook.*/owa/*/service.svc?action=CreateItem*`      | Body: `"MessageDisposition":"SendAndSaveCopy"` + `"ComposeOperation":"newMail"` |
| Yahoo       | `mail.yahoo.com/ws/v3/batch?name=messages.saveAndSend*` | URL param `name=messages.saveAndSend` + body `/send` + `"id":"SendMessage"` |
| ProtonMail  | `mail.proton.me/api/mail/v4/messages/*`               | POST + URL has `?Source=composer`               |
| Yandex      | `mail.yandex.ru/web-api/do-send/*`                    | POST + URL has `_send=true`                     |
| Zoho        | `mail.zoho.com/zm/send.do*`                           | Body has `sendImm=true`                         |

## Adding a new provider

Three files always need updating:

1. **`background.js`** — add `is<Provider>SendRequest()` and a new `chrome.webRequest.onBeforeRequest.addListener` block
2. **`chrome/manifest.json`** — add domain to `host_permissions`, `content_scripts[].matches`, and `web_accessible_resources[].matches`
3. **`firefox/manifest.json`** — add domain to `permissions` and `content_scripts[].matches`

To find the right detection signal: capture the send XHR in DevTools Network tab, look for a body parameter or URL pattern that is present on send but absent on draft save.

## Build & pack

```bash
pnpm pack:chrome    # outputs dist/chrome.zip
pnpm pack:firefox   # outputs dist/firefox.xpi
```

The pack script copies shared files (`background.js`, `script.js`, `style.css`, etc.) plus the browser-specific `manifest.json` and icons into a temp dir, zips it, and moves it to `dist/`.

## Version bumping

Version is kept in sync across three places:
- `package.json` (`version`)
- `chrome/manifest.json` (`version`)
- `firefox/manifest.json` (`version`)
