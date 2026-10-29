# VaaniFill AI - API Contract Specification

All members (Frontend, Backend, and Extension) must adhere to these REST endpoint specifications.

Base URL (Development): `http://localhost:5000/api`

---

### 1. Health & Status

#### `GET /health`
Verifies backend connectivity and service availability.

- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "vaanifill-backend",
  "timestamp": "2026-10-29T05:00:00.000Z"
}
```

---

### 2. Guest Mode Workflow

#### `POST /guest/session`
Initializes a temporary session without requiring an account.

- **Request Body**:
```json
{
  "preferredLanguage": "hi" // optional, defaults to 'en'
}
```

- **Response `201 Created`**:
```json
{
  "sessionId": "4f9d6c7b-1234-5678-abcd-ef0123456789",
  "sessionKey": "guest_abc123",
  "expiresAt": "2026-10-30T05:00:00.000Z"
}
```

---

### 3. Document Processing (OCR & AI)

#### `POST /documents/upload`
Accepts image or PDF files for OCR text extraction and field detection.

- **Content-Type**: `multipart/form-data`
- **Request Form-Data**:
  - `file`: `[Binary Image or PDF]`
  - `language`: `"hi" | "as" | "en"`
  - `sessionId`: `"[Guest Session UUID or Auth Token]"`

- **Response `200 OK`**:
```json
{
  "documentId": "doc_98765",
  "fileName": "pension_scheme.pdf",
  "status": "PROCESSED",
  "detectedFields": [
    {
      "fieldKey": "fullName",
      "label": "Full Name",
      "detectedValue": "Kanishk Choudhary",
      "confidence": 0.98,
      "isMissing": false
    },
    {
      "fieldKey": "age",
      "label": "Age (Years)",
      "detectedValue": "21",
      "confidence": 0.98,
      "isMissing": false
    },
    {
      "fieldKey": "cityDistrict",
      "label": "City / District",
      "detectedValue": null,
      "confidence": 0.0,
      "isMissing": true
    }
  ]
}
```

---

### 4. Field Matching & Review

#### `POST /forms/match`
Submits user corrections and voice-entered answers to finalize form fields.

- **Request Body**:
```json
{
  "documentId": "doc_98765",
  "fieldValues": {
    "fullName": "Kanishk Choudhary",
    "age": 21,
    "cityDistrict": "Guwahati",
    "postalCode": "781001"
  }
}
```

- **Response `200 OK`**:
```json
{
  "submissionId": "sub_555",
  "status": "COMPLETED",
  "downloadUrl": "/api/forms/sub_555/download"
}
```
