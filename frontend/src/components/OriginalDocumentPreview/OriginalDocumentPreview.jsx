import React, { useState } from 'react'
import { FileText, Image as ImageIcon, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import './OriginalDocumentPreview.css'

export default function OriginalDocumentPreview({
  fileData,
  activeField,
  isOpenOnMobile,
  onToggleMobileOpen,
}) {
  const [zoomLevel, setZoomLevel] = useState(100)

  const isPDF = fileData?.isPDF || false
  const isImage = fileData?.isImage || false
  const previewUrl = fileData?.previewUrl || null
  const name = fileData?.name || 'Application Form'
  const activeBox = activeField?.boundingBox

  return (
    <div className={`document-preview-root ${isOpenOnMobile ? 'mobile-open' : 'mobile-collapsed'}`}>
      {/* Mobile Collapse/Expand Bar */}
      <button
        type="button"
        className="preview-mobile-toggle"
        onClick={onToggleMobileOpen}
        aria-expanded={isOpenOnMobile}
      >
        <span className="toggle-label-group">
          {isImage ? <ImageIcon className="toggle-icon" /> : <FileText className="toggle-icon" />}
          <span>Original Document: <strong>{name}</strong></span>
        </span>
        {isOpenOnMobile ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />}
      </button>

      {/* Desktop & Expanded Mobile Container */}
      <div className="preview-content-box">
        <div className="preview-top-toolbar">
          <div className="toolbar-file-info">
            <span className="preview-badge">{isPDF ? 'PDF View' : 'Image View'}</span>
            <span className="preview-filename" title={name}>{name}</span>
          </div>

          <div className="toolbar-controls">
            <button
              type="button"
              className="zoom-btn"
              title="Zoom out"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              disabled={zoomLevel <= 70}
            >
              <ZoomOut className="zoom-icon" />
            </button>
            <span className="zoom-value">{zoomLevel}%</span>
            <button
              type="button"
              className="zoom-btn"
              title="Zoom in"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
              disabled={zoomLevel >= 160}
            >
              <ZoomIn className="zoom-icon" />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="preview-viewport-frame">
          {isImage && previewUrl && (
            <div
              className="image-render-stage"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <img src={previewUrl} alt="Uploaded form page" className="original-rendered-img" />

              {/* Real Bounding Box Highlight (only if field has an actual detected box) */}
              {activeBox && (
                <div
                  className="real-bounding-box-overlay"
                  style={{
                    left: `${activeBox.x}%`,
                    top: `${activeBox.y}%`,
                    width: `${activeBox.width}%`,
                    height: `${activeBox.height}%`,
                  }}
                  title={`Field: ${activeField.label}`}
                >
                  <span className="box-tag">{activeField.label.split('/')[0]}</span>
                </div>
              )}
            </div>
          )}

          {isPDF && previewUrl && (
            <div className="pdf-render-stage">
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                title="Original Form PDF Preview"
                className="original-rendered-pdf"
              />
            </div>
          )}

          {!previewUrl && (
            <div className="preview-fallback-notice" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <FileText style={{ width: '42px', height: '42px', color: '#176B50', marginBottom: '12px', opacity: 0.8 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#202923', marginBottom: '6px' }}>{name}</h4>
              <p style={{ fontSize: '13px', color: '#737D75', maxWidth: '320px', lineHeight: 1.5 }}>
                Form fields derived from your document. Focus or edit any field on the right to review.
              </p>
            </div>
          )}
        </div>

        {/* Highlight notification bar */}
        <div className="preview-bottom-bar">
          {activeBox ? (
            <span className="highlight-active-text">
              Target area highlighted on page {activeField.pageNumber || 1} for "{activeField.label.split('/')[0]}"
            </span>
          ) : (
            <span className="highlight-inactive-text">
              Select or focus any detected field to inspect its context on your form.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
