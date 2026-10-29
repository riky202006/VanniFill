/**
 * VaaniFill Chrome Extension - Popup Logic
 */

document.getElementById('autofill-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status-text')
  statusEl.textContent = 'Scanning fields...'

  // Placeholder for Member 3: Query active tab and send message to content-script
  setTimeout(() => {
    statusEl.textContent = 'Ready'
  }, 1000)
})
