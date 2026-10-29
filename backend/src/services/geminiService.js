/**
 * Gemini AI Extraction Service for VaaniFill AI
 * Uses Google Gemini 2.5 Flash to extract structured JSON from spoken audio transcripts or document OCR.
 * Includes deterministic mock fallback for offline hackathon testing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const isRealApiKey = GEMINI_API_KEY && 
  GEMINI_API_KEY.startsWith('AIza') && 
  !GEMINI_API_KEY.includes('placeholder') && 
  GEMINI_API_KEY.length > 25

let genAI = null
if (isRealApiKey) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
}

/**
 * Deterministic offline fallback extractor for testing without live API quota
 */
function heuristicExtraction(transcript, fieldsDef) {
  const result = {}
  const text = String(transcript || '')

  for (const field of fieldsDef) {
    const id = field.id || field.fieldKey
    result[id] = null

    // 1. Phone extraction
    if (id.toLowerCase().includes('phone') || id.toLowerCase().includes('mobile') || id.toLowerCase().includes('contact')) {
      const match = text.match(/\b([6-9]\d{9})\b/)
      if (match) result[id] = match[1]
    }

    // 2. Email extraction
    else if (id.toLowerCase().includes('email')) {
      const match = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/)
      if (match) result[id] = match[1]
    }

    // 3. Name extraction (Hindi, Hinglish & English patterns)
    else if (id.toLowerCase().includes('name')) {
      const nameMatch = text.match(/(?:mera\s+naam|mera\s+name|मेरा\s*नाम|my\s+name\s+is|name\s+is|i\s+am)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i)
      if (nameMatch) {
        result[id] = nameMatch[1].trim()
      }
    }

    // 4. Age or numeric
    else if (id.toLowerCase().includes('age') || id.toLowerCase().includes('umar')) {
      const ageMatch = text.match(/(?:umar|age|saal)\s*(?:is|hai)?\s*(\d{1,2})/i) || text.match(/(\d{1,2})\s*(?:saal|years)/i)
      if (ageMatch) result[id] = Number(ageMatch[1])
    }

    // 5. Gender
    else if (id.toLowerCase().includes('gender')) {
      if (/female|mahila|महिला|ladki|लड़की/i.test(text)) result[id] = 'Female'
      else if (/male|purush|पुरुष|ladka|लड़का/i.test(text)) result[id] = 'Male'
    }

    // 6. City / District
    else if (id.toLowerCase().includes('city') || id.toLowerCase().includes('district') || id.toLowerCase().includes('state')) {
      const cityMatch = text.match(/(?:live in|from|rehta hoon|rehti hoon|sheher)\s+([A-Za-z\u0900-\u097F]+)/i)
      if (cityMatch) result[id] = cityMatch[1].trim()
    }

    // 7. PIN / Postal code
    else if (id.toLowerCase().includes('pin') || id.toLowerCase().includes('postal')) {
      const pinMatch = text.match(/\b([1-9]\d{5})\b/)
      if (pinMatch) result[id] = pinMatch[1]
    }
  }

  return result
}

/**
 * Extracts structured form fields from spoken transcript
 */
export async function extractFromTranscript(transcript, fieldsDef, currentFields = {}) {
  if (!genAI) {
    const offlineExtracted = heuristicExtraction(transcript, fieldsDef)
    return { ...currentFields, ...offlineExtracted }
  }

  const prompt = `
You are the AI Information Extraction Engine for VAANIFILL AI, a multilingual voice-to-form assistant.
Extract structured personal information from the user's spoken speech transcript into a JSON object.

CRITICAL INSTRUCTIONS:
1. Support Hindi, English, and Hinglish.
2. ZERO-HALLUCINATION RULE: Extract ONLY facts explicitly spoken by the user. If a field was not mentioned or is ambiguous, output null. NEVER invent or assume names, phone numbers, or addresses.
3. Merge newly spoken information with the existing fields: ${JSON.stringify(currentFields)}.
4. Normalize output:
   - Phone numbers as digits only (10 digits).
   - Dates as YYYY-MM-DD.
   - Genders as "Male", "Female", or "Other".
5. Return JSON format only matching this schema specification.

Form Field Schema:
${JSON.stringify(fieldsDef.map(f => ({ id: f.id || f.fieldKey, label: f.label, type: f.type, required: f.required })))}

User Spoken Transcript:
"${transcript}"

Output valid JSON only with keys matching field ids. Example:
{ "fullName": "...", "mobile": "..." }
`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    })

    const response = await model.generateContent(prompt)
    const jsonText = response.response.text()
    const parsed = JSON.parse(jsonText)
    return { ...currentFields, ...parsed }
  } catch (err) {
    console.warn('[GeminiService] Live API unavailable, falling back to heuristics:', err.message)
    const offlineExtracted = heuristicExtraction(transcript, fieldsDef)
    return { ...currentFields, ...offlineExtracted }
  }
}

