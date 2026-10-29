/**
 * Dual AI Extraction Service for VaaniFill AI
 * Combines Groq Ultra-Fast LPU Inference (~300ms) for Speech & Logic
 * with Google Gemini 3.5 Flash for Multimodal Vision Document OCR.
 *
 * Tier 1: Groq (300ms ultra-low latency speech extraction)
 * Tier 2: Gemini 3.5 Flash (Vision OCR & multimodal fallback)
 * Tier 3: Deterministic Heuristic Regex (100% offline fallback)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

const isRealApiKey = GEMINI_API_KEY && 
  !GEMINI_API_KEY.includes('placeholder') && 
  GEMINI_API_KEY.length > 15

let genAI = null
if (isRealApiKey) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
}

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite']

async function generateWithGemini(contents, timeoutMs = 8000) {
  if (!genAI) return null
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      })
      const generatePromise = model.generateContent(contents)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on ${modelName}`)), timeoutMs)
      )
      const response = await Promise.race([generatePromise, timeoutPromise])
      const text = response.response.text()
      const parsed = JSON.parse(text)
      return { parsed, modelName }
    } catch (err) {
      console.warn(`[GeminiService] ${modelName} notice: ${err.message.slice(0, 100)}`)
    }
  }
  return null
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

    // 6. Category
    else if (id.toLowerCase().includes('category') || id.toLowerCase().includes('caste')) {
      if (/obc/i.test(text)) result[id] = 'OBC'
      else if (/sc|scheduled caste/i.test(text)) result[id] = 'SC'
      else if (/st|scheduled tribe/i.test(text)) result[id] = 'ST'
      else if (/general|gen/i.test(text)) result[id] = 'General'
    }

    // 7. Date of birth
    else if (id.toLowerCase().includes('dob') || id.toLowerCase().includes('birth')) {
      const dateMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/) || text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
      if (dateMatch) {
        const parts = dateMatch[0].split(/[-/.]/)
        if (parts[0].length === 4) result[id] = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        else result[id] = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
    }

    // 8. City or district extraction
    else if (id.toLowerCase().includes('city') || id.toLowerCase().includes('sheher') || id.toLowerCase().includes('district')) {
      const cityMatch = text.match(/(?:\bcity\b|\bsheher\b|\bdistrict\b|\blive\s+in\b|\bfrom\b|\brehta\s+hoon\b|\brehti\s+hoon\b|\bशहर\b)\s*(?:is|hai|:)?\s*([A-Za-z\u0900-\u097F]+)/i);
      if (cityMatch && !/^(mobile|phone|email|name|male|female)$/i.test(cityMatch[1])) {
        result[id] = cityMatch[1].trim();
      }
    }

    // 9. PIN or postal code extraction (preserving string with leading zeros)
    else if (id.toLowerCase().includes('pin') || id.toLowerCase().includes('postal') || id.toLowerCase().includes('zip')) {
      const pinMatch = text.match(/\b(\d{6})\b/);
      if (pinMatch) result[id] = pinMatch[1];
    }

    // 10. Annual income
    else if (id.toLowerCase().includes('income') || id.toLowerCase().includes('aay')) {
      const incMatch = text.match(/(?:income|aay|salary)\s*(?:is|hai|:)?\s*(\d+)/i);
      if (incMatch) result[id] = Number(incMatch[1]);
    }

    // 11. General fallback for unmentioned fields
    else {
      result[id] = null
    }
  }

  return result
}

/**
 * Ultra-Fast Speech Extraction via Groq Cloud (~300ms)
 */
