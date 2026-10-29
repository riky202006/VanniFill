# VaaniFill AI - Chrome Extension (Manifest V3)

Autonomous, browser-level form field detection and DOM injection companion for VaaniFill AI. Allows citizens to speak in Hindi, English, or Hinglish to autofill forms on third-party civic, education, and healthcare portals.

## Technical Architecture

- **Background Service Worker**: `src/background/service-worker.js` (Manifest V3 lifecycle & message router)
- **Content Script**: `src/content/content-script.js` (DOM input field detection, schema mapping, and synthetic event injection)
- **Popup Interface**: `src/popup/` (User controls, real-time voice feedback, and profile selector)

## Installation & Testing in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select this `extension/` directory.
5. The VaaniFill extension icon will appear in your Chrome toolbar, ready for live in-page injection.
