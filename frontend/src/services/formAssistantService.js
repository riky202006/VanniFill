/**
 * Form Assistant Service for VaaniFill AI
 * Contextual voice and text assistant for dynamic form fields.
 * Performs deterministic local actions and never silently overwrites user data.
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

    const missingLabels = missing.map((f) => f.label.split('/')[0].trim()).join(', ')
    return {
      reply: `There are ${missing.length} missing required field(s): ${missingLabels}. They have been highlighted for you.`,
      proposedChange: null,
      focusFieldId: missing[0]?.id || null,
      highlightMissing: true,
    }
  }

  // 2. Explain field query ("What does this field mean?" or "Explain [field]")
  if (
    lower.includes('what does') ||
    lower.includes('meaning') ||
    lower.includes('explain') ||
    lower.includes('samjhao') ||
    lower.includes('kya hai')
  ) {
    // Check if query mentions a specific detected field
    const matchedField = fields.find((f) => {
      const label = f.label.toLowerCase()
      const id = f.id.toLowerCase()
      return lower.includes(id) || label.split(/[\s/]+/).some((w) => w.length > 3 && lower.includes(w))
    })

    if (matchedField) {
      const desc = matchedField.description || `This field records your ${matchedField.label.split('/')[0].trim()}.`
      return {
        reply: `Field "${matchedField.label.split('/')[0].trim()}": ${desc}`,
        proposedChange: null,
        focusFieldId: matchedField.id,
        highlightMissing: false,
      }
    }

    return {
      reply: 'You can ask about any field on this form. For example: "Explain Annual Income", "Explain Course", or "What does Bank Account Number mean?"',
      proposedChange: null,
      focusFieldId: null,
      highlightMissing: false,
    }
  }

  // 3. Focus / Navigate to field query ("Go to [field]" or "Focus [field]" or "Help me fill in my [field]")
  const targetFieldToFocus = fields.find((f) => {
    const label = f.label.toLowerCase()
    const id = f.id.toLowerCase()
    return (
      (lower.includes('fill') || lower.includes('go to') || lower.includes('focus') || lower.includes('dikhao')) &&
      (lower.includes(id) || label.split(/[\s/]+/).some((w) => w.length > 3 && lower.includes(w)))
    )
  })

  if (targetFieldToFocus) {
    return {
      reply: `I have navigated to the "${targetFieldToFocus.label.split('/')[0].trim()}" field for you.`,
      proposedChange: null,
      focusFieldId: targetFieldToFocus.id,
      highlightMissing: false,
    }
  }

  // 4. Proposed field change with explicit confirmation ("Change [field] to [value]" or "My [field] is [value]")
  for (const field of fields) {
    const fieldWords = field.label.toLowerCase().split(/[\s/]+/).filter((w) => w.length > 2)
    const fieldMatched = fieldWords.some((w) => lower.includes(w)) || lower.includes(field.id.toLowerCase())

    if (fieldMatched && (lower.includes('change') || lower.includes('set') || lower.includes('my') || lower.includes('mera') || lower.includes('is'))) {
      // Extract proposed value after keyword
      const regexPatterns = [
        /(?:change|set)\s+(?:my\s+)?[a-z\s]+?\s+to\s+([a-z0-9\s.,-]+)/i,
        /(?:mera|meri)\s+[a-z\s]+?\s+(?:hai|rakho)\s+([a-z0-9\s.,-]+)/i,
        /(?:my\s+)?[a-z\s]+?\s+is\s+([a-z0-9\s.,-]+)/i,
      ]

      let proposedValue = null
      for (const rx of regexPatterns) {
        const m = cleanQuery.match(rx)
        if (m && m[1]) {
          proposedValue = m[1].trim()
          break
        }
      }

      if (proposedValue) {
        const currentVal = values[field.id] ?? field.userValue ?? field.detectedValue ?? '(empty)'
        return {
          reply: `Proposed update for "${field.label.split('/')[0].trim()}": change from "${currentVal}" to "${proposedValue}". Please confirm below.`,
          proposedChange: {
            fieldId: field.id,
            fieldLabel: field.label.split('/')[0].trim(),
            oldValue: currentVal,
            newValue: proposedValue,
          },
          focusFieldId: field.id,
          highlightMissing: false,
        }
      }
    }
  }

  // Fallback: Honest response about AI availability
  return {
    reply: `I am your assistant for this ${fields.length}-field form. You can ask: "Which fields are missing?", "Explain [field]", or "Help me fill [field]". Complex conversational reasoning requires the backend AI service.`,
    proposedChange: null,
    focusFieldId: null,
    highlightMissing: false,
  }
}

export default {
  processAssistantQuery,
}