/**
 * Multi-modal OCR extraction for image or PDF documents
 */
export async function extractFromDocument(buffer, mimeType, fileName = '') {
  const lowerName = String(fileName).toLowerCase()
  let detectedFormType = 'scholarship'
  let formTitle = 'National Scholarship Portal Application'
  let formDescription = 'Post-Matric & Merit Scholarship Scheme for Higher Education'

  if (lowerName.includes('ayushman') || lowerName.includes('hospital') || lowerName.includes('health') || lowerName.includes('opd') || lowerName.includes('patient')) {
    detectedFormType = 'healthcare'
    formTitle = 'Ayushman Hospital Intake & OPD Form'
    formDescription = 'Patient Clinical Intake and Emergency Contact Form'
  } else if (lowerName.includes('pension')) {
    detectedFormType = 'pension'
    formTitle = 'National Senior Citizen Pension Scheme'
    formDescription = 'Social Security Pension Application for Senior Citizens'
  }

  const baseSchema = getFormSchema(detectedFormType)

  // Default rich field templates with bounding boxes for the frontend preview
  const defaultFields = baseSchema.fields.map((f, idx) => ({
    fieldKey: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    placeholder: f.placeholder || `Enter ${f.label.split('/')[0].trim()}`,
    detectedValue: null,
    isMissing: true,
    confidence: 0.95,
    pageNumber: 1,
    boundingBox: { x: 12 + (idx % 2) * 40, y: 15 + Math.floor(idx / 2) * 12, width: 38, height: 7 },
    description: f.placeholder || f.label
  }))

  if (!genAI || !buffer) {
    return {
      formTitle,
      formDescription,
      pageCount: 1,
      detectedFields: defaultFields
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    })

    const prompt = `
You are the Document OCR Engine for VAANIFILL AI.
Analyze this uploaded form image or document. Identify the form title, form description, and all input fields.
For any fields already filled or printed on the form, extract the detectedValue. If a field is blank, detectedValue is null and isMissing is true.

Return JSON in this EXACT structure:
{
  "formTitle": "Official name of the form",
  "formDescription": "Short description of purpose",
  "pageCount": 1,
  "detectedFields": [
    {
      "fieldKey": "field_identifier",
      "label": "Field Label / Hindi Label if present",
      "type": "text | number | email | tel | date | select",
      "required": true,
      "placeholder": "Placeholder text",
      "detectedValue": "value if pre-printed or null",
      "isMissing": false,
      "confidence": 0.95,
      "pageNumber": 1,
      "boundingBox": { "x": 10, "y": 20, "width": 40, "height": 6 },
      "description": "Short field explanation"
    }
  ]
}
`
    const part = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType || 'image/png'
      }
    }

    const response = await model.generateContent([prompt, part])
    const parsed = JSON.parse(response.response.text())
    
    return {
      formTitle: parsed.formTitle || formTitle,
      formDescription: parsed.formDescription || formDescription,
      pageCount: parsed.pageCount || 1,
      detectedFields: parsed.detectedFields || defaultFields
    }
  } catch (err) {
    console.warn('[GeminiService] Document vision OCR fallback:', err.message)
    return {
      formTitle,
      formDescription,
      pageCount: 1,
      detectedFields: defaultFields
    }
  }
}
