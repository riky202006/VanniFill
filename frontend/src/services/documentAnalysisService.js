/**
 * Document Analysis Service for VaaniFill AI
 * Handles multipart document uploads, OCR/multimodal extraction, and fixture test adapters.
 */

import { API_BASE_URL } from '../constants/api'

// Developer Fixtures for testing the dynamic UI when backend is unconnected or offline
export const FIXTURES = {
  scholarship: {
    id: 'scholarship',
    title: 'National Scholarship Portal Application',
    description: 'Post-Matric & Higher Education Merit Scholarship Scheme',
    fields: [
      {
        id: 'fullName',
        label: 'Applicant Full Name / पूरा नाम',
        type: 'text',
        required: true,
        placeholder: "Enter candidate's full legal name",
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.95,
        pageNumber: 1,
        boundingBox: { x: 12, y: 18, width: 76, height: 6 },
        description: 'Legal name of the student as registered in educational certificates.',
      },
      {
        id: 'annualIncome',
        label: 'Annual Family Income (₹) / पारिवारिक वार्षिक आय',
        type: 'number',
        required: true,
        placeholder: 'e.g. 180000',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.92,
        pageNumber: 1,
        boundingBox: { x: 12, y: 28, width: 36, height: 6 },
        description: 'Total combined annual income of parents/guardians from all sources.',
      },
      {
        id: 'institutionName',
        label: 'Institution / College Name / शिक्षण संस्थान',
        type: 'text',
        required: true,
        placeholder: 'e.g. Gauhati University Institute of Science',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.9,
        pageNumber: 1,
        boundingBox: { x: 52, y: 28, width: 36, height: 6 },
        description: 'Name of the accredited college or university currently enrolled in.',
      },
      {
        id: 'course',
        label: 'Current Degree or Course / पाठ्यक्रम',
        type: 'select',
        options: ['B.Tech Computer Science', 'Bachelor of Arts (BA)', 'B.Sc General', 'BCA', 'Other'],
        required: true,
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.93,
        pageNumber: 1,
        boundingBox: { x: 12, y: 38, width: 36, height: 6 },
        description: 'Degree program for which the scholarship is being requested.',
      },
      {
        id: 'bankAccountNumber',
        label: 'Bank Account Number / बैंक खाता संख्या',
        type: 'text',
        required: true,
        placeholder: 'e.g. 11 to 16 digit account number',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.98,
        pageNumber: 1,
        boundingBox: { x: 52, y: 38, width: 36, height: 6 },
        description: 'Active savings account number for DBT direct scholarship deposit.',
      },
      {
        id: 'additionalRemarks',
        label: 'Special Eligibility Remarks / अतिरिक्त विवरण',
        type: 'textarea',
        required: false,
        placeholder: 'Enter any additional details or reservation category notes...',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'ready',
        confidence: 0.88,
        pageNumber: 1,
        boundingBox: { x: 12, y: 48, width: 76, height: 10 },
        description: 'Optional remarks or explanatory notes for the verification officer.',
      },
    ],
  },
  healthcare: {
    id: 'healthcare',
    title: 'Ayushman Hospital Intake & OPD Form',
    description: 'Patient Clinical Intake and Emergency Contact Form',
    fields: [
      {
        id: 'patientName',
        label: 'Patient Name / मरीज़ का नाम',
        type: 'text',
        required: true,
        placeholder: 'Full legal name of patient',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.96,
        pageNumber: 1,
        boundingBox: { x: 14, y: 20, width: 45, height: 6 },
        description: 'Full name of the patient requiring medical assistance.',
      },
      {
        id: 'patientAge',
        label: 'Age (Years) / उम्र',
        type: 'number',
        required: true,
        placeholder: 'e.g. 45',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.95,
        pageNumber: 1,
        boundingBox: { x: 63, y: 20, width: 23, height: 6 },
        description: 'Completed years of age.',
      },
      {
        id: 'gender',
        label: 'Gender / लिंग',
        type: 'select',
        options: ['Male', 'Female', 'Other'],
        required: true,
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.98,
        pageNumber: 1,
        boundingBox: { x: 14, y: 30, width: 35, height: 6 },
        description: 'Legal gender for medical record creation.',
      },
      {
        id: 'emergencyContact',
        label: 'Emergency Contact Phone / आपातकालीन संपर्क',
        type: 'tel',
        required: true,
        placeholder: '10-digit mobile number',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.94,
        pageNumber: 1,
        boundingBox: { x: 53, y: 30, width: 33, height: 6 },
        description: 'Immediate family member or guardian phone number.',
      },
      {
        id: 'symptoms',
        label: 'Chief Medical Symptoms / मुख्य लक्षण',
        type: 'textarea',
        required: true,
        placeholder: 'Describe symptoms, duration, and any past medical history...',
        detectedValue: null,
        userValue: null,
        suggestedValue: null,
        source: 'empty',
        status: 'missing',
        confidence: 0.9,
        pageNumber: 1,
        boundingBox: { x: 14, y: 40, width: 72, height: 12 },
        description: 'Primary health concerns for initial OPD triage.',
      },
    ],
  },
}

