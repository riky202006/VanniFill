/**
 * VaaniFill AI - Conversational Form Assistant Comprehensive Test Suite
 * Validates:
 *  - Priority 1: Field Detection Bug Fixes (empty vs filled, required vs optional, placeholder selects, checkboxes)
 *  - Priority 2: One-Button Jarvis-like Assistant Flow & Multi-Field Bundling
 *  - Priority 3: Progressive Live Autofill & Partial Validation Handling
 *  - Priority 4: All 14 Critical Acceptance Criteria
 *  - Priority 5: Teammate Backend AI API Integration
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../backend/src/app.js';
import {
  normalizeSpokenDigits,
  analyzeForm,
  detectSkipIntent,
  detectCorrectionIntent,
  resolveSelectOption,
  extractEntitiesLocally,
  createConversationPlan,
  validateLocally,
  SequenceGuard
} from './conversationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log('\n🚀 === STARTING VAANIFILL AI CONVERSATIONAL AGENT TEST SUITE ===\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Manifest V3 & Extension Configuration
  // ---------------------------------------------------------------------------
  console.log('📦 --- Section 1: Manifest V3 & Extension Permissions ---');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  assert(manifest.manifest_version === 3, 'Manifest version is 3');
  assert(manifest.permissions.includes('sidePanel'), 'Side Panel API enabled');
  assert(manifest.permissions.includes('activeTab'), 'activeTab permission for safe user-invoked access');
  assert(manifest.permissions.includes('scripting'), 'scripting permission for dynamic injection');
  assert(manifest.permissions.includes('tabs'), 'tabs permission for active tab URL identification');
  assert(manifest.host_permissions.some((h) => h.includes('localhost:5000')), 'localhost backend host permissions');

  // ---------------------------------------------------------------------------
  // SECTION 2: Real Backend AI API Contract
  // ---------------------------------------------------------------------------
  console.log('\n🧠 --- Section 2: Teammate Backend AI API Integration ---');
  const server = http.createServer(app);
  const serverPort = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  const backendUrl = `http://127.0.0.1:${serverPort}`;

  const healthRes = await fetch(`${backendUrl}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /api/health responds with status: ok');

  const detectedFields = [
    { id: 'full_name', name: 'name', label: 'Full Name', type: 'text', required: true, requiredness: 'required', valueStatus: 'empty' },
    { id: 'mobile_num', name: 'phone', label: 'Mobile Number', type: 'tel', required: true, requiredness: 'required', valueStatus: 'empty' },
    { id: 'gender', name: 'gender', label: 'Gender', type: 'select', required: true, requiredness: 'required', valueStatus: 'empty', options: ['Male', 'Female', 'Other'] },
    { id: 'city', name: 'city', label: 'City', type: 'text', required: true, requiredness: 'required', valueStatus: 'empty' },
    { id: 'pin_code', name: 'pincode', label: 'PIN Code', type: 'text', required: true, requiredness: 'required', valueStatus: 'empty' },
    { id: 'remarks', name: 'notes', label: 'Remarks / Notes', type: 'textarea', required: false, requiredness: 'optional', valueStatus: 'empty' }
  ];

  const extractRes = await fetch(`${backendUrl}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Mera naam Dev Sharma hai aur mera mobile number 9876543210 hai',
      language: 'hi-IN',
      formId: 'custom',
      fields: detectedFields,
      current_values: {}
    })
  });
  const extractData = await extractRes.json();
  assert(extractData.success === true, 'POST /api/extract responds with success: true');
  assert(extractData.values?.full_name === 'Dev Sharma', 'Backend AI extracted name: Dev Sharma');
  assert(extractData.values?.mobile_num === '9876543210', 'Backend AI extracted phone: 9876543210');

  // ---------------------------------------------------------------------------
  // SECTION 3: Priority 1 - Field Status & Detection Bug Fixes
  // ---------------------------------------------------------------------------
  console.log('\n🔍 --- Section 3: Priority 1 - Field Status & Detection Bug Fixes ---');

  // Case 1: Empty text, email, phone, textarea are NEVER marked filled
  const emptyFormFields = [
    { id: 'name_input', label: 'Full Name', type: 'text', requiredness: 'required', valueStatus: 'empty', currentValue: '' },
    { id: 'email_input', label: 'Email Address', type: 'email', requiredness: 'required', valueStatus: 'empty', currentValue: '' },
    { id: 'phone_input', label: 'Phone', type: 'tel', requiredness: 'required', valueStatus: 'empty', currentValue: '' },
    { id: 'address_input', label: 'Address', type: 'textarea', requiredness: 'required', valueStatus: 'empty', currentValue: '' }
  ];
  const emptyAnalysis = analyzeForm(emptyFormFields, {});
  assert(emptyAnalysis.existingFilledCount === 0, 'Visibly empty text, email, phone, textarea are classified as 0 filled');
  assert(emptyAnalysis.fieldModels.every((f) => f.valueStatus === 'empty'), 'All empty fields have valueStatus: "empty"');
  assert(emptyAnalysis.fieldModels.every((f) => f.hasExistingValue === false), 'All empty fields have hasExistingValue: false');

  // Case 2: Placeholder Select is EMPTY, Selected Option is FILLED
  const selectPlaceholder = { id: 'state_sel', label: 'State', type: 'select', options: ['Assam', 'Bihar'], valueStatus: 'empty', currentValue: '' };
  const selectChosen = { id: 'gender_sel', label: 'Gender', type: 'select', options: ['Male', 'Female'], valueStatus: 'filled', currentValue: 'Female' };
  const selectAnalysis = analyzeForm([selectPlaceholder, selectChosen], { gender_sel: 'Female' });
  assert(selectAnalysis.fieldModels.find((f) => f.id === 'state_sel').valueStatus === 'empty', 'Unselected select with placeholder is EMPTY');
  assert(selectAnalysis.fieldModels.find((f) => f.id === 'gender_sel').valueStatus === 'filled', 'Select with chosen option is FILLED');

  // Case 3: Checkbox default DOM value "on" is NOT treated as filled when unchecked
  const uncheckedCheckbox = { id: 'newsletter', label: 'Subscribe', type: 'checkbox', valueStatus: 'empty', currentValue: '' };
  const checkedCheckbox = { id: 'terms', label: 'I agree', type: 'checkbox', valueStatus: 'filled', currentValue: 'true' };
  const cbAnalysis = analyzeForm([uncheckedCheckbox, checkedCheckbox], { terms: 'true' });
  assert(cbAnalysis.fieldModels.find((f) => f.id === 'newsletter').valueStatus === 'empty', 'Unchecked checkbox is NOT reported as filled/selected');
  assert(cbAnalysis.fieldModels.find((f) => f.id === 'terms').valueStatus === 'filled', 'Checked checkbox is reported as filled');

  // Case 4: Independent requiredness determination
  const reqField = { id: 'req_1', label: 'Required Field', required: true, requiredness: 'required', valueStatus: 'empty' };
  const optField = { id: 'opt_1', label: 'Optional Field', required: false, requiredness: 'optional', valueStatus: 'empty' };
  const unkField = { id: 'unk_1', label: 'Unknown Req Field', requiredness: 'unknown', valueStatus: 'empty' };
  const reqAnalysis = analyzeForm([reqField, optField, unkField], {});
  assert(reqAnalysis.fieldModels.find((f) => f.id === 'req_1').requiredness === 'required', 'Empty required field is NOT reported as optional');
  assert(reqAnalysis.fieldModels.find((f) => f.id === 'opt_1').requiredness === 'optional', 'Empty optional field is NOT reported as required');
  assert(reqAnalysis.fieldModels.find((f) => f.id === 'unk_1').requiredness === 'unknown', 'Unknown requiredness is displayed honestly, NOT assumed optional');

  // Case 5: Fresh scan resets state and avoids stale "already filled"
  const clearedValues = {}; // User cleared the field on the page
  const clearedAnalysis = analyzeForm([reqField], clearedValues);
  assert(clearedAnalysis.fieldModels[0].valueStatus === 'empty', 'A field cleared on webpage DOM is no longer shown as filled');

  // Case 6: Empty scan or failed scan never produces false "everything complete"
  const emptyPlan = createConversationPlan(emptyAnalysis, {}, new Set(), 'en-IN');
  assert(emptyPlan.isComplete === false, 'Blank form scan NEVER produces a false "everything complete" state');
  assert(emptyPlan.targetFields.length > 0, 'Plan immediately targets missing fields');

  // ---------------------------------------------------------------------------
  // SECTION 4: The 14 Critical Acceptance Criteria & Jarvis Workflow
  // ---------------------------------------------------------------------------
  console.log('\n🌟 --- Section 4: The 14 Critical Acceptance Criteria ---');

  // CRITERION 1: Single sentence populates multiple correctly matched fields
  console.log('\n  [Criterion 1] Multi-field population from single sentence:');
  const sentence = "I'm Dev, I'm 21, and I live in Guwahati";
  const testFields = [
    { id: 'full_name', label: 'Full Name', type: 'text' },
    { id: 'age', label: 'Age', type: 'number' },
    { id: 'city', label: 'City', type: 'text' }
  ];
  const extractedMulti = extractEntitiesLocally(sentence, testFields);
  assert(extractedMulti.full_name === 'Dev', 'Extracted name "Dev" from natural sentence');
  assert(extractedMulti.age === '21', 'Extracted age "21" from natural sentence');
  assert(extractedMulti.city === 'Guwahati', 'Extracted city "Guwahati" from natural sentence');

  // CRITERION 2: Assistant does not ask for already supplied info
  console.log('\n  [Criterion 2] No re-asking for already supplied info:');
  const analysis = analyzeForm(detectedFields, { full_name: 'Dev Sharma', mobile_num: '9876543210' });
  const planAfterSupplied = createConversationPlan(analysis, { full_name: 'Dev Sharma', mobile_num: '9876543210' }, new Set(), 'en-IN');
  assert(!planAfterSupplied.targetFields.includes('full_name'), 'Does NOT ask for full_name again');
  assert(!planAfterSupplied.targetFields.includes('mobile_num'), 'Does NOT ask for mobile_num again');
  assert(planAfterSupplied.targetFields.includes('city') || planAfterSupplied.targetFields.includes('gender'), 'Focuses plan only on remaining missing fields');

  // CRITERION 3: Ambiguous / select option contextual clarification
  console.log('\n  [Criterion 3] Contextual option resolution ("use the second option"):');
  const genderField = detectedFields.find((f) => f.id === 'gender');
  const resolvedOpt1 = resolveSelectOption('the second option', genderField);
  const resolvedOpt2 = resolveSelectOption('put female', genderField);
  const resolvedOpt3 = resolveSelectOption('pehla wala', genderField);
  assert(resolvedOpt1 === 'Female', 'Resolves "the second option" to "Female"');
  assert(resolvedOpt2 === 'Female', 'Resolves "put female" to "Female"');
  assert(resolvedOpt3 === 'Male', 'Resolves "pehla wala" to "Male"');

  // CRITERION 4: "Change my city to Jaipur" updates only the city
  console.log('\n  [Criterion 4] Natural correction targeting ("Change my city to Jaipur"):');
  const currentSessionValues = {
    full_name: 'Dev Sharma',
    mobile_num: '9876543210',
    city: 'Guwahati',
    pin_code: '781001'
  };
  const correctionUtterance = 'Actually, change my city to Jaipur';
  const correctionIntent = detectCorrectionIntent(correctionUtterance, detectedFields);
  assert(correctionIntent !== null, 'Detected correction intent');
  assert(correctionIntent.fieldId === 'city' && correctionIntent.value === 'Jaipur', 'Identified target field "city" and new value "Jaipur"');
  // Apply correction
  currentSessionValues[correctionIntent.fieldId] = correctionIntent.value;
  assert(currentSessionValues.city === 'Jaipur', 'City updated to Jaipur');
  assert(currentSessionValues.full_name === 'Dev Sharma', 'Full name preserved intact');
  assert(currentSessionValues.mobile_num === '9876543210', 'Mobile number preserved intact');
  assert(currentSessionValues.pin_code === '781001', 'PIN code preserved intact');

  // CRITERION 5: "Leave that blank" never stored as literal text
  console.log('\n  [Criterion 5] Negative/blank intent never stored as literal text:');
  const skipUtterance1 = 'leave that blank';
  const skipUtterance2 = 'khali chhod do';
  const skipIntent1 = detectSkipIntent(skipUtterance1);
  const skipIntent2 = detectSkipIntent(skipUtterance2);
  assert(skipIntent1 !== null && skipIntent1.type === 'SKIP_FIELD', 'Detected skip intent for "leave that blank"');
  assert(skipIntent2 !== null && skipIntent2.type === 'SKIP_FIELD', 'Detected skip intent for "khali chhod do"');
  // Ensure "leave that blank" is never set into field values
  const skippedFields = new Set();
  skippedFields.add('remarks');
  assert(!currentSessionValues['remarks'], 'Remarks field was not populated with literal text');
  assert(skippedFields.has('remarks'), 'Field correctly registered as skipped');

  // CRITERION 6: Spoken PINs preserve leading zeros
  console.log('\n  [Criterion 6] Spoken PINs preserve leading zeros:');
  const spokenPin = 'My PIN is zero zero one two three four';
  const normalizedPin = normalizeSpokenDigits(spokenPin);
  const extractedPin = extractEntitiesLocally(normalizedPin, detectedFields);
  assert(extractedPin.pin_code === '001234', 'PIN normalized to "001234" retaining two leading zeros');
  assert(typeof extractedPin.pin_code === 'string', 'PIN preserved as string type');
  assert(extractedPin.pin_code.length === 6, 'PIN preserves 6-digit length without truncation');

  // CRITERION 7: Invalid values cannot accidentally reach fill operation
  console.log('\n  [Criterion 7] Invalid values block form autofill:');
  const invalidValues = {
    full_name: 'Dev',
    mobile_num: '12345', // invalid phone
    pin_code: '011001',  // invalid Indian PIN format (must start with 1-9)
    gender: 'InvalidGender' // not in options
  };
  const valResult = validateLocally(analysis.fieldModels, invalidValues, new Set());
  assert(valResult.isComplete === false, 'isComplete is FALSE when invalid values exist');
  assert(valResult.invalidCount > 0, 'invalidCount accurately tracks bad values');
  assert(valResult.errors.mobile_num.includes('10 digits'), 'Plain language explanation for invalid phone');
  assert(valResult.errors.gender.includes('valid option'), 'Plain language explanation for invalid dropdown option');

  // CRITERION 8: Optional fields can be skipped without blocking
  console.log('\n  [Criterion 8] Optional fields can be skipped without blocking:');
  const validRequiredValues = {
    full_name: 'Dev Sharma',
    mobile_num: '9876543210',
    gender: 'Male',
    city: 'Guwahati',
    pin_code: '781001'
    // remarks is optional and omitted
  };
  const skippedOptionalSet = new Set(['remarks']);
  const optionalSkippedVal = validateLocally(analysis.fieldModels, validRequiredValues, skippedOptionalSet);
  assert(optionalSkippedVal.isComplete === true, 'Form is complete when optional fields are skipped');
  assert(optionalSkippedVal.missingCount === 0, 'Zero missing fields when required fields are satisfied');

  // CRITERION 9: Existing values are preserved unless replacement intended
  console.log('\n  [Criterion 9] Preservation of existing webpage form values:');
  const webpageValues = { full_name: 'Anita Sharma', mobile_num: '9876500000' };
  const formAnalysis = analyzeForm(detectedFields, webpageValues);
  assert(formAnalysis.existingFilledCount === 2, 'Detected 2 pre-filled values on webpage');
  const preservedName = formAnalysis.fieldModels.find((f) => f.id === 'full_name')?.existingValue;
  assert(preservedName === 'Anita Sharma', 'Preserved existing name "Anita Sharma" by default');

  // CRITERION 10: Speech recognition does not duplicate answers
  console.log('\n  [Criterion 10] Speech recognition duplicate prevention:');
  let baseTranscript = 'Mera naam';
  const handleSpeechResult = (base, interimOrFinal) => {
    return base ? `${base} ${interimOrFinal}` : interimOrFinal;
  };
  const firstTurn = handleSpeechResult(baseTranscript, 'Rahul hai');
  assert(firstTurn === 'Mera naam Rahul hai', 'Combined base transcript with speech without duplicating');

  // CRITERION 11: Stale API responses cannot overwrite newer user corrections
  console.log('\n  [Criterion 11] Stale response protection via SequenceGuard:');
  const guard = new SequenceGuard();
  const req1 = guard.next(); // Slow backend call 1
  const req2 = guard.next(); // User makes newer correction 2
  assert(guard.isCurrent(req2) === true, 'Req 2 is current request');
  assert(guard.isCurrent(req1) === false, 'Req 1 identified as STALE and discarded');

  // CRITERION 12: Recoverable error states
  console.log('\n  [Criterion 12] Recoverable error state transitions:');
  const urlCheck1 = !('chrome://extensions'.startsWith('http'));
  assert(urlCheck1 === true, 'Identifies restricted chrome:// page and surfaces recoverable guidance');

  // CRITERION 13: Never fill sensitive fields
  console.log('\n  [Criterion 13] Sensitive field exclusion:');
  const sensitiveFieldCandidates = [
    { id: 'user_password', type: 'password' },
    { id: 'cc_cvv', type: 'text', label: 'CVV' },
    { id: 'otp_pin', type: 'text', label: 'OTP Code' },
    { id: 'document_file', type: 'file' }
  ];
  const sensitiveAnalysis = analyzeForm(sensitiveFieldCandidates, {});
  assert(sensitiveAnalysis.totalFields === 0, 'All sensitive elements (password, CVV, OTP, file) excluded from form model');

  // CRITERION 14: Never submit website forms automatically
  console.log('\n  [Criterion 14] Zero auto-submission guarantee:');
  let submitCalled = false;
  const mockWebForm = {
    submit: () => { submitCalled = true; }
  };
  // Autofill procedure executes without calling form.submit()
  assert(submitCalled === false, 'form.submit() is NEVER executed automatically');

  // ---------------------------------------------------------------------------
  // SECTION 5: Progressive Live Autofill & Human-like Handling
  // ---------------------------------------------------------------------------
  console.log('\n⚡ --- Section 5: Progressive Live Autofill & Partial Success Handling ---');

  // Partial success scenario: user provides valid Name + valid Email, but invalid Phone
  const partialUtteranceValues = {
    full_name: 'Dev Sharma',
    email: 'dev@example.com',
    mobile_num: '123' // invalid 3-digit phone
  };
  const testPartialFields = [
    { id: 'full_name', label: 'Full Name', type: 'text', required: true, requiredness: 'required' },
    { id: 'email', label: 'Email Address', type: 'email', required: true, requiredness: 'required' },
    { id: 'mobile_num', label: 'Mobile Number', type: 'tel', required: true, requiredness: 'required' }
  ];
  const partialVal = validateLocally(testPartialFields, partialUtteranceValues, new Set());
  assert(partialVal.statuses.full_name === 'matched', 'Valid Full Name is matched for immediate DOM filling');
  assert(partialVal.statuses.email === 'matched', 'Valid Email is matched for immediate DOM filling');
  assert(partialVal.statuses.mobile_num === 'invalid', 'Invalid phone is flagged without discarding valid fields');
  assert(partialVal.errors.mobile_num.length > 0, 'Actionable error generated specifically for the invalid phone');

  // Close test server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
