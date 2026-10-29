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
} from 'lucide-react'
import DocumentUploader from '../../components/DocumentUploader/DocumentUploader'
import OriginalDocumentPreview from '../../components/OriginalDocumentPreview/OriginalDocumentPreview'
import DocumentProcessingStatus from '../../components/DocumentProcessingStatus/DocumentProcessingStatus'
import DetectedFieldsEditor from '../../components/DetectedFieldsEditor/DetectedFieldsEditor'
import VoiceAssistant from '../../components/VoiceAssistant/VoiceAssistant'
import FormReview from '../../components/FormReview/FormReview'
import DownloadPanel from '../../components/DownloadPanel/DownloadPanel'
import { analyzeDocument, FIXTURES } from '../../services/documentAnalysisService'
import './GuestWorkspace.css'

export default function GuestWorkspace({ onNavigateHome }) {
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

  // Auth Modal State (Placeholder)
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
              <span>Guest Workspace</span>
            </div>

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

          <h1 className="intro-heading">
            {currentStage === 1
              ? "Let's complete your form."
              : currentStage === 2
              ? `Fill ${documentMetadata?.formTitle || 'Your Form'}`
              : currentStage === 3
              ? 'Review Detected Information'
              : 'Export Your Completed Form'}
          </h1>

          <p className="intro-subtext">
            {currentStage === 1
              ? 'Upload any PDF or image form. VaaniFill derives fields directly from your document.'
              : 'Original document preview and contextual multilingual voice assistant stay by your side.'}
          </p>

          {/* Stepper Indicator */}
          <nav className="step-stepper" aria-label="Form Stages">
            <button
              type="button"
              className={`step-item ${currentStage === 1 ? 'step-active' : currentStage > 1 ? 'step-completed' : ''}`}
              onClick={() => currentStage > 1 && setCurrentStage(1)}
              disabled={isProcessing}
            >
              <span className="step-number">{currentStage > 1 ? <Check className="step-check" /> : '1'}</span>
              <span className="step-label">Upload Form</span>
            </button>

            <span className="step-connector" aria-hidden="true" />

            <button
              type="button"
              className={`step-item ${currentStage === 2 ? 'step-active' : currentStage > 2 ? 'step-completed' : ''}`}
              onClick={() => detectedFields.length > 0 && setCurrentStage(2)}
              disabled={detectedFields.length === 0 || isProcessing}
            >
              <span className="step-number">{currentStage > 2 ? <Check className="step-check" /> : '2'}</span>
              <span className="step-label">Fill & Edit</span>
            </button>

            <span className="step-connector" aria-hidden="true" />

            <button
              type="button"
              className={`step-item ${currentStage === 3 ? 'step-active' : currentStage > 3 ? 'step-completed' : ''}`}
              onClick={() => detectedFields.length > 0 && setCurrentStage(3)}
              disabled={detectedFields.length === 0 || isProcessing}
            >
              <span className="step-number">{currentStage > 3 ? <Check className="step-check" /> : '3'}</span>
              <span className="step-label">Review</span>
            </button>

            <span className="step-connector" aria-hidden="true" />

            <button
              type="button"
              className={`step-item ${currentStage === 4 ? 'step-active' : ''}`}
              onClick={() => detectedFields.length > 0 && setCurrentStage(4)}
              disabled={detectedFields.length === 0 || isProcessing}
            >
              <span className="step-number">4</span>
              <span className="step-label">Download</span>
            </button>
          </nav>
        </section>

        {/* --------------------------------------------------------------------
            STAGE 1: DOCUMENT UPLOAD
            -------------------------------------------------------------------- */}
        {currentStage === 1 && !isProcessing && (
          <section className="workspace-card" aria-label="Upload Section">
            <DocumentUploader
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              onStartAnalysis={handleStartAnalysis}
              selectedFixtureId={selectedFixtureId}
              onSelectFixture={setSelectedFixtureId}
            />
          </section>
        )}

        {/* --------------------------------------------------------------------
            PROCESSING TRANSITION STATE
            -------------------------------------------------------------------- */}
        {isProcessing && (
          <DocumentProcessingStatus
            statusStep={processingStatus}
            fileName={selectedFile?.name || 'Uploaded Document'}
            onProceedWithFixture={handleProceedWithFixture}
            onBackToUpload={() => setIsProcessing(false)}
          />
        )}

        {/* --------------------------------------------------------------------
            STAGE 2: DYNAMIC FILL & EDIT WORKSPACE (TWO COLUMNS)
            -------------------------------------------------------------------- */}
        {currentStage === 2 && detectedFields.length > 0 && (
          <div className="dynamic-workspace-layout">
            {/* Left Column: Original Document Preview */}
            <aside className="workspace-left-column" aria-label="Original Document View">
              <OriginalDocumentPreview
                fileData={selectedFile}
                activeField={activeField}
                isOpenOnMobile={isMobilePreviewOpen}
                onToggleMobileOpen={() => setIsMobilePreviewOpen(!isMobilePreviewOpen)}
              />
            </aside>

            {/* Right Column: Dynamic Fields Editor + Voice Assistant */}
            <div className="workspace-right-column">
              <section className="workspace-card" aria-label="Detected Fields Editor">
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
            STAGE 3: REVIEW STAGE
            -------------------------------------------------------------------- */}
        {currentStage === 3 && (
          <FormReview
            fileName={documentMetadata?.fileName}
            formTitle={documentMetadata?.formTitle}
            fields={detectedFields}
            fieldValues={fieldValues}
            fieldSources={fieldSources}
            fieldStatuses={fieldStatuses}
            isFixture={isFixtureData}
            onEditField={(fieldId) => {
              setActiveFieldId(fieldId)
              setCurrentStage(2)
            }}
            onBackToEditor={() => setCurrentStage(2)}
            onProceedToDownload={() => setCurrentStage(4)}
          />
        )}

        {/* --------------------------------------------------------------------
            STAGE 4: DOWNLOAD STAGE
            -------------------------------------------------------------------- */}
        {currentStage === 4 && (
          <DownloadPanel
            fileName={documentMetadata?.fileName}
            formTitle={documentMetadata?.formTitle}
            documentId={documentMetadata?.documentId}
            fields={detectedFields}
            fieldValues={fieldValues}
            isFixture={isFixtureData}
            onBackToReview={() => setCurrentStage(3)}
            onStartNewForm={handleStartNewForm}
          />
        )}
      </main>

      {/* --------------------------------------------------------------------
          PLACEHOLDER AUTH MODAL
          -------------------------------------------------------------------- */}
      {authModal.isOpen && (
        <div className="modal-backdrop" onClick={() => setAuthModal({ isOpen: false, mode: 'signin' })}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {authModal.mode === 'signin' ? 'Sign In to VaaniFill' : 'Create an Account'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAuthModal({ isOpen: false, mode: 'signin' })}
                aria-label="Close modal"
              >
                <X className="modal-close-icon" />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                You are currently in <strong>Guest Mode</strong>. You can upload forms, review detected fields, and export summaries without logging in.
              </p>
              <div className="modal-info-box">
                <CheckCircle2 className="modal-info-icon" />
                <span>Account synchronization and cloud profiles will be available in the upcoming release.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="primary-btn modal-dismiss-btn"
                onClick={() => setAuthModal({ isOpen: false, mode: 'signin' })}
              >
                Continue in Guest Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
