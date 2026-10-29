/**
 * Form Assistant Service for VaaniFill AI
 * Contextual voice and text assistant for dynamic form fields.
 * Performs deterministic local actions and prevents hallucinated updates.
 */

export function processAssistantQuery({ query, fields = [], values = {}, language = 'en' }) {
  const cleanQuery = (query || '').trim()
  const lower = cleanQuery.toLowerCase()

  if (!cleanQuery) {
    return {
      reply: 'Please speak or type a question or instruction.',
      proposedChange: null,
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 1. Missing fields query
  if (
    lower.includes('missing') ||
    lower.includes('empty') ||
    lower.includes('khali') ||
    lower.includes('baki') ||
    lower.includes('choot')
  ) {
    const missing = fields.filter((f) => {
      const val = values[f.id] ?? f.userValue ?? f.detectedValue
      return f.required && (!val || String(val).trim() === '')
    })

    if (missing.length === 0) {
      return {
        reply: 'All required fields currently have values filled in! You are ready to review and download.',
        proposedChange: null,
        focusFieldId: null,
        highlightMissing: false,
      }
    }

    const missingLabels = missing.map((f) => String(f.label || f.id).split('/')[0].trim()).join(', ')
    return {
      reply: `There are ${missing.length} missing required field(s): ${missingLabels}. They have been highlighted for you.`,
      proposedChange: null,
      focusFieldId: missing[0]?.id || null,
      highlightMissing: true,
    }
  }

  // 2. Explain field query ("What is [field]?", "What does this field mean?", "Explain [field]")
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
    // Check if query mentions a specific detected field
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

      if (!desc || desc.length < 5 || desc === fieldName) {
        if (matchedField.id.toLowerCase().includes('course')) {
          desc = 'The academic standard, degree, or stream you are currently enrolled in (e.g. 12th Science, 12th Commerce, B.Tech, B.Sc).'
        } else if (matchedField.id.toLowerCase().includes('income')) {
          desc = 'Your total annual household income in Indian Rupees from all family sources.'
        } else if (matchedField.id.toLowerCase().includes('mobile') || matchedField.id.toLowerCase().includes('phone')) {
          desc = 'Your active 10-digit Indian mobile contact number.'
        } else {
          desc = `Enter the official value for ${fieldName} as required by this form.`
        }
      }

      return {
        reply: `Field "${fieldName}": ${desc}`,
        proposedChange: null,
        focusFieldId: matchedField.id,
        highlightMissing: false,
      }
    }

    return {
      reply: 'You can ask about any field on this form. For example: "What is Current Course?", "Explain Annual Income", or "Which fields are missing?"',
      proposedChange: null,
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 3. Focus / Navigate to field query ("Go to [field]" or "Focus [field]")
  const targetFieldToFocus = fields.find((f) => {
    const label = String(f.label || '').toLowerCase()
    const id = String(f.id || '').toLowerCase()
    return (
      (lower.includes('fill') || lower.includes('go to') || lower.includes('focus') || lower.includes('dikhao')) &&
      (lower.includes(id) || label.split(/[\s/]+/).some((w) => w.length > 3 && lower.includes(w)))
    )
  })

  if (targetFieldToFocus) {
    return {
      reply: `I have navigated to the "${String(targetFieldToFocus.label || targetFieldToFocus.id).split('/')[0].trim()}" field for you.`,
      proposedChange: null,
      focusFieldId: targetFieldToFocus.id,
      highlightMissing: false,
    }
  }

  // 4. Proposed field change with explicit confirmation ("Change [field] to [value]" or "Set [field] to [value]")
  // STRICT GUARD: Must have an explicit mutation verb and must NEVER match questions
  if (
    lower.includes('change') ||
    lower.includes('set') ||
    lower.includes('update') ||
    lower.includes('my name is') ||
    lower.includes('mera naam') ||
    lower.includes('phone number is')
  ) {
    for (const field of fields) {
      const fieldWords = String(field.label || '').toLowerCase().split(/[\s/]+/).filter((w) => w.length > 2)
      const fieldMatched = fieldWords.some((w) => lower.includes(w)) || lower.includes(field.id.toLowerCase())

      if (fieldMatched) {
        const regexPatterns = [
          /(?:change|set|update)\s+(?:my\s+)?[a-z\s]+?\s+to\s+([a-z0-9\s.,-]+)/i,
          /(?:mera|meri)\s+[a-z\s]+?\s+(?:hai|rakho)\s+([a-z0-9\s.,-]+)/i,
          /(?:my\s+name\s+is|name\s+is)\s+([a-z\s]+)/i,
        ]

        let proposedValue = null
        for (const rx of regexPatterns) {
          const m = cleanQuery.match(rx)
          if (m && m[1]) {
            proposedValue = m[1].trim()
            break
          }
        }

        // GUARD: Reject if proposed value is just the field name itself
        if (proposedValue) {
          const cleanProp = proposedValue.toLowerCase()
          const cleanLabel = String(field.label || '').toLowerCase()
          const cleanId = String(field.id || '').toLowerCase()

          if (
            cleanProp === cleanLabel ||
            cleanProp === cleanId ||
            cleanProp === 'current course' ||
            cleanLabel.includes(cleanProp) && cleanProp.length > 4
          ) {
            continue
          }

          const currentVal = values[field.id] ?? field.userValue ?? field.detectedValue ?? '(empty)'
          const fieldName = String(field.label || field.id).split('/')[0].trim()

          return {
            reply: `Proposed update for "${fieldName}": change from "${currentVal}" to "${proposedValue}". Please confirm below.`,
            proposedChange: {
              fieldId: field.id,
              fieldLabel: fieldName,
              oldValue: currentVal,
              newValue: proposedValue,
            },
            focusFieldId: field.id,
            highlightMissing: false,
          }
        }
      }
    }
  }

  // Fallback: Clear helpful guidance
  return {
    reply: `I am your assistant for this ${fields.length}-field form. You can ask: "What is [field]?", "Which fields are missing?", or "Set [field] to [value]".`,
    proposedChange: null,
    focusFieldId: null,
    highlightMissing: false,
  }
}

export default {
  processAssistantQuery,
}
