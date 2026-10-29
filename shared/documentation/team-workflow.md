# VaaniFill AI - Hackathon Team Workflow Guide

## Team Roles & Ownership Matrix (Team Ctrl Freaks)

| Member | Primary Focus | Primary Directory | Core Responsibilities |
|---|---|---|---|
| **Riky Nayak** | Frontend Lead | `frontend/src/pages/`, `frontend/src/components/` | Workspace UI, responsive styling, accessibility, state orchestration |
| **Devansh Dausodia** | Backend & AI Lead | `backend/src/` | Express REST APIs, Gemini 2.5 Flash OCR, MongoDB Atlas integration, deterministic validation |
| **Jibtesh Kalita** | Extension & Field Mapping Lead | `extension/` | Manifest V3 service worker, content script DOM injection, form mapping |
| **Dhairya Choudhary** | QA, Testing & Pitch Lead | `backend/test/`, `shared/` | Automated test suite (20/20 passing), API specifications, live presentation |

## Branching & Commit Conventions

- `main`: Always working, deployable branch.
- Feature branches:
  - `feat/frontend-guest-mode`
  - `feat/backend-gemini-ocr`
  - `feat/extension-autofill`
  - `docs/api-specs`

## Coordination Rules

1. **Follow the API Contract**: Refer to `shared/api-contracts/form-api.json` before altering endpoints.
2. **No Hardcoded Secrets**: Always use `.env` locally; secrets are protected by `.gitignore`.
3. **Decoupled Architecture**: Frontend, Backend, and Extension operate as independent modular layers.
