import React, { useState, useEffect } from 'react'
import Welcome from './pages/Welcome/Welcome'
import GuestWorkspace from './pages/Guest/GuestWorkspace'
import HomePage from './pages/Home/HomePage'
import MyInformationPage from './pages/Profile/MyInformationPage'
import SubmissionsPage from './pages/Submissions/SubmissionsPage'
import AccountSettingsPage from './pages/Settings/AccountSettingsPage'
import Navbar from './components/layout/Navbar'
import { getProfile, clearProfileSession } from './services/profileService'

export default function App() {
  // Current Citizen Auth Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vaanifill_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // User Profile Data (retrieved from service layer)
  const [userProfile, setUserProfile] = useState(null)

  // Lightweight hash-aware view router ('welcome' | 'guest' | 'home' | 'my-information' | 'submissions' | 'settings')
  const [currentView, setCurrentView] = useState(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '')
    const hash = rawHash === 'workspace' ? (localStorage.getItem('vaanifill_user') ? 'home' : 'guest') : rawHash
    if (['welcome', 'guest', 'home', 'my-information', 'submissions', 'settings'].includes(hash)) {
      return hash
    }
    // Default to 'home' if already logged in, otherwise 'welcome'
    try {
      const saved = localStorage.getItem('vaanifill_user')
      return saved ? 'home' : 'welcome'
    } catch {
      return 'welcome'
    }
  })

  // Synchronize hash with window history
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '')
      const hash = rawHash === 'workspace' ? (localStorage.getItem('vaanifill_user') ? 'home' : 'guest') : rawHash
      if (['welcome', 'guest', 'home', 'my-information', 'submissions', 'settings'].includes(hash)) {
        setCurrentView(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Programmatic navigation handler
  const navigateTo = (viewName) => {
    setCurrentView(viewName)
    window.location.hash = `#/${viewName}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Load user profile via service layer when user signs in or changes
  useEffect(() => {
    let isMounted = true

    async function fetchSavedProfile() {
      if (currentUser) {
        try {
          const res = await getProfile()
          if (isMounted && res.profile) {
            setUserProfile(res.profile)
          }
        } catch {
          // graceful fallback
        }
      } else {
        setUserProfile(null)
      }
    }

    fetchSavedProfile()
    return () => { isMounted = false }
  }, [currentUser])

  // Sign out handler
  const handleSignOut = () => {
    localStorage.removeItem('vaanifill_token')
    localStorage.removeItem('vaanifill_user')
    clearProfileSession()
    setCurrentUser(null)
    setUserProfile(null)
    navigateTo('welcome')
  }

  // Handle user signed in from guest workspace or welcome
  const handleUserSignedIn = (user) => {
    setCurrentUser(user)
    if (user?.profile) {
      setUserProfile(user.profile)
    }
    navigateTo('home')
  }

  // --------------------------------------------------------------------------
  // RENDER VIEWS
  // --------------------------------------------------------------------------

  // 1. Welcome Landing Page
  if (currentView === 'welcome') {
    return (
      <Welcome
        onGetStarted={() => {
          if (currentUser) {
            navigateTo('home')
          } else {
            navigateTo('guest')
          }
        }}
      />
    )
  }

  // 2. Guest Workspace
  if (currentView === 'guest') {
    return (
      <GuestWorkspace
        onNavigateHome={() => navigateTo('welcome')}
        onUserSignedIn={handleUserSignedIn}
      />
    )
  }

  // 3. Signed-In Application Shell (Home, My Information, Account Settings)
  const isNavShellView = ['home', 'my-information', 'submissions', 'settings'].includes(currentView)

  return (
    <div className="app-authenticated-shell">
      {/* Persistent Navigation Bar for signed-in sections */}
      {isNavShellView && (
        <Navbar
          activeView={currentView}
          onNavigate={navigateTo}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      )}

      {/* View 1: Signed-In Home */}
      {currentView === 'home' && (
        <HomePage
          currentUser={currentUser}
          userProfile={userProfile}
          onNavigate={navigateTo}
        />
      )}

      {/* View 2: Personal Information (My Information) */}
      {currentView === 'my-information' && (
        <MyInformationPage
          currentUser={currentUser}
          onProfileUpdated={(updated) => setUserProfile(updated)}
          onNavigate={navigateTo}
        />
      )}

      {/* View 3: Submissions History & Official Receipts */}
      {currentView === 'submissions' && (
        <SubmissionsPage onNavigateToHome={() => navigateTo('home')} />
      )}

      {/* View 3: Account Settings */}
      {currentView === 'settings' && (
        <AccountSettingsPage
          currentUser={currentUser}
          onNavigate={navigateTo}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}
