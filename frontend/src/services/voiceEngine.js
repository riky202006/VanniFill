/**
 * Voice & Conversational Engine for VaaniFill AI Web Application
 * Reference implementation adapted from the battle-tested Vaani Chrome Extension.
 *
 * Capabilities:
 * - Spoken digit normalization (English & Hindi) preserving leading zeros
 * - Multi-field entity extraction from natural sentences
 * - Substring-safe select option and ordinal resolution
 * - Negative and skip intent detection
 * - Field-targeted correction intent detection
 */

// Spoken digit maps for English and Hindi (supporting leading zeros!)
const SPOKEN_DIGIT_MAP = {
  // English
  zero: '0',
  oh: '0',
  nought: '0',
  nil: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  // Hindi (Latin script & Devanagari)
  shunya: '0',
  shoonya: '0',
  'शून्य': '0',
  ek: '1',
  'एक': '1',
  do: '2',
  'दो': '2',
  teen: '3',
  'तीन': '3',
  char: '4',
  chaar: '4',
  'चार': '4',
  paanch: '5',
  panch: '5',
  'पांच': '5',
  chhah: '6',
  cheh: '6',
  'छह': '6',
  saat: '7',
  'सात': '7',
  aath: '8',
  'आठ': '8',
  nau: '9',
  'नौ': '9',
}

// Ordinal words for resolving select options ("the second option", "first one", etc.)
const ORDINAL_MAP = {
  first: 0,
  '1st': 0,
  pehla: 0,
  'पहला': 0,
  one: 0,
  second: 1,
  '2nd': 1,
  doosra: 1,
  'दूसरा': 1,
  two: 1,
  third: 2,
  '3rd': 2,
  teesra: 2,
  'तीसरा': 2,
  three: 2,
  fourth: 3,
  '4th': 3,
  chautha: 3,
  'चौथा': 3,
  four: 3,
  fifth: 4,
  '5th': 4,
  panchwa: 4,
  'पांचवा': 4,
  five: 4,
  last: -1,
  aakhri: -1,
  'आखिरी': -1,
}

/**
 * Normalizes spoken digit words in an utterance to numeric digits,
 * preserving leading zeros (e.g. "zero zero one two three four" -> "001234").
 */
export function normalizeSpokenDigits(text) {
  if (!text || typeof text !== 'string') return ''
  const tokens = text.trim().split(/\s+/)
  const outTokens = []

  let digitBuffer = ''

  for (let i = 0; i < tokens.length; i++) {
    const rawToken = tokens[i].toLowerCase().replace(/[^\w\u0900-\u097F]/g, '')
    if (SPOKEN_DIGIT_MAP[rawToken] !== undefined) {
      digitBuffer += SPOKEN_DIGIT_MAP[rawToken]
    } else {
      if (digitBuffer.length > 0) {
        outTokens.push(digitBuffer)
        digitBuffer = ''
      }
      outTokens.push(tokens[i])
    }
  }

  if (digitBuffer.length > 0) {
    outTokens.push(digitBuffer)
  }

  return outTokens.join(' ')
}

/**
 * Resolves select option references (e.g. "the second option", "use female", "last option").
 * Accurately prevents substring collisions like "female" matching "male" by using whole-word matching.
 */
export function resolveSelectOption(text, field) {
  if (!field || !Array.isArray(field.options) || field.options.length === 0) {
    return null
  }

  const clean = text.toLowerCase().trim()

  // Sort options by string length descending to test longer specific options ("female") before shorter substrings ("male")
  const sortedOptions = [...field.options].sort((a, b) => String(b).length - String(a).length)

  for (const opt of sortedOptions) {
    const optClean = String(opt).toLowerCase().trim()
    const wordBoundaryRegex = new RegExp(`\\b${optClean}\\b`, 'i')
    if (clean === optClean || wordBoundaryRegex.test(clean)) {
      return opt
    }
  }

  // Ordinal match ("the second option", "second one", "first option")
  const ordinalMatch = clean.match(
    /(?:use\s+)?(?:the\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|pehla|doosra|teesra|chautha)\s*(?:option|one|wala)?/i
  )
  if (ordinalMatch) {
    const key = ordinalMatch[1].toLowerCase()
    const idx = ORDINAL_MAP[key]
    if (idx !== undefined) {
      if (idx === -1) {
        return field.options[field.options.length - 1]
      }
      if (idx >= 0 && idx < field.options.length) {
        return field.options[idx]
      }
    }
  }

  return null
}

