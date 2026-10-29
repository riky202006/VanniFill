# VAANIFILL AI 🇮🇳
### *Speak naturally. Fill forms confidently.*

[![Hackathon](https://img.shields.io/badge/ECCLESIA_4.0-PS_ECCLISIA26--001-blueviolet?style=for-the-badge)](https://github.com/riky202006/VanniFill)
[![Team](https://img.shields.io/badge/Team-Ctrl_Freaks-ff4757?style=for-the-badge)](https://github.com/riky202006/VanniFill)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/MongoDB_Atlas-Cloud_M0-47A248?style=for-the-badge&logo=mongodb)](https://cloud.mongodb.com/)
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

The system extracts structured data, executes **deterministic format validation**, presents a transparent **human-in-the-loop review interface**, and performs **1-click automated form injection** or stamped PDF generation.

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

 [ Multilingual User Speech ]              [ Uploaded Form PDF / Image ]
 (Hindi / English / Hinglish)             (Ayushman OPD, Scholarships, Pension)
              │                                             │
              ▼                                             ▼
 [ Native Web Speech / Extension ]            [ Multimodal Vision OCR ]
 (Zero-latency local audio capture)           (Gemini 2.5 Flash Zero-Shot OCR)
              │                                             │
              └─────────────────────┬───────────────────────┘
                                    │
                                    ▼
                     [ Express.js Gateway ] (Port 5000)
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
 [ Gemini 2.5 Flash Engine ]               [ Heuristic Offline Fallback ]
 (Strict JSON Key-Value Extraction)        (Deterministic RegEx Extractor)
               │                                         │
               └────────────────────┬────────────────────┘
                                    │
                                    ▼
                   [ Deterministic Validation Engine ]
                   • Indian Phone Regex: ^[6-9]\d{9}$
                   • Strict RFC Email Verification
                   • ISO 8601 Date Normalization (YYYY-MM-DD)
                   • PIN Code Normalization (6 digits)
                   • Multilingual Gender & Category Normalizer
                                    │
                                    ▼
                       [ Status & Confidence Tagger ]
                       🟢 Ready | 🟡 Missing | 🔴 Invalid
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
 [ MongoDB Atlas Cloud Persistence ]       [ Human-in-the-Loop Review Buffer ]
 • Citizen Sovereign Profile Store         • Inline editable inputs
 • Verified Submission Receipts            • Localized conversational questions
               │                                         │
               └────────────────────┬────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
 [ Target Form DOM Injection ]             [ Stamped Completed PDF ]
 (Synthetic dispatch on active web page)    (High-resolution pixel-perfect export)
```

---

## 👥 Engineering Team Ownership Matrix — Team Ctrl Freaks

| Team Member | Engineering Role | Core Focus Areas | Key Deliverables |
|---|---|---|---|
| **Riky Nayak** | Frontend Lead | `frontend/src/` | 4-Stage document workspace, design system, responsive UI, accessibility |
| **Devansh Dausodia** | Backend & AI Lead | `backend/src/` | Gemini 2.5 Flash OCR, MongoDB Atlas persistence, Express REST API, validation engine |
| **Jibtesh Kalita** | Extension & Field Mapping Lead | `extension/` | Manifest V3 service worker, content script DOM injection, cross-domain bridge |
| **Dhairya Choudhary** | QA, Testing & Demo Lead | `backend/test/`, `shared/` | Automated test suite (20/20 passing), API contracts, pitch presentation |

---

## 🗂️ Repository Structure

```text
VanniFill/
├── backend/                       # Node.js + Express REST API (Port 5000)
│   ├── src/
│   │   ├── config/db.js           # MongoDB Atlas connection & resilient in-memory fallback
│   │   ├── models/                # Mongoose Models (User, Submission)
│   │   ├── data/formSchemas.js    # Standard schemas (Scholarship, Healthcare, Pension)
│   │   ├── routes/
│   │   │   ├── authRoutes.js      # User registration, login, and saved citizen profile
│   │   │   ├── extractRoutes.js   # POST /api/extract (Extension & Web speech processing)
│   │   │   ├── formRoutes.js      # POST /api/forms/match & POST /api/forms/generate (PDFKit)
│   │   │   ├── guestRoutes.js     # POST /api/guest/session
│   │   │   └── documentRoutes.js  # POST /api/documents/upload (Gemini Vision OCR)
│   │   ├── services/
│   │   │   ├── geminiService.js   # Gemini 2.5 Flash structured extractor & OCR
│   │   │   └── validationService.js # Deterministic validation & question generator
│   │   ├── app.js                 # Express application & CORS configuration
│   │   └── server.js              # Server entry point
│   ├── test/api.test.js           # 20-case automated unit & integration test suite
│   ├── .env.example               # Environment template (PORT, MONGODB_URI, GEMINI_API_KEY)
│   └── package.json               # Backend dependencies
│
├── frontend/                      # React 19 + Vite + Tailwind Client (Port 5173)
│   ├── src/
│   │   ├── components/            # AuthModal, DocumentUploader, DetectedFieldsEditor, FormReview
│   │   ├── pages/Guest/           # 4-stage document-driven workspace
│   │   ├── services/              # API clients and form generation service
│   │   ├── App.jsx                # Application root
│   │   └── main.jsx               # Entry point
│   ├── .env.example               # Frontend environment template
│   └── package.json               # Frontend dependencies
│
├── extension/                     # Google Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/service-worker.js # Lifecycle & message routing
│   │   ├── content/content-script.js    # In-page DOM inspector & input injector
│   │   └── popup/                 # Extension popup toolbar interface
│   ├── manifest.json              # Extension manifest
│   └── README.md                  # Extension architecture & installation guide
│
├── shared/                        # Shared contracts & documentation
│   ├── api-contracts/form-api.json# Formal API schema contract
│   └── documentation/team-workflow.md # Team workflow guidelines
│
├── .gitignore                     # Git ignore rules (secrets & node_modules protected)
├── package.json                   # Monorepo orchestration scripts
└── README.md                      # Comprehensive project documentation
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
npm install
npm --prefix backend install
npm --prefix frontend install
```

Configure environment files:
- In `backend/`: create `.env` based on `.env.example` with your `GEMINI_API_KEY` and optional `MONGODB_URI`.
- In `frontend/`: create `.env` based on `.env.example`.

---

### Step 2: Run the Automated Test Suite
Verify that all 20 core extraction, OCR, PDF generation, and authentication test cases pass:
```bash
npm test
```

**Verified Test Output:**
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
✅ [PASS] POST /api/documents/upload detects Ayushman form and returns connected: true
✅ [PASS] Returns rich field schemas with bounding boxes for preview
✅ [PASS] POST /api/forms/generate creates a valid stamped PDF stream
✅ [PASS] PDF size is valid binary stream (2226 bytes)
✅ [PASS] POST /api/auth/login logs in demo user with JWT token
✅ [PASS] GET /api/user/profile returns authenticated user profile with saved values
✅ [PASS] POST /api/auth/register registers new user and issues JWT

========================================
🏁 TEST RESULTS: 20 PASSED, 0 FAILED
========================================
```

---

### Step 3: Start the Backend Server
```bash
npm run dev:backend
```
Server runs at **`http://localhost:5000`**.  
Verify health & database status: `http://localhost:5000/api/health`.

---

### Step 4: Start the Frontend Application
```bash
npm run dev:frontend
```
Open **`http://localhost:5173`** in your browser to interact with the web interface.

---

### Step 5: Activate the Chrome In-Page Injection Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `extension/` directory from this repository.
4. The VaaniFill AI extension is now active and ready to autofill live forms on external portals.

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

## 📡 Live API Endpoints (For Hackathon Judges)

You can test extraction and validation endpoints directly using PowerShell or `curl`:

### 1. Test Voice Extraction (Multilingual Speech)
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

### 2. Test Deterministic Validation (Format Enforcement)
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

Every tool and service powering VaaniFill AI operates entirely on free tiers:
- **Speech-to-Text**: Browser Native Web Speech API ($0.00 / zero third-party subscription).
- **AI Processing**: Google AI Studio Gemini 2.5 Flash Free Tier ($0.00 / 15 RPM, 1,000,000 TPM).
- **Database**: MongoDB Atlas M0 Cloud Free Tier ($0.00 / 512 MB storage).
- **Backend & Frontend**: Open-source Node.js, Express, React, Vite, and Tailwind CSS.
- **Extension**: Free native Chrome Manifest V3 APIs.

---

## 📄 License & Attribution

Developed with pride by **Ctrl Freaks** for **ECCLESIA 4.0 (Problem Statement: PS ECCLISIA26-001)**.  
Licensed under the ISC License.
