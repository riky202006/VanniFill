import React, { useState } from 'react'
import {
  Home,
  User,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import './Navbar.css'

export default function Navbar({
  activeView = 'home',
  onNavigate,
  currentUser = null,
  onSignOut,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)

  const handleNavClick = (viewName) => {
    onNavigate?.(viewName)
    setIsMobileMenuOpen(false)
    setIsUserDropdownOpen(false)
  }

  const handleSignOutClick = () => {
    setIsUserDropdownOpen(false)
    setIsMobileMenuOpen(false)
    onSignOut?.()
  }

  // Get user initial for avatar
  const userInitial = currentUser?.name
    ? currentUser.name.trim().charAt(0).toUpperCase()
    : 'U'

  return (
    <header className="app-navbar" role="banner">
      <div className="navbar-inner">
        {/* 1. Brand Logo */}
        <div
          className="navbar-brand"
          onClick={() => handleNavClick(currentUser ? 'home' : 'welcome')}
          role="button"
          tabIndex={0}
          title="VaaniFill AI Home"
          onKeyDown={(e) => e.key === 'Enter' && handleNavClick(currentUser ? 'home' : 'welcome')}
        >
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-title">VAANIFILL</span>
          <span className="brand-sub">AI</span>
        </div>

        {/* 2. Desktop Navigation Links */}
        <nav className="desktop-nav-links" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-item-btn ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            <Home className="nav-item-icon" />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`nav-item-btn ${activeView === 'my-information' ? 'active' : ''}`}
            onClick={() => handleNavClick('my-information')}
          >
            <User className="nav-item-icon" />
            <span>My Information</span>
          </button>

          <button
            type="button"
            className={`nav-item-btn ${activeView === 'submissions' ? 'active' : ''}`}
            onClick={() => handleNavClick('submissions')}
          >
            <FileCheck className="nav-item-icon" />
            <span>My Submissions</span>
          </button>

          <button
            type="button"
            className={`nav-item-btn ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
          >
            <Settings className="nav-item-icon" />
            <span>Account Settings</span>
          </button>
        </nav>

        {/* 3. Right Account Menu / Actions */}
        <div className="navbar-actions">
          {currentUser ? (
            <div className="user-menu-wrapper">
              <button
                type="button"
                className="user-profile-btn"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                aria-expanded={isUserDropdownOpen}
                aria-haspopup="true"
                title="Account Menu"
              >
                <div className="user-avatar-circle" aria-hidden="true">
                  {userInitial}
                </div>
                <span className="user-display-name">{currentUser.name || 'Citizen'}</span>
                <ChevronDown className="user-menu-chevron" />
              </button>

              {/* User Dropdown */}
              {isUserDropdownOpen && (
                <>
                  <div
                    className="dropdown-scrim"
                    onClick={() => setIsUserDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="user-dropdown-menu" role="menu">
                    <div className="dropdown-user-header">
                      <p className="dropdown-name">{currentUser.name}</p>
                      <p className="dropdown-email">{currentUser.email || 'Citizen Account'}</p>
                    </div>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      role="menuitem"
                      className="dropdown-item"
                      onClick={() => handleNavClick('home')}
                    >
                      <Home className="dropdown-icon" />
                      <span>Home Workspace</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="dropdown-item"
                      onClick={() => handleNavClick('my-information')}
                    >
                      <User className="dropdown-icon" />
                      <span>My Information</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="dropdown-item"
                      onClick={() => handleNavClick('submissions')}
                    >
                      <FileCheck className="dropdown-icon" />
                      <span>My Submissions</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="dropdown-item"
                      onClick={() => handleNavClick('settings')}
                    >
                      <Settings className="dropdown-icon" />
                      <span>Account Settings</span>
                    </button>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      role="menuitem"
                      className="dropdown-item dropdown-logout-item"
                      onClick={handleSignOutClick}
                    >
                      <LogOut className="dropdown-icon" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="guest-nav-actions">
              <div className="guest-status-badge">
                <span className="guest-status-dot" aria-hidden="true" />
                <span>Guest Mode</span>
              </div>
            </div>
          )}

          {/* 4. Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="mobile-toggle-icon" />
            ) : (
              <Menu className="mobile-toggle-icon" />
            )}
          </button>
        </div>
      </div>

      {/* 5. Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer" role="navigation" aria-label="Mobile Navigation">
          <div className="mobile-drawer-links">
            <button
              type="button"
              className={`mobile-nav-link ${activeView === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <Home className="mobile-link-icon" />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-link ${activeView === 'my-information' ? 'active' : ''}`}
              onClick={() => handleNavClick('my-information')}
            >
              <User className="mobile-link-icon" />
              <span>My Information</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-link ${activeView === 'submissions' ? 'active' : ''}`}
              onClick={() => handleNavClick('submissions')}
            >
              <FileCheck className="mobile-link-icon" />
              <span>My Submissions</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-link ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <Settings className="mobile-link-icon" />
              <span>Account Settings</span>
            </button>

            {currentUser ? (
              <button
                type="button"
                className="mobile-nav-link mobile-logout-link"
                onClick={handleSignOutClick}
              >
                <LogOut className="mobile-link-icon" />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            ) : (
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('welcome')}
              >
                <span>Back to Welcome</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
