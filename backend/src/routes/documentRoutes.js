/**
 * Document Processing Routes (OCR & Multimodal Extraction)
 * Conforms to docs/api-contract.md
 */

import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { extractFromDocument } from '../services/geminiService.js'
import { getFormSchema } from '../data/formSchemas.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

const router = Router()

// In-memory processed document storage
const processedDocs = new Map()

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { language = 'en', sessionId = null, formId = 'pension' } = req.body || {}
    const file = req.file
    const documentId = `doc_${crypto.randomBytes(4).toString('hex')}`

    const schema = getFormSchema(formId)
    const detectedFields = await extractFromDocument(
      file ? file.buffer : null,
      file ? file.mimetype : 'image/png',
      schema.fields
    )

    const docRecord = {
      documentId,
      fileName: file ? file.originalname : 'uploaded_document.pdf',
      status: 'PROCESSED',
      language,
      sessionId,
      detectedFields,
      processedAt: new Date().toISOString()
    }

    processedDocs.set(documentId, docRecord)

    res.status(200).json({
      documentId,
      fileName: docRecord.fileName,
      status: 'PROCESSED',
      detectedFields
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:docId/status', (req, res) => {
  const doc = processedDocs.get(req.params.docId)
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' })
  }
  res.json({
    documentId: doc.documentId,
    status: doc.status,
    detectedFields: doc.detectedFields
  })
})

export default router

