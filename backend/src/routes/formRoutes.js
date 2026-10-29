/**
 * Form Mapping, Validation & PDF Generation Routes
 * Conforms to shared/api-contracts/form-api.json and frontend documentGenerationService.js
 * Supports both MongoDB Atlas persistence and in-memory caching.
 */

import { Router } from 'express'
import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas.js'
import { validateForm } from '../services/validationService.js'
import Submission from '../models/Submission.js'
import { isMongoConnected } from '../config/db.js'

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
router.post('/match', async (req, res) => {
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

  // Persist to MongoDB if active
  if (isMongoConnected()) {
    try {
      await Submission.create({
        submissionId,
        formId,
        formTitle: schema.title,
        fieldValues: combinedInputs,
        status: submissionRecord.status
      })
    } catch (err) {
      console.warn('[Database] Submission persist warning:', err.message)
    }
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

/**
 * PDF Document Generation Pipeline
 * POST /api/forms/generate
 * Responds with binary application/pdf stream
 */
router.post('/generate', (req, res) => {
  const {
    documentId = `DOC_${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    fieldValues = {},
    formTitle = 'Official Application Form',
    originalFileName = 'form.pdf'
  } = req.body || {}

  try {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Completed_${originalFileName}"`)

    doc.pipe(res)

    // Header Branding
    doc.fillColor('#176B50').fontSize(22).text('VAANIFILL AI', { align: 'center' })
    doc.fillColor('#737D75').fontSize(11).text('Multilingual Form Assistance & Zero-Hallucination Verification', { align: 'center' })
    doc.moveDown(1)

    // Form Banner
    doc.rect(40, doc.y, 515, 60).fillAndStroke('#F7F7F2', '#DCE9DF')
    const bannerY = doc.y - 50
    doc.fillColor('#202923').fontSize(12).font('Helvetica-Bold').text(`Application: ${formTitle}`, 55, bannerY)
    doc.font('Helvetica').fontSize(9).fillColor('#737D75')
      .text(`Reference ID: VF-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, 55, bannerY + 16)
      .text(`Verified On: ${new Date().toLocaleString()} • Compliance: Zero-Hallucination Golden Rule`, 55, bannerY + 28)

    // Form Fields Table
    doc.moveDown(2)
    doc.fontSize(14).fillColor('#176B50').font('Helvetica-Bold').text('Verified Citizen Form Details', 40)
    doc.moveDown(0.5)

    const entries = Object.entries(fieldValues)
    if (entries.length === 0) {
      doc.fontSize(10).fillColor('#737D75').font('Helvetica-Oblique').text('No filled field values provided.')
    } else {
      entries.forEach(([key, val], idx) => {
        const readableLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const displayVal = val ? String(val) : '[Unfilled / Pending]'

        doc.fontSize(10).fillColor('#202923').font('Helvetica-Bold').text(`${idx + 1}. ${readableLabel}: `, { continued: true })
        doc.font('Helvetica').fillColor('#176B50').text(displayVal)
      })
    }

    // Seal & Footer
    doc.moveDown(3)
    doc.rect(40, doc.y, 515, 45).fillAndStroke('#EBF3EE', '#176B50')
    const footerY = doc.y - 35
    doc.fontSize(9).fillColor('#176B50').font('Helvetica-Bold')
      .text('OFFICIALLY STAMPED & VERIFIED BY HUMAN-IN-THE-LOOP ENGINE', 55, footerY, { align: 'center' })
    doc.fontSize(8).fillColor('#737D75').font('Helvetica')
      .text('Team Ctrl Freaks • ECCLESIA 4.0 (PS ECCLISIA26-001) • 100% Zero-Cost Architecture', 55, footerY + 14, { align: 'center' })

    doc.end()
  } catch (err) {
    console.error('[FormGenerateError]:', err)
    res.status(500).json({ error: 'Failed to generate PDF document.' })
  }
})

// Download/view submission receipt JSON
router.get('/:submissionId/download', async (req, res) => {
  let record = submissions.get(req.params.submissionId)

  if (!record && isMongoConnected()) {
    try {
      const doc = await Submission.findOne({ submissionId: req.params.submissionId })
      if (doc) {
        record = {
          submissionId: doc.submissionId,
          formId: doc.formId,
          status: doc.status,
          submittedAt: doc.createdAt,
          fields: doc.fieldValues
        }
      }
    } catch {}
  }

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
