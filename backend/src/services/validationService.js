/**
 * Deterministic Validation Service for VaaniFill AI
 * Validates extracted form fields, checks required inputs, and normalizes formats.
 * Core rule: Zero-hallucination. Never invent or synthesize missing data.
 */

// Normalization mappings for common multi-lingual options
const GENDER_MAPPINGS = {
  male: "Male",
  m: "Male",
  purush: "Male",
  ladka: "Male",
  aadmi: "Male",
  पुरुष: "Male",
  लड़का: "Male",
  female: "Female",
  f: "Female",
  mahila: "Female",
  ladki: "Female",
  aurat: "Female",
  महिला: "Female",
  लड़की: "Female",
  other: "Other",
  transgender: "Other",
  अन्य: "Other"
}

const CATEGORY_MAPPINGS = {
  general: "General",
  gen: "General",
  सामान्य: "General",
  obc: "OBC",
  ओबीसी: "OBC",
  sc: "SC",
  अनुसूचित_जाति: "SC",
  st: "ST",
  अनुसूचित_जनजाति: "ST",
  ews: "EWS"
}

/**
 * Validates and normalizes phone numbers (10 digits, starts with 6-9 in India)
 */
export function normalizePhone(rawVal) {
  if (!rawVal) return null
  const cleaned = String(rawVal).replace(/\D/g, "")
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2)
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return cleaned.slice(1)
  }
  return cleaned
}

/**
 * Normalizes dates to YYYY-MM-DD
 */
export function normalizeDate(rawVal) {
  if (!rawVal) return null
  const str = String(rawVal).trim()
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0")
    const month = dmyMatch[2].padStart(2, "0")
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // Parse generic Date string
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }

  return str
}

/**
 * Validates an individual field
 */
export function validateField(fieldDef, rawValue) {
  let val = rawValue

  // Clean empty or null-like values
  if (
    val === undefined ||
    val === null ||
    String(val).trim() === "" ||
    String(val).toLowerCase() === "null" ||
    String(val).toLowerCase() === "undefined"
  ) {
    val = null
  }

  const result = {
    id: fieldDef.id || fieldDef.fieldKey,
    label: fieldDef.label || fieldDef.id,
    type: fieldDef.type || "text",
    required: !!fieldDef.required,
    options: fieldDef.options || null,
    value: val !== null ? String(val).trim() : null,
    status: "matched",
    validationError: null,
    confidence: val !== null ? 0.95 : 0.0
  }

  // 1. Missing Check
  if (result.value === null) {
    if (result.required) {
      result.status = "missing"
      result.validationError = "Required field missing / आवश्यक जानकारी अधूरी है"
    } else {
      result.status = "optional_empty"
    }
    return result
  }

  // 2. Format & Type Checks
  const cleanVal = result.value

  // Phone Validation
  if (result.type === "tel" || result.id.toLowerCase().includes("phone") || result.id.toLowerCase().includes("mobile") || result.id.toLowerCase().includes("contact")) {
    const normalized = normalizePhone(cleanVal)
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      result.status = "invalid"
      result.validationError = `Invalid phone number (${cleanVal}). Must be 10 digits starting with 6-9.`
      result.confidence = 0.4
    } else {
      result.value = normalized
    }
  }

  // Email Validation
  else if (result.type === "email" || result.id.toLowerCase().includes("email")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanVal)) {
      result.status = "invalid"
      result.validationError = `Invalid email address format (${cleanVal}).`
      result.confidence = 0.4
    }
  }

  // Date Validation
  else if (result.type === "date" || result.id.toLowerCase() === "dob") {
    const normalized = normalizeDate(cleanVal)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      result.status = "invalid"
      result.validationError = `Invalid date format (${cleanVal}). Expected YYYY-MM-DD.`
      result.confidence = 0.4
    } else {
      result.value = normalized
    }
  }

  // Numeric Validation
  else if (result.type === "number" || result.id.toLowerCase().includes("income") || result.id.toLowerCase().includes("age")) {
    const num = Number(cleanVal.replace(/[,₹$]/g, ""))
    if (isNaN(num)) {
      result.status = "invalid"
      result.validationError = `Expected a valid number, received: ${cleanVal}`
      result.confidence = 0.3
    } else {
      result.value = String(num)
    }
  }

  // Select / Enum Validation & Fuzzy Normalization
  else if (result.type === "select" || result.options) {
    const lower = cleanVal.toLowerCase().trim()
    if (result.id.toLowerCase() === "gender") {
      result.value = GENDER_MAPPINGS[lower] || cleanVal
    } else if (result.id.toLowerCase() === "category") {
      result.value = CATEGORY_MAPPINGS[lower] || cleanVal
    } else if (result.options) {
      const match = result.options.find(opt => opt.toLowerCase() === lower)
      if (match) {
        result.value = match
      }
    }
  }

  // PIN / Postal Code Validation
  else if (result.id.toLowerCase().includes("postal") || result.id.toLowerCase().includes("pin")) {
    const digits = cleanVal.replace(/\D/g, "")
    if (!/^[1-9]\d{5}$/.test(digits)) {
      result.status = "invalid"
      result.validationError = `Invalid 6-digit Indian PIN code (${cleanVal}).`
      result.confidence = 0.4
    } else {
      result.value = digits
    }
  }

  return result
}

