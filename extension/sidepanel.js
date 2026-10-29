/**
 * VaaniFill AI - Conversational Form Assistant Controller
 * Architecture:
 * - One primary start button triggering the autonomous assistant
 * - Natural conversation with multi-field bundling
 * - Progressive live autofill with outline pulses on webpage DOM
 * - Deterministic validation & stale response sequence protection
 * - Zero auto-submission & strict sensitive field protection
 */

import { api } from './api.js';
import {
  normalizeSpokenDigits,
  analyzeForm,
  detectSkipIntent,
  detectCorrectionIntent,
  resolveSelectOption,
  extractEntitiesLocally,
  createConversationPlan,
  validateLocally,
  SequenceGuard
} from './conversationEngine.js';

// Sequence Guard to discard stale async responses
const sequenceGuard = new SequenceGuard();

// Assistant Application State
const state = {
  isStarted: false,
  activeTabId: null,
  activeTabUrl: '',
  activeTabTitle: '',
  detectedFields: [],
  formAnalysis: null,
  currentValues: {},
  filledOnDom: new Set(),
  skippedFields: new Set(),
  validationErrors: {},
  selectedLanguage: 'hi-IN',
  isListening: false,
  ttsEnabled: false,
  currentTargetFields: []
};

// UI Element References
const elements = {
  languageSelect: document.getElementById('language-select'),
  backendBadge: document.getElementById('backend-status-badge'),
  btnResetSession: document.getElementById('btn-reset-session'),
  alertBanner: document.getElementById('alert-banner'),
  alertIcon: document.getElementById('alert-icon'),
  alertTitle: document.getElementById('alert-title'),
  alertMessage: document.getElementById('alert-message'),
  alertCloseBtn: document.getElementById('alert-close-btn'),

  // Initial View
  viewInitial: document.getElementById('view-initial'),
  formStatusPill: document.getElementById('form-status-pill'),
  formStatusText: document.getElementById('form-status-text'),
  btnStartAssistant: document.getElementById('btn-start-assistant'),

  // Active View
  viewActive: document.getElementById('view-active'),
  progressText: document.getElementById('progress-text'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  btnToggleFields: document.getElementById('btn-toggle-fields'),
  drawerFields: document.getElementById('drawer-fields'),
  fieldsChecklist: document.getElementById('fields-checklist'),
  chatStream: document.getElementById('chat-stream'),
  assistantTyping: document.getElementById('assistant-typing'),

  // Bottom Dock
  chipSkipOptional: document.getElementById('chip-skip-optional'),
  chipListenToggle: document.getElementById('chip-listen-toggle'),
  ttsStatusLabel: document.getElementById('tts-status-label'),
  chipPause: document.getElementById('chip-pause'),
  btnMicToggle: document.getElementById('btn-mic-toggle'),
  userTextInput: document.getElementById('user-text-input'),
  btnSendMessage: document.getElementById('btn-send-message'),
  micStatusBar: document.getElementById('mic-status-bar'),
  micLiveText: document.getElementById('mic-live-text')
};

// -----------------------------------------------------------------------------
// Unified Speech Recognition Manager
// -----------------------------------------------------------------------------
class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isSupported = false;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Turn-based for assistant dialogue
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        state.isListening = true;
        elements.btnMicToggle.classList.add('vf-mic-listening');
        elements.btnMicToggle.setAttribute('aria-pressed', 'true');
        elements.micStatusBar.classList.remove('vf-hidden');
        elements.micLiveText.textContent = state.selectedLanguage.startsWith('hi') ? 'सुन रहा हूँ... बोलिए' : 'Listening... speak naturally';
      };

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          elements.micLiveText.textContent = `🎙️ "${interim}"`;
        }

        if (final) {
          const cleanFinal = final.trim();
          elements.micLiveText.textContent = `🎙️ "${cleanFinal}"`;
          handleUserUtterance(cleanFinal);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('[SpeechManager] error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showAlert('Microphone Access Denied', 'Please allow microphone permissions in Chrome settings to use voice input, or type in the input bar below.', 'warning');
        }
        this.stop();
      };

      this.recognition.onend = () => {
        state.isListening = false;
        elements.btnMicToggle.classList.remove('vf-mic-listening');
        elements.btnMicToggle.setAttribute('aria-pressed', 'false');
        elements.micStatusBar.classList.add('vf-hidden');
      };
    } catch (e) {
      console.warn('[SpeechManager] Init exception:', e);
      this.isSupported = false;
    }
  }

  start() {
    if (!this.isSupported || !this.recognition) {
      showAlert('Voice Not Supported', 'Web Speech API is unavailable in this environment. You can type freely in the input box.', 'warning');
      elements.userTextInput.focus();
      return;
    }

    if (state.isListening) {
      this.stop();
      return;
    }

    this.recognition.lang = state.selectedLanguage;
    try {
      this.recognition.start();
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        try {
          this.recognition.abort();
          setTimeout(() => {
            try { this.recognition.start(); } catch (e) {}
          }, 150);
        } catch (e) {}
      }
    }
  }

  stop() {
    if (this.recognition && state.isListening) {
      try { this.recognition.stop(); } catch (e) {}
    }
    state.isListening = false;
    elements.btnMicToggle.classList.remove('vf-mic-listening');
    elements.micStatusBar.classList.add('vf-hidden');
  }
}

