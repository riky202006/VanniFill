import React, { useState } from 'react'
import { X, Sparkles, CheckCircle2, AlertCircle, Lock, Mail, User, LogIn, UserPlus } from 'lucide-react'
import { API_BASE_URL } from '../../constants/api'
import './AuthModal.css'

export default function AuthModal({ isOpen, initialMode = 'signin', onClose, onLoginSuccess }) {
  const [mode, setMode] = useState(initialMode) // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const endpoint = mode === 'signin' ? `${API_BASE_URL}/auth/login` : `${API_BASE_URL}/auth/register`
    const payload = mode === 'signin'
      ? { email, password }
      : { name, email, password }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed. Please check your credentials.')
      }

      // Save token and user details to localStorage
      localStorage.setItem('vaanifill_token', data.token)
      localStorage.setItem('vaanifill_user', JSON.stringify(data.user))

      setSuccessMessage(mode === 'signin' ? 'Welcome back! Signed in successfully.' : 'Account created successfully!')
      
      setTimeout(() => {
        onLoginSuccess?.(data.user)
        onClose()
      }, 700)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog auth-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
            >
              <LogIn className="auth-tab-icon" />
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
            >
              <UserPlus className="auth-tab-icon" />
              Register
            </button>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="modal-close-icon" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body auth-body">
          {errorMessage && (
            <div className="auth-alert error">
              <AlertCircle className="auth-alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert success">
              <CheckCircle2 className="auth-alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="auth-input-group">
                <label className="auth-label">Full Legal Name</label>
                <div className="auth-input-wrapper">
                  <User className="auth-field-icon" />
                  <input
                    type="text"
                    required
                    className="auth-input"
                    placeholder="e.g. Devansh Dausodia"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-field-icon" />
                <input
                  type="email"
                  required
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-field-icon" />
                <input
                  type="password"
                  required
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="primary-btn auth-submit-btn"
            >
              {isLoading ? (
                <span>Connecting...</span>
              ) : mode === 'signin' ? (
                <span>Sign In to Account</span>
              ) : (
                <span>Create Citizen Account</span>
              )}
            </button>
          </form>

          <p className="auth-guest-notice">
            Prefer not to sign in? You can continue in{' '}
            <button type="button" className="auth-text-link" onClick={onClose}>
              Guest Mode
            </button>{' '}
            without an account.
          </p>
        </div>
      </div>
    </div>
  )
}

