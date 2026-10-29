import { useState, useEffect, useRef, useCallback } from 'react'
import { normalizeSpokenDigits } from '../services/voiceEngine.js'

/**
 * Custom React hook for Web Speech API with cross-browser support,
 * interim results streaming, digit normalization, and graceful error recovery.
 * Adapted directly from the Vaani Chrome Extension reference implementation.
 */
export function useSpeechRecognition({ continuous = false, interimResults = true } = {}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const currentLangRef = useRef('en-US')

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListeningRef.current = true
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i]
        if (item.isFinal) {
          final += item[0].transcript
        } else {
          interim += item[0].transcript
        }
      }

      if (interim) {
        setInterimTranscript(interim)
      }

      if (final) {
        const normalizedFinal = normalizeSpokenDigits(final.trim())
        setTranscript((prev) => {
          const next = prev ? `${prev} ${normalizedFinal}` : normalizedFinal
          return next
        })
        setInterimTranscript('')
      }
    }

    recognition.onerror = (event) => {
      isListeningRef.current = false
      setIsListening(false)

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser address bar.')
      } else if (event.error === 'no-speech') {
        setError('No speech was detected. Please tap the mic and speak clearly.')
      } else if (event.error === 'network') {
        setError('Network error occurred during speech recognition. Check your connection.')
      } else if (event.error === 'aborted') {
        // Normal user cancellation - don't show noisy error
        setError(null)
      } else {
        setError(`Speech recognition notice: ${event.error}`)
      }
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore cleanup abort errors
        }
      }
    }
  }, [continuous, interimResults])

  const startListening = useCallback((lang = 'en-US') => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser. Please use Chrome or Edge, or type in the input box.')
      return
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')
    currentLangRef.current = lang
    recognitionRef.current.lang = lang

    try {
      recognitionRef.current.start()
    } catch {
      // If already started or transitioning
      try {
        recognitionRef.current.abort()
        setTimeout(() => {
          try {
            recognitionRef.current.lang = currentLangRef.current
            recognitionRef.current.start()
          } catch {
            setError('Could not start microphone. Please try again.')
          }
        }, 150)
      } catch {
        setError('Could not start microphone. Please try again.')
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    isListeningRef.current = false
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}

export default useSpeechRecognition
