/**
 * Multilingual Voice & AI Extraction Routes
 * Handles Gemini structured extraction, zero-hallucination validation, and conversational follow-ups.
 */

import { Router } from 'express'
import { getFormSchema } from '../data/formSchemas.js'
import { extractFromTranscript } from '../services/geminiService.js'
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
      formId = 'scholarship',
      currentFields = {},
      customSchema = null
    } = req.body || {}

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_TRANSCRIPT',
        message: 'No transcript text provided in request body.'
      })
    }

    // Determine field schema (custom from webpage DOM or pre-registered template)
    const schema = customSchema && Array.isArray(customSchema)
      ? { id: formId || 'custom', fields: customSchema }
      : getFormSchema(formId)

    // 1. Extract values with Gemini AI (or heuristic fallback)
    const rawExtracted = await extractFromTranscript(transcript, schema.fields, currentFields)

    // 2. Run deterministic validation engine
    const validated = validateForm(schema.fields, rawExtracted, language)

    res.status(200).json({
      success: true,
      formId: schema.id,
      isComplete: validated.isComplete,
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
    values = {},
    customSchema = null,
    language = 'en'
  } = req.body || {}

  const schema = customSchema && Array.isArray(customSchema)
    ? { id: formId || 'custom', fields: customSchema }
    : getFormSchema(formId)

  const validated = validateForm(schema.fields, values, language)

  res.status(200).json({
    success: true,
    formId: schema.id,
    isComplete: validated.isComplete,
    summary: validated.summary,
    nextQuestion: validated.nextQuestion,
    fields: validated.fields
  })
})

export default router

