/**
 * Document Processing Routes (OCR & Multimodal Extraction)
 * Conforms to shared/api-contracts/form-api.json and frontend documentAnalysisService.js
 */

import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { extractFromDocument } from '../services/geminiService.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

const router = Router()

// In-memory processed document storage
const processedDocs = new Map()

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { language = 'en', sessionId = null, fileName: bodyFileName } = req.body || {}
    const file = req.file
    const originalName = file ? file.originalname : bodyFileName || 'uploaded_document.pdf'
    const documentId = `doc_${crypto.randomBytes(4).toString('hex')}`

    const extraction = await extractFromDocument(
      file ? file.buffer : null,
      file ? file.mimetype : 'application/pdf',
      originalName
    )

    const docRecord = {
      documentId,
      fileName: originalName,
      status: 'PROCESSED',
      language,
      sessionId,
      formTitle: extraction.formTitle,
      formDescription: extraction.formDescription,
      pageCount: extraction.pageCount,
      detectedFields: extraction.detectedFields,
      processedAt: new Date().toISOString()
    }

    processedDocs.set(documentId, docRecord)

    res.status(200).json({
      connected: true,
      documentId,
      fileName: docRecord.fileName,
      status: 'PROCESSED',
      formTitle: docRecord.formTitle,
      formDescription: docRecord.formDescription,
      pageCount: docRecord.pageCount,
      detectedFields: docRecord.detectedFields
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
    formTitle: doc.formTitle,
    formDescription: doc.formDescription,
    detectedFields: doc.detectedFields
  })
})

export default router
