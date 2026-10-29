/**
 * Text-to-Speech Form Read-Aloud Service for VaaniFill AI
 * Accessible, bilingual (English & Hindi) speech synthesis for detected form fields.
 *
 * Features:
 * - Sequential form field narration with pause, resume, stop, next, and prev
 * - Single-field read aloud on demand
 * - Active field highlight callback and smooth scrolling
 * - Graceful fallback when Hindi TTS voices are not installed in the browser/OS
 */

class FormTextToSpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    this.fields = []
    this.fieldValues = {}
    this.currentIndex = 0
    this.language = 'en-US'
    this.state = 'idle' // 'idle' | 'playing' | 'paused' | 'stopped'
    this.onFieldStart = null
    this.onStateChange = null
    this.currentUtterance = null
    this.voicesLoaded = false

    if (this.synth && typeof window !== 'undefined') {
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.voicesLoaded = true
        }
      }
    }
  }

  isSupported() {
    return Boolean(this.synth && typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window)
  }

  getVoices() {
    if (!this.synth) return []
    return this.synth.getVoices() || []
  }

  /**
   * Finds the best voice for the chosen language, with graceful Indian English / system fallback
   */
  resolveVoice(targetLang) {
    const voices = this.getVoices()
    if (!voices || voices.length === 0) return null

    const langLower = (targetLang || 'en').toLowerCase()

    if (langLower.startsWith('hi')) {
      // 1. Look for native Hindi voice
      const hindiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.includes('हिन्दी')
      )
      if (hindiVoice) return hindiVoice

      // 2. Fallback to Indian English (en-IN) which pronounces Indian terms cleanly
      const indianEnglishVoice = voices.find((v) => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'))
      if (indianEnglishVoice) return indianEnglishVoice
    } else {
      // Look for en-IN or en-US voice
      const preferredEnglishVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en-us')
      )
      if (preferredEnglishVoice) return preferredEnglishVoice
    }

    return voices[0] || null
  }

  /**
   * Generates natural speech text for a form field
   */
  buildSpeechText(field, index, total, currentValue, language) {
    const isHindi = String(language).toLowerCase().startsWith('hi')
    const label = String(field.label || field.id).split('/')[0].trim()
    const isReq = field.required !== false
    const desc = field.description || field.placeholder || ''
    const cleanVal = currentValue ? String(currentValue).trim() : ''

    const voices = this.getVoices()
    const hasNativeHindiVoice = voices.some(
      (v) => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')
    )

    if (isHindi && hasNativeHindiVoice) {
      const fieldNum = `फ़ील्ड ${index + 1}: ${label}।`
      const reqText = isReq ? 'यह फ़ील्ड आवश्यक है।' : 'यह फ़ील्ड वैकल्पिक है।'
      const descText = desc ? `${desc}।` : ''
      const valText = cleanVal ? `वर्तमान मान: "${cleanVal}"।` : 'वर्तमान में खाली है।'
      return `${fieldNum} ${reqText} ${descText} ${valText}`
    }

    // English (or transliterated English when no Hindi voice is installed in browser)
    const fieldNum = `Field ${index + 1} of ${total}: ${label}.`
    const reqText = isReq ? 'Required field.' : 'Optional field.'
    const descText = desc ? `${desc}.` : ''
    const valText = cleanVal ? `Currently set to "${cleanVal}".` : 'Currently empty.'

    return `${fieldNum} ${reqText} ${descText} ${valText}`
  }

  setState(newState) {
    this.state = newState
    if (this.onStateChange) {
      this.onStateChange(newState, {
        currentIndex: this.currentIndex,
        totalFields: this.fields.length,
        currentField: this.fields[this.currentIndex] || null,
      })
    }
  }

  /**
   * Start sequential reading from a specific field index
   */
  startReading({
    fields = [],
    fieldValues = {},
    language = 'en-US',
    startIndex = 0,
    onFieldStart = null,
    onStateChange = null,
  }) {
    if (!this.isSupported() || !fields || fields.length === 0) return

    this.stop()
    this.fields = fields
    this.fieldValues = fieldValues
    this.language = language
    this.currentIndex = Math.max(0, Math.min(startIndex, fields.length - 1))
    this.onFieldStart = onFieldStart
    this.onStateChange = onStateChange

    this.speakCurrentField()
  }

  speakCurrentField() {
    if (!this.synth || this.currentIndex >= this.fields.length) {
      this.setState('idle')
      return
    }

    this.synth.cancel()

    const field = this.fields[this.currentIndex]
    const curVal = this.fieldValues[field.id]
    const speechText = this.buildSpeechText(
      field,
      this.currentIndex,
      this.fields.length,
      curVal,
      this.language
    )

    const utterance = new SpeechSynthesisUtterance(speechText)
    const voice = this.resolveVoice(this.language)
    if (voice) {
      utterance.voice = voice
    }
    utterance.lang = this.language.startsWith('hi') && voice?.lang.startsWith('hi') ? 'hi-IN' : 'en-US'
    utterance.rate = 0.95 // slightly measured pace for form clarity
    utterance.pitch = 1.0

    utterance.onstart = () => {
      this.setState('playing')
      if (this.onFieldStart) {
        this.onFieldStart(field.id, this.currentIndex)
      }
    }

    utterance.onend = () => {
      if (this.state === 'playing') {
        if (this.currentIndex + 1 < this.fields.length) {
          this.currentIndex += 1
          // Brief pleasant pause between fields
          setTimeout(() => {
            if (this.state === 'playing') {
              this.speakCurrentField()
            }
          }, 350)
        } else {
          this.setState('idle')
        }
      }
    }

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[TextToSpeech] Utterance error:', e.error)
      }
      this.setState('idle')
    }

    this.currentUtterance = utterance
    this.synth.speak(utterance)
  }

  pause() {
    if (this.synth && this.state === 'playing') {
      this.synth.pause()
      this.setState('paused')
    }
  }

  resume() {
    if (this.synth && this.state === 'paused') {
      this.synth.resume()
      this.setState('playing')
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
    }
    this.setState('stopped')
    this.currentIndex = 0
  }

  nextField() {
    if (this.currentIndex + 1 < this.fields.length) {
      this.currentIndex += 1
      this.speakCurrentField()
    } else {
      this.stop()
    }
  }

  prevField() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1
      this.speakCurrentField()
    } else {
      this.speakCurrentField()
    }
  }

  /**
   * Reads a single field on demand
   */
  readSingleField({ field, currentValue, language = 'en-US', onStart = null, onEnd = null }) {
    if (!this.isSupported() || !field) return

    this.stop()

    const speechText = this.buildSpeechText(field, 0, 1, currentValue, language)
    const utterance = new SpeechSynthesisUtterance(speechText)
    const voice = this.resolveVoice(language)
    if (voice) {
      utterance.voice = voice
    }
    utterance.lang = language.startsWith('hi') && voice?.lang.startsWith('hi') ? 'hi-IN' : 'en-US'
    utterance.rate = 0.95

    utterance.onstart = () => {
      if (onStart) onStart()
    }

    utterance.onend = () => {
      if (onEnd) onEnd()
    }

    utterance.onerror = () => {
      if (onEnd) onEnd()
    }

    this.synth.speak(utterance)
  }

  /**
   * Directly speaks arbitrary speech text (e.g. for Jarvis assistant responses)
   */
  speakText(text, language = 'en-US', onStart = null, onEnd = null) {
    if (!this.isSupported() || !text) {
      if (onEnd) onEnd()
      return
    }

    try {
      this.synth.cancel()
    } catch {
      // ignore
    }

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = this.resolveVoice(language)
    if (voice) {
      utterance.voice = voice
    }
    utterance.lang = language.startsWith('hi') && voice?.lang.startsWith('hi') ? 'hi-IN' : 'en-US'
    utterance.rate = 1.0

    utterance.onstart = () => {
      if (onStart) onStart()
    }

    utterance.onend = () => {
      if (onEnd) onEnd()
    }

    utterance.onerror = () => {
      if (onEnd) onEnd()
    }

    try {
      this.synth.speak(utterance)
    } catch {
      if (onEnd) onEnd()
    }
  }
}

export const textToSpeechService = new FormTextToSpeechService()
export default textToSpeechService

