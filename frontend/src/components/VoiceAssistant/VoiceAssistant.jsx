import React, { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Send,
  AlertCircle,
  Check,
  Sparkles,
  Zap,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { processAssistantQuery } from '../../services/formAssistantService'
import textToSpeechService from '../../services/textToSpeechService'
import {
  analyzeForm,
  createConversationPlan,
  validateLocally,
  detectSkipIntent,
  detectCorrectionIntent,
  resolveSelectOption,
  extractEntitiesLocally,
  normalizeSpokenDigits,
  SequenceGuard,
} from '../../services/voiceEngine'
import apiClient from '../../services/apiClient'
import './VoiceAssistant.css'

export default function VoiceAssistant({
  fields = [],
  fieldValues = {},
  onApplyProposedChange,
  onNavigateToField,
  onHighlightMissingFields,
  onHighlightRecentlyFilled,
  onProceedToReview,
}) {
  const [lang, setLang] = useState('en-US')
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Jarvis Autonomous Mode State
  const [isJarvisActive, setIsJarvisActive] = useState(false)
  const [jarvisPaused, setJarvisPaused] = useState(false)
  const [jarvisVoiceEnabled, setJarvisVoiceEnabled] = useState(true)
  const [skippedFields, setSkippedFields] = useState(new Set())
  const [currentTargetFields, setCurrentTargetFields] = useState([])
  const [_isFormComplete, setIsFormComplete] = useState(false)

  const sequenceGuardRef = useRef(new SequenceGuard())
  const chatScrollRef = useRef(null)

  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      type: 'message',
      text: 'Hello! I am your intelligent form-filling assistant. Start Jarvis mode to let me guide you step-by-step, or dictate any details freely.',
      time: 'Ready',
      proposedChanges: [],
    },
  ])

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

  // Auto-scroll chat history to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, isProcessing])

  // Stop TTS when component unmounts
  useEffect(() => {
    return () => {
      textToSpeechService.stop()
      stopListening()
    }
  }, [stopListening])

  // Compute live progress stats
  const totalFields = fields.length
  const filledFieldsCount = fields.filter((f) => {
    const val = fieldValues[f.id]
    return val !== undefined && val !== null && String(val).trim() !== ''
  }).length
  const progressPercent = totalFields > 0 ? Math.round((filledFieldsCount / totalFields) * 100) : 0

  // --------------------------------------------------------------------------
  // JARVIS AUTONOMOUS CONTROLLER
  // --------------------------------------------------------------------------
  const startJarvisWorkflow = () => {
    setIsJarvisActive(true)
    setJarvisPaused(false)
    setIsFormComplete(false)
    const newSkipped = new Set()
    setSkippedFields(newSkipped)

    const isHindi = lang.startsWith('hi')
    const analysis = analyzeForm(fields, fieldValues)
    const plan = createConversationPlan(analysis, fieldValues, newSkipped, lang)
    setCurrentTargetFields(plan.targetFields || [])

    const total = analysis.totalFields
    const existing = analysis.existingFilledCount
    const greeting = isHindi
      ? `नमस्ते! मैं आपका जार्विस सहायक हूँ। मुझे इस फ़ॉर्म में ${total} फ़ील्ड मिले हैं (${existing} पहले से भरे हैं)। आइए बाकी फ़ील्ड मिलकर भरते हैं।`
      : `Hello! I am your Jarvis assistant. I detected ${total} fields on this form (${existing} already completed). Let's get the remaining fields filled out together.`

    const initMsgs = [
      {
        sender: 'assistant',
        type: 'message',
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]

    if (plan.isComplete) {
      setIsFormComplete(true)
      initMsgs.push({
        sender: 'assistant',
        type: 'completion-card',
        text: plan.summaryText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
      setMessages((prev) => [...prev, ...initMsgs])
      if (jarvisVoiceEnabled) {
        textToSpeechService.speakText(`${greeting} ${plan.summaryText}`, lang)
      }
      return
    }

    if (plan.question) {
      initMsgs.push({
        sender: 'assistant',
        type: 'message',
        text: plan.question,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    }

    setMessages((prev) => [...prev, ...initMsgs])

    if (jarvisVoiceEnabled) {
      const fullSpeech = `${greeting} ${plan.question || ''}`
      textToSpeechService.speakText(fullSpeech, lang, null, () => {
        // Automatically start listening after Jarvis finishes speaking
        try {
          resetTranscript()
          startListening(lang)
        } catch {
          // ignore
        }
      })
    } else {
      setTimeout(() => {
        try {
          resetTranscript()
          startListening(lang)
        } catch {
          // ignore
        }
      }, 400)
    }
  }

  const stopJarvisWorkflow = () => {
    setIsJarvisActive(false)
    setJarvisPaused(false)
    setCurrentTargetFields([])
    stopListening()
    textToSpeechService.stop()
  }

  const toggleJarvisPause = () => {
    if (jarvisPaused) {
      setJarvisPaused(false)
      // Resume current question
      const analysis = analyzeForm(fields, fieldValues)
      const plan = createConversationPlan(analysis, fieldValues, skippedFields, lang)
      if (plan.question) {
        if (jarvisVoiceEnabled) {
          textToSpeechService.speakText(plan.question, lang, null, () => {
            resetTranscript()
            startListening(lang)
          })
        } else {
          resetTranscript()
          startListening(lang)
        }
      }
    } else {
      setJarvisPaused(true)
      stopListening()
      textToSpeechService.stop()
    }
  }

  // --------------------------------------------------------------------------
  // USER UTTERANCE PROCESSING PIPELINE
  // --------------------------------------------------------------------------
  const handleUserUtterance = async (rawText) => {
    if (!rawText || !rawText.trim()) return
    const text = rawText.trim()
    const requestId = sequenceGuardRef.current.next()

    if (isListening) stopListening()

    const userMsg = {
      sender: 'user',
      type: 'message',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    resetTranscript()
    setIsProcessing(true)

    const isHindi = lang.startsWith('hi')

    // 1. Check for Skip Intent ("leave blank", "skip optional", "chhod do")
    const skipIntent = detectSkipIntent(text)
    if (skipIntent) {
      setIsProcessing(false)
      const nextSkipped = new Set(skippedFields)

      if (skipIntent.type === 'SKIP_OPTIONAL') {
        nextSkipped.add('__ALL_OPTIONAL__')
        setSkippedFields(nextSkipped)
        const skipMsg = isHindi ? 'वैकल्पिक फ़ील्ड छोड़ दिए गए हैं।' : 'Skipping optional fields.'
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            type: 'message',
            text: skipMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        if (jarvisVoiceEnabled) textToSpeechService.speakText(skipMsg, lang)
      } else {
        currentTargetFields.forEach((id) => nextSkipped.add(id))
        setSkippedFields(nextSkipped)
        const skipMsg = isHindi
          ? 'ठीक है, मैंने इसे खाली छोड़ दिया है।'
          : 'Understood, leaving that field blank.'
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            type: 'message',
            text: skipMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        if (jarvisVoiceEnabled) textToSpeechService.speakText(skipMsg, lang)
      }

      if (isJarvisActive && !jarvisPaused) {
        evaluateNextJarvisStep(nextSkipped, fieldValues)
      }
      return
    }

    // 2. Check for Explicit Correction Intent ("Actually change my city to Jaipur")
    const correction = detectCorrectionIntent(text, fields)
    if (correction) {
      setIsProcessing(false)
      onApplyProposedChange(correction.fieldId, correction.value)
      if (onHighlightRecentlyFilled) {
        onHighlightRecentlyFilled([correction.fieldId])
      }

      const toastMsg = {
        sender: 'assistant',
        type: 'fill-toast',
        text: `${correction.label || correction.fieldId} → "${correction.value}"`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      const replyText = isHindi
        ? `आपका ${correction.label || correction.fieldId} बदलकर "${correction.value}" कर दिया गया है।`
        : `Updated ${correction.label || correction.fieldId} to "${correction.value}".`

      setMessages((prev) => [
        ...prev,
        toastMsg,
        {
          sender: 'assistant',
          type: 'message',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])

      if (jarvisVoiceEnabled) textToSpeechService.speakText(replyText, lang)

      if (isJarvisActive && !jarvisPaused) {
        const updatedValues = { ...fieldValues, [correction.fieldId]: correction.value }
        evaluateNextJarvisStep(skippedFields, updatedValues)
      }
      return
    }

    // 3. Check for Select Option Reference ("second option", "female", "first one")
    if (currentTargetFields.length === 1) {
      const targetModel = fields.find((f) => f.id === currentTargetFields[0])
      if (targetModel && (targetModel.type === 'select' || Array.isArray(targetModel.options))) {
        const matchedOption = resolveSelectOption(text, targetModel)
        if (matchedOption) {
          setIsProcessing(false)
          onApplyProposedChange(targetModel.id, matchedOption)
          if (onHighlightRecentlyFilled) {
            onHighlightRecentlyFilled([targetModel.id])
          }

          const label = String(targetModel.label || targetModel.id).split('/')[0].trim()
          const toastMsg = {
            sender: 'assistant',
            type: 'fill-toast',
            text: `${label} → "${matchedOption}"`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          const replyText = isHindi
            ? `${label} चुना गया: "${matchedOption}"`
            : `Selected ${matchedOption} for ${label}.`

          setMessages((prev) => [
            ...prev,
            toastMsg,
            {
              sender: 'assistant',
              type: 'message',
              text: replyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])

          if (jarvisVoiceEnabled) textToSpeechService.speakText(replyText, lang)

          if (isJarvisActive && !jarvisPaused) {
            const updatedValues = { ...fieldValues, [targetModel.id]: matchedOption }
            evaluateNextJarvisStep(skippedFields, updatedValues)
          }
          return
        }
      }
    }

    // 4. Extraction: Local entity extraction
    let candidateValues = extractEntitiesLocally(text, fields)

    // Fallback: If user gave single value for a target without naming the field
    if (Object.keys(candidateValues).length === 0 && currentTargetFields.length === 1) {
      const targetModel = fields.find((f) => f.id === currentTargetFields[0])
      if (targetModel && !text.includes('?') && !/what|who|which|how|kya|kyun|meaning/i.test(text)) {
        candidateValues = { [targetModel.id]: normalizeSpokenDigits(text) }
      }
    }

    // If still empty or query looks like a question, invoke processAssistantQuery & backend API
    const isQuestion =
      text.includes('?') || /what|which|why|how|kya|kaunsa|meaning|kya\s+hai|batao/i.test(text)

    if (Object.keys(candidateValues).length === 0 || isQuestion) {
      const localResult = processAssistantQuery({
        query: text,
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

      // If user is NOT in autonomous Jarvis mode, show proposed review card for Mode A
      if (localResult.proposedChanges && localResult.proposedChanges.length > 0 && !isJarvisActive) {
        setIsProcessing(false)
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            type: 'message',
            text: localResult.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            proposedChanges: localResult.proposedChanges,
          },
        ])
        return
      }

      const isGeneric =
        localResult.reply.includes('I am your assistant for this') ||
        localResult.reply.includes('मैं आपके इस')

      if (!isGeneric && !isJarvisActive) {
        setIsProcessing(false)
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            type: 'message',
            text: localResult.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        if (jarvisVoiceEnabled) textToSpeechService.speakText(localResult.reply, lang)
        return
      }

      // Backend API extraction / contextual Q&A
      try {
        const apiRes = await apiClient.post('/extract', {
          transcript: text,
          fields,
          current_values: fieldValues,
          language: lang.startsWith('hi') ? 'hi' : 'en',
        })

        const extractedEntries = Object.entries(apiRes.values || {}).filter(
          ([k, v]) =>
            v !== null && v !== undefined && String(v).trim() !== '' && v !== fieldValues[k]
        )

        if (extractedEntries.length > 0) {
          extractedEntries.forEach(([k, v]) => {
            candidateValues[k] = String(v).trim()
          })
        } else {
          // Contextual question answer
          setIsProcessing(false)
          const reply = apiRes.reply || localResult.reply
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              type: 'message',
              text: reply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
          if (jarvisVoiceEnabled) textToSpeechService.speakText(reply, lang)

          if (isJarvisActive && !jarvisPaused) {
            setTimeout(() => {
              if (currentTargetFields.length > 0) {
                const targetF = fields.find((f) => f.id === currentTargetFields[0])
                const promptBack = isHindi
                  ? `क्या आप ${targetF?.label ? targetF.label.split('/')[0].trim() : 'यह फ़ील्ड'} भरना चाहते हैं?`
                  : `Shall we continue with ${targetF?.label ? targetF.label.split('/')[0].trim() : 'this field'}?`
                setMessages((prev) => [
                  ...prev,
                  {
                    sender: 'assistant',
                    type: 'message',
                    text: promptBack,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
                if (jarvisVoiceEnabled) {
                  textToSpeechService.speakText(promptBack, lang, null, () => {
                    startListening(lang)
                  })
                }
              }
            }, 1200)
          }
          return
        }
      } catch {
        // Continue with local candidate values if backend is unreachable
      }
    }

    if (!sequenceGuardRef.current.isCurrent(requestId)) {
      setIsProcessing(false)
      return
    }

    setIsProcessing(false)

    // Check candidate entries
    const candidateEntries = Object.entries(candidateValues).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== ''
    )

    if (candidateEntries.length === 0) {
      const clarifyText = isHindi
        ? 'माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बताएं या नीचे टाइप करें:'
        : "I didn't quite catch that. Could you repeat, or type the value below:"
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          type: 'message',
          text: clarifyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      if (jarvisVoiceEnabled) {
        textToSpeechService.speakText(clarifyText, lang, null, () => {
          if (isJarvisActive && !jarvisPaused) startListening(lang)
        })
      }
      return
    }

    // 5. Deterministic Validation
    const tempValues = { ...fieldValues, ...candidateValues }
    const validation = validateLocally(fields, tempValues, skippedFields)

    const errorKeys = Object.keys(validation.errors).filter((k) => candidateValues[k] !== undefined)
    if (errorKeys.length > 0) {
      const errFieldId = errorKeys[0]
      const errDesc = validation.errors[errFieldId]
      setCurrentTargetFields([errFieldId])
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          type: 'message',
          text: errDesc,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      if (jarvisVoiceEnabled) {
        textToSpeechService.speakText(errDesc, lang, null, () => {
          if (isJarvisActive && !jarvisPaused) startListening(lang)
        })
      }
      return
    }

    // 6. PROGRESSIVE LIVE AUTOFILL: Apply Confirmed Valid Values!
    const validFieldIds = []
    const filledSummaries = []

    for (const [k, v] of candidateEntries) {
      onApplyProposedChange(k, v)
      validFieldIds.push(k)
      const fObj = fields.find((f) => f.id === k)
      const fLabel = fObj?.label ? String(fObj.label).split('/')[0].trim() : k
      filledSummaries.push(`${fLabel} → "${v}"`)
    }

    // Visual pulse in editor
    if (onHighlightRecentlyFilled && validFieldIds.length > 0) {
      onHighlightRecentlyFilled(validFieldIds)
    }

    // Live Autofill Toast in Chat
    const toastMsg = {
      sender: 'assistant',
      type: 'fill-toast',
      text: filledSummaries.join(', '),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const ackText = isHindi
      ? `बहुत बढ़िया! मैंने ${validFieldIds.length} फ़ील्ड भर दिए हैं।`
      : `Got it! Filled ${validFieldIds.length} field(s) directly on your form.`

    setMessages((prev) => [
      ...prev,
      toastMsg,
      {
        sender: 'assistant',
        type: 'message',
        text: ackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])

    // 7. Advance Jarvis Conversation Step
    if (isJarvisActive && !jarvisPaused) {
      const updatedValues = { ...fieldValues, ...candidateValues }
      evaluateNextJarvisStep(skippedFields, updatedValues, ackText)
    } else {
      if (jarvisVoiceEnabled) textToSpeechService.speakText(ackText, lang)
    }
  }

  // Evaluates next missing fields and bundles the next question
  const evaluateNextJarvisStep = (skipped, currentVals, priorAckText = '') => {
    const analysis = analyzeForm(fields, currentVals)
    const plan = createConversationPlan(analysis, currentVals, skipped, lang)
    setCurrentTargetFields(plan.targetFields || [])

    if (plan.isComplete) {
      setIsFormComplete(true)
      const completionMsg = {
        sender: 'assistant',
        type: 'completion-card',
        text: plan.summaryText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, completionMsg])
      const speech = priorAckText ? `${priorAckText} ${plan.summaryText}` : plan.summaryText
      if (jarvisVoiceEnabled) {
        textToSpeechService.speakText(speech, lang)
      }
      stopListening()
      return
    }

    if (plan.question) {
      const nextQMsg = {
        sender: 'assistant',
        type: 'message',
        text: plan.question,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, nextQMsg])
      const speech = priorAckText ? `${priorAckText} ${plan.question}` : plan.question
      if (jarvisVoiceEnabled) {
        textToSpeechService.speakText(speech, lang, null, () => {
          if (isJarvisActive && !jarvisPaused) {
            resetTranscript()
            startListening(lang)
          }
        })
      } else {
        setTimeout(() => {
          if (isJarvisActive && !jarvisPaused) {
            resetTranscript()
            startListening(lang)
          }
        }, 300)
      }
    }
  }

  // Mode A Manual Review Actions
  const handleApplySingleChange = (fieldId, newValue, fieldLabel) => {
    onApplyProposedChange(fieldId, newValue)
    if (onHighlightRecentlyFilled) {
      onHighlightRecentlyFilled([fieldId])
    }
    setMessages((prev) => [
      ...prev,
      {
        sender: 'assistant',
        type: 'message',
        text: `✓ Applied "${newValue}" to ${fieldLabel}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      },
    ])
  }

  const handleApplyAllChanges = (changesList) => {
    if (!changesList || changesList.length === 0) return
    const ids = []
    changesList.forEach((c) => {
      onApplyProposedChange(c.fieldId, c.newValue)
      ids.push(c.fieldId)
    })
    if (onHighlightRecentlyFilled && ids.length > 0) {
      onHighlightRecentlyFilled(ids)
    }
    const summary = changesList.map((c) => `${c.fieldLabel}: "${c.newValue}"`).join(', ')
    setMessages((prev) => [
      ...prev,
      {
        sender: 'assistant',
        type: 'message',
        text: `✓ Successfully applied ${changesList.length} field update(s): ${summary}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedChanges: [],
      },
    ])
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      if (inputText.trim()) {
        handleUserUtterance(inputText)
      }
    } else {
      resetTranscript()
      setInputText('')
      startListening(lang)
    }
  }

  return (
    <div className="voice-assistant-card" aria-labelledby="assistant-title">
      {/* --------------------------------------------------------------------
          JARVIS SMART ASSISTANT BANNER / ACTIVE CONTROLLER
          -------------------------------------------------------------------- */}
      {!isJarvisActive ? (
        <div className="jarvis-launch-banner">
          <div className="banner-left">
            <div className="jarvis-badge">
              <Zap className="jarvis-badge-icon" />
              <span>Jarvis AI</span>
            </div>
            <h3 id="assistant-title" className="jarvis-banner-title">
              Autonomous Smart Form Assistant
            </h3>
            <p className="jarvis-banner-desc">
              Walks you through missing fields step-by-step with natural speech, and auto-fills the
              form live as you answer.
            </p>
          </div>
          <button
            type="button"
            className="jarvis-start-btn"
            onClick={startJarvisWorkflow}
            title="Start autonomous Jarvis guide"
          >
            <Zap className="btn-icon-sm" />
            <span>Start Jarvis Assistant / शुरू करें</span>
          </button>
        </div>
      ) : (
        <div className="jarvis-active-controller">
          <div className="controller-top-row">
            <div className="active-identity">
              <div
                className={`jarvis-core-orb ${isListening ? 'orb-listening' : isProcessing ? 'orb-thinking' : 'orb-active'}`}
                title={isListening ? 'Jarvis is listening' : 'Jarvis is active'}
              />
              <div className="identity-text">
                <span className="jarvis-name">Jarvis Assistant Active</span>
                <span className="jarvis-status-sub">
                  {jarvisPaused
                    ? 'Paused'
                    : isListening
                      ? 'Listening... speak naturally'
                      : isProcessing
                        ? 'Thinking...'
                        : 'Conversational loop ready'}
                </span>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="jarvis-actions-toolbar">
              <button
                type="button"
                className={`jarvis-tool-btn ${jarvisVoiceEnabled ? 'tool-btn-active' : ''}`}
                onClick={() => setJarvisVoiceEnabled(!jarvisVoiceEnabled)}
                title={jarvisVoiceEnabled ? 'Mute Jarvis voice' : 'Enable Jarvis voice narration'}
              >
                {jarvisVoiceEnabled ? (
                  <Volume2 className="tool-icon-xs" />
                ) : (
                  <VolumeX className="tool-icon-xs" />
                )}
                <span className="tool-btn-label">Voice {jarvisVoiceEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                className="jarvis-tool-btn"
                onClick={toggleJarvisPause}
                title={jarvisPaused ? 'Resume Jarvis assistant' : 'Pause Jarvis assistant'}
              >
                {jarvisPaused ? (
                  <Play className="tool-icon-xs" />
                ) : (
                  <Pause className="tool-icon-xs" />
                )}
                <span className="tool-btn-label">{jarvisPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                className="jarvis-tool-btn jarvis-stop-btn"
                onClick={stopJarvisWorkflow}
                title="Stop Jarvis mode"
              >
                <Square className="tool-icon-xs" />
                <span className="tool-btn-label">Stop</span>
              </button>
            </div>
          </div>

          {/* Compact Completion Progress Bar */}
          <div className="jarvis-progress-box">
            <div className="progress-label-row">
              <span className="progress-field-count">
                <strong>{filledFieldsCount}</strong> of <strong>{totalFields}</strong> fields
                completed
              </span>
              <span className="progress-percentage-pill">{progressPercent}%</span>
            </div>
            <div className="jarvis-progress-track">
              <div
                className="jarvis-progress-fill"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Language Switcher & Mic Indicator */}
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
            <span className="pulse-dot" /> Listening... speak naturally
          </span>
        )}
      </div>

      {/* Chat Messages Stream */}
      <div className="chat-messages-scroll" ref={chatScrollRef} role="log" aria-live="polite">
        {messages.map((msg, idx) => {
          if (msg.type === 'fill-toast') {
            return (
              <div key={idx} className="autofill-toast-bubble">
                <span className="toast-icon">✍️</span>
                <span className="toast-text">
                  <strong>Live Autofill:</strong> {msg.text}
                </span>
              </div>
            )
          }

          if (msg.type === 'completion-card') {
            return (
              <div key={idx} className="jarvis-completion-banner">
                <div className="completion-header">
                  <CheckCircle2 className="completion-check-icon" />
                  <h4>All Required Fields Completed!</h4>
                </div>
                <p className="completion-body">{msg.text}</p>
                {onProceedToReview && (
                  <button
                    type="button"
                    className="completion-proceed-btn"
                    onClick={onProceedToReview}
                  >
                    <span>Proceed to Review (Stage 3)</span>
                    <ArrowRight className="btn-icon-xs" />
                  </button>
                )}
              </div>
            )
          }

          return (
            <div
              key={idx}
              className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div className="message-content">
                <p className="message-text">{msg.text}</p>

                {/* Mode A: Multi-Field Proposed Changes Review Card */}
                {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                  <div
                    className="proposed-changes-review-card"
                    role="region"
                    aria-label="Review voice recognized updates"
                  >
                    <div className="review-card-header">
                      <Sparkles className="review-sparkle-icon" />
                      <span className="review-card-title">
                        Review Voice Updates ({msg.proposedChanges.length}{' '}
                        {msg.proposedChanges.length === 1 ? 'Field' : 'Fields'}):
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
                            onClick={() =>
                              handleApplySingleChange(
                                change.fieldId,
                                change.newValue,
                                change.fieldLabel
                              )
                            }
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
                          <Check className="btn-icon-xs" /> Apply All ({msg.proposedChanges.length}{' '}
                          Fields)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="message-timestamp">{msg.time}</span>
            </div>
          )
        })}

        {isProcessing && (
          <div className="message-bubble message-assistant">
            <div className="message-content">
              <p className="message-text typing-text">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span>Jarvis is thinking...</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mic / Keyboard Input Bar */}
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
          placeholder={
            isListening
              ? 'Listening... (you can edit transcript before sending)'
              : isJarvisActive
                ? 'Answer Jarvis, dictate fields, or type here...'
                : 'Dictate fields, ask questions, or click Start Jarvis...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUserUtterance(inputText)
            }
          }}
        />

        <button
          type="button"
          className="assistant-send-btn"
          onClick={() => handleUserUtterance(inputText)}
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
          <span>Microphone notice: {speechError} You can also type freely in the input bar.</span>
        </div>
      )}
    </div>
  )
}
