import React, { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Volume2,
} from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { processAssistantQuery } from '../../services/formAssistantService'
import './VoiceAssistant.css'

export default function VoiceAssistant({
  fields = [],
  fieldValues = {},
  onApplyProposedChange,
  onNavigateToField,
  onHighlightMissingFields,
}) {
  const [lang, setLang] = useState('en-US')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'I am your form completion assistant. You can ask what any field means, ask which fields are missing, or dictate values.',
      time: 'Ready',
      proposedChange: null,
    },
  ])
  const chatScrollRef = useRef(null)

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Sync incoming speech transcript into editable text input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    }
  }, [transcript])

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening(lang)
    }
  }

  const handleSendMessage = (customText = null) => {
    const textToSend = (customText || inputText).trim()
    if (!textToSend) return

    if (isListening) stopListening()

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Process contextually against currently detected fields!
    const result = processAssistantQuery({
      query: textToSend,
      fields,
      values: fieldValues,
      language: lang,
    })

    if (result.focusFieldId) {
      onNavigateToField(result.focusFieldId)
    }

    if (result.highlightMissing) {
      onHighlightMissingFields(true)
    }

    const assistantMsg = {
      sender: 'assistant',
      text: result.reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      proposedChange: result.proposedChange,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputText('')
    resetTranscript()
  }

  return (
    <div className="voice-assistant-card" aria-labelledby="assistant-title">
      <div className="assistant-card-header">
        <div className="title-group">
          <span className="assistant-status-dot" aria-hidden="true" />
          <h3 id="assistant-title" className="assistant-title">Talk to VaaniFill</h3>
        </div>
        <p className="assistant-subtitle">Speak or type questions about this form.</p>
      </div>

      {/* Language Switcher & Audio Status */}
      <div className="assistant-toolbar">
        <div className="lang-pill-selector">
          <button
            type="button"
            className={`lang-option ${lang === 'en-US' ? 'lang-active' : ''}`}
            onClick={() => setLang('en-US')}
          >
            English
          </button>
          <button
            type="button"
            className={`lang-option ${lang === 'hi-IN' ? 'lang-active' : ''}`}
            onClick={() => setLang('hi-IN')}
          >
            हिन्दी
          </button>
        </div>

        <div className="listening-state-badge">
          {isListening ? (
            <span className="mic-pulsing-badge">Listening...</span>
          ) : (
            <span className="mic-idle-badge">Ready</span>
          )}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="assistant-dialogue-stream">
        {messages.map((m, idx) => (
          <div key={idx} className={`dialogue-bubble ${m.sender === 'user' ? 'bubble-from-user' : 'bubble-from-ai'}`}>
            <p className="dialogue-text">{m.text}</p>

            {/* Proposed Change Confirmation Box */}
            {m.proposedChange && (
              <div className="proposed-change-card">
                <span className="proposal-title">Confirm Form Update:</span>
                <p className="proposal-detail">
                  Update <strong>{m.proposedChange.fieldLabel}</strong> to:
                  <br />
                  <span className="proposed-new-val">"{m.proposedChange.newValue}"</span>
                </p>
                <div className="proposal-actions">
                  <button
                    type="button"
                    className="confirm-proposal-btn"
                    onClick={() => onApplyProposedChange(m.proposedChange.fieldId, m.proposedChange.newValue)}
                  >
                    <Check className="action-icon-xs" />
                    <span>Apply to Form</span>
                  </button>
                </div>
              </div>
            )}

            <span className="dialogue-timestamp">{m.time}</span>
          </div>
        ))}
        <div ref={chatScrollRef} />
      </div>

      {/* Speech Error Banner */}
      {speechError && (
        <div className="speech-error-alert" role="alert">
          <AlertCircle className="error-icon-xs" />
          <span>{speechError}</span>
        </div>
      )}

      {!isSpeechSupported && (
        <div className="unsupported-speech-note">
          <span>Voice recognition is not available in this browser. You can type below instead.</span>
        </div>
      )}

      {/* Quick Example Query Chips */}
      <div className="contextual-chips-row">
        <button
          type="button"
          className="context-chip"
          onClick={() => handleSendMessage('Which fields are still missing?')}
        >
          "Which fields are missing?"
        </button>
        {fields[0] && (
          <button
            type="button"
            className="context-chip"
            onClick={() => handleSendMessage(`What does ${fields[0].label.split('/')[0]} mean?`)}
          >
            "What does {fields[0].label.split('/')[0]} mean?"
          </button>
        )}
      </div>

      {/* Input Composer Bar */}
      <div className="assistant-composer-bar">
        <button
          type="button"
          className={`mic-action-btn ${isListening ? 'mic-active' : ''}`}
          onClick={handleToggleVoice}
          title={isListening ? 'Stop listening' : 'Start microphone voice input'}
          aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
          disabled={!isSpeechSupported}
        >
          {isListening ? <MicOff className="mic-svg" /> : <Mic className="mic-svg" />}
        </button>

        <input
          type="text"
          className="composer-input-field"
          placeholder="Ask a question or dictate a field..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />

        <button
          type="button"
          className="send-action-btn"
          onClick={() => handleSendMessage()}
          title="Send instruction"
          aria-label="Send message"
        >
          <Send className="send-svg" />
        </button>
      </div>
    </div>
  )
}
