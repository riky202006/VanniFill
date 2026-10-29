/**
 * Form Mapping & Submission Routes
 * Conforms to docs/api-contract.md and shared/api-contracts/form-api.json
 */

import { Router } from 'express'
import crypto from 'crypto'
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas.js'
import { validateForm } from '../services/validationService.js'

const router = Router()

// In-memory submissions store
const submissions = new Map()

// List all supported form schemas
router.get('/', (req, res) => {
  res.json({
    count: Object.keys(FORM_SCHEMAS).length,
    forms: Object.values(FORM_SCHEMAS).map(f => ({
      id: f.id,
      title: f.title,
      titleHindi: f.titleHindi,
      description: f.description,
      fieldCount: f.fields.length
    }))
  })
})

// Get specific form schema
router.get('/:id', (req, res) => {
  const schema = FORM_SCHEMAS[req.params.id]
  if (!schema) {
    return res.status(404).json({ error: 'Form schema not found' })
  }
  res.json(schema)
})

// Match and validate fields
router.post('/match', (req, res) => {
  const {
    documentId = null,
    fieldValues = {},
    userInputs = {},
    formId = 'scholarship',
    language = 'en'
  } = req.body || {}

  const schema = getFormSchema(formId)
  const combinedInputs = { ...fieldValues, ...userInputs }
  const validation = validateForm(schema.fields, combinedInputs, language)

  const submissionId = `sub_${crypto.randomBytes(4).toString('hex')}`
  const submissionRecord = {
    submissionId,
    documentId,
    formId,
    status: validation.isComplete ? 'COMPLETED' : 'PENDING_REVIEW',
    submittedAt: new Date().toISOString(),
    summary: validation.summary,
    fields: validation.fields
  }

  submissions.set(submissionId, submissionRecord)

  res.status(200).json({
    submissionId,
    status: submissionRecord.status,
    matchedCount: validation.summary.matched,
    missingCount: validation.summary.missing,
    invalidCount: validation.summary.invalid,
    readyForDownload: validation.isComplete,
    downloadUrl: `/api/forms/${submissionId}/download`
  })
})

// Download/view submission receipt
router.get('/:submissionId/download', (req, res) => {
  const record = submissions.get(req.params.submissionId)
  if (!record) {
    return res.status(404).json({ error: 'Submission not found' })
  }
  res.setHeader('Content-Disposition', `attachment; filename="vaanifill_${record.submissionId}.json"`)
  res.json({
    receiptTitle: "VaaniFill Official Form Application Summary",
    ...record
  })
})

export default router

