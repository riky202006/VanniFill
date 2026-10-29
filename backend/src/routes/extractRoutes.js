/**
 * Multilingual Voice & AI Extraction Routes
 * Handles Gemini structured extraction, zero-hallucination validation, and conversational follow-ups.
 * Fully compatible with Chrome Extension and React Web App.
 */

import { Router } from 'express'
import { getFormSchema } from '../data/formSchemas.js'
import { extractFromTranscript, answerFormQuestion } from '../services/geminiService.js'
import { validateForm } from '../services/validationService.js'

const router = Router()

/**
 * Universal voice extraction endpoint
 * POST /api/extract
 */
router.post('/extract', async (req, res, next) => {
  try {
    const {
      transcript = '',
      language = 'en',
      formId = 'scholarship'
    } = req.body || {}

    // Support parameter aliases across Chrome Extension & Web Client
    const targetFields = req.body.fields || req.body.detectedFields || req.body.customSchema || null
    const contextValues = req.body.current_values || req.body.currentFields || req.body.fieldValues || {}

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_TRANSCRIPT',
        message: 'No transcript text provided in request body.'
      })
    }

    // Determine field schema (custom from webpage DOM or pre-registered template)
    const schema = targetFields && Array.isArray(targetFields)
      ? { id: formId || 'custom', fields: targetFields }
      : getFormSchema(formId)

    // 1. Extract values with Gemini AI (or heuristic fallback)
    const rawExtracted = await extractFromTranscript(transcript, schema.fields, contextValues)

    // 2. Run deterministic validation engine
    const validated = validateForm(schema.fields, rawExtracted, language)

    // 3. Format response for Chrome Extension & Web Client
    const values = {}
    const missing_fields = []
    const validation_errors = {}

    validated.fields.forEach((f) => {
      if (f.value !== null && f.value !== undefined) {
        values[f.id] = f.value
      }
      if (f.status === 'missing') {
        missing_fields.push(f.id)
      }
      if (f.status === 'invalid') {
        validation_errors[f.id] = f.validationError
      }
    })

    const follow_up_question = validated.nextQuestion ? validated.nextQuestion.text : null
    const isHindi = String(language).toLowerCase().startsWith('hi')

    // Count newly extracted non-empty fields that are different from prior context
    const newlyExtractedCount = Object.keys(rawExtracted || {}).filter((k) => {
      const v = rawExtracted[k]
      return v !== null && v !== undefined && String(v).trim() !== '' && v !== contextValues[k]
    }).length

    let reply = ''
    if (newlyExtractedCount > 0) {
      if (validated.isComplete) {
        reply = isHindi
          ? 'बहुत बढ़िया! आपके सभी आवश्यक विवरण सफलतापूर्वक भर दिए गए हैं।'
          : 'All required fields have been successfully extracted and verified.'
      } else if (follow_up_question) {
        reply = isHindi
          ? `मैंने आपके विवरण दर्ज कर लिए हैं। ${follow_up_question}`
          : `I recorded your details. ${follow_up_question}`
      } else {
        reply = isHindi ? 'जानकारी दर्ज कर ली गई है।' : 'Form fields have been updated.'
      }
    } else {
      // Intelligently answer questions or provide form-aware guidance
      reply = await answerFormQuestion(transcript, schema.fields, contextValues, language);
    }

    res.status(200).json({
      success: true,
      isComplete: validated.isComplete,

      // Extension-first contract keys
      values,
      missing_fields,
      validation_errors,
      follow_up_question,
      reply,

      // Web App contract keys
      formId: schema.id,
      summary: validated.summary,
      nextQuestion: validated.nextQuestion,
      fields: validated.fields
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Fast client-side manual validation endpoint
 * POST /api/validate
 */
router.post('/validate', (req, res) => {
  const {
    formId = 'scholarship',
    values: bodyValues = {},
    language = 'en'
  } = req.body || {}

  const targetFields = req.body.fields || req.body.detectedFields || req.body.customSchema || null
  const contextValues = req.body.current_values || req.body.currentFields || bodyValues

  const schema = targetFields && Array.isArray(targetFields)
    ? { id: formId || 'custom', fields: targetFields }
    : getFormSchema(formId)

  const validated = validateForm(schema.fields, contextValues, language)

  const values = {}
  const missing_fields = []
  const validation_errors = {}

  validated.fields.forEach((f) => {
    if (f.value !== null && f.value !== undefined) {
      values[f.id] = f.value
    }
    if (f.status === 'missing') {
      missing_fields.push(f.id)
    }
    if (f.status === 'invalid') {
      validation_errors[f.id] = f.validationError
    }
  })

  res.status(200).json({
    success: true,
    isComplete: validated.isComplete,
    values,
    missing_fields,
    validation_errors,
    summary: validated.summary,
    nextQuestion: validated.nextQuestion,
    fields: validated.fields
  })
})

export default router
