# VaaniFill AI

> **Form Automation, Reimagined.**  
> A multilingual form-assistance application designed for people who struggle with digital forms. Understand forms, answer in your language, and spend less time repeating the same information.

---

## 👥 Hackathon Team Ownership Matrix

This repository is organized to enable 4 team members to work simultaneously without blocking one another or creating merge conflicts:

| Member | Focus Area | Primary Directories | Key Responsibilities |
|---|---|---|---|
| **Member 1** | **Frontend & Guest Workflow** | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/styles/` | Welcome Page, Guest Mode UI, Voice Wizard UI, Form Review |
| **Member 2** | **Backend, Database & AI** | `backend/src/`, `backend/prisma/` | Express REST API, PostgreSQL schema, Gemini API, OCR pipeline |
| **Member 3** | **Chrome Extension** | `extension/` | Manifest V3 background worker, content script form autofilling |
| **Member 4** | **Documentation & Testing** | `docs/`, `shared/documentation/` | API specifications, QA checklists, demo presentation support |

---

## 📁 Repository Structure

```
vaanifill-ai/
│
├── frontend/                     # React + Vite Client Application (Port 5173)
│   ├── public/                   # Static assets & web favicons
│   ├── src/
│   │   ├── assets/               # Visual media & SVGs
│   │   ├── components/           # Reusable UI components
│   │   │   ├── common/           # Shared buttons, badges, modals
│   │   │   ├── layout/           # Navigation, footers, containers
│   │   │   └── forms/            # Form inputs, voice mic widgets
│   │   ├── pages/                # Complete view screens
│   │   │   ├── Welcome/          # The live, working Welcome landing page
│   │   │   │   ├── Welcome.jsx
│   │   │   │   └── Welcome.css
│   │   │   ├── Guest/            # Zero-login guest filling flow
│   │   │   ├── Auth/             # Sign-in & sign-up views
│   │   │   ├── Profile/          # Saved personal profile details
│   │   │   ├── DocumentUpload/   # PDF & image form uploader
│   │   │   ├── DocumentReview/   # Field review & correction screen
│   │   │   └── History/          # Past submitted forms
│   │   ├── hooks/                # Custom React hooks (e.g. useSpeechRecognition)
│   │   ├── services/             # API request functions (apiClient.js)
│   │   ├── utils/                # Helper functions & formatters
│   │   ├── constants/            # API endpoints & configuration constants
│   │   ├── styles/               # Global tokens, resets & font variables
│   │   │   └── index.css
│   │   ├── App.jsx               # Root component (renders Welcome page)
│   │   └── main.jsx              # React root entry point
│   ├── .env.example              # Frontend environment variables template
│   ├── index.html                # HTML template with SEO & Google Fonts
│   └── package.json              # Frontend dependencies (React, Vite, Lucide)
│
├── backend/                      # Node.js + Express API Server (Port 5000)
│   ├── src/
│   │   ├── config/               # Database, Gemini, and environment config
│   │   ├── controllers/          # Route controller handlers
│   │   ├── middleware/           # Auth, validation, and error middlewares
│   │   ├── routes/               # Express route definitions
│   │   ├── services/             # Gemini AI, OCR processing & business logic
│   │   ├── validators/           # Request input schemas
│   │   ├── utils/                # Server helper utilities
│   │   ├── app.js                # Express app setup & middleware pipeline
│   │   └── server.js             # Server listener entry point
│   ├── prisma/
│   │   └── schema.prisma         # PostgreSQL schema (Users, Guests, Documents)
│   ├── tests/                    # Backend API unit & integration tests
│   ├── .env.example              # Backend environment variables template
│   └── package.json              # Backend dependencies (Express, Prisma, CORS)
│
├── extension/                    # Google Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/           # Service worker background scripts
│   │   ├── content/              # Content scripts injected into web forms
│   │   ├── popup/                # Extension popup HTML, CSS, & JS
│   │   └── shared/               # Shared extension messaging utilities
│   ├── assets/                   # Extension toolbar icons
│   ├── manifest.json             # Chrome Manifest V3 configuration
│   └── README.md                 # Extension installation & testing instructions
│
├── shared/                       # Cross-team Single Source of Truth
│   ├── api-contracts/            # Standardized JSON API schemas (form-api.json)
│   └── documentation/            # Team workflow & Git collaboration rules
│
├── docs/                         # Comprehensive Project Documentation
│   ├── architecture.md           # Architecture diagrams & component breakdown
│   ├── api-contract.md           # Full REST API endpoint reference
│   ├── development-guide.md      # Detailed developer setup instructions
│   └── testing-guide.md          # Quality assurance & verification checklist
│
├── .gitignore                    # Git ignore file (excludes secrets & dependencies)
├── README.md                     # This file
└── package.json                  # Root orchestration scripts
```

---

## 🚀 Quickstart Instructions

### 1. Running the Frontend (Welcome Page)

From the project root:
```bash
npm run dev:frontend
```
*Or navigate directly into the frontend directory:*
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173/`** in your browser to view the living Welcome page.

### 2. Running the Backend (When Ready)

From the backend directory:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
The server will start at **`http://localhost:5000/`**. Check health at `http://localhost:5000/api/health`.

### 3. Loading the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension/` folder from this repo.

---

## 🎨 Design System & Palette

- **Page Background**: `#F7F7F2` (Warm ivory)
- **Main Text**: `#202923` (Deep charcoal)
- **Primary Green**: `#176B50` (Forest green)
- **Light Green**: `#DCE9DF` (Soft sage)
- **Secondary Text**: `#737D75` (Forest slate)
- **Panel Background**: `#FFFFFF` (Translucent glassmorphism)
- **Typography**: `Manrope` for headings, `Inter` for body text.

---

## 🔒 Security Best Practices

- **Never commit `.env` files** or real secrets.
- Always use `.env.example` templates with placeholder values.
- Never put database credentials or private keys in the frontend or Chrome extension.
