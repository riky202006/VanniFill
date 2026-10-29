/**
 * Citizen Profile Service
 * 
 * Manages retrieval, updating, and formatting of personal information.
 * Communicates with the Express backend REST API (/api/user/profile).
 * 
 * DESIGN PRINCIPLES:
 * 1. Honest States: Does not pretend backend persistence succeeded if API is offline.
 * 2. Privacy First: Does NOT persist sensitive profile data into localStorage.
 * 3. Graceful Fallback: Maintains in-memory session cache during active sessions.
 */

import { API_BASE_URL, ENDPOINTS } from '../constants/api'
import {
  createEmptyProfile,
  normalizeProfile,
  serializeProfileForBackend,
  validateProfile,
  SAMPLE_PROFILE_FIXTURE,
} from '../models/profileModel'

// In-memory cache for the current session (avoids localStorage leakage of sensitive details)
let inMemoryProfileCache = null
let lastBackendConnectionStatus = null // null | 'connected' | 'offline'

/**
 * Helper: Retrieve JWT Bearer Token from auth storage
 */
function getAuthToken() {
  try {
    return localStorage.getItem('vaanifill_token') || ''
  } catch {
    return ''
  }
}

/**
 * Fetch the current citizen's saved profile
 * @returns {Promise<{ profile: Object, connected: boolean, message?: string }>}
 */
export async function getProfile() {
  const token = getAuthToken()

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.USER_PROFILE}`, {
      method: 'GET',
      headers,
    })

    if (!res.ok) {
      throw new Error(`Profile service returned status ${res.status}`)
    }

    const data = await res.json()
    const normalized = normalizeProfile(data.profile || data)
    inMemoryProfileCache = normalized
    lastBackendConnectionStatus = 'connected'

    return {
      profile: normalized,
      connected: true,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
      },
    }
  } catch (err) {
    lastBackendConnectionStatus = 'offline'

    // Return in-memory profile if available, otherwise blank initial profile
    const fallback = inMemoryProfileCache || createEmptyProfile()

    return {
      profile: fallback,
      connected: false,
      message: 'Backend profile service unavailable. Running in local session mode.',
      error: err.message,
    }
  }
}

/**
 * Save updated citizen personal information
 * @param {Object} updatedProfile - Full or partial profile object
 * @returns {Promise<{ success: boolean, profile: Object, connected: boolean, message: string }>}
 */
export async function updateProfile(updatedProfile) {
  // Validate prior to submission
  const validation = validateProfile(updatedProfile)
  if (!validation.isValid) {
    return {
      success: false,
      connected: false,
      message: 'Please review and fix formatting errors before saving.',
      errors: validation.errors,
    }
  }

  // Always update in-memory cache for immediate UI responsiveness
  const normalized = normalizeProfile(updatedProfile)
  inMemoryProfileCache = normalized

  const token = getAuthToken()
  const payload = serializeProfileForBackend(normalized)

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.USER_PROFILE}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `Server responded with ${res.status}`)
    }

    const data = await res.json()
    const finalProfile = normalizeProfile(data.profile || payload)
    inMemoryProfileCache = finalProfile
    lastBackendConnectionStatus = 'connected'

    return {
      success: true,
      connected: true,
      profile: finalProfile,
      message: 'Your personal information was saved successfully.',
    }
  } catch (err) {
    lastBackendConnectionStatus = 'offline'

    return {
      success: true, // Local session accepted
      connected: false,
      profile: normalized,
      message: 'Changes saved for this local session. (Backend persistence is currently offline).',
      warning: err.message,
    }
  }
}

/**
 * Returns development sample profile fixture
 */
export function getSampleProfile() {
  return normalizeProfile(SAMPLE_PROFILE_FIXTURE)
}

/**
 * Check whether profile backend service is connected
 */
export function getBackendConnectionStatus() {
  return lastBackendConnectionStatus
}

/**
 * Clear in-memory profile cache on logout
 */
export function clearProfileSession() {
  inMemoryProfileCache = null
  lastBackendConnectionStatus = null
}