const speechManager = new SpeechManager();

// -----------------------------------------------------------------------------
// Text-To-Speech (TTS) Read-Aloud Helper
// -----------------------------------------------------------------------------
function speakAloud(text) {
  if (!state.ttsEnabled || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.selectedLanguage;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('[TTS] Speech error:', e);
  }
}

// -----------------------------------------------------------------------------
// UI Alert Helpers
// -----------------------------------------------------------------------------
function showAlert(title, message, type = 'warning') {
  elements.alertTitle.textContent = title;
  elements.alertMessage.textContent = message;
  elements.alertIcon.textContent = type === 'error' ? '❌' : (type === 'success' ? '✅' : '⚠️');
  elements.alertBanner.className = `vf-alert vf-alert-${type}`;
  elements.alertBanner.classList.remove('vf-alert-hidden');
}

function hideAlert() {
  elements.alertBanner.classList.add('vf-alert-hidden');
}

// -----------------------------------------------------------------------------
// Active Tab Communication
// -----------------------------------------------------------------------------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function scanPageFields() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    throw new Error('No active browser tab found.');
  }

  state.activeTabId = tab.id;
  state.activeTabUrl = tab.url || '';
  state.activeTabTitle = tab.title || '';

  // Check for restricted URLs
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('view-source:') ||
    tab.url.includes('chromewebstore.google.com')
  ) {
    throw new Error('Google Chrome prevents extensions from inspecting internal pages (chrome://, webstore). Please navigate to a standard website (http:// or https://) containing a form.');
  }

  // Attempt messaging content script
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'VAANIFILL_SCAN_FIELDS' });
    if (res && res.success) {
      return res;
    }
  } catch (msgErr) {
    // If content script is not yet injected, dynamically inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Small pause for content script to mount
      await new Promise((r) => setTimeout(r, 120));
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'VAANIFILL_SCAN_FIELDS' });
      if (res && res.success) {
        return res;
      }
    } catch (injErr) {
      throw new Error(`Unable to scan active tab: ${injErr.message}`);
    }
  }

  throw new Error('Field detection returned an unexpected format.');
}

async function progressiveFillOnDom(valuesToFill) {
  if (!state.activeTabId || !valuesToFill || Object.keys(valuesToFill).length === 0) {
    return { success: false, filledCount: 0 };
  }

  try {
    const res = await chrome.tabs.sendMessage(state.activeTabId, {
      type: 'VAANIFILL_FILL_PROGRESSIVE',
      values: valuesToFill
    });
    return res || { success: false, filledCount: 0 };
  } catch (err) {
    console.warn('[ProgressiveFill] Injection warning:', err);
    return { success: false, error: err.message, filledCount: 0 };
  }
}

// -----------------------------------------------------------------------------
// Chat Stream Management
// -----------------------------------------------------------------------------
function appendAssistantMessage(text) {
  const msgWrapper = document.createElement('div');
  msgWrapper.className = 'vf-msg vf-msg-assistant';

  const sender = document.createElement('span');
  sender.className = 'vf-msg-sender';
  sender.textContent = 'VaaniFill 🤖';

  const bubble = document.createElement('div');
  bubble.className = 'vf-bubble-assistant';
  bubble.textContent = text;

  msgWrapper.appendChild(sender);
  msgWrapper.appendChild(bubble);
  elements.chatStream.appendChild(msgWrapper);

  elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
  speakAloud(text);
}

