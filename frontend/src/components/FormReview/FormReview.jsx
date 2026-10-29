import React from 'react'
import {
  Edit2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
} from 'lucide-react'
import './FormReview.css'

export default function FormReview({
  fields = [],
  fieldValues = {},
  fieldSources = {},
  fieldStatuses = {},
  isFixture = false,
  onEditField,
  onBackToEditor,
}) {
  const filledCount = fields.filter((f) => {
    const val = fieldValues[f.id] ?? f.userValue ?? f.detectedValue
    return val !== null && val !== undefined && String(val).trim() !== ''
  }).length

  const missingRequired = fields.filter((f) => {
    const val = fieldValues[f.id] ?? f.userValue ?? f.detectedValue
    return f.required && (!val || String(val).trim() === '')
  })

  return (
    <div className="form-review-card" aria-labelledby="review-stage-title">
      <div className="review-header-block">
        <div className="review-title-group">
          <span className="review-step-tag">Step 2: Verification</span>
          <h2 id="review-stage-title" className="review-title">Review Detected Form Data</h2>
          <p className="review-subtitle">
            Inspect all completed values before generating your final summary. Every value corresponds to your actual document schema.
          </p>
        </div>

        <div className="review-stats-badge">
          <span>{filledCount} of {fields.length} Completed</span>
        </div>
      </div>

      {/* Honest Fixture Notice */}
      {isFixture && (
        <div className="review-fixture-notice" role="status">
          <Info className="notice-icon" aria-hidden="true" />
          <span>
            Demonstration schema data: These fields verify the dynamic review interface when backend OCR is in development.
          </span>
        </div>
      )}

      {/* Missing Required Warning */}
      {missingRequired.length > 0 && (
        <div className="review-missing-warning" role="alert">
          <AlertCircle className="warning-icon" aria-hidden="true" />
          <div>
            <strong>{missingRequired.length} required field(s) are currently empty:</strong>
            <p>{missingRequired.map((f) => f.label.split('/')[0]).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Review Table / List of Actual Fields */}
      <div className="review-fields-table">
        {fields.map((field, idx) => {
          const val = fieldValues[field.id] ?? field.userValue ?? field.detectedValue
          const hasValue = val !== null && val !== undefined && String(val).trim() !== ''
          const source = fieldSources[field.id] || (hasValue ? 'user_entered' : 'empty')
          const status = fieldStatuses[field.id] || (hasValue ? 'ready' : (field.required ? 'missing' : 'ready'))

          return (
            <div key={field.id} className="review-field-row">
              <div className="review-col-meta">
                <span className="row-index">{idx + 1}</span>
                <div className="label-with-tags">
                  <span className="field-label-text">
                    {field.label}
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
                  {hasValue ? String(val) : '— (Empty)'}
                </span>
              </div>

              <div className="review-col-action">
                <button
                  type="button"
                  className="edit-field-link"
                  onClick={() => onEditField(field.id)}
                  title={`Edit ${field.label}`}
                >
                  <Edit2 className="edit-icon-xs" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Nav Bar */}
      <div className="review-nav-bar">
        <button
          type="button"
          className="review-back-btn"
          onClick={onBackToEditor}
        >
          <ArrowLeft className="btn-icon-xs" />
          <span>Back to Form Editor</span>
        </button>

        <button
          type="button"
          className="review-proceed-btn"
          onClick={onProceedToDownload}
        >
          <span>Continue to Download</span>
          <ArrowRight className="btn-icon-xs" />
        </button>
      </div>
    </div>
  )
}
