# darkpattern-scanner

A Chrome extension that scans webpages for manipulative UI patterns in real time — fake countdown timers, confirm-shaming, pre-checked opt-ins, and buried unsubscribe links. Flags and labels each pattern in place using a MutationObserver so dynamically injected content gets caught too.

---

## Overview

Most dark patterns are detectable from the DOM. This extension injects a content script that runs a suite of pattern detectors on page load and on every subsequent DOM mutation. When a pattern is found, it gets labeled with a non-intrusive overlay badge directly on the offending element — no separate panel, no page reload.

---

## Patterns Detected

| Pattern | How it's detected |
|---|---|
| Fake countdown timers | elements with countdown text cross-referenced against repeated page visits |
| Confirm-shaming | negative-sentiment language in dismiss/decline buttons and modal cancel links |
| Pre-checked boxes | `input[type=checkbox]` with `checked` attribute in opt-in or marketing contexts |
| Hidden unsubscribe links | unsubscribe or opt-out links with low contrast, sub-10px font size, or `display:none` wrappers |

---

## Project Structure
```
darkpattern-scanner/
├── src/
│   ├── content/
│   │   ├── index.ts              # entry point, sets up MutationObserver
│   │   ├── scanner.ts            # orchestrates all detectors
│   │   └── overlay.ts            # injects and positions flag badges
│   ├── detectors/
│   │   ├── countdown.ts          # fake timer detection
│   │   ├── confirmShaming.ts     # negative-language button scan
│   │   ├── preChecked.ts         # pre-checked opt-in detection
│   │   └── hiddenUnsubscribe.ts  # buried unsubscribe link detection
│   ├── background/
│   │   └── service-worker.ts     # badge count, extension state
│   ├── popup/
│   │   ├── popup.html            # extension popup UI
│   │   └── popup.ts              # summary of flags on current page
│   └── types.ts                  # shared pattern + flag types
├── public/
│   ├── manifest.json
│   └── icons/
├── tests/
│   └── detectors/
├── package.json
└── vite.config.ts
```

---

## Prerequisites

- Node 18+
- Chrome 114+ (Manifest V3)
- npm or pnpm

---

## Quickstart
```bash
# 1. Clone and install
git clone https://github.com/you/darkpattern-scanner && cd darkpattern-scanner
npm install

# 2. Build the extension
npm run build
# output goes to /dist

# 3. Load into Chrome
# open chrome://extensions
# enable Developer Mode
# click Load unpacked → select the /dist folder

# 4. Visit any page and click the extension icon to see flagged patterns
```

---

## How It Works

On every page load the content script runs all detectors against the current DOM, then registers a MutationObserver to catch anything injected after the initial render:
```ts
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        scanner.scan(node)
      }
    }
  }
})

observer.observe(document.body, { childList: true, subtree: true })
```

Each detector returns a list of `Flag` objects:
```ts
type Flag = {
  element: HTMLElement
  pattern: "countdown" | "confirm-shaming" | "pre-checked" | "hidden-unsubscribe"
  confidence: "high" | "medium"
  reason: string
}
```

The overlay module then wraps each flagged element in a labeled badge without disrupting layout. Badges are injected as shadow DOM nodes so they are never affected by the host page's styles.

---

## Adding a Detector

1. Create `src/detectors/yourPattern.ts` and export a `detect(root: HTMLElement): Flag[]` function.
2. Import and register it in `scanner.ts`.
3. Add the pattern name to the `Flag` union type in `types.ts`.
4. Add a fixture page to `tests/detectors/` and write at least one positive and one negative case.

---

## Building for Production
```bash
npm run build
```

The `/dist` folder is ready to zip and submit to the Chrome Web Store. Before submitting, audit `manifest.json` permissions — the extension only needs `activeTab` and `scripting`. Do not request `<all_urls>` host permissions unless you are enabling background scanning.

---

## Testing
```bash
npm run test
```

Detector tests run in jsdom against fixture HTML files. No browser required. Integration tests that exercise the full MutationObserver pipeline require Playwright:
```bash
npm run test:e2e
```

---

## Notes

- Confidence is set to `medium` for patterns that rely on sentiment analysis (confirm-shaming) since natural language edge cases are common. High confidence is reserved for structural detections like pre-checked boxes and hidden links.
- The extension does not make any network requests and has no telemetry. All detection runs locally.
- Countdown timers that are legitimate (ticket booking, auction ending) will still be flagged. The extension makes no distinction between real and fake scarcity — that judgment is left to the user.

---

## Contributing

New detector PRs are very welcome. Include a fixture HTML page that demonstrates the pattern, a test that passes against it, and a note in this README's pattern table. Run `npm run lint` and `npm run test` before opening a PR.
