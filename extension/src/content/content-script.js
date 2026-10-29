/**
 * VaaniFill Chrome Extension - Content Script
 * Injected into target web pages to detect form inputs and autofill them from verified extractions.
 */

console.log('[VaaniFill Extension] Content script initialized on:', window.location.href)

// Listener for autofill trigger from popup or background worker
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== 'VAANIFILL_POPUP') {
    return
  }

  const { type, payload } = event.data
  if (type === 'INJECT_FIELDS' && payload?.values) {
    console.log('[VaaniFill Extension] Received form values for DOM injection:', payload.values)
  }
})
