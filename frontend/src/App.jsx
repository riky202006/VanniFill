import React, { useState } from 'react'
import Welcome from './pages/Welcome/Welcome'
import GuestWorkspace from './pages/Guest/GuestWorkspace'

export default function App() {
  const [currentView, setCurrentView] = useState('welcome')

  if (currentView === 'guest') {
    return <GuestWorkspace onNavigateHome={() => setCurrentView('welcome')} />
  }

  return <Welcome onGetStarted={() => setCurrentView('guest')} />
}
