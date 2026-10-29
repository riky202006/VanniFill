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
import apiClient from '../../services/apiClient'
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
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
  })

  // Synchronize interim/final speech recognition transcript into the text input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    }
  }, [transcript])

  // Auto-scroll chat history to the latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      if (inputText.trim()) {
        handleSendMessage(inputText)
      }
    } else {
      resetTranscript()
      setInputText('')
      startListening(lang)
    }
  }

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputText).trim()
    if (!textToSend) return

    if (isListening) stopListening()

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    resetTranscript()

    // 1. Process deterministic local actions first (explanations, navigation, missing fields)
    const localResult = processAssistantQuery({
      query: textToSend,
      fields,
      values: fieldValues,
      language: lang,
    })

    if (localResult.focusFieldId) {
      onNavigateToField(localResult.focusFieldId)
    }

    if (localResult.highlightMissing) {
      onHighlightMissingFields(true)
    }

    // If local query found an explanation, field navigation, or explicit manual update proposal
    const isGenericFallback = localResult.reply.includes('I am your assistant for this')
    if (!isGenericFallback || localResult.proposedChange) {
      const assistantMsg = {
        sender: 'assistant',
        text: localResult.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChange: localResult.proposedChange,
      }
      setMessages((prev) => [...prev, assistantMsg])
      return
    }

    // 2. Otherwise, route speech transcript to Backend AI Engine (Groq + Gemini 2.5 Flash)
    try {
      const apiRes = await apiClient.post('/extract', {
        transcript: textToSend,
        fields,
        current_values: fieldValues,
        language: lang.startsWith('hi') ? 'hi' : 'en',
      })

      const extractedEntries = Object.entries(apiRes.values || {}).filter(
        ([k, v]) => v !== null && v !== undefined && String(v).trim() !== '' && v !== fieldValues[k]
      )

      if (extractedEntries.length > 0) {
        // Apply extracted fields directly to the form
        extractedEntries.forEach(([fieldId, val]) => {
          onApplyProposedChange(fieldId, val)
        })

        const summary = extractedEntries
          .map(([k, v]) => {
            const fObj = fields.find((f) => f.id === k)
            const labelText = fObj?.label ? String(fObj.label).split('/')[0].trim() : k
            return `${labelText}: "${v}"`
          })
          .join(', ')

        const assistantMsg = {
          sender: 'assistant',
          text: `Updated: ${summary}. ${apiRes.follow_up_question || ''}`.trim(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposedChange: null,
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        const assistantMsg = {
          sender: 'assistant',
          text: apiRes.reply || localResult.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposedChange: null,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      // Fallback to local response if backend API is not reachable
      const assistantMsg = {
        sender: 'assistant',
        text: localResult.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChange: null,
      }
      setMessages((prev) => [...prev, assistantMsg])
    }
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
            title="English"
          >
            English
          </button>
          <button
            type="button"
            className={`lang-option ${lang === 'hi-IN' ? 'lang-active' : ''}`}
            onClick={() => setLang('hi-IN')}
            title="Hindi"
          >
            हिंदी
          </button>
        </div>

        {isListening && (
          <span className="audio-listening-badge" role="status">
            <span className="pulse-dot" /> Listening...
          </span>
        )}
      </div>

      {/* Chat Messages Log */}
      <div className="chat-messages-scroll" ref={chatScrollRef} role="log" aria-live="polite">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-content">
              <p className="message-text">{msg.text}</p>

              {/* Proposed Change Confirmation Box */}
              {msg.proposedChange && (
                <div className="proposed-change-box" role="region" aria-label="Confirm field update">
                  <span className="proposed-label">Confirm Form Update:</span>
                  <p className="proposed-summary">
                    Update <strong>{msg.proposedChange.fieldLabel}</strong> to:
                    <br />
                    <em>"{msg.proposedChange.newValue}"</em>
                  </p>
                  <button
                    type="button"
                    className="apply-proposed-btn"
                    onClick={() => {
                      onApplyProposedChange(msg.proposedChange.fieldId, msg.proposedChange.newValue)
                      setMessages((prev) => [
                        ...prev,
                        {
                          sender: 'assistant',
                          text: `Applied "${msg.proposedChange.newValue}" to ${msg.proposedChange.fieldLabel}!`,
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          proposedChange: null,
                        },
                      ])
                    }}
                  >
                    <Check className="btn-icon-xs" /> Apply to Form
                  </button>
                </div>
              )}
            </div>
            <span className="message-timestamp">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Mic / Keyboard Input Control Bar */}
      <div className="assistant-input-bar">
        {isSpeechSupported && (
          <button
            type="button"
            className={`assistant-mic-btn ${isListening ? 'mic-active-recording' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Start speaking'}
            aria-label={isListening ? 'Stop recording voice' : 'Start recording voice'}
          >
            {isListening ? <MicOff className="mic-icon" /> : <Mic className="mic-icon" />}
          </button>
        )}

        <input
          type="text"
          className="assistant-text-input"
          placeholder={isListening ? 'Listening to your speech...' : 'Ask a question or dictate details...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage()
            }
          }}
        />

        <button
          type="button"
          className="assistant-send-btn"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() && !isListening}
          title="Send message"
          aria-label="Send query to assistant"
        >
          <Send className="send-icon" />
        </button>
      </div>

      {speechError && (
        <div className="speech-error-notice" role="alert">
          <AlertCircle className="error-icon-xs" />
          <span>Microphone notice: {speechError}. You can type your request.</span>
        </div>
      )}
    </div>
  )
}