function appendUserMessage(text) {
  const msgWrapper = document.createElement('div');
  msgWrapper.className = 'vf-msg vf-msg-user';

  const sender = document.createElement('span');
  sender.className = 'vf-msg-sender';
  sender.style.textAlign = 'right';
  sender.textContent = 'You 👤';

  const bubble = document.createElement('div');
  bubble.className = 'vf-bubble-user';
  bubble.textContent = text;

  msgWrapper.appendChild(sender);
  msgWrapper.appendChild(bubble);
  elements.chatStream.appendChild(msgWrapper);

  elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
}

function appendFillToast(fieldSummaryText) {
  const toast = document.createElement('div');
  toast.className = 'vf-fill-toast';
  toast.innerHTML = `
    <span class="vf-fill-toast-icon">✍️</span>
    <span class="vf-fill-toast-text"><strong>Live Autofill:</strong> ${fieldSummaryText}</span>
  `;
  elements.chatStream.appendChild(toast);
  elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
}

function showTypingIndicator(show = true) {
  if (show) {
    elements.assistantTyping.classList.remove('vf-hidden');
    elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
  } else {
    elements.assistantTyping.classList.add('vf-hidden');
  }
}

// -----------------------------------------------------------------------------
// Progress & Checklist UI Updates
// -----------------------------------------------------------------------------
function updateProgressAndChecklist() {
  if (!state.formAnalysis) return;

  const total = state.formAnalysis.totalFields;
  let filledCount = 0;

  elements.fieldsChecklist.innerHTML = '';

  state.formAnalysis.fieldModels.forEach((field) => {
    const val = state.currentValues[field.id];
    const isSkipped = state.skippedFields.has(field.id) || state.skippedFields.has('__ALL_OPTIONAL__');
    const hasVal = val !== undefined && val !== null && String(val).trim() !== '';

    let badgeClass = 'vf-badge-missing';
    let badgeLabel = 'Missing';

    if (isSkipped) {
      badgeClass = 'vf-badge-skipped';
      badgeLabel = 'Skipped';
    } else if (hasVal) {
      badgeClass = 'vf-badge-verified';
      badgeLabel = 'Verified';
      filledCount++;
    } else if (field.requiredness === 'optional') {
      badgeClass = 'vf-badge-optional';
      badgeLabel = 'Optional';
    }

    const row = document.createElement('div');
    row.className = 'vf-field-row';
    row.innerHTML = `
      <div class="vf-field-info">
        <span class="vf-field-name">${field.label || field.id}</span>
        ${hasVal ? `<span class="vf-field-val">("${String(val).slice(0, 18)}")</span>` : ''}
      </div>
      <span class="vf-field-badge ${badgeClass}">${badgeLabel}</span>
    `;
    elements.fieldsChecklist.appendChild(row);
  });

  const percent = total > 0 ? Math.round((filledCount / total) * 100) : 0;
  elements.progressText.textContent = `${filledCount} of ${total} fields completed (${percent}%)`;
  elements.progressBarFill.style.width = `${percent}%`;
}

// -----------------------------------------------------------------------------
// Initial Form Reconnaissance
// -----------------------------------------------------------------------------
async function probeActivePage() {
  try {
    elements.formStatusPill.className = 'vf-form-badge vf-form-badge-loading';
    elements.formStatusText.textContent = 'Scanning webpage form...';

    const scanResult = await scanPageFields();
    state.detectedFields = scanResult.fields || [];

    // Analyze form
    state.formAnalysis = analyzeForm(state.detectedFields, scanResult.currentValues || {});

    if (state.detectedFields.length > 0) {
      elements.formStatusPill.className = 'vf-form-badge vf-form-badge-ready';
      const previewLabels = state.detectedFields.slice(0, 3).map((f) => f.label).join(', ');
      elements.formStatusText.textContent = `📝 ${state.detectedFields.length} fields detected (${previewLabels}...)`;
    } else {
      elements.formStatusPill.className = 'vf-form-badge vf-form-badge-none';
      elements.formStatusText.textContent = 'No form fields found on this page.';
    }
  } catch (err) {
    elements.formStatusPill.className = 'vf-form-badge vf-form-badge-none';
    elements.formStatusText.textContent = err.message.length < 50 ? err.message : 'No supported form detected.';
    showAlert('Notice', err.message, 'warning');
  }
}

