# VaaniFill AI - Development Guide

Welcome to the VaaniFill AI hackathon development guide. Follow these quickstart instructions to set up your local development environment.

## Prerequisites

- Node.js (v18 or higher recommended; v24 verified)
- npm (v9 or higher)
- Google Chrome browser (for Chrome Extension testing)
- PostgreSQL (for backend database development)

---

## 1. Frontend Quickstart (Member 1)

1. Open your terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the local Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:5173/`.

---

## 2. Backend Quickstart (Member 2)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. (Optional) Run Prisma migration when PostgreSQL is available:
   ```bash
   npm run prisma:generate
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
6. Check server health:
   ```bash
   curl http://localhost:5000/api/health
   ```

---

## 3. Chrome Extension Quickstart (Member 3)

1. In Chrome, open `chrome://extensions/`.
2. Enable **Developer mode** (toggle in upper right).
3. Click **Load unpacked**.
4. Select the `extension/` directory from this workspace.
5. Click the puzzle icon in Chrome to pin and open the VaaniFill popup.

---

## 4. Root Orchestration Scripts

From the repository root, you can also run convenient workspace scripts:

```bash
# Run the frontend dev server
npm run dev:frontend

# Build frontend for production
npm run build:frontend

# Run the backend dev server (once backend dependencies are installed)
npm run dev:backend
```
