import React, { useState, useEffect } from 'react'
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  User,
  LogOut,
} from 'lucide-react'
import DocumentUploader from '../../components/DocumentUploader/DocumentUploader'
import OriginalDocumentPreview from '../../components/OriginalDocumentPreview/OriginalDocumentPreview'
import DocumentProcessingStatus from '../../components/DocumentProcessingStatus/DocumentProcessingStatus'
import DetectedFieldsEditor from '../../components/DetectedFieldsEditor/DetectedFieldsEditor'
import VoiceAssistant from '../../components/VoiceAssistant/VoiceAssistant'
import FormReview from '../../components/FormReview/FormReview'
import DownloadPanel from '../../components/DownloadPanel/DownloadPanel'
import AuthModal from '../../components/AuthModal/AuthModal'
import { analyzeDocument, FIXTURES } from '../../services/documentAnalysisService'
import './GuestWorkspace.css'

export default function GuestWorkspace({ onNavigateHome }) {
  // Authentication & Citizen Profile State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vaanifill_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Workflow Stages: 1 = Upload, 2 = Fill & Edit, 3 = Review, 4 = Download
  const [currentStage, setCurrentStage] = useState(1)

  // Document Upload State
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFixtureId, setSelectedFixtureId] = useState(null)

  // Document Processing State
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('reading') // 'reading' | 'detecting' | 'preparing' | 'unconnected'

  // Dynamic Detected Form Model
  const [documentMetadata, setDocumentMetadata] = useState(null)
  const [detectedFields, setDetectedFields] = useState([])
  const [fieldValues, setFieldValues] = useState({})
  const [suggestedValues, setSuggestedValues] = useState({})
  const [fieldSources, setFieldSources] = useState({})
  const [fieldStatuses, setFieldStatuses] = useState({})
  const [isFixtureData, setIsFixtureData] = useState(false)

  // Active / Focused Field (for preview bounding-box synchronization)
  const [activeFieldId, setActiveFieldId] = useState(null)

  // Mobile preview collapse state
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false)

  // Visual highlight for missing fields
  const [highlightMissing, setHighlightMissing] = useState(false)

  // Auth Modal State
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' })

  // Clean up object URLs when file changes or on unmount
  useEffect(() => {
    return () => {
      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl)
      }
    }
  }, [selectedFile])

  // --------------------------------------------------------------------------
  // Document Upload & Analysis Flow
  // --------------------------------------------------------------------------
  const handleFileSelect = (fileData) => {
    setSelectedFile(fileData)
    setSelectedFixtureId(null)
  }

  const handleRemoveFile = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl)
    }
    setSelectedFile(null)
    setSelectedFixtureId(null)
  }

  const handleStartAnalysis = async () => {
    setIsProcessing(true)
    setProcessingStatus('reading')

    // Step sequence animation for UI clarity
    setTimeout(() => setProcessingStatus('detecting'), 700)
    setTimeout(() => setProcessingStatus('preparing'), 1400)

    try {
      const result = await analyzeDocument({
        file: selectedFile?.file,
        fileName: selectedFile?.name || 'document.pdf',
        fileType: selectedFile?.type,
        selectedFixtureId,
      })

      setTimeout(() => {
        if (!result.connected && !result.isFixture) {
          // Honest unconnected state (no fake claims)
          setProcessingStatus('unconnected')
        } else {
          // Successfully loaded detected fields from backend or test fixture
          applyAnalysisResult(result)
          setIsProcessing(false)
          setCurrentStage(2)
        }
      }, 2000)
    } catch (err) {
      setTimeout(() => setProcessingStatus('unconnected'), 1500)
    }
  }

  const applyAnalysisResult = (result) => {
    setDocumentMetadata({
      documentId: result.documentId,
      fileName: result.fileName,
      formTitle: result.formTitle,
      formDescription: result.formDescription,
      pageCount: result.pageCount,
    })

    setDetectedFields(result.fields || [])
    setIsFixtureData(Boolean(result.isFixture))

    // Initialize field states dynamically
    const initialValues = {}
    const initialSources = {}
    const initialStatuses = {}

    ;(result.fields || []).forEach((f) => {
      const val = f.detectedValue || f.userValue || ''
      initialValues[f.id] = val
      initialSources[f.id] = f.detectedValue ? 'found_in_document' : 'empty'
      initialStatuses[f.id] = val ? 'ready' : (f.required ? 'missing' : 'ready')
    })

    setFieldValues(initialValues)
    setFieldSources(initialSources)
    setFieldStatuses(initialStatuses)
    setActiveFieldId(result.fields?.[0]?.id || null)
  }

  const handleProceedWithFixture = (fixtureKey) => {
    const fixture = FIXTURES[fixtureKey] || FIXTURES.scholarship
    applyAnalysisResult({
      connected: false,
      isFixture: true,
      documentId: `fixture_${fixture.id}`,
      fileName: selectedFile?.name || `${fixture.id}_application.pdf`,
      formTitle: fixture.title,
      formDescription: fixture.description,
      fields: fixture.fields.map((f) => ({ ...f })),
      pageCount: 1,
    })
    setIsProcessing(false)
    setCurrentStage(2)
  }

  // --------------------------------------------------------------------------
  // Form Field Value & Status Handlers
  // --------------------------------------------------------------------------
  const handleFieldValueChange = (fieldId, newValue) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: newValue }))
    setFieldSources((prev) => ({ ...prev, [fieldId]: 'user_entered' }))

    const fieldDef = detectedFields.find((f) => f.id === fieldId)
    const isRequired = fieldDef?.required !== false
    const hasContent = newValue !== null && newValue !== undefined && String(newValue).trim() !== ''

    setFieldStatuses((prev) => ({
      ...prev,
      [fieldId]: hasContent ? 'ready' : (isRequired ? 'missing' : 'ready'),
    }))

    // Clear suggestion if user explicitly edited it
    if (suggestedValues[fieldId]) {
      setSuggestedValues((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  const handleConfirmSuggestion = (fieldId, confirmedVal) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: confirmedVal }))
    setFieldSources((prev) => ({ ...prev, [fieldId]: 'suggested' }))
    setFieldStatuses((prev) => ({ ...prev, [fieldId]: 'ready' }))
    setSuggestedValues((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  const handleRejectSuggestion = (fieldId) => {
    setSuggestedValues((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  // 1-Click Profile Autofill for Logged-In Citizens
  const handleAutofillProfile = () => {
    if (!currentUser?.profile) return
    const profile = currentUser.profile

    detectedFields.forEach((field) => {
      const key = (field.id || '').toLowerCase()
      let matchedVal = null

      if (key.includes('name') || key.includes('applicant') || key.includes('patient')) {
        matchedVal = profile.fullName
      } else if (key.includes('phone') || key.includes('mobile') || key.includes('contact')) {
        matchedVal = profile.mobile
      } else if (key.includes('email')) {
        matchedVal = profile.email
      } else if (key.includes('dob') || key.includes('birth')) {
        matchedVal = profile.dob
      } else if (key.includes('gender')) {
        matchedVal = profile.gender
      } else if (key.includes('category')) {
        matchedVal = profile.category
      } else if (key.includes('state')) {
        matchedVal = profile.state
      } else if (key.includes('pin') || key.includes('postal')) {
        matchedVal = profile.postalCode
      } else if (key.includes('income')) {
        matchedVal = profile.annualIncome
      }

      if (matchedVal) {
        handleFieldValueChange(field.id, matchedVal)
      }
    })
  }

  // --------------------------------------------------------------------------
  // Reset Flow
  // --------------------------------------------------------------------------
  const handleStartNewForm = () => {
    handleRemoveFile()
    setDocumentMetadata(null)
    setDetectedFields([])
    setFieldValues({})
    setSuggestedValues({})
    setFieldSources({})
    setFieldStatuses({})
    setIsFixtureData(false)
    setActiveFieldId(null)
    setCurrentStage(1)
  }

  const handleSignOut = () => {
    localStorage.removeItem('vaanifill_token')
    localStorage.removeItem('vaanifill_user')
    setCurrentUser(null)
  }

  const activeField = detectedFields.find((f) => f.id === activeFieldId)

  return (
    <div className="guest-workspace-root">
      {/* --------------------------------------------------------------------
          1. NAVIGATION BAR
          -------------------------------------------------------------------- */}
      <header className="workspace-navbar">
        <div className="navbar-container">
          <div
            className="navbar-brand"
            onClick={onNavigateHome}
            role="button"
            tabIndex={0}
            title="Return to Welcome Page"
            onKeyDown={(e) => e.key === 'Enter' && onNavigateHome?.()}
          >
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-title">VAANIFILL</span>
            <span className="brand-sub">AI</span>
          </div>

          <div className="navbar-actions">
            <div className="guest-badge" title="No account required for filling">
              <span className="guest-badge-dot" aria-hidden="true" />
              <span>{currentUser ? 'Citizen Account' : 'Guest Workspace'}</span>
            </div>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="auth-user-badge">
                  <User className="auth-user-icon" />
                  <span>{currentUser.name}</span>
                </div>
                <button
                  type="button"
                  className="auth-logout-btn"
                  onClick={handleSignOut}
                  title="Sign out of account"
                >
                  <LogOut style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px' }} />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="nav-auth-btn nav-signin-btn"
                  onClick={() => setAuthModal({ isOpen: true, mode: 'signin' })}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className="nav-auth-btn nav-signup-btn"
                  onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          2. WORKSPACE MAIN & STEPPER
          -------------------------------------------------------------------- */}
      <main className="workspace-main">
        {/* Intro Banner */}
        <section className="workspace-intro">
          <div className="intro-badge">
            <ShieldCheck className="intro-badge-icon" aria-hidden="true" />
            <span>Document-Driven Form Completion</span>
          </div>
          <h1 className="workspace-title">
            {currentStage === 1 && "Let's complete your form."}
            {currentStage === 2 && `Fill ${documentMetadata?.formTitle || 'Your Form'}`}
            {currentStage === 3 && 'Review & Confirm Your Form'}
            {currentStage === 4 && 'Export Your Completed Form'}
          </h1>
          <p className="workspace-subtitle">
            {currentStage === 1 && 'Upload any PDF or image form. VaaniFill derives fields directly from your document.'}
            {currentStage === 2 && 'Original document preview and contextual multilingual voice assistant stay by your side.'}
            {currentStage === 3 && 'Verify detected document fields against your voice answers before final generation.'}
            {currentStage === 4 && 'Original document preview and contextual multilingual voice assistant stay by your side.'}
          </p>
        </section>

        {/* 4-Stage Stepper Navigation */}
        <nav className="workspace-stepper" aria-label="Form completion stages">
          <div className={`step-item ${currentStage === 1 ? 'active' : ''} ${currentStage > 1 ? 'completed' : ''}`}>
            <span className="step-circle">{currentStage > 1 ? <Check className="step-icon-xs" /> : '1'}</span>
            <span className="step-label">Upload Form</span>
          </div>
          <span className="step-divider" aria-hidden="true" />

          <div className={`step-item ${currentStage === 2 ? 'active' : ''} ${currentStage > 2 ? 'completed' : ''}`}>
            <span className="step-circle">{currentStage > 2 ? <Check className="step-icon-xs" /> : '2'}</span>
            <span className="step-label">Fill & Edit</span>
          </div>
          <span className="step-divider" aria-hidden="true" />

          <div className={`step-item ${currentStage === 3 ? 'active' : ''} ${currentStage > 3 ? 'completed' : ''}`}>
            <span className="step-circle">{currentStage > 3 ? <Check className="step-icon-xs" /> : '3'}</span>
            <span className="step-label">Review</span>
          </div>
          <span className="step-divider" aria-hidden="true" />

          <div className={`step-item ${currentStage === 4 ? 'active' : ''}`}>
            <span className="step-circle">4</span>
            <span className="step-label">Download</span>
          </div>
        </nav>

        {/* --------------------------------------------------------------------
            STAGE 1: DOCUMENT UPLOAD & OCR TRIGGER
            -------------------------------------------------------------------- */}
        {currentStage === 1 && !isProcessing && (
          <section className="workspace-card" aria-label="Upload Form Section">
            <DocumentUploader
              selectedFile={selectedFile}
              selectedFixtureId={selectedFixtureId}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              onSelectFixture={setSelectedFixtureId}
              onStartAnalysis={handleStartAnalysis}
            />
          </section>
        )}

        {/* Processing State Animation & Fallbacks */}
        {currentStage === 1 && isProcessing && (
          <DocumentProcessingStatus
            status={processingStatus}
            fileName={selectedFile?.name || 'document.pdf'}
            onSelectFixture={handleProceedWithFixture}
            onBackToUpload={() => setIsProcessing(false)}
          />
        )}

        {/* --------------------------------------------------------------------
            STAGE 2: TWO-COLUMN FILL & EDIT WORKSPACE
            -------------------------------------------------------------------- */}
        {currentStage === 2 && (
          <div className="dynamic-workspace-layout">
            {/* Left Column: Side-by-side Original Document Preview */}
            <aside className="workspace-left-column">
              <OriginalDocumentPreview
                fileUrl={selectedFile?.previewUrl}
                fileName={documentMetadata?.fileName || 'Original Document'}
                fields={detectedFields}
                activeField={activeField}
                isOpenOnMobile={isMobilePreviewOpen}
                onToggleMobileOpen={() => setIsMobilePreviewOpen(!isMobilePreviewOpen)}
              />
            </aside>

            {/* Right Column: Dynamic Fields Editor + Voice Assistant */}
            <div className="workspace-right-column">
              <section className="workspace-card" aria-label="Detected Fields Editor">
                {/* 1-Click Profile Autofill Banner if Logged In */}
                {currentUser?.profile && (
                  <div className="profile-autofill-banner">
                    <div className="profile-autofill-info">
                      <Sparkles style={{ width: '16px', height: '16px', color: '#166534', flexShrink: 0 }} />
                      <span>
                        Welcome <strong>{currentUser.name}</strong>! Autofill your saved profile details into this form?
                      </span>
                    </div>
                    <button
                      type="button"
                      className="profile-autofill-action-btn"
                      onClick={handleAutofillProfile}
                      title="1-Click Fill Saved Profile"
                    >
                      <Sparkles style={{ width: '13px', height: '13px' }} />
                      1-Click Autofill
                    </button>
                  </div>
                )}

                <DetectedFieldsEditor
                  fields={detectedFields}
                  fieldValues={fieldValues}
                  suggestedValues={suggestedValues}
                  fieldSources={fieldSources}
                  fieldStatuses={fieldStatuses}
                  activeFieldId={activeFieldId}
                  onFieldFocus={setActiveFieldId}
                  onFieldValueChange={handleFieldValueChange}
                  onConfirmSuggestion={handleConfirmSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  isFixture={isFixtureData}
                  formTitle={documentMetadata?.formTitle}
                  highlightMissing={highlightMissing}
                />

                {/* Editor Navigation */}
                <div className="editor-nav-bar">
                  <button
                    type="button"
                    className="editor-back-upload-btn"
                    onClick={() => setCurrentStage(1)}
                  >
                    <ArrowLeft className="nav-icon-xs" />
                    <span>Upload Different Form</span>
                  </button>

                  <button
                    type="button"
                    className="editor-proceed-btn"
                    onClick={() => setCurrentStage(3)}
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight className="nav-icon-xs" />
                  </button>
                </div>
              </section>

              {/* Contextual Voice & Text Assistant */}
              <section className="assistant-wrapper-block">
                <VoiceAssistant
                  fields={detectedFields}
                  fieldValues={fieldValues}
                  onApplyProposedChange={handleFieldValueChange}
                  onNavigateToField={setActiveFieldId}
                  onHighlightMissingFields={setHighlightMissing}
                />
              </section>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            STAGE 3: COMPREHENSIVE FORM REVIEW
            -------------------------------------------------------------------- */}
        {currentStage === 3 && (
          <FormReview
            fields={detectedFields}
            fieldValues={fieldValues}
            formTitle={documentMetadata?.formTitle}
            fileName={documentMetadata?.fileName}
            isFixture={isFixtureData}
            onBackToEdit={() => setCurrentStage(2)}
            onProceedToDownload={() => setCurrentStage(4)}
          />
        )}

        {/* --------------------------------------------------------------------
            STAGE 4: OFFICIAL FORM EXPORT & DOWNLOAD
            -------------------------------------------------------------------- */}
        {currentStage === 4 && (
          <DownloadPanel
            documentId={documentMetadata?.documentId}
            fileName={documentMetadata?.fileName}
            formTitle={documentMetadata?.formTitle}
            fields={detectedFields}
            fieldValues={fieldValues}
            isFixture={isFixtureData}
            onBackToReview={() => setCurrentStage(3)}
            onStartNewForm={handleStartNewForm}
          />
        )}
      </main>

      {/* --------------------------------------------------------------------
          INTERACTIVE AUTHENTICATION & DEMO LOGIN MODAL
          -------------------------------------------------------------------- */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: 'signin' })}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  )
}