/**
 * Analyzes an uploaded document via real backend API or reports honest unconnected state.
 */
export async function analyzeDocument({ file, fileName, fileType, selectedFixtureId = null }) {
  // If user selected a developer fixture for testing dynamic fields
  if (selectedFixtureId && FIXTURES[selectedFixtureId]) {
    const fixture = FIXTURES[selectedFixtureId]
    return {
      connected: false,
      isFixture: true,
      documentId: `fixture_${fixture.id}_${Date.now()}`,
      fileName: fileName || `${fixture.id}_form.pdf`,
      formTitle: fixture.title,
      formDescription: fixture.description,
      fields: fixture.fields.map((f) => ({ ...f })),
      pageCount: 1,
      message: 'Loaded demonstration fixture. Fields shown are from a test schema, not extracted from your uploaded file.',
    }
  }

  // Try real backend integration endpoint: POST /api/documents/upload
  const uploadUrl = `${API_BASE_URL}/documents/upload`

  try {
    const formData = new FormData()
    if (file) {
      formData.append('file', file)
    }
    formData.append('fileName', fileName || 'document.pdf')
    formData.append('language', 'en')

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // No Content-Type header so browser sets multipart boundary automatically
    })

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`)
    }

    const data = await response.json()

    // Transform backend detectedFields format to client form model
    const fields = (data.detectedFields || []).map((field, idx) => ({
      id: field.fieldKey || `field_${idx}`,
      label: field.label || field.fieldKey,
      type: field.type || 'text',
      required: field.required !== false,
      placeholder: field.placeholder || `Enter ${field.label || 'value'}`,
      detectedValue: field.detectedValue || null,
      userValue: null,
      suggestedValue: null,
      source: field.detectedValue ? 'found_in_document' : 'empty',
      status: field.isMissing ? 'missing' : 'ready',
      confidence: field.confidence ?? 0.85,
      pageNumber: field.pageNumber || 1,
      boundingBox: field.boundingBox || null,
      description: field.description || '',
    }))

    return {
      connected: true,
      isFixture: false,
      documentId: data.documentId || `doc_${Date.now()}`,
      fileName: data.fileName || fileName,
      formTitle: data.formTitle || 'Uploaded Form Document',
      formDescription: data.formDescription || 'Detected form fields from your uploaded document.',
      fields,
      pageCount: data.pageCount || 1,
      message: 'Document analyzed via connected backend service.',
    }
  } catch (error) {
    console.info('[DocumentAnalysisService] Backend API not reachable or unconfigured:', error.message)
    // Return honest unconnected state with zero fake claims
    return {
      connected: false,
      isFixture: false,
      documentId: null,
      fileName,
      formTitle: 'Unconnected Analysis Service',
      fields: [],
      error: 'Document analysis service is not connected yet.',
      message: 'The backend document extraction service is currently offline or unconfigured. To test the dynamic field workflow in frontend mode, select a test form fixture below.',
    }
  }
}

export default {
  FIXTURES,
  analyzeDocument,
}