async function extractWithGroq(transcript, fieldsDef) {
  if (!GROQ_API_KEY || GROQ_API_KEY.includes('placeholder')) {
    return null
  }

  const prompt = `You are the Multilingual Form Extraction Engine for VAANIFILL AI.
Extract structured field values from this transcript of user speech:
"${transcript}"

Target Form Fields:
${JSON.stringify(fieldsDef.map(f => ({ id: f.id || f.fieldKey, label: f.label, type: f.type })))}

CRITICAL ZERO-HALLUCINATION RULES:
1. ONLY extract values explicitly stated by the user.
2. If a field was NOT mentioned, its value MUST be null. Never invent or hallucinate.
3. Map Hindi/colloquial speech into clean official form values (e.g. "महिला" -> "Female", "दसवीं" -> "10th", "General" -> "General").
4. Output valid JSON mapping field IDs to extracted values or null.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: 'You are an extraction engine. Output strictly valid JSON conforming to the schema with no extra text or markdown.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    return JSON.parse(content)
  } catch (err) {
    console.warn('[Groq Engine] Fast extraction fallback:', err.message)
    return null
  }
}

/**
 * Multilingual Speech Extraction Engine
 * Tries Groq (Tier 1) -> Gemini 3.5 Flash (Tier 2) -> Heuristics (Tier 3)
 */
export async function extractFromTranscript(transcript, fieldsDef, currentFields = {}) {
  // Tier 1: Try Ultra-Fast Groq Inference (< 400ms)
  const groqResult = await extractWithGroq(transcript, fieldsDef)
  if (groqResult) {
    console.log('⚡ [AI Engine] Extracted via Groq High-Speed Inference in ~300ms')
    return { ...currentFields, ...groqResult }
  }

  // Tier 2: Try Gemini 3.5 Flash
  if (genAI) {
    const prompt = `
You are the Multilingual Form Extraction Engine for VAANIFILL AI.
Extract structured field values from this transcript of user speech:
"${transcript}"

Target Form Fields:
${JSON.stringify(fieldsDef.map(f => ({ id: f.id || f.fieldKey, label: f.label, type: f.type })))}

CRITICAL ZERO-HALLUCINATION RULES:
1. ONLY extract values explicitly stated by the user.
2. If a field was NOT mentioned, its value MUST be null. Never invent or hallucinate.
3. Map Hindi/colloquial speech into clean official form values (e.g. "महिला" -> "Female", "दसवीं" -> "10th", "General" -> "General").
4. Output valid JSON mapping field IDs to extracted values or null.
Example:
{ "fullName": "...", "mobile": "..." }
`

    const geminiRes = await generateWithGemini(prompt, 6000)
    if (geminiRes?.parsed) {
      console.log(`✨ [AI Engine] Extracted via ${geminiRes.modelName}`)
      return { ...currentFields, ...geminiRes.parsed }
    }
  }

  // Tier 3: Heuristic deterministic regex fallback
  const offlineExtracted = heuristicExtraction(transcript, fieldsDef)
  return { ...currentFields, ...offlineExtracted }
}

/**
 * Universal Zero-Shot Multi-Modal Document OCR Extraction
 * Handles ANY arbitrary form: PDF, PNG, JPG, JPEG, WEBP.
 * Uses Gemini 3.5 Flash Vision with automatic 8-second circuit breaker.
 */
export async function extractFromDocument(buffer, mimeType, fileName = '') {
  const cleanName = String(fileName || 'document.pdf').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
  const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
  const lowerName = cleanName.toLowerCase()

  // Baseline fallback fields in case of offline/network failure
  let detectedFormType = 'scholarship'
  let fallbackTitle = formattedTitle.length > 3 ? formattedTitle : 'Citizen Application Form'
  let fallbackDescription = 'Digital Form Application'

  if (lowerName.includes('ayushman') || lowerName.includes('hospital') || lowerName.includes('health') || lowerName.includes('opd') || lowerName.includes('patient')) {
    detectedFormType = 'healthcare'
    fallbackTitle = 'Ayushman Hospital Intake & OPD Form'
    fallbackDescription = 'Patient Clinical Intake and Emergency Contact Form'
  } else if (lowerName.includes('pension')) {
    detectedFormType = 'pension'
    fallbackTitle = 'National Senior Citizen Pension Scheme'
    fallbackDescription = 'Social Security Pension Application for Senior Citizens'
  } else if (lowerName.includes('scholarship')) {
    detectedFormType = 'scholarship'
    fallbackTitle = 'National Scholarship Portal Application'
    fallbackDescription = 'Post-Matric & Higher Education Merit Scholarship Scheme'
  } else if (lowerName.includes('class') || lowerName.includes('12') || lowerName.includes('school') || lowerName.includes('admission') || lowerName.includes('board')) {
    detectedFormType = 'scholarship'
    fallbackTitle = `${formattedTitle} Examination & Admission Form`
    fallbackDescription = 'Senior Secondary Board & Academic Enrollment Document'
  }

  const baseSchema = getFormSchema(detectedFormType)
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
    description: f.placeholder || f.label,
  }))

  // If no buffer or offline
  if (!genAI || !buffer) {
    return {
      formTitle: fallbackTitle,
      formDescription: fallbackDescription,
      pageCount: 1,
      detectedFields: defaultFields,
    }
  }

  try {
    const prompt = `
You are the Universal Form Detection and Layout Engine for VAANIFILL AI.
Analyze this uploaded document/form image or PDF. It can be ANY form from any institution (government scheme, medical intake, passport, driving license, bank application, tax form, admission, or utility bill).

YOUR GOAL:
1. Identify the official Form Title and Form Description from the document header.
2. Detect EVERY fillable input field, blank line, text box, or question that requires user entry.
3. For each field:
   - fieldKey: Unique camelCase identifier (e.g. "applicantName", "meterNumber", "dateOfBirth", "bloodGroup", "bankAccount")
   - label: The printed field label as shown on the document (preserve bilingual text like Hindi/English if present)
   - type: "text" | "number" | "date" | "tel" | "email" | "select" | "textarea"
   - required: true if mandatory or marked with (*), else false
   - placeholder: Helpful prompt for the user
   - detectedValue: If the document already has pre-printed or handwritten text filled into this field, transcribe it. If blank, set to null.
   - isMissing: true if detectedValue is null, false if a value was found.
   - confidence: Estimated confidence (0.85 to 0.99)
   - pageNumber: Page number where field is located (default 1)
   - boundingBox: Approximate percentage coordinates { "x": number, "y": number, "width": number, "height": number } (0 to 100)
   - description: Short explanation of what this field is for

Return valid JSON conforming to this schema:
{
  "formTitle": "Official name of the form",
  "formDescription": "Brief explanation of purpose",
  "pageCount": 1,
  "detectedFields": [
    {
      "fieldKey": "...",
      "label": "...",
      "type": "text",
      "required": true,
      "placeholder": "...",
      "detectedValue": null,
      "isMissing": true,
      "confidence": 0.95,
      "pageNumber": 1,
      "boundingBox": { "x": 12, "y": 20, "width": 40, "height": 6 },
      "description": "..."
    }
  ]
}
`

    // Determine normalized mimeType
    let cleanMime = mimeType || 'application/pdf'
    if (cleanMime.includes('octet-stream')) {
      if (fileName.endsWith('.pdf')) cleanMime = 'application/pdf'
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) cleanMime = 'image/jpeg'
      else if (fileName.endsWith('.png')) cleanMime = 'image/png'
    }

    const part = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: cleanMime,
      },
    }

    const geminiRes = await generateWithGemini([prompt, part], 8000)
    if (geminiRes?.parsed) {
      const parsed = geminiRes.parsed
      console.log(`✨ [AI Engine] Document parsed via ${geminiRes.modelName}`)
      return {
        formTitle: parsed.formTitle || fallbackTitle,
        formDescription: parsed.formDescription || fallbackDescription,
        pageCount: parsed.pageCount || 1,
        detectedFields: parsed.detectedFields && parsed.detectedFields.length > 0
          ? parsed.detectedFields
          : defaultFields,
      }
    }

    return {
      formTitle: fallbackTitle,
      formDescription: fallbackDescription,
      pageCount: 1,
      detectedFields: defaultFields,
    }
  } catch (err) {
    console.warn('[GeminiService] Vision OCR notice:', err.message)
    return {
      formTitle: fallbackTitle,
      formDescription: fallbackDescription,
      pageCount: 1,
      detectedFields: defaultFields,
    }
  }
}


/**
 * Contextual Form Q&A Assistant Engine
 * Answers user questions directly based on the uploaded form's actual schema and values.
 */
export async function answerFormQuestion(question, fieldsDef = [], currentValues = {}, language = 'en') {
  const isHindi = String(language).toLowerCase().startsWith('hi');

  // Tier 1: Try Gemini AI
  if (genAI) {
    const prompt = `
You are the VaaniFill AI Form Assistant.
The user is filling out a digital form with the following actual detected fields:
${JSON.stringify(fieldsDef.map((f) => ({
  id: f.id || f.fieldKey,
  label: f.label,
  type: f.type,
  required: Boolean(f.required),
  description: f.description || f.placeholder || null,
  currentValue: currentValues[f.id] || null
})))}

User Question: "${question}"

Provide a concise, helpful, accurate answer (1 to 3 sentences maximum) in ${isHindi ? 'Hindi (Devanagari script)' : 'English'}.
Address their question directly based on the form schema and current values above.
Never invent field values or claim a field has a value when it is null.
If they ask what a field means, explain its purpose simply.
If they ask what fields are missing, list only the genuinely empty required fields.
Output a JSON object with: { "reply": "..." }
`;
    try {
      const res = await generateWithGemini(prompt, 5000);
      if (res?.parsed?.reply) {
        return res.parsed.reply;
      }
    } catch (e) {
      console.warn('[Gemini Q&A] Fallback to deterministic Q&A:', e.message);
    }
  }

  // Tier 2: Deterministic Context-Aware Q&A
  const lower = (question || '').toLowerCase().trim();

  // Missing fields inquiry
  if (lower.includes('missing') || lower.includes('empty') || lower.includes('khali') || lower.includes('baki') || lower.includes('choot')) {
    const missing = fieldsDef.filter((f) => f.required && (!currentValues[f.id] || String(currentValues[f.id]).trim() === ''));
    if (missing.length === 0) {
      return isHindi
        ? 'फॉर्म के सभी आवश्यक फ़ील्ड भर दिए गए हैं! आप समीक्षा करके डाउनलोड कर सकते हैं।'
        : 'All required fields are currently completed! You are ready to review and download.';
    }
    const missingLabels = missing.map((f) => String(f.label || f.id).split('/')[0].trim()).join(', ');
    return isHindi
      ? `फॉर्म में ${missing.length} आवश्यक फ़ील्ड खाली हैं: ${missingLabels}।`
      : `There are ${missing.length} missing required field(s): ${missingLabels}.`;
  }

  // Field meaning inquiry
  const matchedField = fieldsDef.find((f) => {
    const label = String(f.label || '').toLowerCase();
    const id = String(f.id || '').toLowerCase();
    return lower.includes(id) || lower.includes(label.split('/')[0].trim().toLowerCase());
  });

  if (matchedField) {
    const label = String(matchedField.label || matchedField.id).split('/')[0].trim();
    const desc = matchedField.description || matchedField.placeholder || `Enter the official value for ${label}.`;
    const isReq = matchedField.required ? (isHindi ? 'यह एक आवश्यक फ़ील्ड है।' : 'This field is required.') : (isHindi ? 'यह वैकल्पिक है।' : 'This field is optional.');
    const curVal = currentValues[matchedField.id] ? (isHindi ? `वर्तमान मान: "${currentValues[matchedField.id]}"।` : `Currently set to "${currentValues[matchedField.id]}".`) : (isHindi ? 'वर्तमान में खाली है।' : 'Currently empty.');
    return isHindi
      ? `फ़ील्ड "${label}": ${desc} ${isReq} ${curVal}`
      : `Field "${label}": ${desc} ${isReq} ${curVal}`;
  }

  // Completion check
  if (lower.includes('complete') || lower.includes('ready') || lower.includes('pura') || lower.includes('khatam') || lower.includes('status')) {
    const total = fieldsDef.length;
    const filled = fieldsDef.filter((f) => currentValues[f.id] && String(currentValues[f.id]).trim() !== '').length;
    return isHindi
      ? `इस फॉर्म में कुल ${total} फ़ील्ड हैं, जिनमें से ${filled} भरे हुए हैं।`
      : `This form has ${total} fields in total, and ${filled} are currently filled.`;
  }

  // Default helpful response based on the actual form
  const fieldListPreview = fieldsDef.slice(0, 3).map((f) => f.label || f.id).join(', ');
  return isHindi
    ? `मैं इस फॉर्म के लिए आपका सहायक हूँ (${fieldsDef.length} फ़ील्ड: ${fieldListPreview} आदि)। आप किसी भी फ़ील्ड के बारे में पूछ सकते हैं या मान बोल सकते हैं।`
    : `I am your assistant for this form (${fieldsDef.length} fields: ${fieldListPreview} etc.). You can ask about any field or dictate values.`;
}
