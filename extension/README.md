# VaaniFill AI — Jarvis-Like Intelligent Form-Filling Assistant (Manifest V3)
Voice-first, context-aware digital form assistant powered by VaaniFill AI. Built for citizens with diverse digital literacy, enabling zero-barrier form completion through natural, human-like dialogue in Hindi (`hi-IN`) and English (`en-IN`) with progressive live autofill.

---

## 🌟 The Jarvis-Like Assistant Experience

VaaniFill AI is engineered as an **autonomous, context-aware form-filling assistant**:

1. **One-Action Initiation ("Start Assistant")**:
   - The user opens the extension side panel and presses **`[ ⚡ Start Assistant / शुरू करें ]`**.
   - No confusing 5-step cards, fragmented scan buttons, manual extraction triggers, or technical review dashboards.
2. **Form Understanding Before Asking Questions**:
   - Accurately inspects visible, editable input controls, textareas, and selects.
   - Evaluates `valueStatus`: `'empty' | 'filled' | 'unknown'`. Distinguishes placeholder options (e.g. `-- Select --`, `Choose option`) from actual user selections. Checks checkbox `checked` state (ignoring the default DOM `"on"` string).
   - Determines `requiredness` independently: `'required' | 'optional' | 'unknown'`. Empty fields are never falsely reported as "Already filled" or "Not required".
   - Automatically preserves pre-existing webpage values by default.
3. **Progressive Live Autofill**:
   - Validated fields are filled directly onto the active webpage DOM in real time as the conversation progresses (`VAANIFILL_FILL_PROGRESSIVE`).
   - Webpage controls pulse with a green highlight glow (`#10B981`) so users watch their form complete live.
4. **Natural Field Bundling & Multi-Field Intelligence**:
   - Bundles compatible fields into conversational prompts:
     - *"Let's get this form filled out! What's your full name and mobile number?"*
     - *"I have your address to complete. What is your city and PIN code?"*
   - Handles multi-detail utterances: *"I'm Dev, I'm 21, and I live in Guwahati"* populates name, age, and city simultaneously.
   - Targeted corrections: *"Actually, change my city to Jaipur"* updates and re-fills only the city.
   - Negative intent: *"Leave that blank"* or *"skip optional"* marks fields as skipped and never saves literal phrases.
   - Numeric PINs: Spoken numbers with leading zeros (e.g. *"zero zero one two three four"*) strictly preserve string format (`"001234"`).
5. **Partial Success Resilience**:
   - If a user provides a valid name, valid email, and an invalid phone number, the valid fields fill immediately on the page while the assistant politely asks for a corrected phone number.
6. **Safety & Zero Auto-Submission**:
   - Strictly excludes passwords, hidden controls, file uploads, credit card numbers, CVVs, and OTPs.
   - Never auto-submits any web form. The user remains in control to review and submit.

---

## 📁 File Structure

```
extension/
├── manifest.json            # Chrome Manifest V3 configuration (sidePanel, activeTab, scripting, tabs)
├── background.js            # Service worker configuring side panel behavior on action click
├── api.js                   # Isolated API service module communicating with http://localhost:5000
├── conversationEngine.js    # Form analysis, planning, natural intent, spoken digits, SequenceGuard
├── content.js               # Normalized DOM scanning, element tagging & progressive live autofill
├── sidepanel.html           # Minimal premium Jarvis-like single assistant layout (320-450px)
├── sidepanel.css            # Modern AI assistant theme, chat stream bubbles, glowing mic pulse
├── sidepanel.js             # Autonomous assistant controller: start -> progressive fill -> next question loop
├── test-form.html           # Ready-to-use sample citizen form with security audit fields
├── test-suite.mjs           # Comprehensive automated test suite (63/63 passing tests)
├── icons/                   # High-contrast 16px, 48px, and 128px extension icons
└── README.md                # Documentation and verification guide
```

---

## 🚀 Installation Guide (`chrome://extensions`)

### Step 1: Ensure Backend is Running
The extension interacts with the VaaniFill AI backend on `http://localhost:5000`.

From PowerShell or Terminal at the repository root:
```powershell
# Start the backend server
npm --prefix backend start
```

Verify the backend is live by opening `http://localhost:5000/api/health` in your browser (returns `{"status":"ok"}`).

### Step 2: Load Extension in Google Chrome
1. Open Google Chrome (version 116 or higher is recommended for the Side Panel API).
2. In the Chrome address bar, navigate to:
   ```
   chrome://extensions/
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top-left toolbar.
5. Browse to this repository and select the `extension` directory:
   ```
   c:\Users\astra\VanniFill-1\extension
   ```
6. The **VaaniFill AI - Form Assistant** extension card will appear with active status.
7. Click **Details** on the extension card, and toggle **"Allow access to file URLs"** to **ON** (allows inspecting local HTML files like `test-form.html`).
8. Pin the extension to your Chrome toolbar.

---

## 🧪 Running Automated Tests

Run the complete test suite verifying all 63 unit and integration criteria:
```powershell
node extension/test-suite.mjs
```

Run backend tests:
```powershell
npm --prefix backend test
```

---

## 📋 Acceptance Criteria Test Matrix

| # | Acceptance Criterion | Test Result |
|---|----------------------|-------------|
| 1 | Multi-field population from single sentence | ✅ PASS |
| 2 | No re-asking for already supplied info | ✅ PASS |
| 3 | Contextual option resolution ("use second option", "Female") | ✅ PASS |
| 4 | Natural correction targeting ("Change my city to Jaipur") | ✅ PASS |
| 5 | Negative/blank intent never stored as literal text | ✅ PASS |
| 6 | Spoken PINs preserve leading zeros ("001234") | ✅ PASS |
| 7 | Invalid values block form autofill & prompt correction | ✅ PASS |
| 8 | Optional fields can be skipped without blocking | ✅ PASS |
| 9 | Preservation of existing webpage form values | ✅ PASS |
| 10 | Speech recognition duplicate prevention | ✅ PASS |
| 11 | Stale response protection via SequenceGuard | ✅ PASS |
| 12 | Recoverable error state transitions | ✅ PASS |
| 13 | Sensitive field exclusion (passwords, CVV, OTP, file) | ✅ PASS |
| 14 | Zero auto-submission guarantee | ✅ PASS |
| 15 | Empty fields never reported as "Already filled" or "Not required" | ✅ PASS |
| 16 | Progressive live DOM autofill with visual outline pulses | ✅ PASS |
