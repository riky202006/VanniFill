import React from 'react'
import { ArrowRight } from 'lucide-react'
import './Welcome.css'

export default function Welcome({ onGetStarted }) {
  return (
    <div className="welcome-container">
      {/* 1. Ambient Background Luminous Glows */}
      <div className="background-glow" aria-hidden="true" />
      <div className="background-glow-secondary" aria-hidden="true" />

      {/* 2. Main Centered Glass Panel */}
      <div className="main-glass-panel">
        
        {/* 3. Top Navigation */}
        <header className="panel-header">
          <div className="brand-identity" role="banner">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">VAANIFILL</span>
            <span className="brand-badge">AI</span>
          </div>

          <nav className="panel-nav" aria-label="Main Navigation">
            <a href="#about" className="nav-link" onClick={(e) => e.preventDefault()}>About</a>
            <a href="#how-it-works" className="nav-link" onClick={(e) => e.preventDefault()}>How it works</a>
            <a href="#contact" className="nav-link" onClick={(e) => e.preventDefault()}>Contact</a>
          </nav>
        </header>

        {/* 4. Panel Body (Two Columns) */}
        <main className="panel-body">
          
          {/* Left Content Column */}
          <section className="left-content" aria-labelledby="hero-title">
            <div className="content-eyebrow">
              <span className="eyebrow-accent" aria-hidden="true" />
              <span>FORM AUTOMATION, REIMAGINED</span>
            </div>

            <h1 id="hero-title" className="content-headline">
              <span className="headline-line">Every form.</span>
              <span className="headline-line">A little easier.</span>
            </h1>

            <p className="content-description">
              Your personal form assistant. Understand forms, answer in your language,
              and spend less time repeating the same information.
            </p>

            <div className="action-wrapper">
              <button
                type="button"
                className="primary-cta-btn"
                aria-label="Get Started with VaaniFill AI"
                onClick={(e) => {
                  e.preventDefault()
                  onGetStarted?.()
                }}
              >
                <span>Get Started</span>
                <ArrowRight className="btn-arrow-icon" aria-hidden="true" />
              </button>

              <div className="action-caption">
                <span>Simple</span>
                <span className="caption-dot" aria-hidden="true" />
                <span>Guided</span>
                <span className="caption-dot" aria-hidden="true" />
                <span>Designed for everyone.</span>
              </div>
            </div>
          </section>

          {/* 5. Right Visual Element (Architectural Slabs & Typography) */}
          <section className="right-visual-container" aria-label="VaaniFill AI Architectural Visual">
            <div className="visual-ambient-aura" aria-hidden="true" />

            <div className="architectural-stage">
              
              {/* Panel 1: Deep Evergreen Sentry */}
              <div className="arch-panel arch-panel-1">
                <div className="panel-decor-top">
                  <span className="panel-index">01</span>
                  <span className="panel-line-accent" />
                </div>
                <div className="panel-decor-bottom">
                  <div className="waveform-strip">
                    <span className="waveform-bar" style={{ height: '6px' }} />
                    <span className="waveform-bar" style={{ height: '12px' }} />
                    <span className="waveform-bar" style={{ height: '18px' }} />
                    <span className="waveform-bar" style={{ height: '10px' }} />
                  </div>
                </div>
              </div>

              {/* Panel 2: Deep Emerald Resonator */}
              <div className="arch-panel arch-panel-2">
                <div className="panel-decor-top">
                  <span className="panel-index">02</span>
                  <span className="panel-line-accent" />
                </div>
                <div className="panel-decor-bottom">
                  <div className="waveform-strip">
                    <span className="waveform-bar" style={{ height: '14px' }} />
                    <span className="waveform-bar" style={{ height: '22px' }} />
                    <span className="waveform-bar" style={{ height: '16px' }} />
                    <span className="waveform-bar" style={{ height: '8px' }} />
                  </div>
                </div>
              </div>

              {/* Panel 3: Signature Forest Monolith (Central Hero) */}
              <div className="arch-panel arch-panel-3">
                <div className="panel-decor-top">
                  <span className="panel-index">03</span>
                  <span className="panel-line-accent" style={{ width: '32px' }} />
                </div>
                <div className="panel-decor-bottom">
                  <div className="waveform-strip">
                    <span className="waveform-bar" style={{ height: '18px' }} />
                    <span className="waveform-bar" style={{ height: '24px' }} />
                    <span className="waveform-bar" style={{ height: '14px' }} />
                    <span className="waveform-bar" style={{ height: '20px' }} />
                  </div>
                </div>
              </div>

              {/* Panel 4: Sage Foreground Anchor */}
              <div className="arch-panel arch-panel-4">
                <div className="panel-decor-top">
                  <span className="panel-index">04</span>
                  <span className="panel-line-accent" />
                </div>
                <div className="panel-decor-bottom">
                  <div className="waveform-strip">
                    <span className="waveform-bar" style={{ height: '8px' }} />
                    <span className="waveform-bar" style={{ height: '16px' }} />
                    <span className="waveform-bar" style={{ height: '10px' }} />
                    <span className="waveform-bar" style={{ height: '4px' }} />
                  </div>
                </div>
              </div>

              {/* Prominent White VAANIFILL Brand Wordmark across the central visual */}
              <div className="central-watermark-overlay" aria-hidden="true">
                <span className="prominent-wordmark">VAANIFILL</span>
              </div>

              {/* Three Low-Contrast Annotations */}
              <div className="annotation-tag annotation-1">
                <span className="annotation-tag-dot" aria-hidden="true" />
                <span>Your information</span>
              </div>

              <div className="annotation-tag annotation-2">
                <span className="annotation-tag-dot" aria-hidden="true" />
                <span>Smart form matching</span>
              </div>

              <div className="annotation-tag annotation-3">
                <span className="annotation-tag-dot" aria-hidden="true" />
                <span>You stay in control</span>
              </div>

            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
