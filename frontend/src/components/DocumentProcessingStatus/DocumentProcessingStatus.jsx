import React from 'react'
import { Loader2, AlertCircle, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'
import './DocumentProcessingStatus.css'

export default function DocumentProcessingStatus({
  statusStep, // 'reading' | 'detecting' | 'preparing' | 'unconnected' | 'complete'
  fileName,
  analysisResult,
  onProceedWithFixture,
  onBackToUpload,
}) {
  const steps = [
    { id: 'reading', label: 'Reading your document...' },
    { id: 'detecting', label: 'Identifying form fields...' },
    { id: 'preparing', label: 'Preparing your workspace...' },
  ]

  const getStepIndex = (step) => {
    switch (step) {
      case 'reading': return 0
      case 'detecting': return 1
      case 'preparing': return 2
      default: return 0
    }
  }

  const currentIdx = getStepIndex(statusStep)

  return (
    <div className="processing-status-root" role="status" aria-live="polite">
      {statusStep !== 'unconnected' ? (
        <div className="processing-in-flight-card">
          <div className="spinner-wrapper" aria-hidden="true">
            <Loader2 className="processing-spinner" />
          </div>

          <h2 className="processing-title">Understanding your form</h2>
          <p className="processing-filename">{fileName}</p>

          <div className="processing-steps-list">
            {steps.map((st, i) => (
              <div
                key={st.id}
                className={`processing-step-row ${i === currentIdx ? 'step-current' : i < currentIdx ? 'step-done' : 'step-pending'}`}
              >
                <span className="step-bullet" />
                <span className="step-text">{st.label}</span>
              </div>
            ))}
          </div>

          <p className="processing-honest-note">
            Communicating with document analysis engine. Processing runs locally or through your configured backend.
          </p>
        </div>
      ) : (
        <div className="unconnected-service-card">
          <div className="unconnected-icon-badge" aria-hidden="true">
            <AlertCircle className="unconnected-icon" />
          </div>

          <h2 className="unconnected-title">Document analysis is not connected yet</h2>
          <p className="unconnected-desc">
            The backend document OCR extraction pipeline is not reachable.
            In accordance with our zero-hallucination policy, VaaniFill will <strong>never fabricate</strong> fields or claim that your document was analyzed.
          </p>

          <div className="unconnected-fixture-prompt">
            <div className="fixture-prompt-icon" aria-hidden="true">
              <Sparkles className="sparkles-icon" />
            </div>
            <div className="fixture-prompt-text">
              <strong>Select a standard government template:</strong>
              <p>
                Choose an official pre-configured portal template to complete your application.
              </p>
            </div>
          </div>

          <div className="unconnected-actions-bar">
            <button
              type="button"
              className="unconnected-back-btn"
              onClick={onBackToUpload}
            >
              <ArrowLeft className="action-btn-icon" />
              <span>Back to Upload</span>
            </button>

            <button
              type="button"
              className="unconnected-fixture-btn"
              onClick={() => onProceedWithFixture('scholarship')}
            >
              <span>National Scholarship Application</span>
              <ArrowRight className="action-btn-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
