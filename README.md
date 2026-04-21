# Did You Mean? — Chrome Extension

A Gmail extension that catches your personal atomic typos: real words used in the wrong context that spell check will never catch.

You typed *beset* when you meant *best*. You wrote *Greta* when you meant *great*. Autocorrect won't save you. Did You Mean? will.

---

## The problem

Standard spell checkers catch misspellings. They don't catch **real-word errors** — word substitution mistakes where every word is technically valid but one of them is wrong. These atomic typos are invisible to the spell checker and embarrassingly visible to your recipient.

Most people have a small, consistent set of these. This extension lets you define yours.

---

## How it works

1. Click the extension icon in your Chrome toolbar
2. Enter up to 8 trap words — the word you accidentally type on the left, what you actually mean on the right
3. Compose an email in Gmail as normal
4. If a trap word appears, it's flagged with an amber underline and a **"Did you mean?"** tooltip appears automatically
5. Choose to correct it or keep it as-is — nothing changes without your say-so

Session-only dismissal: "Keep as-is" suppresses the flag for that email only. Your trap word list stays intact until you edit it in the extension.

---

## Features

- Up to 8 personal trap word pairs
- Case-insensitive matching ("Greta" catches "greta", "GRETA", and "Greta")
- No auto-replacement — ever
- Gmail compose only (no inbox scanning, no other tabs)
- Works with English, Spanish, Italian, Portuguese, and other Roman alphabet languages
- Zero data collection — all trap words stored locally in your browser

---

## Installation

### From the Chrome Web Store (recommended)
[Chrome Web Store listing](https://chromewebstore.google.com/detail/did-you-mean) *(link live once published)*

### Manual / development install
1. Download and unzip this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle) → click **Load unpacked**
4. Select the unzipped folder

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Saves your trap word list locally in the browser |
| `activeTab` | Reads the Gmail compose window to scan for trap words |
| `host_permissions: mail.google.com` | Required by Manifest V3 to run the content script on Gmail |

No data ever leaves your browser.

---

## Roadmap

- [ ] Support for more than 8 trap words
- [ ] Per-word dismissal memory across sessions (opt-in)
- [ ] Support for phrases, not just single words

---

## Keywords

atomic typo, real-word error, word substitution error, context-aware spell check, Gmail proofreading, email typo checker, homophone error, personal spell check, typing habits, compose assistant, email mistakes, autocorrect alternative

---

## License

MIT

---

*Built by Jonathan Goldner — [@jgoldner](https://www.threads.net/@jgoldner)*
