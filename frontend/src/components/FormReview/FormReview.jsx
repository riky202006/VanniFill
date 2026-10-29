import React from 'react'
import {
  Edit2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import './FormReview.css'

export default function FormReview({
  fields = [],
  fieldValues = {},
  fieldSources = {},
  fieldStatuses = {},
  formTitle = '',
  fileName = '',
  isFixture = false,
  onEditField = null,
  onBackToEditor = null,
  onBackToEdit = null,
  onProceedToDownload = null,
}) {
  const handleBack = () => {
    if (typeof onBackToEditor === 'function') {
      onBackToEditor()
    } else if (typeof onBackToEdit === 'function') {
      onBackToEdit()
    }
  }

  const handleEdit = (fieldId) => {
    if (typeof onEditField === 'function') {
      onEditField(fieldId)
    } else {
      handleBack()
    }
  }

  const getFieldLabel = (field) => {
    if (!field) return 'Field'
    if (typeof field.label === 'string' && field.label.trim()) return field.label
    if (typeof field.fieldKey === 'string' && field.fieldKey.trim()) return field.fieldKey
    if (typeof field.id === 'string' && field.id.trim()) return field.id
    return 'Unnamed Field'
  }

  const getShortLabel = (field) => {
    const lbl = getFieldLabel(field)
    return lbl.split('/')[0].trim() || lbl
  }

  const getFormattedValue = (raw) => {
    if (raw === null || raw === undefined) return ''
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
    if (typeof raw === 'object') {
      if (raw.value !== undefined) return String(raw.value)
      return JSON.stringify(raw)
    }
    return String(raw)
  }

  const safeFields = Array.isArray(fields) ? fields : []

  const filledCount = safeFields.filter((f) => {
    if (!f) return false
    const rawVal = fieldValues?.[f.id] ?? f.userValue ?? f.detectedValue
    return getFormattedValue(rawVal).trim() !== ''
  }).length

  const missingRequired = safeFields.filter((f) => {
    if (!f || !f.required) return false
    const rawVal = fieldValues?.[f.id] ?? f.userValue ?? f.detectedValue
    return getFormattedValue(rawVal).trim() === ''
  })

  const handleProceed = onProceedToDownload

  return (
    <div className="form-review-card" aria-labelledby="review-stage-title">
      <div className="review-header-block">
        <div className="review-title-group">
          <span className="review-step-tag">Step 3: Verification</span>
          <h2 id="review-stage-title" className="review-title">
            {formTitle ? `Review: ${formTitle}` : 'Review Detected Form Data'}
          </h2>
          <p className="review-subtitle">
            {fileName ? `Document: ${fileName} • ` : ''}
            Inspect all completed values before generating your final summary. Every value corresponds to your actual document schema.
          </p>
        </div>

        <div className="review-stats-badge">
          <span>{filledCount} of {safeFields.length} Completed</span>
        </div>
      </div>

      {/* Fixture Notice if applicable */}
      {isFixture && (
        <div className="review-fixture-notice" role="status">
          <Info className="notice-icon" aria-hidden="true" />
          <span>
            Demonstration schema data: These fields verify the dynamic review interface.
          </span>
        </div>
      )}

      {/* Missing Required Warning */}
      {missingRequired.length > 0 && (
        <div className="review-missing-warning" role="alert">
          <AlertCircle className="warning-icon" aria-hidden="true" />
          <div>
            <strong>{missingRequired.length} required field(s) are currently empty:</strong>
            <p>{missingRequired.map((f) => getShortLabel(f)).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeFields.length === 0 ? (
        <div className="review-empty-state">
          <FileText className="empty-icon-lg" aria-hidden="true" />
          <h3>No Form Fields to Review</h3>
          <p>We could not find any detected form fields for this document.</p>
          <button
            type="button"
            className="review-back-btn"
            onClick={handleBack}
          >
            <ArrowLeft className="btn-icon-xs" />
            <span>Back to Form Editor</span>
          </button>
        </div>
      ) : (
        /* Review Table / List of Actual Fields */
        <div className="review-fields-table">
          {safeFields.map((field, idx) => {
            if (!field) return null
            const fieldId = field.id || `field_${idx}`
            const rawVal = fieldValues?.[fieldId] ?? field.userValue ?? field.detectedValue
            const formattedVal = getFormattedValue(rawVal)
            const hasValue = formattedVal.trim() !== ''
            const source = fieldSources?.[fieldId] || (hasValue ? 'user_entered' : 'empty')
            const status = fieldStatuses?.[fieldId] || (hasValue ? 'ready' : (field.required ? 'missing' : 'ready'))
            const label = getFieldLabel(field)

            return (
              <div key={fieldId} className="review-field-row">
                <div className="review-col-meta">
                  <span className="row-index">{idx + 1}</span>
                  <div className="label-with-tags">
                    <span className="field-label-text">
                      {label}
                      {field.required && <span className="req-marker">*</span>}
                    </span>
                    <div className="pill-tags-row">
                      {source === 'saved_profile' && (
                        <span className="source-tag tag-profile">Saved Profile</span>
                      )}
                      {source === 'found_in_document' && (
                        <span className="source-tag tag-ocr">Found in document</span>
                      )}
                      {source === 'user_entered' && (
                        <span className="source-tag tag-user">User entered</span>
                      )}
                      {source === 'suggested' && (
                        <span className="source-tag tag-suggested">Suggested</span>
                      )}
                      {status === 'missing' && (
                        <span className="status-tag tag-missing">Missing</span>
                      )}
                      {status === 'uncertain' && (
                        <span className="status-tag tag-uncertain">Uncertain</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="review-col-value">
                  <span className={`value-display ${hasValue ? '' : 'value-empty'}`}>
                    {hasValue ? formattedVal : '— (Empty)'}
                  </span>
                </div>

                <div className="review-col-action">
                  <button
                    type="button"
                    className="edit-field-link"
                    onClick={() => handleEdit(fieldId)}
                    title={`Edit ${label}`}
                  >
                    <Edit2 className="edit-icon-xs" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="review-nav-bar">
        <button
          type="button"
          className="review-back-btn"
          onClick={handleBack}
        >
          <ArrowLeft className="btn-icon-xs" />
          <span>Back to Form Editor</span>
        </button>

        <button
          type="button"
          className="review-proceed-btn"
          onClick={handleProceed}
        >
          <span>Continue to Download</span>
          <ArrowRight className="btn-icon-xs" />
        </button>
      </div>
    </div>
  )
}
