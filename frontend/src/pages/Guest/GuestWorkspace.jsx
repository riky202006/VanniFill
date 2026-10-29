import React, { useState } from 'react'
import {
  User,
  LogOut,
} from 'lucide-react'
import DocumentWorkspace from '../../components/DocumentWorkspace/DocumentWorkspace'
import AuthModal from '../../components/AuthModal/AuthModal'
import './GuestWorkspace.css'

export default function GuestWorkspace({ onNavigateHome, onUserSignedIn }) {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vaanifill_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Auth Modal State
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' })

  const handleSignOut = () => {
    localStorage.removeItem('vaanifill_token')
    localStorage.removeItem('vaanifill_user')
    setCurrentUser(null)
  }

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    onUserSignedIn?.(user)
  }

  return (
    <div className="guest-workspace-root">
      {/* --------------------------------------------------------------------
          1. GUEST WORKSPACE NAVBAR
          -------------------------------------------------------------------- */}
      <header className="workspace-navbar" role="banner">
        <div className="navbar-container">
          <div
            className="navbar-brand"
            onClick={onNavigateHome}
            role="button"
            tabIndex={0}
            title="Return to Welcome Page"
            onKeyDown={(e) => e.key === 'Enter' && onNavigateHome?.()}
          >
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-title">VAANIFILL</span>
            <span className="brand-sub">AI</span>
          </div>

          <div className="navbar-actions">
            <div className="guest-badge" title="No account required for filling">
              <span className="guest-badge-dot" aria-hidden="true" />
              <span>{currentUser ? 'Citizen Account' : 'Guest Workspace'}</span>
            </div>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="auth-user-badge">
                  <User className="auth-user-icon" />
                  <span>{currentUser.name}</span>
                </div>
                <button
                  type="button"
                  className="auth-logout-btn"
                  onClick={handleSignOut}
                  title="Sign out of account"
                >
                  <LogOut style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px' }} />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="nav-auth-btn nav-signin-btn"
                  onClick={() => setAuthModal({ isOpen: true, mode: 'signin' })}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className="nav-auth-btn nav-signup-btn"
                  onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          2. SHARED DOCUMENT WORKSPACE
          -------------------------------------------------------------------- */}
      <main className="workspace-main">
        <DocumentWorkspace
          currentUser={currentUser}
          userProfile={currentUser?.profile || null}
          isGuest={!currentUser}
          onOpenAuth={() => setAuthModal({ isOpen: true, mode: 'signin' })}
        />
      </main>

      {/* --------------------------------------------------------------------
          3. INTERACTIVE AUTH MODAL
          -------------------------------------------------------------------- */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: 'signin' })}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}
