import React, { useState, useEffect, useRef } from 'react'
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
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
} from 'lucide-react'
import { resolveFieldOptions } from '../../constants/indianFormOptions'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { textToSpeechService } from '../../services/textToSpeechService'
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
  recentlyFilledFieldIds = [],
}) {
  // TTS State
  const [ttsState, setTtsState] = useState('idle') // 'idle' | 'playing' | 'paused' | 'stopped'
  const [ttsLang, setTtsLang] = useState('en-US') // 'en-US' | 'hi-IN'
  const [ttsCurrentFieldId, setTtsCurrentFieldId] = useState(null)
  const [ttsCurrentIndex, setTtsCurrentIndex] = useState(0)

  // Mode B: Individual Field Voice Recognition State
  const [activeListeningFieldId, setActiveListeningFieldId] = useState(null)
  const [fieldDraftValue, setFieldDraftValue] = useState('')
  const [listeningLang, setListeningLang] = useState('en-US')

  const fieldCardsRef = useRef({})

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
  })

  // Synchronize recognized speech into field draft value
  useEffect(() => {
    if (activeListeningFieldId) {
      if (transcript) {
        setFieldDraftValue(transcript)
      } else if (interimTranscript) {
        setFieldDraftValue(interimTranscript)
      }
    }
  }, [transcript, interimTranscript, activeListeningFieldId])

  // Cleanup TTS and speech recognition on unmount
  useEffect(() => {
    return () => {
      textToSpeechService.stop()
      stopListening()
    }
  }, [stopListening])

  // Scroll to active field when read aloud or focused
  useEffect(() => {
    const targetId = ttsCurrentFieldId || activeFieldId
    if (targetId && fieldCardsRef.current[targetId]) {
      fieldCardsRef.current[targetId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [ttsCurrentFieldId, activeFieldId])

  // --------------------------------------------------------------------------
  // TTS Read Aloud Handlers
  // --------------------------------------------------------------------------
  const handleToggleReadForm = () => {
    if (ttsState === 'playing') {
      textToSpeechService.pause()
    } else if (ttsState === 'paused') {
      textToSpeechService.resume()
    } else {
      textToSpeechService.startReading({
        fields,
        fieldValues,
        language: ttsLang,
        startIndex: 0,
        onFieldStart: (fId, idx) => {
          setTtsCurrentFieldId(fId)
          setTtsCurrentIndex(idx)
        },
        onStateChange: (state, meta) => {
          setTtsState(state)
          if (meta) {
            setTtsCurrentIndex(meta.currentIndex)
            if (meta.currentField) {
              setTtsCurrentFieldId(meta.currentField.id)
            }
          }
          if (state === 'idle' || state === 'stopped') {
            setTtsCurrentFieldId(null)
          }
        },
      })
    }
  }

  const handleStopReading = () => {
    textToSpeechService.stop()
    setTtsState('idle')
    setTtsCurrentFieldId(null)
  }

  const handleNextField = () => {
    textToSpeechService.nextField()
  }

  const handlePrevField = () => {
    textToSpeechService.prevField()
  }

  const handleReadSingleField = (field) => {
    if (ttsState === 'playing') {
      textToSpeechService.stop()
    }
    setTtsCurrentFieldId(field.id)
    textToSpeechService.readSingleField({
      field,
      currentValue: fieldValues[field.id],
      language: ttsLang,
      onStart: () => setTtsCurrentFieldId(field.id),
      onEnd: () => setTtsCurrentFieldId(null),
    })
  }

  // --------------------------------------------------------------------------
  // Mode B: Individual Field Voice Input Handlers
  // --------------------------------------------------------------------------
  const handleToggleFieldMic = (field) => {
    if (activeListeningFieldId === field.id) {
      // Stop listening for this field
      stopListening()
      setActiveListeningFieldId(null)
      setFieldDraftValue('')
      resetTranscript()
    } else {
      // Switch / start listening for this field
      if (ttsState === 'playing') {
        textToSpeechService.stop()
      }
      stopListening()
      resetTranscript()
      setActiveListeningFieldId(field.id)
      setFieldDraftValue(fieldValues[field.id] || '')
      onFieldFocus(field.id)
      startListening(listeningLang)
    }
  }

  const handleConfirmFieldVoice = (fieldId) => {
    const finalVal = fieldDraftValue.trim()
    if (finalVal) {
      onFieldValueChange(fieldId, finalVal)
    }
    stopListening()
    setActiveListeningFieldId(null)
    setFieldDraftValue('')
    resetTranscript()
  }

  const handleCancelFieldVoice = () => {
    stopListening()
    setActiveListeningFieldId(null)
    setFieldDraftValue('')
    resetTranscript()
  }

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

      {/* --------------------------------------------------------------------
          READ FORM ALOUD PLAYER TOOLBAR (Accessibility / Speech Synthesis)
          -------------------------------------------------------------------- */}
      <div className="read-form-toolbar" role="region" aria-label="Read form aloud controls">
        <div className="read-toolbar-left">
          <button
            type="button"
            className={`read-aloud-toggle-btn ${ttsState === 'playing' ? 'read-aloud-active' : ''}`}
            onClick={handleToggleReadForm}
            title={ttsState === 'playing' ? 'Pause reading' : (ttsState === 'paused' ? 'Resume reading' : 'Read all form fields aloud')}
          >
            {ttsState === 'playing' ? <Pause className="btn-icon-xs" /> : <Play className="btn-icon-xs" />}
            <span>
              {ttsState === 'playing'
                ? 'Pause Reading'
                : ttsState === 'paused'
                ? 'Resume Reading'
                : 'Read Form Aloud / फॉर्म सुनें'}
            </span>
          </button>

          {ttsState !== 'idle' && (
            <div className="read-player-controls">
              <button
                type="button"
                className="player-control-btn"
                onClick={handlePrevField}
                title="Previous field"
                aria-label="Previous field"
              >
                <SkipBack className="btn-icon-xxs" />
              </button>

              <button
                type="button"
                className="player-control-btn"
                onClick={handleStopReading}
                title="Stop reading"
                aria-label="Stop reading"
              >
                <Square className="btn-icon-xxs" />
              </button>

              <button
                type="button"
                className="player-control-btn"
                onClick={handleNextField}
                title="Next field"
                aria-label="Next field"
              >
                <SkipForward className="btn-icon-xxs" />
              </button>
            </div>
          )}

          {ttsCurrentFieldId && ttsState === 'playing' && (
            <span className="reading-indicator-pill">
              <span className="audio-wave-pulse" /> Reading Field {ttsCurrentIndex + 1} of {fields.length}
            </span>
          )}
        </div>

        <div className="read-toolbar-right">
          <div className="tts-lang-selector" title="Choose speech language">
            <span className="lang-label">Voice:</span>
            <button
              type="button"
              className={`tts-lang-btn ${ttsLang === 'en-US' ? 'active' : ''}`}
              onClick={() => {
                setTtsLang('en-US')
                setListeningLang('en-US')
              }}
            >
              English
            </button>
            <button
              type="button"
              className={`tts-lang-btn ${ttsLang === 'hi-IN' ? 'active' : ''}`}
              onClick={() => {
                setTtsLang('hi-IN')
                setListeningLang('hi-IN')
              }}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Review Suggestions Banner */}
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
          const isReadingAloud = ttsCurrentFieldId === field.id
          const isFieldListening = activeListeningFieldId === field.id
          const isRecentlyFilled = recentlyFilledFieldIds.includes(field.id)
          const resolvedOptions = resolveFieldOptions(field)

          return (
            <div
              key={field.id}
              ref={(el) => (fieldCardsRef.current[field.id] = el)}
              className={`field-row-card ${isFocused ? 'field-card-focused' : ''} ${isMissingHighlight ? 'field-card-missing-alert' : ''} ${isFromProfile ? 'field-card-profile-matched' : ''} ${isReadingAloud ? 'field-card-reading-aloud' : ''} ${isRecentlyFilled ? 'field-card-progressive-filled' : ''}`}
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

                  {/* Field Accessibility Controls: Speak & Read Aloud */}
                  <div className="field-voice-tools">
                    {/* Mode B: Mic button for this specific field */}
                    {isSpeechSupported && (
                      <button
                        type="button"
                        className={`field-tool-btn field-mic-btn ${isFieldListening ? 'active-listening' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleFieldMic(field)
                        }}
                        title={isFieldListening ? `Stop listening for ${field.label}` : `Speak value for ${field.label}`}
                        aria-label={`Dictate ${field.label}`}
                      >
                        {isFieldListening ? <MicOff className="tool-icon-xs" /> : <Mic className="tool-icon-xs" />}
                      </button>
                    )}

                    {/* Single Field Read Aloud */}
                    <button
                      type="button"
                      className="field-tool-btn field-read-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReadSingleField(field)
                      }}
                      title={`Read ${field.label} aloud`}
                      aria-label={`Listen to ${field.label}`}
                    >
                      <Volume2 className="tool-icon-xs" />
                    </button>
                  </div>
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

              {/* Mode B: Inline Field Voice Dictation Box with Confirmation */}
              {isFieldListening && (
                <div className="inline-field-voice-box" role="region" aria-label={`Dictate ${field.label}`}>
                  <div className="voice-box-header">
                    <span className="live-pulse-dot" />
                    <span className="voice-box-title">
                      {isListening ? `Listening for "${field.label}"... Speak clearly` : `Review recognized answer for "${field.label}":`}
                    </span>
                  </div>

                  <div className="voice-box-input-row">
                    <input
                      type="text"
                      className="voice-draft-input"
                      value={fieldDraftValue}
                      placeholder="Recognized words will appear here (you can edit before applying)..."
                      onChange={(e) => setFieldDraftValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleConfirmFieldVoice(field.id)
                        }
                      }}
                    />

                    <div className="voice-box-buttons">
                      <button
                        type="button"
                        className="voice-confirm-btn"
                        onClick={() => handleConfirmFieldVoice(field.id)}
                        disabled={!fieldDraftValue.trim()}
                        title="Confirm and fill this value"
                      >
                        <Check className="action-icon-xs" />
                        <span>Confirm & Fill</span>
                      </button>

                      <button
                        type="button"
                        className="voice-cancel-btn"
                        onClick={handleCancelFieldVoice}
                        title="Cancel voice input"
                      >
                        <X className="action-icon-xs" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>

                  {speechError && (
                    <p className="voice-error-text">
                      <AlertCircle className="error-icon-xxs" /> {speechError}
                    </p>
                  )}
                </div>
              )}

              {/* Form Matching Suggestion Card with 3 Buttons */}
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