/**
 * Detects whether an utterance is an intent to skip or leave a field blank.
 * Ensures the assistant NEVER treats phrases like "leave that blank" as literal content.
 */
export function detectSkipIntent(text) {
  if (!text || typeof text !== 'string') return null
  const clean = text.toLowerCase().trim()

  // Skip optional fields intent
  if (
    /(skip\s+optional|leave\s+optional|optional\s+chhod\s+do|optional\s+hata\s+do|skip\s+all\s+optional)/i.test(
      clean
    )
  ) {
    return { type: 'SKIP_OPTIONAL' }
  }

  // Skip specific / current field
  const skipPatterns = [
    /^(leave\s+(that|this|it)?\s*blank)$/i,
    /^(leave\s+blank)$/i,
    /^(keep\s+(it|this)?\s*empty)$/i,
    /^(blank\s*chhod\s*do)$/i,
    /^(khali\s*chhod\s*do)$/i,
    /^(isko\s*khali\s*rakho)$/i,
    /^(skip\s*(this|that|it)?)$/i,
    /^(don't\s+fill\s*(that|this|it)?)$/i,
    /^(nahin\s+bharna)$/i,
    /^(ise\s+chhod\s+do)$/i,
    /^(no\s+need)$/i,
    /^(nahi\s+chahiye)$/i,
  ]

  for (const pattern of skipPatterns) {
    if (pattern.test(clean)) {
      return { type: 'SKIP_FIELD' }
    }
  }

  return null
}

/**
 * Detects whether an utterance is an explicit correction targeting a specific field.
 * Example: "Actually, change my city to Jaipur" -> updates only city!
 */
export function detectCorrectionIntent(text, fields = []) {
  if (!text || typeof text !== 'string') return null
  const clean = text.trim()

  const correctionMatch = clean.match(
    /(?:actually\s*,?\s*|no\s*,?\s*|nahi\s*,?\s*|correction\s*:?\s*)?(?:change|update|set|make|badlo|karo)\s+(?:my\s+)?([a-zA-Z\u0900-\u097F\s]+?)\s+(?:to|as|hai|kar\s+do)\s+([^,.]+)/i
  )

  if (correctionMatch) {
    const targetPhrase = correctionMatch[1].trim().toLowerCase()
    const newValue = correctionMatch[2].trim()

    // Match targetPhrase with a field
    const matchedField = fields.find((f) => {
      const fieldTerms = `${f.id} ${f.label || ''}`.toLowerCase()
      return (
        fieldTerms.includes(targetPhrase) ||
        targetPhrase.includes(String(f.label || '').toLowerCase())
      )
    })

    if (matchedField) {
      return {
        fieldId: matchedField.id,
        value: newValue,
        label: String(matchedField.label || matchedField.id).split('/')[0].trim(),
      }
    }
  }

  return null
}

/**
 * Natural language entity extractor that parses multi-detail sentences
 * (e.g., "My name is Riky Nayak, my mobile number is 9876543210, and my city is Guwahati" or
 * "मेरा नाम रिकी नायक है, मोबाइल 9876543210 और शहर गुवाहाटी").
 */
export function extractEntitiesLocally(text, fields = []) {
  const normalized = normalizeSpokenDigits(text)
  const extracted = {}

  // Find candidate fields
  const nameField = fields.find((f) => /name|naam|नाम/i.test(`${f.id} ${f.label || ''}`))
  const ageField = fields.find((f) => /age|umar|उम्र/i.test(`${f.id} ${f.label || ''}`))
  const cityField = fields.find((f) => /city|sheher|शहर|district/i.test(`${f.id} ${f.label || ''}`))
  const phoneField = fields.find((f) => /phone|mobile|मोबाइल|contact/i.test(`${f.id} ${f.label || ''}`))
  const emailField = fields.find((f) => /email|mail|ईमेल/i.test(`${f.id} ${f.label || ''}`))
  const pinField = fields.find((f) => /(pin|pincode|postal|zip|पिन)/i.test(`${f.id} ${f.label || ''}`))
  const genderField = fields.find((f) => /gender|ling|लिंग/i.test(`${f.id} ${f.label || ''}`))
  const incomeField = fields.find((f) => /income|aay|आय/i.test(`${f.id} ${f.label || ''}`))

  // 1. Phone extraction (10 digits starting with 6-9)
  if (phoneField) {
    const phoneMatch = normalized.match(/\b([6-9]\d{9})\b/)
    if (phoneMatch) extracted[phoneField.id] = phoneMatch[1]
  }

  // 2. Email extraction
  if (emailField) {
    const emailMatch = normalized.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/)
    if (emailMatch) extracted[emailField.id] = emailMatch[1]
  }

  // 3. Postal / PIN code extraction (strictly preserving text format with leading zeros)
  if (pinField) {
    const pinMatch = normalized.match(/(?:pin|pincode|postal|code|पिन)?\s*(?:is|hai|:)?\s*\b(\d{6})\b/i)
    if (pinMatch) extracted[pinField.id] = pinMatch[1]
  }

  // 4. Age extraction
  if (ageField) {
    const ageMatch = normalized.match(/(?:i'm|im|age|umar|उम्र|saal)\s*(?:is|hai)?\s*(\d{1,2})/i) || normalized.match(/(\d{1,2})\s*(?:years|saal|year old)/i)
    if (ageMatch && Number(ageMatch[1]) > 5 && Number(ageMatch[1]) < 120) {
      extracted[ageField.id] = String(Number(ageMatch[1]))
    }
  }

  // 5. Gender extraction
  if (genderField) {
    if (/\bfemale\b|mahila|महिला|woman|girl/i.test(normalized)) extracted[genderField.id] = 'Female'
    else if (/\bmale\b|purush|पुरुष|man|boy/i.test(normalized)) extracted[genderField.id] = 'Male'
    else if (/other|transgender/i.test(normalized)) extracted[genderField.id] = 'Other'
  }

  // 6. Name extraction ("My name is Riky Nayak" or "I'm Riky Nayak" or "Mera naam Riky Nayak")
  if (nameField) {
    const nameMatch = normalized.match(
      /(?:my\s+name\s+is|i'm|im|i\s+am|mera\s+naam|mera\s+name|मेरा\s*नाम)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i
    )
    if (nameMatch) {
      const candidate = nameMatch[1].trim()
      if (!/^(female|male|from|living|years|saal|phone|mobile|city)$/i.test(candidate)) {
        extracted[nameField.id] = candidate
      }
    }
  }

  // 7. City extraction ("I live in Guwahati", "city Guwahati", "sheher Guwahati")
  if (cityField) {
    const cityMatch = normalized.match(
      /(?:live\s+in|living\s+in|from|rehta\s+hoon|rehti\s+hoon|sheher|city\s+is|city|शहर)\s*(?:is|hai|:)?\s*([A-Za-z\u0900-\u097F]+)/i
    )
    if (cityMatch) {
      const cand = cityMatch[1].trim()
      if (!/^(mobile|phone|email|name|female|male)$/i.test(cand)) {
        extracted[cityField.id] = cand
      }
    }
  }

  // 8. Income extraction
  if (incomeField) {
    const incMatch = normalized.match(/(?:income|aay|salary|आय)\s*(?:is|hai|:)?\s*(\d+)/i)
    if (incMatch) extracted[incomeField.id] = incMatch[1]
  }

  return extracted
}

/**
 * Classifies the semantic category of a form field from its metadata.
 */
export function categorizeField(field) {
  const type = (field.type || '').toLowerCase()
  if (['password', 'file', 'hidden'].includes(type)) {
    return 'sensitive'
  }

  const text = `${field.id || ''} ${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()

  if (/(password|pwd|passwd|cvv|cvc|otp|token|secret)/i.test(text)) {
    return 'sensitive'
  }
  if (
    /(first.*name|last.*name|full.*name|applicant.*name|candidate.*name|naam|नाम|gender|ling|लिंग|age|umar|उम्र|dob|birth|category|caste)/i.test(
      text
    )
  ) {
    return 'identity'
  }
  if (/(phone|mobile|contact|tel|cell|email|mail|मोबाइल|फोन|ईमेल)/i.test(text)) {
    return 'contact'
  }
  if (
    /(address|addr|pata|पता|city|sheher|शहर|district|zila|ज़िला|state|rajya|राज्य|pin|pincode|postal|zip|पिन)/i.test(
      text
    )
  ) {
    return 'location'
  }
  if (
    /(course|degree|education|qualification|university|college|school|roll|marks|percentage|year|पाठ्यक्रम)/i.test(
      text
    )
  ) {
    return 'education'
  }
  return 'details'
}

/**
 * Form Field Semantic & Status Analyzer
 * Analyzes detected fields, classifies valueStatus ('empty' | 'filled')
 * and requiredness ('required' | 'optional' | 'unknown') independently.
 */
export function analyzeForm(detectedFields = [], currentValues = {}) {
  const sections = {
    identity: [],
    contact: [],
    location: [],
    education: [],
    details: [],
  }

  const fieldModels = []
  let existingFilledCount = 0
  let requiredCount = 0
  let optionalCount = 0
  let unknownRequiredCount = 0

  detectedFields.forEach((field) => {
    const category = categorizeField(field)
    if (category === 'sensitive') return // strictly excluded

    let rawVal = currentValues[field.id]
    if (rawVal === undefined || rawVal === null) {
      rawVal = field.currentValue
    }

    const hasStringValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
    let valueStatus = hasStringValue ? 'filled' : field.valueStatus || 'empty'

    const isFilled = valueStatus === 'filled' && hasStringValue
    if (isFilled) {
      existingFilledCount++
    }

    let requiredness = field.requiredness
    if (!requiredness) {
      if (field.required === true) {
        requiredness = 'required'
      } else if (field.required === false) {
        requiredness = 'optional'
      } else {
        requiredness = 'unknown'
      }
    }

    if (requiredness === 'required') {
      requiredCount++
    } else if (requiredness === 'optional') {
      optionalCount++
    } else {
      unknownRequiredCount++
    }

    const model = {
      ...field,
      category,
      valueStatus: isFilled ? 'filled' : 'empty',
      requiredness,
      required: requiredness === 'required',
      hasExistingValue: isFilled,
      existingValue: isFilled ? String(rawVal).trim() : null,
      isPostal: /(pin|pincode|postal|zip|पिन)/i.test(`${field.id} ${field.label || ''}`),
    }

    fieldModels.push(model)
    if (sections[category]) {
      sections[category].push(model)
    } else {
      sections.details.push(model)
    }
  })

  return {
    totalFields: fieldModels.length,
    fieldModels,
    sections,
    existingFilledCount,
    requiredCount,
    optionalCount,
    unknownRequiredCount,
  }
}

/**
 * Creates an intelligent, conversational planning step that combines compatible fields
 * instead of asking rigid single-field questions.
 */
export function createConversationPlan(
  analysis,
  currentValues = {},
  skippedFields = new Set(),
  language = 'en-US'
) {
  const isHindi = String(language).toLowerCase().startsWith('hi')
  const missingRequired = []
  const missingOptional = []

  const fieldModels = analysis?.fieldModels || analysis || []

  fieldModels.forEach((field) => {
    if (skippedFields.has(field.id)) return
    const val = currentValues[field.id]
    const hasVal = val !== undefined && val !== null && String(val).trim() !== ''

    if (!hasVal) {
      if (field.requiredness === 'required' || field.required === true) {
        missingRequired.push(field)
      } else {
        missingOptional.push(field)
      }
    }
  })

  // Helper to extract clean human label
  const getCleanLabel = (f) => {
    if (!f) return ''
    const raw = f.label || f.id
    if (isHindi && raw.includes('/')) {
      return raw.split('/')[1]?.trim() || raw.split('/')[0]?.trim()
    }
    return raw.split('/')[0]?.trim()
  }

  // If no required fields are missing
  if (missingRequired.length === 0) {
    if (missingOptional.length > 0 && !skippedFields.has('__ALL_OPTIONAL__')) {
      const optLabels = missingOptional.slice(0, 2).map(getCleanLabel).join(', ')
      return {
        isComplete: false,
        readyToFill: true,
        isOptionalPhase: true,
        summaryText: isHindi
          ? `सभी आवश्यक फ़ील्ड भर दिए गए हैं! क्या आप वैकल्पिक विवरण (${optLabels}) भरना चाहते हैं, या 'skip' कहें:`
          : `All required fields are completed! Would you like to fill optional details (${optLabels}), or say 'skip' to finish:`,
        targetFields: missingOptional.map((f) => f.id),
        targetModels: missingOptional,
        question: isHindi
          ? `क्या आप ${optLabels} भरना चाहते हैं, या छोड़ें?`
          : `Would you like to provide ${optLabels}, or skip?`,
      }
    }

    return {
      isComplete: true,
      readyToFill: true,
      summaryText: isHindi
        ? 'शानदार! सभी आवश्यक फ़ील्ड सफलतापूर्वक भर दिए गए हैं। कृपया अपने फ़ॉर्म की समीक्षा करें।'
        : "All set! I've progressively filled the available fields on your form. Please review and proceed when ready.",
      targetFields: [],
      question: null,
    }
  }

  // Natural Field Bundling
  const identityMissing = missingRequired.filter((f) => f.category === 'identity')
  const contactMissing = missingRequired.filter((f) => f.category === 'contact')
  const locationMissing = missingRequired.filter((f) => f.category === 'location')

  let bundled = []
  let questionText = ''

  if (identityMissing.length > 0 && contactMissing.length > 0) {
    bundled = [identityMissing[0], contactMissing[0]]
    const l1 = getCleanLabel(bundled[0])
    const l2 = getCleanLabel(bundled[1])
    questionText = isHindi
      ? `शुरू करते हैं! कृपया अपना ${l1} और ${l2} बताएं:`
      : `Let's get this form filled out. What's your ${l1} and ${l2}?`
  } else if (locationMissing.length >= 2) {
    bundled = [locationMissing[0], locationMissing[1]]
    const l1 = getCleanLabel(bundled[0])
    const l2 = getCleanLabel(bundled[1])
    questionText = isHindi
      ? `कृपया अपना पता बताएं — ${l1} और ${l2}:`
      : `I have your address details to complete. What is your ${l1} and ${l2}?`
  } else {
    // Single targeted question
    const target = missingRequired[0]
    bundled = [target]
    const l = getCleanLabel(target)
    if (target.type === 'select' && Array.isArray(target.options) && target.options.length > 0) {
      const opts = target.options.join(', ')
      questionText = isHindi
        ? `कृपया ${l} चुनें (${opts}):`
        : `Please choose your ${l} (${opts}):`
    } else {
      questionText = isHindi
        ? `कृपया अपना ${l} बताएं:`
        : `Please provide your ${l}:`
    }
  }

  const totalFields = analysis?.totalFields || fieldModels.length
  const existingFilledCount =
    analysis?.existingFilledCount || Object.values(currentValues).filter(Boolean).length

  return {
    isComplete: false,
    readyToFill: false,
    summaryText: isHindi
      ? `मुझे फॉर्म में ${totalFields} फ़ील्ड मिले (${existingFilledCount} पहले से भरे हैं)।`
      : `I found ${totalFields} fields (${existingFilledCount} already completed).`,
    targetFields: bundled.map((f) => f.id),
    targetModels: bundled,
    question: questionText,
  }
}

/**
 * Deterministic validation engine running client-side with full precision.
 * Distinguishes between Valid, Invalid, Missing, Uncertain, and Skipped.
 */
export function validateLocally(fieldModels = [], values = {}, skippedFields = new Set()) {
  const errors = {}
  const statuses = {}
  let validCount = 0
  let invalidCount = 0
  let missingCount = 0
  let skippedCount = 0

  fieldModels.forEach((field) => {
    const fieldId = field.id
    const val = values[fieldId]
    const isSkipped = skippedFields.has(fieldId) || skippedFields.has('__ALL_OPTIONAL__')
    const hasValue = val !== undefined && val !== null && String(val).trim() !== ''

    if (isSkipped) {
      statuses[fieldId] = 'skipped'
      skippedCount++
      return
    }

    if (!hasValue) {
      if (field.requiredness === 'required' || field.required === true) {
        statuses[fieldId] = 'missing'
        missingCount++
      } else {
        statuses[fieldId] = 'optional_empty'
      }
      return
    }

    const strVal = String(val).trim()

    // 1. Phone validation
    if (field.type === 'tel' || /phone|mobile/i.test(`${field.id} ${field.label || ''}`)) {
      if (!/^[6-9]\d{9}$/.test(strVal)) {
        errors[fieldId] = `Invalid phone number (${strVal}). Must be 10 digits starting with 6-9.`
        statuses[fieldId] = 'invalid'
        invalidCount++
        return
      }
    }

    // 2. Email validation
    if (field.type === 'email' || /email/i.test(`${field.id} ${field.label || ''}`)) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(strVal)) {
        errors[fieldId] = `Invalid email address (${strVal}).`
        statuses[fieldId] = 'invalid'
        invalidCount++
        return
      }
    }

    // 3. Postal / PIN validation
    if (field.isPostal || /(pin|pincode|postal|zip)/i.test(`${field.id} ${field.label || ''}`)) {
      if (!/^[1-9]\d{5}$/.test(strVal)) {
        errors[fieldId] = `PIN code must be 6 digits starting with 1-9.`
        statuses[fieldId] = 'invalid'
        invalidCount++
        return
      }
    }

    // 4. Select options validation
    if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const match = field.options.some((opt) => String(opt).toLowerCase() === strVal.toLowerCase())
      if (!match) {
        errors[fieldId] = `Please select a valid option from the dropdown.`
        statuses[fieldId] = 'invalid'
        invalidCount++
        return
      }
    }

    // Valid
    statuses[fieldId] = 'matched'
    validCount++
  })

  const isComplete = missingCount === 0 && invalidCount === 0

  return {
    isComplete,
    statuses,
    errors,
    validCount,
    invalidCount,
    missingCount,
    skippedCount,
  }
}

/**
 * Monotonically increasing sequence tracker to prevent stale asynchronous API
 * responses from overwriting newer user corrections.
 */
export class SequenceGuard {
  constructor() {
    this.latestRequestId = 0
  }

  next() {
    this.latestRequestId += 1
    return this.latestRequestId
  }

  isCurrent(requestId) {
    return requestId === this.latestRequestId
  }
}

export default {
  normalizeSpokenDigits,
  resolveSelectOption,
  detectSkipIntent,
  detectCorrectionIntent,
  extractEntitiesLocally,
  categorizeField,
  analyzeForm,
  createConversationPlan,
  validateLocally,
  SequenceGuard,
}

