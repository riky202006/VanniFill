import React from 'react'
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Check,
  X,
  FileText,
} from 'lucide-react'
import './DetectedFieldsEditor.css'

export default function DetectedFieldsEditor({
  fields = [],
  fieldValues = {},
  suggestedValues = {},
  fieldSources = {},
  fieldStatuses = {},
  activeFieldId,
  onFieldFocus,
  onFieldValueChange,
  onConfirmSuggestion,
  onRejectSuggestion,
  isFixture = false,
  formTitle = '',
  highlightMissing = false,
}) {
  const getBadgeClass = (status) => {
    switch (status) {
      case 'ready': return 'badge-ready'
      case 'missing': return 'badge-missing'
      case 'uncertain': return 'badge-uncertain'
      default: return 'badge-neutral'
    }
  }

  const getSourcePill = (source) => {
    switch (source) {
      case 'found_in_document':
        return <span className="source-pill source-doc" title="Pre-extracted from your document OCR">Found in document</span>
      case 'user_entered':
        return <span className="source-pill source-user" title="Entered or edited by you">User entered</span>
      case 'suggested':
        return <span className="source-pill source-suggested" title="Suggested by assistant (requires confirmation)">Suggested</span>
      default:
        return null
    }
  }

  return (
    <div className="detected-fields-editor-root">
      {/* Header Info Banner */}
      <div className="editor-top-meta">
        <div className="meta-left">
          <span className="editor-doc-badge">Detected Form</span>
          <h2 className="editor-form-title">{formTitle || 'Dynamic Form Fields'}</h2>
        </div>

        <div className="meta-right">
          <span className="field-count-indicator">
            {fields.length} detected {fields.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
      </div>

      {/* Honest Fixture Notice when running in demonstration mode */}
      {isFixture && (
        <div className="fixture-disclaimer-banner" role="status">
          <Info className="disclaimer-icon-sm" aria-hidden="true" />
          <span>
            <strong>Demonstration Fixture:</strong> These fields are from a test schema to verify dynamic generation. They have not been extracted from your uploaded file.
          </span>
        </div>
      )}

      {/* Dynamic Fields List */}
      <div className="dynamic-fields-stack">
        {fields.map((field) => {
          const currentValue = fieldValues[field.id] ?? ''
          const suggestion = suggestedValues[field.id]
          const source = fieldSources[field.id] || (currentValue ? 'user_entered' : 'empty')
          const status = fieldStatuses[field.id] || (currentValue ? 'ready' : (field.required ? 'missing' : 'ready'))
          const isFocused = activeFieldId === field.id
          const isMissingHighlight = highlightMissing && status === 'missing'

          return (
            <div
              key={field.id}
              className={`field-row-card ${isFocused ? 'field-card-focused' : ''} ${isMissingHighlight ? 'field-card-missing-alert' : ''}`}
              onClick={() => onFieldFocus(field.id)}
            >
              {/* Field Label & Metadata Bar */}
              <div className="field-meta-bar">
                <div className="label-wrapper">
                  <label htmlFor={`input-${field.id}`} className="dynamic-field-label">
                    {field.label}
                    {field.required && <span className="required-asterisk" title="Required field">*</span>}
                  </label>
                  {field.pageNumber && (
                    <span className="field-page-tag">Page {field.pageNumber}</span>
                  )}
                </div>

                <div className="status-tags-group">
                  {getSourcePill(source)}
                  <span className={`status-badge ${getBadgeClass(status)}`}>
                    {status === 'ready' && <Check className="badge-icon-xs" />}
                    {status === 'missing' && <AlertCircle className="badge-icon-xs" />}
                    {status === 'uncertain' && <HelpCircle className="badge-icon-xs" />}
                    <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Input Control by Type */}
              <div className="field-control-wrapper">
                {/* 1. SELECT DROPDOWN */}
                {field.type === 'select' ? (
                  <select
                    id={`input-${field.id}`}
                    className="dynamic-select-input"
                    value={currentValue}
                    onFocus={() => onFieldFocus(field.id)}
                    onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                  >
                    <option value="">-- Choose option --</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  /* 2. TEXTAREA */
                  <textarea
                    id={`input-${field.id}`}
                    rows={3}
                    className="dynamic-textarea-input"
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    value={currentValue}
                    onFocus={() => onFieldFocus(field.id)}
                    onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                  />
                ) : field.type === 'checkbox' ? (
                  /* 3. CHECKBOX */
                  <label className="dynamic-checkbox-label">
                    <input
                      id={`input-${field.id}`}
                      type="checkbox"
                      className="dynamic-checkbox-input"
                      checked={Boolean(currentValue)}
                      onFocus={() => onFieldFocus(field.id)}
                      onChange={(e) => onFieldValueChange(field.id, e.target.checked)}
                    />
                    <span>{field.description || 'Confirm this condition'}</span>
                  </label>
                ) : (
                  /* 4. STANDARD INPUTS (text, date, number, email, tel, unknown) */
                  <input
                    id={`input-${field.id}`}
                    type={
                      field.type === 'date'
                        ? 'date'
                        : field.type === 'number'
                        ? 'number'
                        : field.type === 'email'
                        ? 'email'
                        : field.type === 'tel'
                        ? 'tel'
                        : 'text'
                    }
                    className="dynamic-text-input"
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    value={currentValue}
                    onFocus={() => onFieldFocus(field.id)}
                    onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                  />
                )}
              </div>

              {/* Suggested Value Notification & Explicit Confirmation */}
              {suggestion && (
                <div className="suggestion-confirmation-bar">
                  <div className="suggestion-text">
                    <Sparkles className="suggestion-sparkle-icon" />
                    <span>Suggested value: <strong>"{suggestion}"</strong></span>
                  </div>
                  <div className="suggestion-action-buttons">
                    <button
                      type="button"
                      className="suggestion-confirm-btn"
                      title="Accept suggested value"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmSuggestion(field.id, suggestion)
                      }}
                    >
                      <Check className="action-icon-xs" />
                      <span>Confirm</span>
                    </button>
                    <button
                      type="button"
                      className="suggestion-reject-btn"
                      title="Reject suggested value"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRejectSuggestion(field.id)
                      }}
                    >
                      <X className="action-icon-xs" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Field Description or OCR Confidence note */}
              {field.description && (
                <p className="field-hint-text">{field.description}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
