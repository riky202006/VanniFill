# VAANIFILL AI 🇮🇳
### *Speak naturally. Fill forms confidently.*

[![Hackathon](https://img.shields.io/badge/ECCLESIA_4.0-PS_ECCLISIA26--001-blueviolet?style=for-the-badge)](https://github.com/riky202006/VanniFill)
[![Team](https://img.shields.io/badge/Team-Ctrl_Freaks-ff4757?style=for-the-badge)](https://github.com/riky202006/VanniFill)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![AI Engine](https://img.shields.io/badge/Gemini-2.5_Flash-orange?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![Frontend](https://img.shields.io/badge/React_19-Vite_%2B_Tailwind-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-yellow?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20_Passing-brightgreen?style=for-the-badge)](https://github.com/riky202006/VanniFill)
[![License](https://img.shields.io/badge/Infrastructure_Cost-%240.00_(100%25_Free)-success?style=for-the-badge)]()

---

## 📌 Executive Summary & Problem Statement

**ECCLESIA 4.0 • Problem Statement: PS ECCLISIA26-001**

Online government schemes, scholarship portals, and healthcare intake forms present overwhelming barriers to millions of citizens due to:
1. **Digital Illiteracy & Complex Layouts**: Cluttered multi-step forms with confusing labels.
2. **Language Barriers**: Most Indian civic and healthcare portals are predominantly English-only.
3. **Repetitive Manual Typing**: Frustrating re-entry of the same personal details across multiple forms.

### The VaaniFill Solution
**VAANIFILL AI** is an AI-powered, multilingual voice assistant and browser extension that empowers citizens to complete complex online forms by simply speaking in their mother tongue (**Hindi**, **English**, or code-mixed **Hinglish**). 

The system extracts structured data, executes **deterministic format validation**, presents a transparent **human-in-the-loop review interface**, and performs **1-click automated form injection**.

---

## 🛡️ Core Innovation: Zero-Hallucination & Human-in-the-Loop

> [!IMPORTANT]
> **The Golden Safety Rule**: General-purpose LLMs frequently hallucinate sensitive personal data (inventing phone numbers, birthdates, or identity numbers) when inputs are incomplete. 
> 
> **VaaniFill enforces a strict Zero-Hallucination Guardrail**:
> - If an applicant does not explicitly state a field, the extraction engine returns `null`.
> - The deterministic engine tags the field as `status: "missing"` and prompts a natural follow-up question.
> - No form is ever submitted without explicit human review and confirmation on the review screen.

---

## 🏛️ End-to-End System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           VAANIFILL AI PIPELINE                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

 [ Multilingual User Speech ]
 (Hindi / English / Hinglish)
              │
              ▼
 [ Client Web Speech API / Extension ]  ───> Zero-latency local speech-to-text ($0.00 cost)
              │
              ▼ (Raw Transcript + Form Schema)
 [ Express.js Backend Gateway ] (Port 5000)
              │
              ├───────────────────────────────────┐
              ▼                                   ▼
 [ Google Gemini 2.5 Flash Engine ]    [ Heuristic Offline Fallback ]
 (Strict JSON Key-Value Extraction)     (Deterministic RegEx Extractor)
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                                ▼
              [ Deterministic Validation Engine ]
              • Phone Regex: ^[6-9]\d{9}$
              • Email Format Verification
              • ISO 8601 Date Normalization (YYYY-MM-DD)
              • PIN Code Normalization (6 digits)
              • Multilingual Gender & Category Normalizer
                                │
                                ▼
              [ Status & Confidence Tagger ]
              🟢 Matched (0.95) | 🟡 Missing (0.00) | 🔴 Invalid (0.40)
                                │
                                ▼
              [ Human-in-the-Loop Review Screen ]
              (Inline editable inputs + Localized Follow-up Question)
                                │
              [ User Confirmation & Lock ]
                                │
                                ▼
              [ Target Form Autofill & DOM Dispatch ]
              (Synthetic input & change events injected into webpage)
                                │
                                ▼
              [ Completed Application Receipt (JSON / PDF) ]
```

---

## 👥 Hackathon Team Ownership Matrix — Team Ctrl Freaks

| Squad Member | Hackathon Role | Primary Focus & Directories | Core Deliverables |
|---|---|---|---|
| **Riky Nayak** | Frontend Lead | `frontend/src/pages/`, `frontend/src/components/` | Welcome Page UI, voice visualizer, review panel, responsive styling |
| **Devansh Dausodia** | Backend & AI Lead | `backend/src/services/`, `backend/src/routes/` | Gemini 2.5 Flash integration, validation engine, Express REST API |
| **Jibtesh Kalita** | Field Mapping & Extension Lead | `extension/`, `backend/src/data/` | Chrome Manifest V3 extension, content script DOM injection, form schemas |
| **Dhairya Choudhary** | QA, Testing & Demo Lead | `backend/test/`, `docs/`, `shared/` | Automated test suite (13/13 passing), API contract docs, pitch demo |

---

## 🗂️ Repository Structure

```text
VanniFill/
├── backend/                       # Node.js + Express REST API (Port 5000)
│   ├── src/
│   │   ├── data/formSchemas.js    # Built-in schemas (Scholarship, Healthcare, Pension)
│   │   ├── routes/
│   │   │   ├── extractRoutes.js   # POST /api/extract & POST /api/validate
│   │   │   ├── formRoutes.js      # GET /api/forms & POST /api/forms/match
│   │   │   ├── guestRoutes.js     # POST /api/guest/session
│   │   │   └── documentRoutes.js  # POST /api/documents/upload (Multimodal OCR)
│   │   ├── services/
│   │   │   ├── geminiService.js   # Gemini 2.5 Flash structured JSON extractor
│   │   │   └── validationService.js # Deterministic validation & question generator
│   │   ├── app.js                 # Express app configuration & CORS
│   │   └── server.js              # Server bootstrapper
│   ├── test/api.test.js           # 13-case automated unit & integration test suite
│   ├── .env.example               # Environment template (PORT, GEMINI_API_KEY)
│   └── package.json               # Backend dependencies
│
├── frontend/                      # React 19 + Vite + Tailwind Client (Port 5173)
│   ├── src/
│   │   ├── pages/Welcome/         # Landing & Welcome UI
│   │   ├── services/apiClient.js  # Centralized API fetch wrapper
│   │   ├── constants/api.js       # Endpoint route constants
│   │   ├── App.jsx                # Root application component
│   │   └── main.jsx               # React DOM entry point
│   ├── .env.example               # Frontend environment template
│   └── package.json               # Frontend dependencies
│
├── extension/                     # Google Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/service-worker.js # Background extension worker
│   │   ├── content/content-script.js    # In-page DOM inspector & autofiller
│   │   └── popup/                 # Extension popup toolbar interface
│   ├── manifest.json              # Chrome extension configuration
│   └── README.md                  # Extension loading instructions
│
├── docs/                          # Specifications & Guides
│   ├── api-contract.md            # Canonical REST endpoint specifications
│   ├── architecture.md            # Technical component design
│   ├── development-guide.md       # Local onboarding guide
│   └── testing-guide.md           # QA checklists & verification criteria
│
├── shared/                        # Shared contracts & team guidelines
│   ├── api-contracts/form-api.json# JSON Schema specification
│   └── documentation/             # Team collaboration workflows
│
├── .gitignore                     # Git ignore rules (secrets & node_modules protected)
├── package.json                   # Root monorepo orchestration scripts
└── README.md                      # Project documentation
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Google Chrome**: For running the web application and testing the Chrome Extension

---

### Step 1: Install Dependencies
Run from the repository root:
```bash
# Install backend dependencies
cd backend && npm install && cp .env.example .env && cd ..

# Install frontend dependencies
cd frontend && npm install && cp .env.example .env && cd ..
```

---

### Step 2: Run the Automated Test Suite
Verify that all 13 core extraction, validation, and API cases pass:
```bash
npm test
```
*(Or from the `backend/` directory: `npm test`)*

**Output Preview:**
```text
🚀 === STARTING VAANIFILL AI BACKEND TEST SUITE ===
✅ [PASS] GET /api/health returns status 200 OK
✅ [PASS] POST /api/guest/session returns valid 201 guest session
✅ [PASS] GET /api/forms returns 3 standard schemas (scholarship, healthcare, pension)
✅ [PASS] POST /api/extract processes Hindi transcript successfully
✅ [PASS] Extracted Full Name correctly (Rahul Verma)
✅ [PASS] Extracted and validated Phone (9876543210)
✅ [PASS] Extracted Email (rahul.verma@example.com)
✅ [PASS] Unspoken DOB remains null and flagged as MISSING (Zero-Hallucination)
✅ [PASS] Generates conversational nextQuestion for first missing field
✅ [PASS] Flags invalid phone number as status: invalid
✅ [PASS] Flags invalid email as status: invalid
✅ [PASS] POST /api/forms/match verifies all fields and prepares download receipt
✅ [PASS] GET /api/forms/:id/download retrieves official submission receipt

========================================
🏁 TEST RESULTS: 13 PASSED, 0 FAILED
========================================
```

---

### Step 3: Start the Backend Server
```bash
npm run dev:backend
```
Server runs at **`http://localhost:5000`**. Health check: `http://localhost:5000/api/health`.

---

### Step 4: Start the Frontend Application
Open a new terminal tab:
```bash
npm run dev:frontend
```
Open **`http://localhost:5173`** in your browser to interact with the web interface.

---

### Step 5: Load the Chrome Extension (Optional)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `extension/` directory from this repository.
4. The VaaniFill AI floating widget is now active on all web forms.

---

## 🛠️ Teammate Troubleshooting & Common Connection Issues

If a teammate pulls the repository and encounters connection issues, network errors, or failed API calls, check these 4 common items:

### 1. MongoDB Atlas IP Whitelist (Most Likely!)
* **The Cause**: When MongoDB Atlas was initially created, choosing "Add My Current IP Address" restricts database access strictly to that single IP/network. When teammates attempt to connect from other locations, MongoDB Atlas blocks their IP address.
* **How to Fix**:
  1. Open [cloud.mongodb.com](https://cloud.mongodb.com).
  2. In the left navigation, click **Network Access** (under *SECURITY*).
  3. Inspect the IP Access List: if `0.0.0.0/0` is not listed, click **"Add IP Address"**.
  4. Select **"Allow Access from Anywhere"** (`0.0.0.0/0`) and click **Confirm**.
  5. It takes ~30 seconds to deploy. Once active, all teammates can connect without IP restrictions!
  > **Note**: Even if Atlas is offline or blocked, VaaniFill features an automatic in-memory datastore fallback that allows the app to function locally.

---

### 2. Missing `backend/.env` on Their Machine
* **The Cause**: `.env` files are git-ignored for credential safety.
* **The Result**: When teammates clone or pull, `backend/.env` is missing or contains placeholder values.
* **How to Fix**:
  Copy `backend/.env.example` to `backend/.env` and supply working values:
  - `MONGODB_URI` connection string
  - `JWT_SECRET`
  - `GEMINI_API_KEY`

---

### 3. Backend Server Isn't Running on Port 5000
* **The Cause**: Only the frontend (`localhost:5173`) was started, without starting the Express backend on port 5000.
* **The Result**: Browser requests to `http://localhost:5000/api/*` return `Failed to fetch` or `ERR_CONNECTION_REFUSED`.
* **How to Fix**:
  Run the backend server in a separate terminal:
  ```bash
  npm run dev:backend
  ```
  *(Or from the `backend/` folder: `npm run dev`)*

---

### 4. Missing Dependencies (`npm install`)
* **The Cause**: New packages (such as `mongoose`) were recently added. If a teammate pulls git changes without running `npm install`, the server crashes on startup with `Cannot find module 'mongoose'`.
* **How to Fix**:
  Inside the `backend/` directory, install all required dependencies:
  ```bash
  npm install
  ```

---

### 💡 Quick Diagnostic:
Open this URL directly in the browser: **`http://localhost:5000/api/health`**
- If it loads and shows `"status": "ok"`, the backend server is running properly.
- If it says *"This site can’t be reached"*, the backend server is either stopped or crashed during boot.

---

## 📡 Live API Testing (For Hackathon Judges)

You can test live extraction and validation endpoints directly from your terminal using PowerShell or `curl`:

### 1. Test Voice Extraction (Hindi Speech)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/extract" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{
    "transcript": "Mera naam Priya Sharma hai, mera phone number 9876543210 hai aur meri email priya@gmail.com hai",
    "language": "hi",
    "formId": "scholarship"
  }' | ConvertTo-Json -Depth 5
```

### 2. Test Deterministic Validation (Format Rejections)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/validate" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{
    "formId": "scholarship",
    "values": {
      "mobile": "12345",
      "email": "invalid-email-address"
    }
  }' | ConvertTo-Json -Depth 5
```

---

## 💰 100% Zero-Cost Architecture Guarantee

Every tool and service powering VaaniFill AI operates on completely free tiers:
- **Speech-to-Text**: Browser Native Web Speech API ($0.00 / zero third-party subscription).
- **AI Processing**: Google AI Studio Gemini 2.5 Flash Free Tier ($0.00 / 15 RPM, 1,000,000 TPM).
- **Backend & Frontend**: Open-source Node.js, Express, React, Vite, and Tailwind CSS.
- **Extension**: Free native Chrome Manifest V3 APIs.

---

## 📄 License & Attribution

Developed with pride by **Ctrl Freaks** for **ECCLESIA 4.0 (Problem Statement: PS ECCLISIA26-001)**.  
Licensed under the ISC License.