// -----------------------------------------------------------------------------
// PRIORITY 2: Start Assistant Workflow (One Primary Button)
// -----------------------------------------------------------------------------
async function startAssistantWorkflow() {
  hideAlert();
  showTypingIndicator(true);

  try {
    // 1. Fresh scan of page
    const scanResult = await scanPageFields();
    state.detectedFields = scanResult.fields || [];
    
    // Reset session values to prevent stale carryovers
    state.currentValues = { ...(scanResult.currentValues || {}) };
    state.filledOnDom.clear();
    state.skippedFields.clear();

    // 2. Build form analysis
    state.formAnalysis = analyzeForm(state.detectedFields, state.currentValues);

    if (state.detectedFields.length === 0) {
      showTypingIndicator(false);
      showAlert('No Form Found', 'Could not find any fillable form fields on this tab. Please open a webpage with an input form.', 'warning');
      return;
    }

    // 3. Switch view to Active Assistant View
    state.isStarted = true;
    elements.viewInitial.classList.add('vf-hidden');
    elements.viewActive.classList.remove('vf-hidden');

    // 4. Update initial progress and checklist
    updateProgressAndChecklist();

    // 5. Create initial conversation plan
    const isHindi = state.selectedLanguage.startsWith('hi');
    const plan = createConversationPlan(state.formAnalysis, state.currentValues, state.skippedFields, state.selectedLanguage);
    state.currentTargetFields = plan.targetFields || [];

    showTypingIndicator(false);

    // Initial Greeting & First Question
    const greeting = isHindi
      ? `नमस्ते! मुझे इस पेज पर ${state.formAnalysis.totalFields} फ़ील्ड मिले हैं। आइए इन्हें भरते हैं।`
      : `Hello! I detected ${state.formAnalysis.totalFields} fields on this page. Let's get them filled out.`;

    appendAssistantMessage(greeting);

    if (plan.question) {
      setTimeout(() => {
        appendAssistantMessage(plan.question);
        // Automatically start listening for user response
        speechManager.start();
      }, 500);
    } else if (plan.isComplete) {
      appendAssistantMessage(plan.summaryText);
    }

  } catch (err) {
    showTypingIndicator(false);
    showAlert('Unable to Start', err.message, 'error');
  }
}

