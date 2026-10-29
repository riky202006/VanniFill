import React, { useState, useEffect } from 'react'
import {
  FileCheck,
  Download,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'
import { API_BASE_URL } from '../../constants/api'
import './SubmissionsPage.css'

export default function SubmissionsPage({ onNavigateToHome }) {
  const [submissions, setSubmissions] = useState([])
  const [source, setSource] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  const fetchSubmissions = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('vaanifill_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/user/submissions`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions || [])
        setSource(data.source || 'MongoDB Atlas')
      } else {
        setSource('Session Memory')
      }
    } catch {
      setSource('Session Memory (Offline)')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const handleCopyId = (id) => {
    navigator.clipboard?.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDownloadPdf = (sub) => {
    const downloadUrl = sub.downloadUrl
      ? `${API_BASE_URL.replace('/api', '')}${sub.downloadUrl}`
      : `${API_BASE_URL}/forms/${sub.submissionId}/download`
    window.open(downloadUrl, '_blank')
  }

  return (
    <div className="submissions-page-root">
      <div className="submissions-container">
        {/* Header */}
        <header className="submissions-header">
          <div className="submissions-header-meta">
            <div className="submissions-badge">
              <ShieldCheck className="submissions-badge-icon" />
              <span>Official Submission History</span>
            </div>
            <span className="source-indicator-pill">
              <span className="source-dot" />
              {source}
            </span>
          </div>

          <div className="header-title-row">
            <div>
              <h1 className="submissions-heading">Application Receipts & Submissions</h1>
              <p className="submissions-subtitle">
                Access your digitally stamped application receipts and pre-filled PDF documents.
              </p>
            </div>

            <button
              type="button"
              className="refresh-submissions-btn"
              onClick={fetchSubmissions}
              disabled={isLoading}
              title="Refresh submission records"
            >
              <RefreshCw className={`refresh-icon ${isLoading ? 'spinning' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="submissions-loading-card">
            <div className="loading-spinner-circle" />
            <p>Loading your submission records from cloud database...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="submissions-empty-card">
            <div className="empty-icon-wrapper">
              <FolderOpen className="empty-folder-icon" />
            </div>
            <h3 className="empty-title">No Application Receipts Yet</h3>
            <p className="empty-desc">
              When you complete and submit an application form in VaaniFill, your official submission receipt and stamped PDF will appear here.
            </p>
            <button
              type="button"
              className="fill-form-cta-btn"
              onClick={onNavigateToHome}
            >
              <span>Complete a Form Now</span>
              <ArrowRight className="btn-icon-xs" />
            </button>
          </div>
        ) : (
          <div className="submissions-list-stack">
            {submissions.map((sub) => {
              const dateStr = sub.createdAt
                ? new Date(sub.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent'

              const fields = sub.fieldValues || {}

              return (
                <div key={sub.submissionId} className="submission-card">
                  <div className="submission-card-top">
                    <div className="submission-title-group">
                      <div className="title-with-badge">
                        <FileCheck className="form-icon-success" />
                        <h3 className="submission-form-title">
                          {sub.formTitle || 'Application Form'}
                        </h3>
                      </div>
                      <div className="submission-receipt-id-row">
                        <span className="receipt-label">Receipt ID:</span>
                        <code className="receipt-code">{sub.submissionId}</code>
                        <button
                          type="button"
                          className="copy-id-btn"
                          onClick={() => handleCopyId(sub.submissionId)}
                          title="Copy Receipt ID"
                        >
                          {copiedId === sub.submissionId ? (
                            <Check className="copy-icon text-success" />
                          ) : (
                            <Copy className="copy-icon" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="submission-meta-tags">
                      <span className="status-stamp-badge">
                        <CheckCircle2 className="stamp-icon" />
                        Verified & Stamped
                      </span>
                      <span className="timestamp-badge">
                        <Calendar className="cal-icon" />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Field Highlights */}
                  {Object.keys(fields).length > 0 && (
                    <div className="submission-fields-preview">
                      <div className="fields-grid">
                        {Object.entries(fields)
                          .slice(0, 6)
                          .map(([key, val]) => (
                            <div key={key} className="preview-field-cell">
                              <span className="cell-label">{key}</span>
                              <span className="cell-value">{String(val)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="submission-card-actions">
                    <button
                      type="button"
                      className="download-receipt-btn"
                      onClick={() => handleDownloadPdf(sub)}
                    >
                      <Download className="btn-icon-xs" />
                      <span>Download Stamped Receipt</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

