import React, { useState } from 'react'
import {
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react'
import { generateCompletedDocument, downloadFieldsSummary } from '../../services/documentGenerationService'
import './DownloadPanel.css'

export default function DownloadPanel({
  fileName,
  formTitle,
  documentId,
  fields = [],
  fieldValues = {},
  isFixture = false,
  onBackToReview,
  onStartNewForm,
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)
  const [summaryDownloaded, setSummaryDownloaded] = useState(false)

  const handleAttemptDocumentGeneration = async () => {
    setIsGenerating(true)
    setGenerationResult(null)

    const result = await generateCompletedDocument({
      documentId,
      fields,
      fieldValues,
      originalFileName: fileName,
    })

    setIsGenerating(false)
    setGenerationResult(result)
  }

  const handleDownloadSummary = () => {
    downloadFieldsSummary({
      originalFileName: fileName,
      formTitle,
      fields,
      fieldValues,
      isFixture,
    })
    setSummaryDownloaded(true)
  }

  return (
    <div className="download-panel-card" aria-labelledby="download-stage-title">
      <div className="download-header-block">
        <span className="download-step-tag">Step 3: Document Export</span>
        <h2 id="download-stage-title" className="download-title">Download Completed Form</h2>
        <p className="download-subtitle">
          Export your verified form fields or generate a completed version of your document.
        </p>
      </div>

      {/* Primary Target: Real PDF Generation Integration Notice */}
      <div className="generation-status-box">
        <div className="generation-status-header">
          <div className="status-indicator-badge badge-unconnected">
            <AlertCircle className="status-icon-sm" />
            <span>Document Generation Pipeline: In Development</span>
          </div>
        </div>

        <p className="generation-explainer">
          Generating a pixel-precise, stamped PDF overlay of your uploaded document requires the backend PDF-rendering engine. In accordance with VaaniFill's transparency standards, we do not claim that a synthetic completed PDF is available when the engine is not yet deployed.
        </p>

        <button
          type="button"
          className="attempt-generation-btn"
          disabled={isGenerating}
          onClick={handleAttemptDocumentGeneration}
        >
          <Sparkles className="btn-icon-xs" />
          <span>{isGenerating ? 'Connecting to Generation Service...' : 'Check Server for PDF Overlay Service'}</span>
        </button>

        {generationResult && !generationResult.success && (
          <div className="generation-error-box" role="alert">
            <Info className="info-icon-sm" />
            <span>{generationResult.message}</span>
          </div>
        )}
      </div>

      {/* Available Honest Fallback: Field Data Summary Export */}
      <div className="summary-export-section">
        <div className="summary-export-header">
          <div className="doc-icon-wrap" aria-hidden="true">
            <FileText className="file-icon" />
          </div>
          <div>
            <h3 className="summary-export-title">Download Extracted Fields Summary (.txt)</h3>
            <p className="summary-export-desc">
              Structured text record of all {fields.length} detected fields and your entered values.
            </p>
          </div>
        </div>

        {summaryDownloaded && (
          <div className="summary-success-pill" role="status">
            <CheckCircle2 className="check-icon-sm" />
            <span>Downloaded <code>VaaniFill-Extracted-Fields-Summary.txt</code></span>
          </div>
        )}

        <button
          type="button"
          className="download-summary-btn"
          onClick={handleDownloadSummary}
        >
          <Download className="btn-icon-xs" />
          <span>Download Fields Summary (.txt)</span>
        </button>
      </div>

      {/* Actions */}
      <div className="download-footer-actions">
        <button
          type="button"
          className="download-back-btn"
          onClick={onBackToReview}
        >
          <ArrowLeft className="btn-icon-xs" />
          <span>Back to Review</span>
        </button>

        <button
          type="button"
          className="download-reset-btn"
          onClick={onStartNewForm}
        >
          <RotateCcw className="btn-icon-xs" />
          <span>Start with Another Form</span>
        </button>
      </div>
    </div>
  )
}