// -----------------------------------------------------------------------------
// Utterance Processing Pipeline (Shared for Voice & Text)
// -----------------------------------------------------------------------------
async function handleUserUtterance(rawText) {
  if (!rawText || !rawText.trim()) return;
  const text = rawText.trim();
  const requestId = sequenceGuard.next();

  // Stop listening while processing
  speechManager.stop();
  appendUserMessage(text);
  showTypingIndicator(true);

  try {
    const isHindi = state.selectedLanguage.startsWith('hi');

    // 1. Check for Skip Intent
    const skipIntent = detectSkipIntent(text);
    if (skipIntent) {
      if (skipIntent.type === 'SKIP_OPTIONAL') {
        state.skippedFields.add('__ALL_OPTIONAL__');
        appendAssistantMessage(isHindi ? 'वैकल्पिक फ़ील्ड छोड़ दिए गए हैं।' : 'Skipping optional fields.');
      } else {
        // Skip current target fields
        state.currentTargetFields.forEach((id) => state.skippedFields.add(id));
        appendAssistantMessage(isHindi ? 'ठीक है, मैंने इसे खाली छोड़ दिया है।' : 'Understood, leaving that field blank.');
      }

      showTypingIndicator(false);
      evaluateNextStep();
      return;
    }

    // 2. Check for Explicit Correction Intent ("Actually change my city to Jaipur")
    const correction = detectCorrectionIntent(text, state.formAnalysis.fieldModels);
    if (correction) {
      state.currentValues[correction.fieldId] = correction.value;

      // Progressive Live Autofill for corrected field immediately!
      const fillRes = await progressiveFillOnDom({ [correction.fieldId]: correction.value });
      if (fillRes.success) {
        appendFillToast(`${correction.label || correction.fieldId} → "${correction.value}"`);
      }

      appendAssistantMessage(isHindi ? `आपका ${correction.label || correction.fieldId} बदलकर "${correction.value}" कर दिया गया है।` : `Updated ${correction.label || correction.fieldId} to "${correction.value}".`);
      showTypingIndicator(false);
      evaluateNextStep();
      return;
    }

    // 3. Check for Select Option Reference ("second option", "female", "first one")
    if (state.currentTargetFields.length === 1) {
      const targetModel = state.formAnalysis.fieldModels.find((f) => f.id === state.currentTargetFields[0]);
      if (targetModel && targetModel.type === 'select') {
        const matchedOption = resolveSelectOption(text, targetModel);
        if (matchedOption) {
          state.currentValues[targetModel.id] = matchedOption;
          const fillRes = await progressiveFillOnDom({ [targetModel.id]: matchedOption });
          if (fillRes.success) {
            appendFillToast(`${targetModel.label || targetModel.id} → "${matchedOption}"`);
          }
          appendAssistantMessage(isHindi ? `${targetModel.label || targetModel.id} चुना गया: "${matchedOption}"` : `Selected ${matchedOption} for ${targetModel.label || targetModel.id}.`);
          showTypingIndicator(false);
          evaluateNextStep();
          return;
        }
      }
    }

    // 4. Extraction: Attempt Backend AI Extract, Fallback to Local Natural Extractor
    let candidateValues = {};
    try {
      const extractRes = await api.extract({
        transcript: text,
        language: state.selectedLanguage,
        formId: 'custom',
        fields: state.detectedFields,
        current_values: state.currentValues
      });

      if (sequenceGuard.isCurrent(requestId) && extractRes.values && Object.keys(extractRes.values).length > 0) {
        candidateValues = extractRes.values;
      }
    } catch (apiErr) {
      console.warn('[Extractor] Backend extract warning, falling back to local engine:', apiErr);
    }

    // Always merge with local engine to capture multi-field sentences & leading zero PINs
    const localValues = extractEntitiesLocally(text, state.formAnalysis.fieldModels);
    candidateValues = { ...localValues, ...candidateValues };

    // If single target was expected and nothing extracted, assign text directly
    if (Object.keys(candidateValues).length === 0 && state.currentTargetFields.length === 1) {
      const singleField = state.formAnalysis.fieldModels.find((f) => f.id === state.currentTargetFields[0]);
      if (singleField) {
        candidateValues[singleField.id] = normalizeSpokenDigits(text);
      }
    }

    if (!sequenceGuard.isCurrent(requestId)) {
      // Discard stale response
      return;
    }

    // 5. Merge Candidate Values into currentValues
    const newlyResolvedValues = {};
    for (const [k, v] of Object.entries(candidateValues)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        state.currentValues[k] = String(v).trim();
        newlyResolvedValues[k] = String(v).trim();
      }
    }

    // 6. Deterministic Validation & Progressive Live Autofill
    const validation = validateLocally(state.formAnalysis.fieldModels, state.currentValues, state.skippedFields);

    const validValuesToFill = {};
    const filledSummaries = [];

    for (const [k, v] of Object.entries(newlyResolvedValues)) {
      if (validation.statuses[k] === 'matched') {
        validValuesToFill[k] = v;
        const fieldMeta = state.formAnalysis.fieldModels.find((f) => f.id === k);
        filledSummaries.push(`${fieldMeta ? fieldMeta.label : k} ("${v}")`);
      }
    }

    // PROGRESSIVELY FILL CONFIDENTLY RESOLVED FIELDS ON DOM!
    if (Object.keys(validValuesToFill).length > 0) {
      const fillRes = await progressiveFillOnDom(validValuesToFill);
      if (fillRes.success) {
        appendFillToast(filledSummaries.join(', '));
      }
    }

    showTypingIndicator(false);

    // 7. Handle validation errors if any
    const errorKeys = Object.keys(validation.errors);
    if (errorKeys.length > 0) {
      const errFieldId = errorKeys[0];
      const errField = state.formAnalysis.fieldModels.find((f) => f.id === errFieldId);
      const errDesc = validation.errors[errFieldId];
      appendAssistantMessage(errDesc);
      state.currentTargetFields = [errFieldId];
      // Listen again for correction
      speechManager.start();
      updateProgressAndChecklist();
      return;
    }

    // 8. Progress to Next Step
    evaluateNextStep();

  } catch (err) {
    showTypingIndicator(false);
    appendAssistantMessage(`I encountered an issue processing that: ${err.message}. Please try again.`);
  }
}

