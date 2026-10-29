import React, { useRef, useState } from 'react'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { FIXTURES } from '../../services/documentAnalysisService'
import './DocumentUploader.css'

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function DocumentUploader({
  selectedFile,
  onFileSelect,
  onRemoveFile,
  onStartAnalysis,
  selectedFixtureId,
  onSelectFixture,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleValidateAndSelect = (file) => {
    setValidationError(null)
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const isPDF = lowerName.endsWith('.pdf') || (file.type && file.type.includes('pdf'))
    const isImage = /\.(png|jpe?g|webp)$/i.test(lowerName) || (file.type && file.type.startsWith('image/'))

    if (!isPDF && !isImage) {
      setValidationError('Unsupported format. Please select a PDF, PNG, JPG, or JPEG file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`File exceeds 10 MB limit (${formatSize(file.size)}). Please choose a smaller file.`)
      return
    }

    // Revoke previous object URL if any
    if (selectedFile?.previewUrl) {
      try {
        URL.revokeObjectURL(selectedFile.previewUrl)
      } catch {}
    }

    let previewUrl = null
    try {
      previewUrl = URL.createObjectURL(file)
    } catch (err) {
      console.warn('Could not create preview URL for file:', err)
    }

    onFileSelect({
      file,
      name: file.name,
      size: formatSize(file.size),
      sizeBytes: file.size,
      type: file.type || (isPDF ? 'application/pdf' : 'image/jpeg'),
      previewUrl,
      isPDF,
      isImage,
    })
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleValidateAndSelect(file)
    }
  }

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleRemove = (e) => {
    e?.stopPropagation()
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemoveFile()
  }

  return (
    <div className="document-uploader-root">
      <div className="uploader-header">
        <h2 className="uploader-title">Upload your form</h2>
        <p className="uploader-desc">
          Choose any digital or scanned form from your device. VaaniFill will detect its specific fields.
        </p>
      </div>

      {/* Main Drag & Drop / Tap Target Zone */}
      <div
        className={`uploader-dropzone ${isDragging ? 'dropzone-active' : ''} ${selectedFile ? 'dropzone-filled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && openFilePicker()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden-file-input"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleValidateAndSelect(f)
          }}
        />

        {!selectedFile ? (
          <div className="dropzone-empty-content">
            <div className="uploader-icon-ring" aria-hidden="true">
              <UploadCloud className="uploader-icon-svg" />
            </div>
            <p className="dropzone-primary-label">
              <span className="browse-link">Browse files</span> or drag & drop here
            </p>
            <p className="dropzone-format-hint">
              Supports PDF, PNG, JPG, JPEG • Maximum 10 MB
            </p>
            <button
              type="button"
              className="dropzone-browse-button"
              onClick={(e) => {
                e.stopPropagation()
                openFilePicker()
              }}
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="selected-document-card">
            <div className="selected-doc-info">
              <div className="doc-icon-badge" aria-hidden="true">
                {selectedFile.isImage ? <ImageIcon className="doc-icon" /> : <FileText className="doc-icon" />}
              </div>
              <div className="doc-meta-text">
                <span className="doc-name" title={selectedFile.name}>{selectedFile.name}</span>
                <span className="doc-size">{selectedFile.size} • {selectedFile.isPDF ? 'PDF Document' : 'Image Document'}</span>
              </div>
              <div className="doc-actions-group">
                <button
                  type="button"
                  className="doc-action-btn replace-action"
                  title="Replace with another file"
                  onClick={(e) => {
                    e.stopPropagation()
                    openFilePicker()
                  }}
                >
                  <RefreshCw className="action-icon-xs" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  className="doc-action-btn remove-action"
                  title="Remove this file"
                  onClick={handleRemove}
                >
                  <Trash2 className="action-icon-xs" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Preview */}
            {selectedFile.isImage && selectedFile.previewUrl && (
              <div className="doc-thumbnail-frame">
                <img src={selectedFile.previewUrl} alt="Uploaded form preview" className="doc-thumb-img" />
              </div>
            )}

            {selectedFile.isPDF && selectedFile.previewUrl && (
              <div className="doc-pdf-preview-box">
                <div className="doc-pdf-status-banner">
                  <CheckCircle2 className="pdf-check-icon" />
                  <span>PDF Document ready for field detection</span>
                </div>
                <div className="doc-pdf-mini-embed">
                  <iframe
                    src={`${selectedFile.previewUrl}#toolbar=0&navpanes=0`}
                    title="PDF Document Preview"
                    className="doc-pdf-iframe"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="uploader-validation-error" role="alert">
          <AlertCircle className="error-icon" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Developer Testing Fixture Adapter */}
      <div className="developer-fixture-box">
        <div className="fixture-label-row">
          <span className="fixture-badge">Official Form Templates</span>
          <span className="fixture-hint">Or choose a standard civic / health template to begin:</span>
        </div>
        <div className="fixture-options-row">
          {Object.entries(FIXTURES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`fixture-choice-btn ${selectedFixtureId === key ? 'fixture-choice-active' : ''}`}
              onClick={() => onSelectFixture(selectedFixtureId === key ? null : key)}
            >
              <Sparkles className="fixture-icon-xs" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="uploader-cta-bar">
        <button
          type="button"
          className="understand-form-btn"
          disabled={!selectedFile && !selectedFixtureId}
          onClick={onStartAnalysis}
        >
          <span>Understand This Form</span>
          <ArrowRight className="btn-icon" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
