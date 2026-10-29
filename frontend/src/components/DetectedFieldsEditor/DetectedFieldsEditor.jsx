import React from 'react'
import {
  AlertCircle,
  HelpCircle,
  Sparkles,
  Check,
  X,
  Edit2,
  RotateCcw,
  UserCheck,
  FileText,
} from 'lucide-react'
import { resolveFieldOptions } from '../../constants/indianFormOptions'
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
  onApplyAllSuggestions,
  onDismissAllSuggestions,
  onRemoveAppliedValue,
  isFixture: _isFixture = false,
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
      case 'saved_profile':
        return (
          <span className="source-pill source-profile" title="Matched from My Information">
            <UserCheck className="pill-icon-xs" />
            Saved Profile
          </span>
        )
      case 'found_in_document':
        return (
          <span className="source-pill source-doc" title="Pre-extracted from document OCR">
            <FileText className="pill-icon-xs" />
            Document Extracted
          </span>
        )
      case 'suggested_match':
        return (
          <span className="source-pill source-suggested" title="Suggested from profile (pending confirmation)">
            <Sparkles className="pill-icon-xs" />
            Suggested Match
          </span>
        )
      case 'user_confirmed':
        return (
          <span className="source-pill source-confirmed" title="Confirmed by user">
            <Check className="pill-icon-xs" />
            User Confirmed
          </span>
        )
      case 'user_entered':
        return (
          <span className="source-pill source-user" title="Entered or edited by you">
            User Entered
          </span>
        )
      default:
        return null
    }
  }

  // Count high-confidence suggestions
  const suggestionKeys = Object.keys(suggestedValues || {})
  const pendingSuggestionsCount = suggestionKeys.length

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

      {/* Review Suggestions Banner (Batch confirmation for high-confidence profile matches) */}
      {pendingSuggestionsCount > 0 && (
        <div className="batch-suggestions-banner" role="region" aria-label="Review Profile Suggestions">
          <div className="banner-left">
            <div className="banner-sparkle-circle">
              <Sparkles className="banner-sparkle-icon" />
            </div>
            <div>
              <h4 className="banner-title">
                {pendingSuggestionsCount} {pendingSuggestionsCount === 1 ? 'Field Match' : 'Field Matches'} from My Information
              </h4>
              <p className="banner-desc">
                Review suggested values below. You remain in control and can accept, edit, or ignore any suggestion.
              </p>
            </div>
          </div>

          <div className="banner-actions">
            {onApplyAllSuggestions && (
              <button
                type="button"
                className="banner-apply-all-btn"
                onClick={onApplyAllSuggestions}
                title="Confirm all high-confidence profile matches"
              >
                <Check className="btn-icon-xs" />
                <span>Apply All Matches ({pendingSuggestionsCount})</span>
              </button>
            )}

            {onDismissAllSuggestions && (
              <button
                type="button"
                className="banner-dismiss-all-btn"
                onClick={onDismissAllSuggestions}
                title="Dismiss all suggestions and enter manually"
              >
                <span>Ignore All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Fields List */}
      <div className="dynamic-fields-stack">
        {fields.map((field) => {
          const currentValue = fieldValues[field.id] ?? ''
          const suggestionObj = suggestedValues[field.id]
          const suggestionValue = typeof suggestionObj === 'object' ? suggestionObj.value : suggestionObj
          const suggestionMeta = typeof suggestionObj === 'object' ? suggestionObj : null

          const source = fieldSources[field.id] || (currentValue ? 'user_entered' : 'empty')
          const status = fieldStatuses[field.id] || (currentValue ? 'ready' : (field.required ? 'missing' : 'ready'))
          const isFocused = activeFieldId === field.id
          const isMissingHighlight = highlightMissing && status === 'missing'
          const isFromProfile = source === 'saved_profile'
          const resolvedOptions = resolveFieldOptions(field)

          return (
            <div
              key={field.id}
              className={`field-row-card ${isFocused ? 'field-card-focused' : ''} ${isMissingHighlight ? 'field-card-missing-alert' : ''} ${isFromProfile ? 'field-card-profile-matched' : ''}`}
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

                  {/* Remove applied value action */}
                  {isFromProfile && onRemoveAppliedValue && (
                    <button
                      type="button"
                      className="remove-applied-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveAppliedValue(field.id)
                      }}
                      title="Clear applied profile value"
                    >
                      <RotateCcw className="btn-icon-xxs" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Input Control by Type */}
              <div className="field-control-wrapper">
                {resolvedOptions && resolvedOptions.type === 'grouped' ? (
                  /* GROUPED DEGREE & COURSE SELECT */
                  <select
                    id={`input-${field.id}`}
                    className="dynamic-select-input"
                    value={currentValue}
                    onFocus={() => onFieldFocus(field.id)}
                    onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                  >
                    <option value="">-- Select Degree or Course / पाठ्यक्रम चुनें --</option>
                    {currentValue && !Object.values(resolvedOptions.groups).flat().includes(currentValue) && (
                      <option value={currentValue}>{currentValue} (Current / Custom)</option>
                    )}
                    {Object.entries(resolvedOptions.groups).map(([groupName, courses]) => (
                      <optgroup key={groupName} label={groupName}>
                        {courses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other / Custom Course</option>
                  </select>
                ) : resolvedOptions && (resolvedOptions.type === 'flat' || resolvedOptions.type === 'explicit') ? (
                  /* REAL-WORLD FLAT SELECT (States & UTs, Categories, Occupations, Genders) */
                  <select
                    id={`input-${field.id}`}
                    className="dynamic-select-input"
                    value={currentValue}
                    onFocus={() => onFieldFocus(field.id)}
                    onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                  >
                    <option value="">-- Choose {field.label ? field.label.split('/')[0].trim() : 'Option'} --</option>
                    {currentValue && !resolvedOptions.options.includes(currentValue) && (
                      <option value={currentValue}>{currentValue} (Current / Custom)</option>
                    )}
                    {resolvedOptions.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'select' ? (
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
                  /* 4. STANDARD INPUTS */
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

              {/* Form Matching Suggestion Card with 3 Buttons: Use This Value, Edit, Ignore */}
              {suggestionValue && (
                <div className="suggestion-confirmation-bar" role="region" aria-label="Suggested field value">
                  <div className="suggestion-left">
                    <div className="suggestion-text">
                      <Sparkles className="suggestion-sparkle-icon" aria-hidden="true" />
                      <span className="suggestion-value-text">
                        Suggested value: <strong>"{suggestionValue}"</strong>
                      </span>
                    </div>

                    <div className="suggestion-meta-row">
                      <span className="suggestion-source-tag">
                        Source: {suggestionMeta?.sourceCategory || 'My Information'}
                        {suggestionMeta?.sourceLabel ? ` (${suggestionMeta.sourceLabel})` : ''}
                      </span>
                      {suggestionMeta?.confidence && (
                        <span className={`confidence-pill confidence-${suggestionMeta.confidence}`}>
                          {suggestionMeta.confidence === 'high' ? 'High Confidence' : 'Review Match'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="suggestion-action-buttons">
                    {/* Button 1: Use This Value */}
                    <button
                      type="button"
                      className="suggestion-confirm-btn"
                      title="Use this suggested value"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmSuggestion(field.id, suggestionValue)
                      }}
                    >
                      <Check className="action-icon-xs" />
                      <span>Use This Value</span>
                    </button>

                    {/* Button 2: Edit */}
                    <button
                      type="button"
                      className="suggestion-edit-btn"
                      title="Edit this suggested value"
                      onClick={(e) => {
                        e.stopPropagation()
                        onFieldValueChange(field.id, suggestionValue)
                        onFieldFocus(field.id)
                      }}
                    >
                      <Edit2 className="action-icon-xs" />
                      <span>Edit</span>
                    </button>

                    {/* Button 3: Ignore */}
                    <button
                      type="button"
                      className="suggestion-reject-btn"
                      title="Ignore this suggestion"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRejectSuggestion(field.id)
                      }}
                    >
                      <X className="action-icon-xs" />
                      <span>Ignore</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Field Description */}
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
