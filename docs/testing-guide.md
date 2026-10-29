# VaaniFill AI - Testing Guide

## Testing Responsibilities: Member 4

This document defines the verification checklist for each component of the VaaniFill AI application.

---

## 1. Frontend Verification Checklist

- [ ] **Welcome Page Rendering**:
  - Warm ivory background (`#F7F7F2`) displayed cleanly without seams.
  - Centered floating glass panel with 24px rounded corners and subtle blur.
  - Forest-green ambient glow rendered behind the panel on the right side.
  - Manrope headings and Inter body text rendered properly.
  - Top navigation links and "Get Started" button have smooth hover micro-animations.
  - Right architectural composition shows 4 vertical green slabs and white "VAANIFILL" wordmark.
- [ ] **Responsive Tests**:
  - Test on Desktop (1280px+), Tablet (768px - 1024px), and Mobile (< 540px).
  - Verify zero horizontal scrolling on mobile viewports.
- [ ] **Accessibility**:
  - Test keyboard navigation (`Tab` focus rings visible).
  - Verify `prefers-reduced-motion` suppresses drifting animations.

---

## 2. Backend Verification Checklist

- [ ] **Health Check**:
  - `GET http://localhost:5000/api/health` returns status `200` with `{ status: "ok" }`.
- [ ] **CORS Verification**:
  - Requests from `http://localhost:5173` succeed with correct `Access-Control-Allow-Origin` headers.
- [ ] **Prisma & DB**:
  - Prisma client generates valid models matching `prisma/schema.prisma`.

---

## 3. Chrome Extension Verification Checklist

- [ ] Unpacked extension loads in Chrome without Manifest V3 errors.
- [ ] Popup interface opens with styled branding when clicking extension icon.
- [ ] Content script successfully attaches to active tab DOM.
