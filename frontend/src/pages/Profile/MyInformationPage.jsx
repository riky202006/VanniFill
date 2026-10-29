import React, { useState, useEffect } from 'react'
import {
  User,
  Phone,
  MapPin,
  GraduationCap,
  Users,
  Briefcase,
  PlusCircle,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  X,
} from 'lucide-react'
import {
  createEmptyProfile,
  validateProfile,
} from '../../models/profileModel'
import {
  getProfile,
  updateProfile,
  getSampleProfile,
} from '../../services/profileService'
import {
  INDIAN_STATES_AND_UTS,
  INDIAN_COURSES_BY_LEVEL,
  SOCIAL_CATEGORIES,
  OCCUPATIONS
} from '../../constants/indianFormOptions'
import './MyInformationPage.css'

export default function MyInformationPage({ onProfileUpdated }) {
  // Working draft profile
  const [profile, setProfile] = useState(createEmptyProfile())
  // Clean baseline profile for change tracking and cancel
  const [initialProfile, setInitialProfile] = useState(createEmptyProfile())

  // Loading & Action State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSameAddress, setIsSameAddress] = useState(true)

  // Derived unsaved changes state
  const hasUnsavedChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile)

  // Status & Feedback alerts
  const [feedback, setFeedback] = useState({ type: null, message: null, errors: {} })
  const [backendConnected, setBackendConnected] = useState(null)
  const [isUsingFixture, setIsUsingFixture] = useState(false)

  // Collapsible section states (default open first 3, collapse remainder)
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: true,
    address: true,
    education: false,
    family: false,
    employment: false,
    custom: false,
  })

  // Custom field creation modal/input state
  const [newCustomField, setNewCustomField] = useState({ label: '', value: '' })
  const [isAddingCustomField, setIsAddingCustomField] = useState(false)
  const [editingCustomFieldId, setEditingCustomFieldId] = useState(null)

  // --------------------------------------------------------------------------
  // 1. Initial Profile Fetch on Mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      try {
        const result = await getProfile()
        if (isMounted) {
          setProfile(result.profile)
          setInitialProfile(result.profile)
          setBackendConnected(result.connected)

          // Check if permanent & current match
          const permStr = JSON.stringify(result.profile.address?.permanent || {})
          const currStr = JSON.stringify(result.profile.address?.current || {})
          setIsSameAddress(permStr === currStr)
        }
      } catch (err) {
        if (isMounted) {
          setFeedback({
            type: 'error',
            message: `Failed to load profile: ${err.message}`,
            errors: {},
          })
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])



  // Warn user on window beforeunload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // --------------------------------------------------------------------------
  // 3. Section Collapse Toggle
  // --------------------------------------------------------------------------
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  // --------------------------------------------------------------------------
  // 4. Nested Field Change Handlers
  // --------------------------------------------------------------------------
  const handleFieldChange = (section, field, value) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }

      // If current address mirrors permanent address
      if (section === 'address' && isSameAddress) {
        updated.address = {
          ...updated.address,
          current: {
            ...updated.address.permanent,
          },
        }
      }

      return updated
    })
    setFeedback({ type: null, message: null, errors: {} })
  }

  const handleAddressFieldChange = (type, field, value) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        address: {
          ...prev.address,
          [type]: {
            ...prev.address[type],
            [field]: value,
          },
        },
      }

      // If updating permanent and sameAddress is enabled, mirror to current
      if (type === 'permanent' && isSameAddress) {
        updated.address.current = {
          ...updated.address.permanent,
          [field]: value,
        }
      }

      return updated
    })
    setFeedback({ type: null, message: null, errors: {} })
  }

  const handleSameAddressToggle = (checked) => {
    setIsSameAddress(checked)
    if (checked) {
      setProfile((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          current: { ...prev.address.permanent },
        },
      }))
    }
  }

  // --------------------------------------------------------------------------
  // 5. Custom Field Operations
  // --------------------------------------------------------------------------
  const handleAddCustomField = () => {
    if (!newCustomField.label.trim() || !newCustomField.value.trim()) {
      return
    }

    const fieldObj = {
      id: `custom_${Date.now()}`,
      label: newCustomField.label.trim(),
      value: newCustomField.value.trim(),
    }

    setProfile((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), fieldObj],
    }))

    setNewCustomField({ label: '', value: '' })
    setIsAddingCustomField(false)
  }

  const handleDeleteCustomField = (id) => {
    setProfile((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f) => f.id !== id),
    }))
  }

  const handleSaveCustomFieldEdit = (id, newLabel, newValue) => {
    setProfile((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === id ? { ...f, label: newLabel, value: newValue } : f
      ),
    }))
    setEditingCustomFieldId(null)
  }

  // --------------------------------------------------------------------------
  // 6. Save & Cancel Actions
  // --------------------------------------------------------------------------
  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    setFeedback({ type: null, message: null, errors: {} })

    const validation = validateProfile(profile)
    if (!validation.isValid) {
      setIsSaving(false)
      setFeedback({
        type: 'error',
        message: 'Please resolve formatting errors before saving.',
        errors: validation.errors,
      })
      return
    }

    try {
      const res = await updateProfile(profile)
      if (res.success) {
        setInitialProfile(res.profile || profile)
        setBackendConnected(res.connected)
        setFeedback({
          type: 'success',
          message: res.message || 'Personal information saved successfully.',
          errors: {},
        })
        onProfileUpdated?.(res.profile || profile)
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Could not save profile changes.',
          errors: res.errors || {},
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `An unexpected error occurred: ${err.message}`,
        errors: {},
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setProfile(initialProfile)
    setFeedback({ type: null, message: null, errors: {} })
    setIsAddingCustomField(false)
    setEditingCustomFieldId(null)
  }

  // --------------------------------------------------------------------------
  // 7. Explicit Development Sample Data Fixture Loader
  // --------------------------------------------------------------------------
  const handleLoadSampleFixture = () => {
    const sample = getSampleProfile()
    setProfile(sample)
    setIsUsingFixture(true)
    setFeedback({
      type: 'info',
      message: 'Sample test fixture loaded into the form. Click "Save Changes" to apply.',
      errors: {},
    })
  }

  // Section completion counter helper
  const countFilled = (obj = {}) => {
    return Object.values(obj).filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length
  }

  if (isLoading) {
    return (
      <div className="profile-page-loading">
        <div className="loading-spinner-circle" />
        <p>Loading your saved personal information...</p>
      </div>
    )
  }

  return (
    <div className="my-information-page-root">
      <div className="my-information-container">
        {/* ------------------------------------------------------------------
            PAGE HEADER & PRIVACY STATEMENT
            ------------------------------------------------------------------ */}
        <header className="profile-header-card">
          <div className="header-badge-row">
            <div className="profile-badge">
              <ShieldCheck className="profile-badge-icon" />
              <span>Saved Citizen Profile</span>
            </div>

            {backendConnected === true && (
              <span className="backend-status-pill connected" title="Connected to Express backend">
                <span className="status-dot connected" />
                Backend Connected
              </span>
            )}

            {backendConnected === false && (
              <span className="backend-status-pill offline" title="Backend persistence is offline. Active in session memory.">
                <span className="status-dot offline" />
                Session Storage (Backend Offline)
              </span>
            )}
          </div>

          <h1 className="profile-heading">My Information</h1>
          <p className="profile-description">
            Save your details once and reuse them when filling future forms.
          </p>

          <div className="privacy-callout-strip">
            <Info className="privacy-strip-icon" />
            <p className="privacy-strip-text">
              <strong>Privacy Note:</strong> Your saved details can be suggested for matching form fields. You remain in control of what gets used.
            </p>
          </div>

          {/* Quick Actions & Fixture Loader */}
          <div className="header-actions-row">
            <button
              type="button"
              className="fixture-loader-btn"
              onClick={handleLoadSampleFixture}
              title="Load demo test data to evaluate form-filling capabilities"
            >
              <Sparkles className="btn-icon-xs" />
              <span>Load Sample Data for Testing</span>
            </button>

            {isUsingFixture && (
              <span className="fixture-active-badge">
                Sample Test Fixture Active
              </span>
            )}
          </div>
        </header>

        {/* ------------------------------------------------------------------
            FEEDBACK & UNSAVED CHANGES WARNINGS
            ------------------------------------------------------------------ */}
        {hasUnsavedChanges && (
          <div className="unsaved-warning-bar" role="alert">
            <div className="warning-left">
              <AlertCircle className="warning-icon" />
              <span>You have unsaved changes. Remember to click "Save Changes" before leaving.</span>
            </div>
            <div className="warning-actions">
              <button
                type="button"
                className="btn-save-inline"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Now'}
              </button>
            </div>
          </div>
        )}

        {feedback.message && (
          <div className={`feedback-alert ${feedback.type}`} role="alert">
            {feedback.type === 'success' && <CheckCircle2 className="feedback-icon" />}
            {feedback.type === 'error' && <AlertCircle className="feedback-icon" />}
            {feedback.type === 'info' && <Info className="feedback-icon" />}
            <div className="feedback-content">
              <span>{feedback.message}</span>
              {feedback.errors && Object.keys(feedback.errors).length > 0 && (
                <ul className="feedback-error-list">
                  {Object.entries(feedback.errors).map(([key, err]) => (
                    <li key={key}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            COLLAPSIBLE SECTIONS ACCORDION
            ------------------------------------------------------------------ */}
        <form onSubmit={handleSave} className="profile-sections-stack">
          {/* ================================================================
              SECTION A: BASIC INFORMATION
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('basic')}
              aria-expanded={expandedSections.basic}
            >
              <div className="section-title-wrap">
                <User className="section-icon" />
                <div>
                  <h2 className="section-title">A. Basic Information</h2>
                  <p className="section-subtitle">Name, birthdate, and demographic basics</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.basic)} / 4</span>
                {expandedSections.basic ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.basic && (
              <div className="section-body-grid">
                {/* Full Name */}
                <div className="form-field-group">
                  <label htmlFor="basic-fullName" className="field-label">
                    Full Name
                  </label>
                  <input
                    id="basic-fullName"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Riky Nayak"
                    value={profile.basic?.fullName || ''}
                    onChange={(e) => handleFieldChange('basic', 'fullName', e.target.value)}
                  />
                </div>

                {/* Date of Birth */}
                <div className="form-field-group">
                  <label htmlFor="basic-dateOfBirth" className="field-label">
                    Date of Birth
                  </label>
                  <input
                    id="basic-dateOfBirth"
                    type="date"
                    className="field-input"
                    value={profile.basic?.dateOfBirth || ''}
                    onChange={(e) => handleFieldChange('basic', 'dateOfBirth', e.target.value)}
                  />
                </div>

                {/* Gender */}
                <div className="form-field-group">
                  <label htmlFor="basic-gender" className="field-label">
                    Gender
                  </label>
                  <select
                    id="basic-gender"
                    className="field-select"
                    value={profile.basic?.gender || ''}
                    onChange={(e) => handleFieldChange('basic', 'gender', e.target.value)}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Nationality */}
                <div className="form-field-group">
                  <label htmlFor="basic-category" className="field-label">
                    Social Category / सामाजिक श्रेणी
                  </label>
                  <select
                    id="basic-category"
                    className="field-select"
                    value={profile.basic?.category || ''}
                    onChange={(e) => handleFieldChange('basic', 'category', e.target.value)}
                  >
                    <option value="">-- Select Category / श्रेणी चुनें --</option>
                    {SOCIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label htmlFor="basic-nationality" className="field-label">
                    Nationality
                  </label>
                  <input
                    id="basic-nationality"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Indian"
                    value={profile.basic?.nationality || ''}
                    onChange={(e) => handleFieldChange('basic', 'nationality', e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION B: CONTACT INFORMATION
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('contact')}
              aria-expanded={expandedSections.contact}
            >
              <div className="section-title-wrap">
                <Phone className="section-icon" />
                <div>
                  <h2 className="section-title">B. Contact Information</h2>
                  <p className="section-subtitle">Primary email and phone number for form communication</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.contact)} / 2</span>
                {expandedSections.contact ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.contact && (
              <div className="section-body-grid">
                {/* Email Address */}
                <div className="form-field-group">
                  <label htmlFor="contact-email" className="field-label">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className={`field-input ${feedback.errors?.email ? 'input-error' : ''}`}
                    placeholder="e.g. riky@example.com"
                    value={profile.contact?.email || ''}
                    onChange={(e) => handleFieldChange('contact', 'email', e.target.value)}
                  />
                  {feedback.errors?.email && (
                    <span className="field-error-hint">{feedback.errors.email}</span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="form-field-group">
                  <label htmlFor="contact-phone" className="field-label">
                    Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className={`field-input ${feedback.errors?.phone ? 'input-error' : ''}`}
                    placeholder="e.g. 9876543210"
                    value={profile.contact?.phone || ''}
                    onChange={(e) => handleFieldChange('contact', 'phone', e.target.value)}
                  />
                  {feedback.errors?.phone && (
                    <span className="field-error-hint">{feedback.errors.phone}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION C: ADDRESS (Permanent & Current)
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('address')}
              aria-expanded={expandedSections.address}
            >
              <div className="section-title-wrap">
                <MapPin className="section-icon" />
                <div>
                  <h2 className="section-title">C. Address Details</h2>
                  <p className="section-subtitle">Permanent domicile and current correspondence address</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.address?.permanent)} / 7</span>
                {expandedSections.address ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.address && (
              <div className="section-body-block">
                {/* 1. Permanent Address */}
                <h3 className="subsection-title">1. Permanent Address</h3>
                <div className="section-body-grid">
                  <div className="form-field-group">
                    <label htmlFor="perm-house" className="field-label">House Number / Building</label>
                    <input
                      id="perm-house"
                      type="text"
                      className="field-input"
                      placeholder="e.g. Flat 402, Green Enclave"
                      value={profile.address?.permanent?.houseNumber || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'houseNumber', e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-street" className="field-label">Street Address</label>
                    <input
                      id="perm-street"
                      type="text"
                      className="field-input"
                      placeholder="e.g. GS Road"
                      value={profile.address?.permanent?.street || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'street', e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-locality" className="field-label">Locality / Area</label>
                    <input
                      id="perm-locality"
                      type="text"
                      className="field-input"
                      placeholder="e.g. Dispur"
                      value={profile.address?.permanent?.locality || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'locality', e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-city" className="field-label">City / District</label>
                    <input
                      id="perm-city"
                      type="text"
                      className="field-input"
                      placeholder="e.g. Guwahati"
                      value={profile.address?.permanent?.city || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'city', e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-state" className="field-label">State / Province</label>
                    <select
                      id="perm-state"
                      className="field-select"
                      value={profile.address?.permanent?.state || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'state', e.target.value)}
                    >
                      <option value="">-- Select State / Union Territory --</option>
                      {INDIAN_STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-postal" className="field-label">Postal / PIN Code</label>
                    <input
                      id="perm-postal"
                      type="text"
                      className={`field-input ${feedback.errors?.postalCode ? 'input-error' : ''}`}
                      placeholder="e.g. 781005"
                      value={profile.address?.permanent?.postalCode || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'postalCode', e.target.value)}
                    />
                    {feedback.errors?.postalCode && (
                      <span className="field-error-hint">{feedback.errors.postalCode}</span>
                    )}
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="perm-country" className="field-label">Country</label>
                    <input
                      id="perm-country"
                      type="text"
                      className="field-input"
                      placeholder="e.g. India"
                      value={profile.address?.permanent?.country || ''}
                      onChange={(e) => handleAddressFieldChange('permanent', 'country', e.target.value)}
                    />
                  </div>
                </div>

                {/* Same Address Toggle */}
                <div className="same-address-toggle-bar">
                  <label className="toggle-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isSameAddress}
                      onChange={(e) => handleSameAddressToggle(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="toggle-label-text">
                      Current address is the same as permanent address
                    </span>
                  </label>
                </div>

                {/* 2. Current Address (If Different) */}
                {!isSameAddress && (
                  <div className="current-address-subblock">
                    <h3 className="subsection-title">2. Current / Correspondence Address</h3>
                    <div className="section-body-grid">
                      <div className="form-field-group">
                        <label htmlFor="curr-house" className="field-label">House Number / Building</label>
                        <input
                          id="curr-house"
                          type="text"
                          className="field-input"
                          placeholder="e.g. Apartment 12B"
                          value={profile.address?.current?.houseNumber || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'houseNumber', e.target.value)}
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-street" className="field-label">Street Address</label>
                        <input
                          id="curr-street"
                          type="text"
                          className="field-input"
                          placeholder="e.g. MG Road"
                          value={profile.address?.current?.street || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'street', e.target.value)}
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-locality" className="field-label">Locality / Area</label>
                        <input
                          id="curr-locality"
                          type="text"
                          className="field-input"
                          placeholder="e.g. Sector 4"
                          value={profile.address?.current?.locality || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'locality', e.target.value)}
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-city" className="field-label">City / District</label>
                        <input
                          id="curr-city"
                          type="text"
                          className="field-input"
                          placeholder="e.g. Guwahati"
                          value={profile.address?.current?.city || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'city', e.target.value)}
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-state" className="field-label">State / Province</label>
                        <select
                          id="curr-state"
                          className="field-select"
                          value={profile.address?.current?.state || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'state', e.target.value)}
                        >
                          <option value="">-- Select State / Union Territory --</option>
                          {INDIAN_STATES_AND_UTS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-postal" className="field-label">Postal / PIN Code</label>
                        <input
                          id="curr-postal"
                          type="text"
                          className="field-input"
                          placeholder="e.g. 781001"
                          value={profile.address?.current?.postalCode || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'postalCode', e.target.value)}
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="curr-country" className="field-label">Country</label>
                        <input
                          id="curr-country"
                          type="text"
                          className="field-input"
                          placeholder="e.g. India"
                          value={profile.address?.current?.country || ''}
                          onChange={(e) => handleAddressFieldChange('current', 'country', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION D: EDUCATION
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('education')}
              aria-expanded={expandedSections.education}
            >
              <div className="section-title-wrap">
                <GraduationCap className="section-icon" />
                <div>
                  <h2 className="section-title">D. Education</h2>
                  <p className="section-subtitle">Academic institution, course, and registration number</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.education)} / 5</span>
                {expandedSections.education ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.education && (
              <div className="section-body-grid">
                <div className="form-field-group">
                  <label htmlFor="edu-institution" className="field-label">Institution / College Name</label>
                  <input
                    id="edu-institution"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Assam Down Town University"
                    value={profile.education?.institution || ''}
                    onChange={(e) => handleFieldChange('education', 'institution', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="edu-course" className="field-label">Course / Degree Program</label>
                  <select
                    id="edu-course"
                    className="field-select"
                    value={profile.education?.course || ''}
                    onChange={(e) => handleFieldChange('education', 'course', e.target.value)}
                  >
                    <option value="">-- Select Course / Program --</option>
                    {profile.education?.course && !Object.values(INDIAN_COURSES_BY_LEVEL).flat().includes(profile.education.course) && (
                      <option value={profile.education.course}>{profile.education.course} (Custom)</option>
                    )}
                    {Object.entries(INDIAN_COURSES_BY_LEVEL).map(([group, courses]) => (
                      <optgroup key={group} label={group}>
                        {courses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other / Custom Course</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label htmlFor="edu-department" className="field-label">Department / Branch</label>
                  <input
                    id="edu-department"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Computer Science & Engineering"
                    value={profile.education?.department || ''}
                    onChange={(e) => handleFieldChange('education', 'department', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="edu-reg" className="field-label">Roll / Registration Number</label>
                  <input
                    id="edu-reg"
                    type="text"
                    className="field-input"
                    placeholder="e.g. ADTU/2022/CS/084"
                    value={profile.education?.registrationNumber || ''}
                    onChange={(e) => handleFieldChange('education', 'registrationNumber', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="edu-qualification" className="field-label">Highest Qualification</label>
                  <input
                    id="edu-qualification"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Bachelor's Degree"
                    value={profile.education?.qualification || ''}
                    onChange={(e) => handleFieldChange('education', 'qualification', e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION E: FAMILY INFORMATION
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('family')}
              aria-expanded={expandedSections.family}
            >
              <div className="section-title-wrap">
                <Users className="section-icon" />
                <div>
                  <h2 className="section-title">E. Family Information</h2>
                  <p className="section-subtitle">Parent and guardian names for government and scholarship forms</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.family)} / 3</span>
                {expandedSections.family ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.family && (
              <div className="section-body-grid">
                <div className="form-field-group">
                  <label htmlFor="fam-father" className="field-label">Father's Name</label>
                  <input
                    id="fam-father"
                    type="text"
                    className="field-input"
                    placeholder="e.g. B. C. Nayak"
                    value={profile.family?.fatherName || ''}
                    onChange={(e) => handleFieldChange('family', 'fatherName', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="fam-mother" className="field-label">Mother's Name</label>
                  <input
                    id="fam-mother"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Sunita Nayak"
                    value={profile.family?.motherName || ''}
                    onChange={(e) => handleFieldChange('family', 'motherName', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="fam-guardian" className="field-label">Guardian's Name (Optional)</label>
                  <input
                    id="fam-guardian"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Guardian Name"
                    value={profile.family?.guardianName || ''}
                    onChange={(e) => handleFieldChange('family', 'guardianName', e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION F: EMPLOYMENT
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('employment')}
              aria-expanded={expandedSections.employment}
            >
              <div className="section-title-wrap">
                <Briefcase className="section-icon" />
                <div>
                  <h2 className="section-title">F. Employment Information</h2>
                  <p className="section-subtitle">Employer, job role, and work experience</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{countFilled(profile.employment)} / 3</span>
                {expandedSections.employment ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.employment && (
              <div className="section-body-grid">
                <div className="form-field-group">
                  <label htmlFor="emp-employer" className="field-label">Employer / Organization</label>
                  <input
                    id="emp-employer"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Ctrl Freaks Lab"
                    value={profile.employment?.employer || ''}
                    onChange={(e) => handleFieldChange('employment', 'employer', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="emp-occupation" className="field-label">Occupation / Employment Category</label>
                  <select
                    id="emp-occupation"
                    className="field-select"
                    value={profile.employment?.occupation || ''}
                    onChange={(e) => handleFieldChange('employment', 'occupation', e.target.value)}
                  >
                    <option value="">-- Select Occupation Category --</option>
                    {OCCUPATIONS.map((occ) => (
                      <option key={occ} value={occ}>{occ}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label htmlFor="emp-title" className="field-label">Job Title / Designation</label>
                  <input
                    id="emp-title"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Frontend Engineer"
                    value={profile.employment?.jobTitle || ''}
                    onChange={(e) => handleFieldChange('employment', 'jobTitle', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="emp-exp" className="field-label">Work Experience</label>
                  <input
                    id="emp-exp"
                    type="text"
                    className="field-input"
                    placeholder="e.g. 2 Years"
                    value={profile.employment?.experience || ''}
                    onChange={(e) => handleFieldChange('employment', 'experience', e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              SECTION G: ADDITIONAL CUSTOM FIELDS
              ================================================================ */}
          <section className="profile-section-card">
            <button
              type="button"
              className="section-header-btn"
              onClick={() => toggleSection('custom')}
              aria-expanded={expandedSections.custom}
            >
              <div className="section-title-wrap">
                <PlusCircle className="section-icon" />
                <div>
                  <h2 className="section-title">G. Additional Information</h2>
                  <p className="section-subtitle">Custom fields you frequently need across specialized applications</p>
                </div>
              </div>
              <div className="section-meta-wrap">
                <span className="filled-count-pill">{(profile.customFields || []).length} Custom</span>
                {expandedSections.custom ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
              </div>
            </button>

            {expandedSections.custom && (
              <div className="section-body-block">
                {/* Existing Custom Fields List */}
                {(profile.customFields || []).length === 0 && !isAddingCustomField && (
                  <p className="empty-custom-fields-text">
                    No custom fields added yet. Add items like Blood Group, Preferred Language, or Scheme IDs below.
                  </p>
                )}

                <div className="custom-fields-list">
                  {(profile.customFields || []).map((cf) => {
                    const isEditing = editingCustomFieldId === cf.id

                    if (isEditing) {
                      return (
                        <div key={cf.id} className="custom-field-edit-row">
                          <input
                            type="text"
                            defaultValue={cf.label}
                            className="field-input edit-label"
                            id={`edit-label-${cf.id}`}
                            placeholder="Field Label"
                          />
                          <input
                            type="text"
                            defaultValue={cf.value}
                            className="field-input edit-val"
                            id={`edit-val-${cf.id}`}
                            placeholder="Field Value"
                          />
                          <button
                            type="button"
                            className="btn-custom-action save"
                            onClick={() => {
                              const l = document.getElementById(`edit-label-${cf.id}`)?.value || cf.label
                              const v = document.getElementById(`edit-val-${cf.id}`)?.value || cf.value
                              handleSaveCustomFieldEdit(cf.id, l, v)
                            }}
                            title="Save"
                          >
                            <Check className="action-icon-xs" />
                          </button>
                          <button
                            type="button"
                            className="btn-custom-action cancel"
                            onClick={() => setEditingCustomFieldId(null)}
                            title="Cancel"
                          >
                            <X className="action-icon-xs" />
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div key={cf.id} className="custom-field-item">
                        <div className="custom-field-info">
                          <span className="custom-field-label">{cf.label}</span>
                          <span className="custom-field-value">{cf.value}</span>
                        </div>
                        <div className="custom-field-actions">
                          <button
                            type="button"
                            className="custom-action-btn edit"
                            onClick={() => setEditingCustomFieldId(cf.id)}
                            title={`Edit ${cf.label}`}
                          >
                            <Edit2 className="action-icon-xs" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="custom-action-btn delete"
                            onClick={() => handleDeleteCustomField(cf.id)}
                            title={`Delete ${cf.label}`}
                          >
                            <Trash2 className="action-icon-xs" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Field Form */}
                {isAddingCustomField ? (
                  <div className="add-custom-field-panel">
                    <h4 className="add-panel-title">Add New Custom Field</h4>
                    <div className="add-panel-inputs">
                      <div className="form-field-group">
                        <label className="field-label">Field Label</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="e.g. Blood Group"
                          value={newCustomField.label}
                          onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="field-label">Field Value</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="e.g. O+"
                          value={newCustomField.value}
                          onChange={(e) => setNewCustomField({ ...newCustomField, value: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="add-panel-actions">
                      <button
                        type="button"
                        className="btn-add-confirm"
                        onClick={handleAddCustomField}
                        disabled={!newCustomField.label.trim() || !newCustomField.value.trim()}
                      >
                        <Check className="btn-icon-xs" />
                        <span>Add Field</span>
                      </button>
                      <button
                        type="button"
                        className="btn-add-cancel"
                        onClick={() => {
                          setIsAddingCustomField(false)
                          setNewCustomField({ label: '', value: '' })
                        }}
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-start-add-custom"
                    onClick={() => setIsAddingCustomField(true)}
                  >
                    <PlusCircle className="btn-icon-xs" />
                    <span>Add Custom Field</span>
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ================================================================
              STICKY SAVE & CANCEL ACTION BAR
              ================================================================ */}
          <div className="profile-submit-bar">
            <div className="submit-bar-left">
              {hasUnsavedChanges ? (
                <span className="unsaved-status-tag">Unsaved edits</span>
              ) : (
                <span className="saved-status-tag">
                  <Check className="tag-icon-xs" />
                  All changes saved
                </span>
              )}
            </div>

            <div className="submit-bar-actions">
              <button
                type="button"
                className="btn-profile-cancel"
                onClick={handleCancel}
                disabled={!hasUnsavedChanges || isSaving}
              >
                <RotateCcw className="btn-icon-xs" />
                <span>Cancel Changes</span>
              </button>

              <button
                type="submit"
                className="btn-profile-save"
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="btn-icon-xs" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
