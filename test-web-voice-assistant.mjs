/**
 * VaaniFill AI - Web Voice Assistant & Form Read-Aloud Comprehensive Test Suite
 * Tests:
 * 1. Multi-Field Voice Extraction (Mode A) in English & Hindi
 * 2. Single-Field Voice Dictation & Spoken Digit Normalization (Mode B)
 * 3. AI Assistant Contextual Form Q&A via POST /api/extract
 * 4. Text-To-Speech (TTS) Form Read-Aloud Engine & Voice Fallback
 * 5. Correction Targeting & Skip Intent Resolution
 */

import http from 'http'
import app from './backend/src/app.js'
import {
  normalizeSpokenDigits,
  extractEntitiesLocally,
  resolveSelectOption,
  detectSkipIntent,
  detectCorrectionIntent,
  categorizeField,
  analyzeForm,
  createConversationPlan,
  validateLocally,
} from './frontend/src/services/voiceEngine.js'
import { processAssistantQuery } from './frontend/src/services/formAssistantService.js'
import textToSpeechService from './frontend/src/services/textToSpeechService.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`)
    passed++
  } else {
    console.error(`  ❌ [FAIL] ${message}`)
    failed++
  }
}

async function runTestSuite() {
  console.log('\n🎙️ === VAANIFILL AI WEB VOICE & ASSISTANT TEST SUITE ===\n')

  const testFields = [
    { id: 'fullName', label: 'Full Name / पूरा नाम', type: 'text', required: true },
    { id: 'mobile', label: 'Mobile Number / मोबाइल नंबर', type: 'tel', required: true },
    { id: 'email', label: 'Email Address / ईमेल', type: 'email', required: false },
    { id: 'city', label: 'City / शहर', type: 'text', required: true },
    { id: 'pincode', label: 'PIN Code / पिन कोड', type: 'text', required: true },
    {
      id: 'gender',
      label: 'Gender / लिंग',
      type: 'select',
      required: true,
      options: ['Male', 'Female', 'Other'],
    },
    {
      id: 'currentCourse',
      label: 'Current Course / वर्तमान पाठ्यक्रम',
      type: 'select',
      required: true,
      description: 'The academic degree or vocational course you are currently enrolled in.',
      options: ['12th Science', 'B.Tech', 'B.Sc', 'B.Com'],
    },
    { id: 'annualIncome', label: 'Annual Income / वार्षिक आय', type: 'number', required: false },
  ]

  // =========================================================================
  // 1. MODE A: MULTI-FIELD VOICE FILLING
  // =========================================================================
  console.log('🗣️ --- 1. Mode A: Multi-Field Voice Filling ---')

  const englishMulti = 'My name is Riky Nayak, my mobile number is 9876543210, and my city is Guwahati'
  const extractedEn = extractEntitiesLocally(englishMulti, testFields)
  assert(extractedEn.fullName === 'Riky Nayak', 'Extracted English name: "Riky Nayak"')
  assert(extractedEn.mobile === '9876543210', 'Extracted 10-digit mobile number: "9876543210"')
  assert(extractedEn.city === 'Guwahati', 'Extracted city: "Guwahati"')

  const hindiMulti = 'मेरा नाम रिकी नायक है, मोबाइल 9876543210 और शहर गुवाहाटी'
  const extractedHi = extractEntitiesLocally(hindiMulti, testFields)
  assert(extractedHi.fullName === 'रिकी नायक' || extractedHi.fullName === 'रिकी', 'Extracted Hindi name correctly')
  assert(extractedHi.mobile === '9876543210', 'Extracted mobile from Hindi speech: "9876543210"')
  assert(extractedHi.city === 'गुवाहाटी', 'Extracted city from Hindi speech: "गुवाहाटी"')

  // Verify proposed changes review card generation in processAssistantQuery
  const queryResult = processAssistantQuery({
    query: englishMulti,
    fields: testFields,
    values: {},
    language: 'en',
  })
  assert(queryResult.proposedChanges.length >= 3, 'Generated review changes for all 3 extracted fields')
  assert(queryResult.proposedChanges.some((p) => p.fieldId === 'fullName' && p.newValue === 'Riky Nayak'), 'Review card contains Full Name change')
  assert(queryResult.proposedChanges.some((p) => p.fieldId === 'mobile' && p.newValue === '9876543210'), 'Review card contains Mobile change')
  assert(queryResult.proposedChanges.some((p) => p.fieldId === 'city' && p.newValue === 'Guwahati'), 'Review card contains City change')

  // =========================================================================
  // 2. MODE B: SINGLE-FIELD DICTATION & DIGIT NORMALIZATION
  // =========================================================================
  console.log('\n🔢 --- 2. Mode B: Single-Field Spoken Digit Normalization ---')

  const spokenPin = 'zero zero one two three four'
  const normalizedPin = normalizeSpokenDigits(spokenPin)
  assert(normalizedPin === '001234', 'English spoken digits "zero zero one..." normalized to "001234" with leading zeros preserved')

  const spokenHindiPin = 'शून्य शून्य एक दो तीन चार'
  const normalizedHindiPin = normalizeSpokenDigits(spokenHindiPin)
  assert(normalizedHindiPin === '001234', 'Hindi spoken digits "शून्य शून्य एक..." normalized to "001234"')

  const spokenPhone = 'nine eight seven six five four three two one zero'
  const normalizedPhone = normalizeSpokenDigits(spokenPhone)
  assert(normalizedPhone === '9876543210', 'Spoken phone digits converted to clean 10-digit string "9876543210"')

  // Select Option Ordinal Resolution
  const genderField = testFields.find((f) => f.id === 'gender')
  assert(resolveSelectOption('the second option', genderField) === 'Female', 'Resolved "the second option" to "Female"')
  assert(resolveSelectOption('put female', genderField) === 'Female', 'Resolved "put female" to "Female"')
  assert(resolveSelectOption('pehla wala', genderField) === 'Male', 'Resolved "pehla wala" to "Male"')

  // =========================================================================
  // 3. CORRECTION TARGETING & SKIP INTENT
  // =========================================================================
  console.log('\n🎯 --- 3. Correction & Skip Intent Resolution ---')

  const correction = detectCorrectionIntent('Actually, change my city to Jaipur', testFields)
  assert(correction !== null, 'Detected correction intent')
  assert(correction.fieldId === 'city' && correction.value === 'Jaipur', 'Targeted only the city field with new value "Jaipur"')

  const skip1 = detectSkipIntent('leave that blank')
  const skip2 = detectSkipIntent('skip optional')
  const skip3 = detectSkipIntent('khali chhod do')
  assert(skip1?.type === 'SKIP_FIELD', 'Identified "leave that blank" as SKIP_FIELD')
  assert(skip2?.type === 'SKIP_OPTIONAL', 'Identified "skip optional" as SKIP_OPTIONAL')
  assert(skip3?.type === 'SKIP_FIELD', 'Identified "khali chhod do" as SKIP_FIELD')

  // =========================================================================
  // 4. BACKEND AI ASSISTANT Q&A (POST /api/extract)
  // =========================================================================
  console.log('\n🧠 --- 4. Backend AI Assistant Q&A Contract ---')

  const server = http.createServer(app)
  const port = await new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)))
  const baseUrl = `http://127.0.0.1:${port}`

  // Case A: User asks "Which fields are missing?"
  const qRes1 = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Which fields are missing?',
      fields: testFields,
      current_values: { fullName: 'Riky Nayak', mobile: '9876543210' },
      language: 'en',
    }),
  })
  const qData1 = await qRes1.json()
  assert(qRes1.status === 200 && qData1.success === true, 'POST /api/extract responds 200 OK for question')
  assert(!qData1.reply.includes("didn't detect any form values"), 'Assistant did NOT return generic negative fallback')
  assert(qData1.reply.toLowerCase().includes('missing') || qData1.reply.toLowerCase().includes('city'), 'Assistant accurately answered missing fields question')

  // Case B: User asks "What is Current Course?"
  const qRes2 = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'What is Current Course?',
      fields: testFields,
      current_values: {},
      language: 'en',
    }),
  })
  const qData2 = await qRes2.json()
  assert(qData2.reply.toLowerCase().includes('course') || qData2.reply.toLowerCase().includes('degree'), 'Assistant explained what Current Course means')

  // Case C: Multi-field dictation through backend
  const extractRes = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'My name is Riky Nayak and mobile is 9876543210 and city is Guwahati',
      fields: testFields,
      current_values: {},
      language: 'en',
    }),
  })
  const extractData = await extractRes.json()
  assert(extractData.values.fullName === 'Riky Nayak', 'Backend AI extracted Full Name: "Riky Nayak"')
  assert(extractData.values.mobile === '9876543210', 'Backend AI extracted Mobile: "9876543210"')
  assert(extractData.values.city === 'Guwahati', 'Backend AI extracted City: "Guwahati"')

  // =========================================================================
  // 5. TEXT-TO-SPEECH FORM READ-ALOUD SERVICE
  // =========================================================================
  console.log('\n🔊 --- 5. Form Read-Aloud TTS Engine ---')

  const enSpeechText = textToSpeechService.buildSpeechText(
    testFields[0],
    0,
    testFields.length,
    'Riky Nayak',
    'en-US'
  )
  assert(enSpeechText.includes('Field 1 of 8: Full Name'), 'Generates accessible English field announcement')
  assert(enSpeechText.includes('Required field'), 'Includes requiredness in speech narration')
  assert(enSpeechText.includes('Currently set to "Riky Nayak"'), 'Reads current filled value aloud')

  const hiSpeechText = textToSpeechService.buildSpeechText(
    testFields[1],
    1,
    testFields.length,
    '',
    'hi-IN'
  )
  assert(hiSpeechText.length > 10, 'Generates speech text for Hindi read-aloud')
  assert(hiSpeechText.includes('Mobile Number') || hiSpeechText.includes('मोबाइल'), 'Includes field name in narration')

  // =========================================================================
  // 6. JARVIS AUTONOMOUS CONVERSATIONAL ENGINE & PROGRESSIVE FILLING
  // =========================================================================
  console.log('\n⚡ --- 6. Jarvis Autonomous Engine & Progressive Filling ---')

  // A. Semantic Categorization
  assert(categorizeField(testFields[0]) === 'identity', 'Categorized fullName as identity')
  assert(categorizeField(testFields[1]) === 'contact', 'Categorized mobile as contact')
  assert(categorizeField(testFields[3]) === 'location', 'Categorized city as location')
  assert(categorizeField({ id: 'pwd', label: 'Password', type: 'password' }) === 'sensitive', 'Categorized password as sensitive')

  // B. Form Semantic Analysis
  const initialValues = { email: 'user@example.com' } // email filled, required empty
  const formAnalysis = analyzeForm(testFields, initialValues)
  assert(formAnalysis.totalFields === 8, 'Analyzed all 8 fields')
  assert(formAnalysis.existingFilledCount === 1, 'Accurately detected 1 existing filled field')
  assert(formAnalysis.fieldModels.find((f) => f.id === 'fullName').valueStatus === 'empty', 'Empty field marked as empty (never falsely marked filled)')
  assert(formAnalysis.fieldModels.find((f) => f.id === 'fullName').requiredness === 'required', 'Required field marked as required')

  // C. Natural Bundling Plan (Turn 1: Identity + Contact)
  const planTurn1 = createConversationPlan(formAnalysis, initialValues, new Set(), 'en-US')
  assert(planTurn1.targetFields.length === 2, 'Bundled 2 compatible fields into first question')
  assert(planTurn1.targetFields.includes('fullName') && planTurn1.targetFields.includes('mobile'), 'Bundled Full Name and Mobile Number together')
  assert(planTurn1.question.includes('Full Name') && planTurn1.question.includes('Mobile Number'), 'Question mentions both bundled fields')

  // D. Turn 1 Answer & Progressive Fill
  const turn1Utterance = 'My name is Riky Nayak and my phone is 9876543210'
  const turn1Extracted = extractEntitiesLocally(turn1Utterance, testFields)
  assert(turn1Extracted.fullName === 'Riky Nayak' && turn1Extracted.mobile === '9876543210', 'Extracted both bundled fields from single natural answer')

  // Progressive live update
  const currentSessionValues = { ...initialValues, ...turn1Extracted }
  const valTurn1 = validateLocally(testFields, currentSessionValues)
  assert(valTurn1.statuses.fullName === 'matched' && valTurn1.statuses.mobile === 'matched', 'Both fields passed validation')

  // E. Turn 2: Next Plan bundles Location fields (City + PIN)
  const planTurn2 = createConversationPlan(formAnalysis, currentSessionValues, new Set(), 'en-US')
  assert(planTurn2.targetFields.includes('city') && planTurn2.targetFields.includes('pincode'), 'Turn 2 automatically advanced and bundled City and PIN Code')

  // F. Turn 2 Answer with Spoken Digits PIN
  const turn2Utterance = 'I live in Guwahati and PIN is zero zero one two three four'
  const turn2Extracted = extractEntitiesLocally(turn2Utterance, testFields)
  assert(turn2Extracted.city === 'Guwahati', 'Turn 2 extracted City: "Guwahati"')
  assert(turn2Extracted.pincode === '001234', 'Turn 2 extracted PIN with leading zeros preserved: "001234"')

  Object.assign(currentSessionValues, turn2Extracted)

  // G. Turn 3: Target Select Field with Options
  const planTurn3 = createConversationPlan(formAnalysis, currentSessionValues, new Set(), 'en-US')
  assert(planTurn3.targetFields.includes('gender'), 'Turn 3 targeted Gender dropdown')
  assert(planTurn3.question.includes('Male, Female, Other'), 'Dropdown question lists available options')

  // User answers using ordinal "the second option"
  const genderModel = testFields.find((f) => f.id === 'gender')
  const matchedOpt = resolveSelectOption('the second option', genderModel)
  assert(matchedOpt === 'Female', 'Resolved "the second option" to "Female"')
  currentSessionValues.gender = matchedOpt

  // H. Turn 4: Correction Handling
  const correctionUtterance = 'Actually, change my city to Jaipur'
  const jarvisCorrection = detectCorrectionIntent(correctionUtterance, testFields)
  assert(jarvisCorrection && jarvisCorrection.fieldId === 'city' && jarvisCorrection.value === 'Jaipur', 'Detected correction for city to Jaipur')
  currentSessionValues[jarvisCorrection.fieldId] = jarvisCorrection.value
  assert(currentSessionValues.city === 'Jaipur', 'City updated in session values to Jaipur')

  // Clean up test server
  await new Promise((res) => server.close(res))

  console.log('\n======================================================')
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

