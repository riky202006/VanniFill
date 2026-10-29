import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom React hook for Web Speech API with cross-browser support and graceful fallback
 */
export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognition.onresult = (event) => {
        let currentTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        setTranscript(currentTranscript)
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please check your browser permissions.')
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking again.')
        } else if (event.error === 'network') {
          setError('Network error occurred during speech recognition.')
        } else {
          setError(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore cleanup abort errors
        }
      }
    }
  }, [])

  const startListening = useCallback((lang = 'en-US') => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser.')
      return
    }

    setError(null)
    setTranscript('')
    recognitionRef.current.lang = lang

    try {
      recognitionRef.current.start()
    } catch {
      // If already started or transitioning
      try {
        recognitionRef.current.stop()
        setTimeout(() => recognitionRef.current?.start(), 150)
      } catch (err) {
        setError('Could not start microphone. Please try again.')
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}

export default useSpeechRecognition
