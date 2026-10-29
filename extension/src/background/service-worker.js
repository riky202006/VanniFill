/**
 * VaaniFill Chrome Extension - Background Service Worker (Manifest V3)
 * Handles message passing between content scripts, popup, and VaaniFill API.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[VaaniFill Extension] Installed and active.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() })
  }
  return true
})
