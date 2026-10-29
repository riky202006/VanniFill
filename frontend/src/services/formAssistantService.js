/**
 * Form Assistant Service for VaaniFill AI
 * Contextual voice and text assistant for dynamic form fields.
 * Performs deterministic multi-field extraction, explanations, corrections,
 * and zero-hallucination validation before submitting to backend AI.
 */

import {
  extractEntitiesLocally,
  detectCorrectionIntent,
  detectSkipIntent,
} from './voiceEngine.js'

export function processAssistantQuery({ query, fields = [], values = {}, language = 'en' }) {
  const cleanQuery = (query || '').trim()
  const lower = cleanQuery.toLowerCase()
  const isHindi = String(language).toLowerCase().startsWith('hi')

  if (!cleanQuery) {
    return {
      reply: isHindi
        ? 'कृपया फॉर्म के बारे में कोई प्रश्न पूछें या अपने विवरण बोलें।'
        : 'Please speak or type a question or dictate details for this form.',
      proposedChanges: [],
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 1. Skip Intent ("skip optional", "leave that blank", "khali chhod do")
  const skipIntent = detectSkipIntent(cleanQuery)
  if (skipIntent) {
    if (skipIntent.type === 'SKIP_OPTIONAL') {
      return {
        reply: isHindi
          ? 'वैकल्पिक फ़ील्ड छोड़ दिए गए हैं। केवल आवश्यक फ़ील्ड्स पर ध्यान केंद्रित किया गया है।'
          : 'Optional fields can be left blank. Focus on completing the required fields.',
        proposedChanges: [],
        focusFieldId: null,
        highlightMissing: false,
      }
    }
    return {
      reply: isHindi
        ? 'ठीक है, आप उस फ़ील्ड को खाली छोड़ सकते हैं।'
        : 'Understood. You can leave that field blank if it is not required.',
      proposedChanges: [],
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 2. Missing fields query ("which fields are missing?", "kya khali hai?", "what is left?")
  if (
    lower.includes('missing') ||
    lower.includes('empty') ||
    lower.includes('khali') ||
    lower.includes('baki') ||
    lower.includes('choot') ||
    lower.includes('kya bacha')
  ) {
    const missing = fields.filter((f) => {
      const val = values[f.id] ?? f.userValue ?? f.detectedValue
      return f.required !== false && (!val || String(val).trim() === '')
    })

    if (missing.length === 0) {
      return {
        reply: isHindi
          ? 'बधाई हो! फॉर्म के सभी आवश्यक फ़ील्ड भर दिए गए हैं। आप समीक्षा करके डाउनलोड कर सकते हैं।'
          : 'All required fields currently have values filled in! You are ready to review and download.',
        proposedChanges: [],
        focusFieldId: null,
        highlightMissing: false,
      }
    }

    const missingLabels = missing.map((f) => String(f.label || f.id).split('/')[0].trim()).join(', ')
    return {
      reply: isHindi
        ? `फॉर्म में ${missing.length} आवश्यक फ़ील्ड खाली हैं: ${missingLabels}।`
        : `There are ${missing.length} missing required field(s): ${missingLabels}.`,
      proposedChanges: [],
      focusFieldId: missing[0]?.id || null,
      highlightMissing: true,
    }
  }

  // 3. Explicit correction targeting ("Actually change my city to Jaipur")
  const correction = detectCorrectionIntent(cleanQuery, fields)
  if (correction) {
    const currentVal = values[correction.fieldId] ?? '(empty)'
    return {
      reply: isHindi
        ? `फ़ील्ड "${correction.label}" के लिए नया मान: "${correction.value}"। पुष्टि करने के लिए नीचे क्लिक करें।`
        : `Proposed update for "${correction.label}": change from "${currentVal}" to "${correction.value}". Please review and confirm below.`,
      proposedChanges: [
        {
          fieldId: correction.fieldId,
          fieldLabel: correction.label,
          oldValue: currentVal,
          newValue: correction.value,
        },
      ],
      focusFieldId: correction.fieldId,
      highlightMissing: false,
    }
  }

  // 4. Multi-field local entity extraction (e.g. "My name is Riky Nayak, mobile number is 9876543210, city is Guwahati")
  const localEntities = extractEntitiesLocally(cleanQuery, fields)
  const extractedKeys = Object.keys(localEntities)

  if (extractedKeys.length > 0) {
    const proposedChanges = []
    extractedKeys.forEach((fId) => {
      const newVal = localEntities[fId]
      const oldVal = values[fId] ?? '(empty)'
      const fieldDef = fields.find((f) => f.id === fId)
      const fieldLabel = fieldDef ? String(fieldDef.label || fieldDef.id).split('/')[0].trim() : fId

      if (newVal && newVal !== oldVal) {
        proposedChanges.push({
          fieldId: fId,
          fieldLabel,
          oldValue: oldVal,
          newValue: newVal,
        })
      }
    })

    if (proposedChanges.length > 0) {
      const summaryList = proposedChanges.map((p) => `${p.fieldLabel}: "${p.newValue}"`).join(', ')
      return {
        reply: isHindi
          ? `मैंने ${proposedChanges.length} फ़ील्ड पहचाने हैं (${summaryList})। कृपया फॉर्म में जोड़ने के लिए नीचे समीक्षा करें।`
          : `I identified ${proposedChanges.length} field value(s): ${summaryList}. Please review and apply below.`,
        proposedChanges,
        focusFieldId: proposedChanges[0]?.fieldId || null,
        highlightMissing: false,
      }
    }
  }

  // 5. Explain field query ("What is [field]?", "Explain [field]", "samjhao")
  const isQuestion =
    lower.startsWith('what is') ||
    lower.includes('what is') ||
    lower.includes('what does') ||
    lower.includes('meaning') ||
    lower.includes('explain') ||
    lower.includes('samjhao') ||
    lower.includes('kya hai') ||
    lower.includes('tell me about') ||
    lower.includes('help me with')

  if (isQuestion) {
    const matchedField = fields.find((f) => {
      const label = String(f.label || '').toLowerCase()
      const id = String(f.id || '').toLowerCase()
      const cleanLabelName = label.split('/')[0].trim()
      return (
        lower.includes(id) ||
        lower.includes(cleanLabelName) ||
        cleanLabelName.split(/[\s]+/).some((w) => w.length > 3 && lower.includes(w))
      )
    })

    if (matchedField) {
      const fieldName = String(matchedField.label || matchedField.id).split('/')[0].trim()
      let desc = matchedField.description || matchedField.placeholder
      const isReq = matchedField.required !== false

      if (!desc || desc.length < 5 || desc === fieldName) {
        if (matchedField.id.toLowerCase().includes('course')) {
          desc = 'The academic degree or vocational course you are enrolled in (e.g., 12th Science, B.Tech, B.Sc).'
        } else if (matchedField.id.toLowerCase().includes('income')) {
          desc = 'Your total annual household income in Indian Rupees from all family sources.'
        } else if (matchedField.id.toLowerCase().includes('mobile') || matchedField.id.toLowerCase().includes('phone')) {
          desc = 'Your active 10-digit Indian mobile contact number.'
        } else {
          desc = `Enter the official value for ${fieldName} as required by this form.`
        }
      }

      const reqStr = isReq ? 'Required field.' : 'Optional field.'
      return {
        reply: `Field "${fieldName}": ${desc} (${reqStr})`,
        proposedChanges: [],
        focusFieldId: matchedField.id,
        highlightMissing: false,
      }
    }

    return {
      reply: isHindi
        ? 'आप इस फॉर्म के किसी भी फ़ील्ड के बारे में पूछ सकते हैं (उदा. "वार्षिक आय क्या है?", "कौन से फ़ील्ड खाली हैं?")।'
        : 'You can ask about any field on this form. For example: "What is Current Course?", "Explain Annual Income", or "Which fields are missing?"',
      proposedChanges: [],
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 6. Navigation query ("Go to [field]" or "Focus [field]" or "dikhao")
  const targetFieldToFocus = fields.find((f) => {
    const label = String(f.label || '').toLowerCase()
    const id = String(f.id || '').toLowerCase()
    return (
      (lower.includes('go to') || lower.includes('focus') || lower.includes('dikhao') || lower.includes('par jao')) &&
      (lower.includes(id) || label.split(/[\s/]+/).some((w) => w.length > 3 && lower.includes(w)))
    )
  })

  if (targetFieldToFocus) {
    const label = String(targetFieldToFocus.label || targetFieldToFocus.id).split('/')[0].trim()
    return {
      reply: isHindi ? `मैंने "${label}" फ़ील्ड खोल दिया है।` : `Navigated to "${label}".`,
      proposedChanges: [],
      focusFieldId: targetFieldToFocus.id,
      highlightMissing: false,
    }
  }

  // 7. General fallback
  const preview = fields.slice(0, 3).map((f) => String(f.label || f.id).split('/')[0].trim()).join(', ')
  return {
    reply: isHindi
      ? `मैं आपके इस ${fields.length}-फ़ील्ड फॉर्म के लिए सहायक हूँ (${preview} आदि)। आप विवरण बोल सकते हैं या प्रश्न पूछ सकते हैं।`
      : `I am your assistant for this ${fields.length}-field form (${preview} etc.). You can dictate values or ask questions.`,
    proposedChanges: [],
    focusFieldId: null,
    highlightMissing: false,
  }
}

export default {
  processAssistantQuery,
}
