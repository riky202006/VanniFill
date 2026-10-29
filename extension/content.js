/**
 * VaaniFill AI - Content Script
 * Performs zero-intrusion, safe DOM field detection, normalized field analysis,
 * and progressive real-time autofill.
 *
 * Rules:
 * - Scans ONLY fillable input fields, textareas, and selects.
 * - Accurately distinguishes empty vs. filled values (handling selects, checkboxes, radios, placeholders).
 * - Determines requiredness independently (required, optional, unknown).
 * - Skips passwords, hidden fields, file inputs, and sensitive controls.
 * - Uses stable IDs tagged via data-vaanifill-id for 1:1 match.
 * - Fills using native value setters (React/Vue/Angular compatible) and dispatches change/input events.
 * - NEVER transmits the entire page or unrelated data.
 * - NEVER automatically submits any form.
 */

(() => {
  // Prevent duplicate execution if injected multiple times
  if (window.__VAANIFILL_CONTENT_SCRIPT_INITIALIZED__) {
    return;
  }
  window.__VAANIFILL_CONTENT_SCRIPT_INITIALIZED__ = true;

  /**
   * Helper: Sanitize string to camelCase or clean identifier
   */
  function toCamelCase(str) {
    if (!str) return '';
    return str
      .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
      .trim()
      .split(/[\s_-]+/)
      .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join('');
  }

  /**
   * Helper: Determine if element is visible
   */
  function isElementVisible(el) {
    if (!el) return false;
    if (el.type === 'hidden') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rects = el.getClientRects();
    if (rects.length === 0 && style.position !== 'fixed') {
      return false;
    }

    return true;
  }

  /**
   * Helper: Determine if element is sensitive (passwords, credit cards, CVVs, auth tokens, OTPs)
   */
  function isSensitiveElement(el) {
    if (!el) return false;
    const inputType = (el.type || '').toLowerCase();
    if (['password', 'file', 'hidden'].includes(inputType)) return true;

    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const sensitiveAutocompletes = [
      'new-password',
      'current-password',
      'cc-number',
      'cc-csc',
      'cc-exp',
      'cc-exp-month',
      'cc-exp-year',
      'cc-type',
      'one-time-code',
      'transaction-amount',
      'transaction-currency'
    ];
    if (sensitiveAutocompletes.includes(autocomplete)) return true;

    const descriptor = `${el.id || ''} ${el.name || ''} ${el.getAttribute('aria-label') || ''} ${el.placeholder || ''} ${autocomplete}`.toLowerCase();
    if (/(password|passwd|creditcard|credit[-_]?card|cc[-_]?num|card[-_]?num|cardnumber|cvv|cvc|otp|totp|secret|auth[-_]?token|security[-_]?code|atm[-_]?pin|card[-_]?pin)/i.test(descriptor)) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Extract friendly human-readable label for a form element
   */
  function extractElementLabel(el) {
    let label = '';

    // 1. Explicit <label for="id">
    if (el.id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl) {
          label = labelEl.innerText;
        }
      } catch (e) {}
    }

    // 2. Wrapping <label>
    if (!label) {
      const parentLabel = el.closest('label');
      if (parentLabel) {
        const clone = parentLabel.cloneNode(true);
        clone.querySelectorAll('input, select, textarea').forEach((n) => n.remove());
        label = clone.innerText;
      }
    }

    // 3. aria-label or aria-labelledby
    if (!label && el.getAttribute('aria-label')) {
      label = el.getAttribute('aria-label');
    }
    if (!label && el.getAttribute('aria-labelledby')) {
      try {
        const labelledByEl = document.getElementById(el.getAttribute('aria-labelledby'));
        if (labelledByEl) label = labelledByEl.innerText;
      } catch (e) {}
    }

    // 4. placeholder
    if (!label && el.placeholder) {
      label = el.placeholder;
    }

    // 5. Preceding sibling label or span
    if (!label) {
      let prev = el.previousElementSibling;
      while (prev && !label) {
        if (['LABEL', 'SPAN', 'P', 'STRONG', 'B', 'H4', 'H5'].includes(prev.tagName)) {
          label = prev.innerText;
          break;
        }
        prev = prev.previousElementSibling;
      }
    }

    // 6. Parent container heading or previous text node
    if (!label && el.parentElement) {
      const parentPrev = el.parentElement.previousElementSibling;
      if (parentPrev && ['LABEL', 'SPAN', 'DIV'].includes(parentPrev.tagName)) {
        const text = parentPrev.innerText;
        if (text && text.length < 80) label = text;
      }
    }

    // 7. Fallback to name or id
    if (!label) {
      label = el.name || el.id || 'Field';
    }

    return label
      .replace(/\s*\*/g, '')
      .replace(/[:：]\s*$/, '')
      .trim();
  }

  /**
   * Helper: Determine requiredness independently ('required' | 'optional' | 'unknown')
   */
  function determineFieldRequiredness(el, rawLabelText = '') {
    // 1. Native HTML required attribute
    if (el.required === true || el.hasAttribute('required')) {
      return 'required';
    }

    // 2. ARIA required
    const ariaReq = el.getAttribute('aria-required');
    if (ariaReq === 'true') return 'required';
    if (ariaReq === 'false') return 'optional';

    // 3. Explicit required markers in label or container
    if (rawLabelText.includes('*') || /\brequired\b/i.test(rawLabelText)) {
      return 'required';
    }
    if (/\boptional\b/i.test(rawLabelText)) {
      return 'optional';
    }

    // 4. Form-group / wrapper indicator check
    const container = el.closest('.form-group, .field, .input-group, div');
    if (container) {
      const reqMarker = container.querySelector('.required, .req, [aria-hidden="true"]');
      if (reqMarker && (reqMarker.textContent.includes('*') || /required/i.test(reqMarker.className))) {
        return 'required';
      }
    }

    return 'optional';
  }

  /**
   * Helper: Accurately determine whether a field has a real user-entered value vs empty/placeholder
   */
  function determineElementValue(el) {
    try {
      if (!el.isConnected) {
        return { value: '', valueStatus: 'unknown' };
      }

      // 1. SELECT elements
      if (el.tagName === 'SELECT') {
        if (el.selectedIndex < 0) {
          return { value: '', valueStatus: 'empty' };
        }
        const opt = el.options[el.selectedIndex];
        if (!opt) {
          return { value: '', valueStatus: 'empty' };
        }

        const optVal = (opt.value || '').trim();
        const optText = (opt.text || '').trim();

        // Check if option is a dummy placeholder rather than a valid user choice
        const isPlaceholder =
          optVal === '' ||
          opt.disabled === true ||
          /^(\s*--|\s*select|\s*choose|\s*pick|\s*please\s+select|\s*none\s*$)/i.test(optText) ||
          ((optVal === '0' || optVal === '-1' || optVal === 'default') &&
            /--|select|choose|pick|none/i.test(optText));

        if (isPlaceholder) {
          return { value: '', valueStatus: 'empty' };
        }

        return { value: optVal || optText, valueStatus: 'filled' };
      }

      // 2. CHECKBOX
      if (el.type === 'checkbox') {
        if (el.checked) {
          const val = el.value && el.value !== 'on' ? el.value : 'true';
          return { value: val, valueStatus: 'filled' };
        }
        return { value: '', valueStatus: 'empty' };
      }

      // 3. RADIO
      if (el.type === 'radio') {
        if (el.checked) {
          return { value: el.value || 'true', valueStatus: 'filled' };
        }
        return { value: '', valueStatus: 'empty' };
      }

      // 4. Standard text, email, tel, number, date, textarea
      const rawVal = typeof el.value === 'string' ? el.value.trim() : '';

      if (rawVal === '') {
        return { value: '', valueStatus: 'empty' };
      }

      // Avoid treating a legacy browser placeholder value as filled
      if (el.placeholder && rawVal === el.placeholder.trim()) {
        return { value: '', valueStatus: 'empty' };
      }

      // Retain exact text string (especially for PINs with leading zeros like "001234")
      return { value: rawVal, valueStatus: 'filled' };
    } catch (e) {
      return { value: '', valueStatus: 'unknown' };
    }
  }

  /**
   * Helper: Determine semantic field type
   */
  function determineFieldType(el) {
    if (el.tagName === 'SELECT') return 'select';
    if (el.tagName === 'TEXTAREA') return 'textarea';

    const inputType = (el.type || 'text').toLowerCase();
    if (['tel', 'email', 'number', 'date', 'checkbox', 'radio'].includes(inputType)) {
      return inputType;
    }

    const descriptor = `${el.id || ''} ${el.name || ''} ${el.placeholder || ''}`.toLowerCase();
    if (/(pin|pincode|postal|zip)/i.test(descriptor)) {
      return 'text'; // Keep PIN/postal code as text to preserve leading zeros!
    }
    if (/(phone|mobile|contact)/i.test(descriptor)) return 'tel';
    if (/(email|mail)/i.test(descriptor)) return 'email';

    return 'text';
  }

  /**
   * PRIORITY 1: Normalized Form Field Scanning Pipeline
   * Produces an accurate internal representation distinguishing empty, filled, and unknown.
   */
  function scanPageFormFields() {
    const rawElements = Array.from(document.querySelectorAll('input, textarea, select'));
    const detected = [];
    const currentValues = {};
    const idCountMap = {};

    let index = 0;
    for (const el of rawElements) {
      if (!isElementVisible(el)) continue;
      if (['submit', 'reset', 'button', 'image', 'file', 'hidden'].includes(el.type)) continue;
      if (isSensitiveElement(el)) continue;

      const rawLabel = el.id ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.innerText || '') : '';
      const label = extractElementLabel(el);
      const fieldType = determineFieldType(el);
      const requiredness = determineFieldRequiredness(el, rawLabel || label);
      const isRequired = requiredness === 'required';

      // Semantic, stable ID
      let rawBaseId = el.id || el.name || toCamelCase(label) || `field${index}`;
      rawBaseId = rawBaseId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!rawBaseId || rawBaseId.length < 2) {
        rawBaseId = `field_${index}`;
      }

      idCountMap[rawBaseId] = (idCountMap[rawBaseId] || 0) + 1;
      const stableId = idCountMap[rawBaseId] === 1 ? rawBaseId : `${rawBaseId}_${idCountMap[rawBaseId]}`;

      // Stamp DOM element for 100% reliable progressive filling
      el.dataset.vaanifillId = stableId;

      // Extract options if select
      let options = null;
      if (el.tagName === 'SELECT') {
        options = Array.from(el.options)
          .map((opt) => (opt.text || opt.value || '').trim())
          .filter((txt) => txt.length > 0 && !/^(\s*--|\s*select|\s*choose|\s*none)/i.test(txt));
      }

      // Determine live DOM value and status
      const { value, valueStatus } = determineElementValue(el);

      // Only include in currentValues if genuinely filled by user
      if (valueStatus === 'filled' && value !== '') {
        currentValues[stableId] = value;
      }

      // Normalized Field Model
      detected.push({
        id: stableId,
        label,
        type: fieldType,
        requiredness,
        required: isRequired,
        currentValue: value,
        valueStatus, // 'empty' | 'filled' | 'unknown'
        isEditable: !el.disabled && !el.readOnly,
        isSupported: true,
        ...(options && options.length > 0 ? { options } : {})
      });

      index++;
    }

    return {
      success: true,
      pageTitle: document.title || 'Web Form',
      url: window.location.href,
      fieldCount: detected.length,
      fields: detected,
      currentValues
    };
  }

  /**
   * Native value setter that triggers framework reactivity (React, Vue, Angular)
   */
  function setNativeValue(element, value) {
    let prototype = Object.getPrototypeOf(element);
    if (typeof window.HTMLInputElement !== 'undefined' && element instanceof window.HTMLInputElement) {
      prototype = window.HTMLInputElement.prototype;
    } else if (typeof window.HTMLTextAreaElement !== 'undefined' && element instanceof window.HTMLTextAreaElement) {
      prototype = window.HTMLTextAreaElement.prototype;
    } else if (typeof window.HTMLSelectElement !== 'undefined' && element instanceof window.HTMLSelectElement) {
      prototype = window.HTMLSelectElement.prototype;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
  }

  /**
   * Visual feedback pulse on the webpage
   */
  function highlightElement(el) {
    if (!el || !el.style) return;
    const prevBorder = el.style.border;
    const prevShadow = el.style.boxShadow;
    const prevTransition = el.style.transition;

    el.style.transition = 'all 0.3s ease';
    el.style.border = '2px solid #10B981';
    el.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.3)';

    setTimeout(() => {
      el.style.border = prevBorder;
      el.style.boxShadow = prevShadow;
      el.style.transition = prevTransition;
    }, 1800);
  }

  /**
   * PRIORITY 3: Progressive Live Autofill
   * Injects validated values progressively in real time as the conversation unfolds.
   * NEVER automatically submits the form.
   */
  function fillFormFields(valuesToFill = {}) {
    if (!valuesToFill || typeof valuesToFill !== 'object') {
      return { success: false, error: 'No values provided to fill.' };
    }

    let filledCount = 0;
    let skippedCount = 0;
    const filledFields = [];
    const skippedFields = [];

    for (const [fieldId, val] of Object.entries(valuesToFill)) {
      if (val === null || val === undefined || String(val).trim() === '') {
        skippedCount++;
        skippedFields.push({ id: fieldId, reason: 'Value is empty or null' });
        continue;
      }

      const stringVal = String(val).trim();

      const el = document.querySelector(`[data-vaanifill-id="${CSS.escape(fieldId)}"]`);
      if (!el) {
        skippedCount++;
        skippedFields.push({ id: fieldId, reason: 'Scanned element mapping missing from DOM' });
        continue;
      }

      if (!el.isConnected || !isElementVisible(el) || el.disabled || el.readOnly || isSensitiveElement(el)) {
        skippedCount++;
        skippedFields.push({ id: fieldId, reason: 'Element is not eligible for filling' });
        continue;
      }

      try {
        if (el.tagName === 'SELECT') {
          const target = stringVal.toLowerCase();
          let matchIndex = -1;

          for (let i = 0; i < el.options.length; i++) {
            const opt = el.options[i];
            const optVal = (opt.value || '').toLowerCase();
            const optText = (opt.text || '').toLowerCase().trim();

            if (optVal === target || optText === target) {
              matchIndex = i;
              break;
            }
          }

          if (matchIndex === -1) {
            for (let i = 0; i < el.options.length; i++) {
              const optText = (el.options[i].text || '').toLowerCase().trim();
              if (optText.includes(target) || target.includes(optText)) {
                matchIndex = i;
                break;
              }
            }
          }

          if (matchIndex >= 0) {
            el.selectedIndex = matchIndex;
            setNativeValue(el, el.options[matchIndex].value);
            highlightElement(el);
            filledCount++;
            filledFields.push({ id: fieldId, value: el.options[matchIndex].text });
          } else {
            skippedCount++;
            skippedFields.push({ id: fieldId, reason: `No matching select option for '${stringVal}'` });
          }
        } else if (el.type === 'checkbox') {
          const isTrue = ['true', 'yes', '1', 'on'].includes(stringVal.toLowerCase());
          el.checked = isTrue;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          highlightElement(el);
          filledCount++;
          filledFields.push({ id: fieldId, value: isTrue });
        } else if (el.type === 'radio') {
          const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`));
          const target = stringVal.toLowerCase();
          let matchedRadio = radios.find((r) => r.value.toLowerCase() === target);
          if (!matchedRadio) {
            matchedRadio = radios.find((r) => {
              const rLabel = extractElementLabel(r).toLowerCase();
              return rLabel.includes(target) || target.includes(rLabel);
            });
          }

          if (matchedRadio) {
            matchedRadio.checked = true;
            matchedRadio.dispatchEvent(new Event('change', { bubbles: true }));
            highlightElement(matchedRadio);
            filledCount++;
            filledFields.push({ id: fieldId, value: matchedRadio.value });
          } else {
            skippedCount++;
            skippedFields.push({ id: fieldId, reason: `No matching radio option for '${stringVal}'` });
          }
        } else {
          // Standard text, tel, email, textarea, number, date
          setNativeValue(el, stringVal);
          highlightElement(el);
          filledCount++;
          filledFields.push({ id: fieldId, value: stringVal });
        }
      } catch (err) {
        skippedCount++;
        skippedFields.push({ id: fieldId, reason: `Error during injection: ${err.message}` });
      }
    }

    return {
      success: true,
      filledCount,
      skippedCount,
      filledFields,
      skippedFields,
      timestamp: Date.now()
    };
  }

  // Listen for messages from the side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'VAANIFILL_PING') {
      sendResponse({ status: 'OK', url: window.location.href });
      return true;
    }

    if (request.type === 'VAANIFILL_SCAN_FIELDS') {
      try {
        const scanResult = scanPageFormFields();
        sendResponse(scanResult);
      } catch (err) {
        sendResponse({ success: false, error: err.message, fields: [], currentValues: {} });
      }
      return true;
    }

    if (request.type === 'VAANIFILL_FILL_FIELDS' || request.type === 'VAANIFILL_FILL_PROGRESSIVE') {
      try {
        const fillResult = fillFormFields(request.values);
        sendResponse(fillResult);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    return false;
  });

  console.log('[VaaniFill AI] Content script active with normalized field analysis.');
})();
