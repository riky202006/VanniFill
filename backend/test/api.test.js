/**
 * VaaniFill AI Backend Automated Test Suite
 * Validates all endpoints, deterministic rules, and AI extraction contracts.
 */

import http from 'http'
import app from '../src/app.js'

let server
let baseUrl

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function runTests() {
  console.log('🚀 === STARTING VAANIFILL AI BACKEND TEST SUITE ===\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${message}`)
      failed++
    }
  }

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      console.log(`📡 Test server running on ${baseUrl}\n`)
      resolve()
    })
  })

  try {
    // Test 1: Health Check
    const resHealth = await request('GET', '/api/health')
    assert(resHealth.status === 200 && resHealth.data.status === 'ok', 'GET /api/health returns status 200 OK')

    // Test 2: Guest Session Creation
    const resGuest = await request('POST', '/api/guest/session', { preferredLanguage: 'hi' })
    assert(resGuest.status === 201 && resGuest.data.sessionId && resGuest.data.sessionKey, 'POST /api/guest/session returns valid 201 guest session')

    // Test 3: Form Schemas
    const resForms = await request('GET', '/api/forms')
    assert(resForms.status === 200 && resForms.data.count >= 3, 'GET /api/forms returns 3 standard schemas (scholarship, healthcare, pension)')

    // Test 4: Voice Extraction with Hindi Transcript
    const hindiPayload = {
      transcript: 'Mera naam Rahul Verma hai, mera mobile 9876543210 hai, meri email rahul.verma@example.com hai',
      language: 'hi',
      formId: 'scholarship'
    }
    const resExtract = await request('POST', '/api/extract', hindiPayload)
    assert(resExtract.status === 200 && resExtract.data.success === true, 'POST /api/extract processes Hindi transcript successfully')
    
    const nameField = resExtract.data.fields.find(f => f.id === 'fullName')
    const phoneField = resExtract.data.fields.find(f => f.id === 'mobile')
    const emailField = resExtract.data.fields.find(f => f.id === 'email')
    const missingDobField = resExtract.data.fields.find(f => f.id === 'dob')

    assert(nameField && nameField.value === 'Rahul Verma' && nameField.status === 'matched', 'Extracted Full Name correctly (Rahul Verma)')
    assert(phoneField && phoneField.value === '9876543210' && phoneField.status === 'matched', 'Extracted and validated Phone (9876543210)')
    assert(emailField && emailField.value === 'rahul.verma@example.com' && emailField.status === 'matched', 'Extracted Email (rahul.verma@example.com)')
    assert(missingDobField && missingDobField.value === null && missingDobField.status === 'missing', 'Unspoken DOB remains null and flagged as MISSING (Zero-Hallucination)')

    // Test 5: Next Question Generation
    assert(resExtract.data.nextQuestion && resExtract.data.nextQuestion.fieldId === 'dob', 'Generates conversational nextQuestion for first missing field')

    // Test 6: Deterministic Validation Endpoint (Invalid Phone rejection)
    const invalidPayload = {
      formId: 'scholarship',
      values: {
        mobile: '12345', // invalid length & prefix
        email: 'invalid-email-format'
      }
    }
    const resVal = await request('POST', '/api/validate', invalidPayload)
    const invPhone = resVal.data.fields.find(f => f.id === 'mobile')
    const invEmail = resVal.data.fields.find(f => f.id === 'email')
    assert(invPhone && invPhone.status === 'invalid', 'Flags invalid phone number as status: invalid')
    assert(invEmail && invEmail.status === 'invalid', 'Flags invalid email as status: invalid')

    // Test 7: Form Match & Submission Receipt
    const matchPayload = {
      formId: 'pension',
      userInputs: {
        fullName: 'Ramesh Sharma',
        age: 65,
        mobile: '9876543210',
        postalCode: '781001',
        cityDistrict: 'Guwahati',
        bankAccountNumber: '123456789012'
      }
    }
    const resMatch = await request('POST', '/api/forms/match', matchPayload)
    assert(resMatch.status === 200 && resMatch.data.readyForDownload === true, 'POST /api/forms/match verifies all fields and prepares download receipt')

    // Test 8: Download Receipt
    const resReceipt = await request('GET', resMatch.data.downloadUrl)
    assert(resReceipt.status === 200 && resReceipt.data.submissionId, 'GET /api/forms/:id/download retrieves official submission receipt')

  } catch (err) {
    console.error('Fatal error during test run:', err)
    failed++
  } finally {
    server.close()
    console.log(`\n========================================`)
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================\n`)
    process.exit(failed > 0 ? 1 : 0)
  }
}

runTests()

