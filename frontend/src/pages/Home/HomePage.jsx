import React from 'react'
import DocumentWorkspace from '../../components/DocumentWorkspace/DocumentWorkspace'
import './HomePage.css'

export default function HomePage({
  currentUser = null,
  userProfile = null,
  onNavigate,
}) {
  return (
    <div className="home-page-root">
      {/* Shared Document-Filling Experience with Citizen Profile Form-Matching */}
      <DocumentWorkspace
        currentUser={currentUser}
        userProfile={userProfile}
        isGuest={false}
        onNavigateToProfile={() => onNavigate?.('my-information')}
      />
    </div>
  )
}
