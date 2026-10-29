# VaaniFill AI - Hackathon Team Workflow Guide

## Team Roles & Ownership Matrix

| Member | Primary Focus | Primary Directory | Core Responsibilities |
|---|---|---|---|
| **Member 1** | Frontend & Guest Workflow | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/hooks/` | Welcome page, Guest mode, voice wizard UI, review form |
| **Member 2** | Backend & AI | `backend/src/` | Express REST API, Gemini API, OCR pipeline |
| **Member 3** | Chrome Extension | `extension/` | Manifest V3 background worker, content script form autofilling |
| **Member 4** | Docs, Testing & QA | `docs/`, `shared/documentation/` | API validation, testing guide, architecture diagrams, demo deck |

## Branching & Commit Conventions

- `main`: Always working, deployable branch.
- Feature branches:
  - `feat/frontend-guest-mode`
  - `feat/backend-gemini-ocr`
  - `feat/extension-autofill`
  - `docs/api-specs`

## Coordination Rules

1. **Follow the API Contract**: Refer to `docs/api-contract.md` before implementing or altering endpoints.
2. **No Hardcoded Secrets**: Always use `.env` files locally and `.env.example` templates in source control.
3. **Independent Sub-Apps**: Frontend, Backend, and Extension are decoupled; changes in one should not break local startup of another.
