import React, { useState } from 'react'
import {
  User,
  Globe,
  Shield,
  FileText,
  LogOut,
  CheckCircle2,
  Download,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { clearProfileSession, getProfile } from '../../services/profileService'
import './AccountSettingsPage.css'

export default function AccountSettingsPage({
  currentUser = null,
  onNavigate,
  onSignOut,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState('hi-en') // Hinglish default
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true)
  const [cacheClearedNotice, setCacheClearedNotice] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Language options
  const languages = [
    { id: 'en', label: 'English (India)' },
    { id: 'hi', label: 'हिंदी (Hindi)' },
    { id: 'hi-en', label: 'Hinglish (Hindi + English Code-Mixed)' },
    { id: 'as', label: 'অসমীয়া (Assamese)' },
    { id: 'bn', label: 'বাংলা (Bengali)' },
    { id: 'ta', label: 'தமிழ் (Tamil)' },
    { id: 'te', label: 'తెలుగు (Telugu)' },
  ]

  const handleClearCache = () => {
    clearProfileSession()
    setCacheClearedNotice(true)
    setTimeout(() => setCacheClearedNotice(false), 3000)
  }

  const handleExportProfile = async () => {
    setIsExporting(true)
    try {
      const { profile } = await getProfile()
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `vaanifill_profile_${currentUser?.name?.replace(/\s+/g, '_') || 'backup'}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch {
      // export fallback
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="account-settings-page-root">
      <div className="account-settings-container">
        {/* Page Header */}
        <header className="settings-header">
          <div className="settings-badge">
            <ShieldCheck className="settings-badge-icon" />
            <span>Citizen Preferences</span>
          </div>
          <h1 className="settings-title">Account Settings</h1>
          <p className="settings-subtitle">
            Manage your account details, language preferences, and privacy controls.
          </p>
        </header>

        {/* 1. Account Details */}
        <section className="settings-card" aria-labelledby="heading-account-details">
          <div className="settings-card-header">
            <User className="card-icon" />
            <div>
              <h2 id="heading-account-details" className="card-title">Account Details</h2>
              <p className="card-subtitle">Your registered profile identity</p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="account-info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{currentUser?.name || 'Devansh Dausodia'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value">{currentUser?.email || 'demo@vaanifill.ai'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Account Type</span>
                <span className="info-value-badge">Citizen Account (ECCLESIA 4.0)</span>
              </div>

              <div className="info-item">
                <span className="info-label">Backend API Status</span>
                <span className="info-value-badge success">REST Gateway Connected</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Language Preference */}
        <section className="settings-card" aria-labelledby="heading-language">
          <div className="settings-card-header">
            <Globe className="card-icon" />
            <div>
              <h2 id="heading-language" className="card-title">Language & Voice Preference</h2>
              <p className="card-subtitle">Default language for voice interaction and form explanations</p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="language-selector-wrapper">
              <label htmlFor="language-select" className="settings-label">
                Preferred Interaction Language
              </label>
              <select
                id="language-select"
                className="settings-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="field-help-text">
                VaaniFill AI automatically adapts speech recognition and synthesis to your preferred language.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Privacy & Data Controls */}
        <section className="settings-card" aria-labelledby="heading-privacy">
          <div className="settings-card-header">
            <Shield className="card-icon" />
            <div>
              <h2 id="heading-privacy" className="card-title">Privacy & Data Controls</h2>
              <p className="card-subtitle">Control how your personal information is used during form filling</p>
            </div>
          </div>

          <div className="settings-card-body">
            {/* Toggle 1: Auto suggest */}
            <div className="setting-toggle-row">
              <div className="toggle-text">
                <span className="toggle-title">Suggest Saved Details on Form Upload</span>
                <span className="toggle-desc">
                  When enabled, VaaniFill compares detected document fields with "My Information" and presents suggestions for your review.
                </span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={autoSuggestEnabled}
                  onChange={(e) => setAutoSuggestEnabled(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="settings-divider" />

            {/* Clear session cache */}
            <div className="setting-action-row">
              <div className="action-text">
                <span className="action-title">Clear In-Memory Profile Cache</span>
                <span className="action-desc">
                  Reset the current session's memory cache. Does not delete your saved database profile.
                </span>
              </div>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleClearCache}
              >
                <Trash2 className="btn-icon-xs" />
                <span>Clear Cache</span>
              </button>
            </div>

            {cacheClearedNotice && (
              <div className="notice-strip success">
                <CheckCircle2 className="notice-icon" />
                <span>Session cache cleared successfully.</span>
              </div>
            )}
          </div>
        </section>

        {/* 4. Saved Information Management */}
        <section className="settings-card" aria-labelledby="heading-saved-info">
          <div className="settings-card-header">
            <FileText className="card-icon" />
            <div>
              <h2 id="heading-saved-info" className="card-title">Saved Information Management</h2>
              <p className="card-subtitle">Manage, update, or export your saved personal details</p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="manage-buttons-row">
              <button
                type="button"
                className="btn-settings-primary"
                onClick={() => onNavigate?.('my-information')}
              >
                <span>Edit My Information</span>
                <ExternalLink className="btn-icon-xs" />
              </button>

              <button
                type="button"
                className="btn-settings-secondary"
                onClick={handleExportProfile}
                disabled={isExporting}
              >
                <Download className="btn-icon-xs" />
                <span>{isExporting ? 'Exporting...' : 'Export Profile as JSON'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 5. Sign Out Button */}
        <section className="settings-card logout-card" aria-labelledby="heading-sign-out">
          <div className="logout-card-content">
            <div>
              <h3 id="heading-sign-out" className="logout-title">Sign Out of VaaniFill AI</h3>
              <p className="logout-desc">
                End your active session. You can continue completing forms in Guest Mode at any time.
              </p>
            </div>

            <button
              type="button"
              className="btn-logout-prominent"
              onClick={onSignOut}
            >
              <LogOut className="btn-icon-xs" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
