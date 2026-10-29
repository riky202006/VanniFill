import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react'
import DocumentUploader from '../DocumentUploader/DocumentUploader'
import OriginalDocumentPreview from '../OriginalDocumentPreview/OriginalDocumentPreview'
import DocumentProcessingStatus from '../DocumentProcessingStatus/DocumentProcessingStatus'
import DetectedFieldsEditor from '../DetectedFieldsEditor/DetectedFieldsEditor'
import VoiceAssistant from '../VoiceAssistant/VoiceAssistant'
import FormReview from '../FormReview/FormReview'
import DownloadPanel from '../DownloadPanel/DownloadPanel'
import { analyzeDocument, FIXTURES } from '../../services/documentAnalysisService'
import { matchFieldsWithProfile } from '../../services/profileMatchingService'
import './DocumentWorkspace.css'

export default function DocumentWorkspace({
  currentUser = null,
  userProfile = null,
  isGuest = false,
  onOpenAuth = null,
  onNavigateToProfile = null,
}) {
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

  // Clean up object URLs when file changes or on unmount
  useEffect(() => {
    return () => {
      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl)
      }
    }
  }, [selectedFile])

  // Re-run matching when userProfile becomes available or changes during Stage 2
  useEffect(() => {
    if (currentStage === 2 && detectedFields.length > 0 && userProfile) {
      const suggestions = matchFieldsWithProfile(detectedFields, userProfile)
      // Only keep suggestions for fields that haven't been manually entered or already applied
      const pendingSuggestions = {}
      Object.entries(suggestions).forEach(([fId, sugg]) => {
        const currentVal = fieldValues[fId]
        const currentSource = fieldSources[fId]
        if (!currentVal || currentSource === 'suggested_match') {
          pendingSuggestions[fId] = sugg
        }
      })
      setSuggestedValues(pendingSuggestions)
    }
  }, [userProfile, currentStage, detectedFields.length])

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
    } catch {
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

    const fields = result.fields || []
    setDetectedFields(fields)
    setIsFixtureData(Boolean(result.isFixture))

    // Initialize field states
    const initialValues = {}
    const initialSources = {}
    const initialStatuses = {}

    fields.forEach((f) => {
      const val = f.detectedValue || f.userValue || ''
      initialValues[f.id] = val
      initialSources[f.id] = f.detectedValue ? 'found_in_document' : 'empty'
      initialStatuses[f.id] = val ? 'ready' : (f.required ? 'missing' : 'ready')
    })

    // Profile-to-form matching when user is signed in
    let suggestions = {}
    if (userProfile) {
      suggestions = matchFieldsWithProfile(fields, userProfile)
      // Tag fields with pending suggestions as suggested_match if currently empty
      Object.keys(suggestions).forEach((fId) => {
        if (!initialValues[fId]) {
          initialSources[fId] = 'suggested_match'
        }
      })
    }

    setFieldValues(initialValues)
    setFieldSources(initialSources)
    setFieldStatuses(initialStatuses)
    setSuggestedValues(suggestions)
    setActiveFieldId(fields?.[0]?.id || null)
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

    // Clear suggestion if user explicitly typed a value
    if (suggestedValues[fieldId]) {
      setSuggestedValues((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  // Suggestion: Use This Value (Applies and confirms suggestion)
  const handleConfirmSuggestion = (fieldId, confirmedVal) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: confirmedVal }))
    setFieldSources((prev) => ({ ...prev, [fieldId]: 'saved_profile' }))
    setFieldStatuses((prev) => ({ ...prev, [fieldId]: 'ready' }))
    setSuggestedValues((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  // Suggestion: Ignore / Dismiss
  const handleRejectSuggestion = (fieldId) => {
    setSuggestedValues((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
    // If source was pending suggestion, mark back to empty
    if (fieldSources[fieldId] === 'suggested_match') {
      setFieldSources((prev) => ({ ...prev, [fieldId]: 'empty' }))
    }
  }

  // Batch Suggestion: Apply all high-confidence suggestions
  const handleApplyAllSuggestions = () => {
    const newValues = { ...fieldValues }
    const newSources = { ...fieldSources }
    const newStatuses = { ...fieldStatuses }

    Object.entries(suggestedValues).forEach(([fId, sugg]) => {
      const val = typeof sugg === 'object' ? sugg.value : sugg
      newValues[fId] = val
      newSources[fId] = 'saved_profile'
      newStatuses[fId] = 'ready'
    })

    setFieldValues(newValues)
    setFieldSources(newSources)
    setFieldStatuses(newStatuses)
    setSuggestedValues({})
  }

  // Batch Suggestion: Dismiss all
  const handleDismissAllSuggestions = () => {
    const newSources = { ...fieldSources }
    Object.keys(suggestedValues).forEach((fId) => {
      if (newSources[fId] === 'suggested_match') {
        newSources[fId] = 'empty'
      }
    })
    setFieldSources(newSources)
    setSuggestedValues({})
  }

  // Remove an applied value from saved profile
  const handleRemoveAppliedValue = (fieldId) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: '' }))
    setFieldSources((prev) => ({ ...prev, [fieldId]: 'empty' }))
    const fieldDef = detectedFields.find((f) => f.id === fieldId)
    setFieldStatuses((prev) => ({
      ...prev,
      [fieldId]: fieldDef?.required !== false ? 'missing' : 'ready',
    }))
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
    <div className="shared-workspace-root">
      {/* --------------------------------------------------------------------
          1. INTRO BANNER & STAGE STEPPER
          -------------------------------------------------------------------- */}
      <section className="workspace-intro">
        <div className="intro-badge">
          <ShieldCheck className="intro-badge-icon" aria-hidden="true" />
          <span>
            {currentUser ? 'Signed-In Workspace' : 'Guest Document Workspace'}
          </span>
        </div>

        <h1 className="workspace-title">
          {currentStage === 1 && "Let's complete your form."}
          {currentStage === 2 && `Fill ${documentMetadata?.formTitle || 'Your Form'}`}
          {currentStage === 3 && 'Review & Confirm Your Form'}
          {currentStage === 4 && 'Export Your Completed Form'}
        </h1>

        <p className="workspace-subtitle">
          {currentStage === 1 &&
            'Upload any PDF or image form. VaaniFill derives fields directly from your document.'}
          {currentStage === 2 &&
            'Original document preview and contextual multilingual voice assistant stay by your side.'}
          {currentStage === 3 &&
            'Verify detected document fields against your answers before final generation.'}
          {currentStage === 4 &&
            'Download your stamped, filled form receipt or start a new form.'}
        </p>

        {/* Guest Upsell notice if in Guest Mode */}
        {isGuest && (
          <div className="guest-upsell-strip">
            <Info className="strip-icon" />
            <span>
              Filling as guest. You can{' '}
              <button
                type="button"
                className="strip-link-btn"
                onClick={onOpenAuth}
              >
                Sign In
              </button>{' '}
              at any time to save personal details once and reuse them on future forms.
            </span>
          </div>
        )}

        {!isGuest && currentUser && onNavigateToProfile && (
          <div className="guest-upsell-strip">
            <Info className="strip-icon" />
            <span>
              Form matching suggestions are active from{' '}
              <button
                type="button"
                className="strip-link-btn"
                onClick={onNavigateToProfile}
              >
                My Information
              </button>.
            </span>
          </div>
        )}
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
                onApplyAllSuggestions={handleApplyAllSuggestions}
                onDismissAllSuggestions={handleDismissAllSuggestions}
                onRemoveAppliedValue={handleRemoveAppliedValue}
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
    </div>
  )
}
