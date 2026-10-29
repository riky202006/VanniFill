import React, { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Send,
  AlertCircle,
  Check,
  Sparkles,
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'I am your form completion assistant. You can speak or type to dictate values (e.g. "My name is Riky, phone is 9876543210, city is Guwahati") or ask what any field means.',
      time: 'Ready',
      proposedChanges: [],
    },
  ])
  const chatScrollRef = useRef(null)

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

  // Synchronize speech recognition transcript into the text input for editing
  useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    } else if (interimTranscript) {
      setInputText(interimTranscript)
    }
  }, [transcript, interimTranscript])

  // Auto-scroll chat history to the latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, isProcessing])

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

  const handleApplySingleChange = (fieldId, newValue, fieldLabel) => {
    onApplyProposedChange(fieldId, newValue)
    setMessages((prev) => [
      ...prev,
      {
        sender: 'assistant',
        text: `✓ Applied "${newValue}" to ${fieldLabel}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      },
    ])
  }

  const handleApplyAllChanges = (changesList) => {
    if (!changesList || changesList.length === 0) return
    changesList.forEach((c) => {
      onApplyProposedChange(c.fieldId, c.newValue)
    })
    const summary = changesList.map((c) => `${c.fieldLabel}: "${c.newValue}"`).join(', ')
    setMessages((prev) => [
      ...prev,
      {
        sender: 'assistant',
        text: `✓ Successfully applied ${changesList.length} field update(s): ${summary}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      },
    ])
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
    setIsProcessing(true)

    // 1. Process deterministic local actions first (explanations, navigation, missing fields, multi-field regex)
    const localResult = processAssistantQuery({
      query: textToSend,
      fields,
      values: fieldValues,
      language: lang,
    })

    if (localResult.focusFieldId && onNavigateToField) {
      onNavigateToField(localResult.focusFieldId)
    }

    if (localResult.highlightMissing && onHighlightMissingFields) {
      onHighlightMissingFields(true)
    }

    // If local query extracted multi-field proposed changes or single-field updates
    if (localResult.proposedChanges && localResult.proposedChanges.length > 0) {
      setIsProcessing(false)
      const assistantMsg = {
        sender: 'assistant',
        text: localResult.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: localResult.proposedChanges,
      }
      setMessages((prev) => [...prev, assistantMsg])
      return
    }

    // If local query handled an explanation, navigation, or missing fields check
    const isGenericFallback = localResult.reply.includes('I am your assistant for this') || localResult.reply.includes('मैं आपके इस')
    if (!isGenericFallback) {
      setIsProcessing(false)
      const assistantMsg = {
        sender: 'assistant',
        text: localResult.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      }
      setMessages((prev) => [...prev, assistantMsg])
      return
    }

    // 2. Route to Backend AI Engine (Gemini / Groq + Form Q&A)
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
        // Mode A: Build Proposed Updates Review Card for user confirmation before filling
        const proposedChanges = extractedEntries.map(([fId, val]) => {
          const fObj = fields.find((f) => f.id === fId)
          const fieldLabel = fObj?.label ? String(fObj.label).split('/')[0].trim() : fId
          const oldValue = fieldValues[fId] ?? '(empty)'
          return {
            fieldId: fId,
            fieldLabel,
            oldValue,
            newValue: String(val).trim(),
          }
        })

        const summary = proposedChanges.map((p) => `${p.fieldLabel}: "${p.newValue}"`).join(', ')
        const assistantMsg = {
          sender: 'assistant',
          text: `I identified ${proposedChanges.length} field values: ${summary}. Please review and apply below.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposedChanges,
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        // Contextual AI answer to user question
        const assistantMsg = {
          sender: 'assistant',
          text: apiRes.reply || localResult.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposedChanges: [],
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      // Offline fallback
      const assistantMsg = {
        sender: 'assistant',
        text: localResult.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="voice-assistant-card" aria-labelledby="assistant-title">
      <div className="assistant-card-header">
        <div className="title-group">
          <span className="assistant-status-dot" aria-hidden="true" />
          <h3 id="assistant-title" className="assistant-title">Talk to VaaniFill</h3>
        </div>
        <p className="assistant-subtitle">Speak or type questions, or dictate multiple fields at once.</p>
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
            🇮🇳 English
          </button>
          <button
            type="button"
            className={`lang-option ${lang === 'hi-IN' ? 'lang-active' : ''}`}
            onClick={() => setLang('hi-IN')}
            title="Hindi"
          >
            🇮🇳 हिन्दी
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

              {/* Mode A: Multi-Field Proposed Changes Review Card */}
              {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                <div className="proposed-changes-review-card" role="region" aria-label="Review voice recognized updates">
                  <div className="review-card-header">
                    <Sparkles className="review-sparkle-icon" />
                    <span className="review-card-title">
                      Review Voice Updates ({msg.proposedChanges.length} {msg.proposedChanges.length === 1 ? 'Field' : 'Fields'}):
                    </span>
                  </div>

                  <div className="proposed-items-stack">
                    {msg.proposedChanges.map((change, cIdx) => (
                      <div key={cIdx} className="proposed-item-row">
                        <div className="item-labels">
                          <span className="field-name-badge">{change.fieldLabel}</span>
                          <span className="value-arrow">→</span>
                          <span className="value-new-badge">"{change.newValue}"</span>
                        </div>
                        <button
                          type="button"
                          className="single-apply-btn"
                          onClick={() => handleApplySingleChange(change.fieldId, change.newValue, change.fieldLabel)}
                          title={`Apply ${change.fieldLabel}`}
                        >
                          <Check className="btn-icon-xxs" /> Apply
                        </button>
                      </div>
                    ))}
                  </div>

                  {msg.proposedChanges.length > 1 && (
                    <div className="review-card-actions">
                      <button
                        type="button"
                        className="apply-all-proposed-btn"
                        onClick={() => handleApplyAllChanges(msg.proposedChanges)}
                      >
                        <Check className="btn-icon-xs" /> Apply All ({msg.proposedChanges.length} Fields)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="message-timestamp">{msg.time}</span>
          </div>
        ))}

        {isProcessing && (
          <div className="message-bubble message-assistant">
            <div className="message-content">
              <p className="message-text typing-text">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span>VaaniFill is thinking...</span>
              </p>
            </div>
          </div>
        )}
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
          placeholder={isListening ? 'Listening... (you can edit transcript before sending)' : 'Dictate fields or ask a question...'}
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
          <span>Microphone notice: {speechError} You can also type freely.</span>
        </div>
      )}
    </div>
  )
}