// -----------------------------------------------------------------------------
// Evaluate Next Step in Conversation
// -----------------------------------------------------------------------------
function evaluateNextStep() {
  updateProgressAndChecklist();

  const plan = createConversationPlan(state.formAnalysis, state.currentValues, state.skippedFields, state.selectedLanguage);
  state.currentTargetFields = plan.targetFields || [];

  if (plan.isComplete) {
    appendAssistantMessage(plan.summaryText);
    speechManager.stop();
  } else if (plan.question) {
    setTimeout(() => {
      appendAssistantMessage(plan.question);
      // Keep conversation flow active
      speechManager.start();
    }, 400);
  }
}

// -----------------------------------------------------------------------------
// Server Connectivity Ping
// -----------------------------------------------------------------------------
async function checkBackendConnectivity() {
  try {
    const health = await api.checkHealth();
    if (health && health.status === 'ok') {
      elements.backendBadge.className = 'vf-status-badge vf-status-connected';
      elements.backendBadge.title = 'Backend AI Server: Connected (http://localhost:5000)';
    } else {
      elements.backendBadge.className = 'vf-status-badge vf-status-disconnected';
    }
  } catch (e) {
    elements.backendBadge.className = 'vf-status-badge vf-status-disconnected';
    elements.backendBadge.title = 'Backend: Disconnected (npm --prefix backend start)';
  }
}

// -----------------------------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------------------------
function initEventListeners() {
  // Reset Session
  elements.btnResetSession.addEventListener('click', () => {
    speechManager.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.isStarted = false;
    state.currentValues = {};
    state.filledOnDom.clear();
    state.skippedFields.clear();
    state.currentTargetFields = [];
    elements.chatStream.innerHTML = '';
    elements.viewActive.classList.add('vf-hidden');
    elements.viewInitial.classList.remove('vf-hidden');
    probeActivePage();
  });

  // Language Change
  elements.languageSelect.addEventListener('change', (e) => {
    state.selectedLanguage = e.target.value;
  });

  // Alert Close
  elements.alertCloseBtn.addEventListener('click', hideAlert);

  // PRIMARY BUTTON: Start Assistant
  elements.btnStartAssistant.addEventListener('click', startAssistantWorkflow);

  // Collapsible Fields Checklist
  elements.btnToggleFields.addEventListener('click', () => {
    elements.drawerFields.classList.toggle('vf-hidden');
  });

  // Quick Action: Skip Optional
  elements.chipSkipOptional.addEventListener('click', () => {
    handleUserUtterance('skip optional');
  });

  // Quick Action: Toggle Listen TTS
  elements.chipListenToggle.addEventListener('click', () => {
    state.ttsEnabled = !state.ttsEnabled;
    elements.ttsStatusLabel.textContent = state.ttsEnabled ? 'On' : 'Off';
    elements.chipListenToggle.style.color = state.ttsEnabled ? '#2563EB' : '';
  });

  // Quick Action: Stop / Pause
  elements.chipPause.addEventListener('click', () => {
    speechManager.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    elements.micStatusBar.classList.add('vf-hidden');
  });

  // Mic Toggle Button
  elements.btnMicToggle.addEventListener('click', () => {
    speechManager.start();
  });

  // Text Send Button
  elements.btnSendMessage.addEventListener('click', () => {
    const text = elements.userTextInput.value;
    if (text && text.trim()) {
      elements.userTextInput.value = '';
      handleUserUtterance(text);
    }
  });

  // Enter Key on Text Input
  elements.userTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.btnSendMessage.click();
    }
  });

  // Tab Activation & URL Change (Auto Re-Probe)
  chrome.tabs.onActivated.addListener(() => {
    if (!state.isStarted) {
      probeActivePage();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' && !state.isStarted) {
      probeActivePage();
    }
  });
}

// -----------------------------------------------------------------------------
// Bootstrapping
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkBackendConnectivity();
  probeActivePage();
  // Periodic backend health ping
  setInterval(checkBackendConnectivity, 15000);
});
