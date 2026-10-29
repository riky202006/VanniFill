/**
 * API Endpoints and Configuration Constants
 * Team members should use these constants rather than hardcoded URLs.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const ENDPOINTS = {
  // Guest mode & form sessions
  GUEST_SESSION: '/guest/session',
  GUEST_SUBMIT: '/guest/forms/submit',
  
  // Document processing
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_OCR_PROCESS: '/documents/process',
  DOCUMENT_STATUS: (docId) => `/documents/${docId}/status`,
  
  // Form field mapping
  FORM_FIELDS_MATCH: '/forms/match',
  FORM_DOWNLOAD: (formId) => `/forms/${formId}/download`,
  
  // Auth endpoints (optional)
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  USER_PROFILE: '/user/profile',
}
