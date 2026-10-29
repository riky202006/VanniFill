/**
 * VaaniFill AI - Background Service Worker (Manifest V3)
 * Configures the Chrome side panel to open on toolbar action click
 * and handles extension lifecycle events.
 */

// Enable opening side panel when user clicks extension icon in toolbar
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('[VaaniFill] Could not set side panel behavior:', err);
    });
  }
  console.log('[VaaniFill AI] Extension installed and active.');
});

// Explicit action click listener for Chrome versions or contexts where setPanelBehavior needs a trigger
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel && chrome.sidePanel.open && tab?.id) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch (err) {
        // Fallback to windowId if tabId is unsupported in this browser revision
        try {
          if (tab.windowId) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
          }
        } catch (winErr) {
          console.warn('[VaaniFill] Failed to open side panel:', winErr);
        }
      }
    }
  });
}

// Global runtime message handler for ping/diagnostics
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'VAANIFILL_BACKGROUND_PING') {
    sendResponse({ status: 'OK', timestamp: Date.now() });
  }
  return true;
});