/**
 * Generates natural follow-up question for missing fields in the requested language
 */
export function generateNextQuestion(field, language = "en") {
  if (!field) return null

  const isHindi = language.startsWith("hi")
  const label = field.label || field.id

  if (isHindi) {
    if (field.id === "fullName" || field.id === "patientName") return { fieldId: field.id, text: "कृपया अपना पूरा नाम बताएं।" }
    if (field.id === "mobile" || field.id === "contactNumber") return { fieldId: field.id, text: "कृपया अपना 10 अंकों का मोबाइल नंबर बताएं।" }
    if (field.id === "email") return { fieldId: field.id, text: "कृपया अपना ईमेल पता दर्ज कराएं।" }
    if (field.id === "dob") return { fieldId: field.id, text: "आपकी जन्म तिथि क्या है?" }
    if (field.id === "age") return { fieldId: field.id, text: "आपकी आयु कितने वर्ष है?" }
    if (field.id === "cityDistrict" || field.id === "state") return { fieldId: field.id, text: "आपका शहर या राज्य कौन सा है?" }
    return { fieldId: field.id, text: `कृपया ${label} की जानकारी प्रदान करें।` }
  }

  // Default English
  if (field.id === "fullName" || field.id === "patientName") return { fieldId: field.id, text: "Please tell us your full legal name." }
  if (field.id === "mobile" || field.id === "contactNumber") return { fieldId: field.id, text: "Please provide your 10-digit mobile number." }
  if (field.id === "email") return { fieldId: field.id, text: "Please provide your email address." }
  if (field.id === "dob") return { fieldId: field.id, text: "What is your date of birth? (e.g. 15th August 2000)" }
  if (field.id === "age") return { fieldId: field.id, text: "How old are you?" }
  if (field.id === "cityDistrict" || field.id === "state") return { fieldId: field.id, text: "Which city or state do you reside in?" }
  return { fieldId: field.id, text: `Please provide information for: ${label}.` }
}

/**
 * Validates an entire form schema against raw inputs
 */
export function validateForm(fieldsDef, rawInputs = {}, language = "en") {
  const fields = []
  let matchedCount = 0
  let missingCount = 0
  let invalidCount = 0

  for (const def of fieldsDef) {
    const rawVal = rawInputs[def.id || def.fieldKey]
    const result = validateField(def, rawVal)

    if (result.status === "matched") matchedCount++
    else if (result.status === "missing") missingCount++
    else if (result.status === "invalid") invalidCount++

    fields.push(result)
  }

  // Find first required field needing attention
  const nextMissing = fields.find(f => f.status === "missing" || f.status === "invalid")
  const nextQuestion = nextMissing ? generateNextQuestion(nextMissing, language) : null

  return {
    isComplete: missingCount === 0 && invalidCount === 0,
    summary: {
      total: fields.length,
      matched: matchedCount,
      missing: missingCount,
      invalid: invalidCount
    },
    nextQuestion,
    fields
  }
}

