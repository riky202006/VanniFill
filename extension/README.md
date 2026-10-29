# VaaniFill AI - Chrome Extension (Manifest V3)

This extension allows users to autofill digital forms directly on third-party websites using their VaaniFill verified profiles.

## Team Ownership: Member 3

- **Background worker**: `src/background/service-worker.js`
- **Content script**: `src/content/content-script.js` (detects DOM input fields, injects values)
- **Popup UI**: `src/popup/`

## How to Test in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder from this repository.
5. The VaaniFill extension icon will appear in your Chrome toolbar.
