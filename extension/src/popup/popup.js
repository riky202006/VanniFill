/**
 * VaaniFill Chrome Extension - Popup Logic
 * Interacts with the active browser tab to orchestrate voice-driven form autofill.
 */

document.getElementById('autofill-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status-text')
  statusEl.textContent = 'Scanning fields...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_DOM_FIELDS' }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Active form detected'
        } else {
          statusEl.textContent = response?.fieldCount ? `Found ${response.fieldCount} fields` : 'Ready'
        }
      })
    }
  } catch (err) {
    statusEl.textContent = 'Ready'
  }
})
