import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function ThankYouPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center p-md">
      <div className="text-center max-w-md bg-surface-container p-xl rounded-3xl border border-outline-variant shadow-xl w-full">
        <span className="material-symbols-outlined text-secondary text-[64px] mb-md" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <h1 className="font-headline-lg text-on-surface mb-sm">Thank You for Joining!</h1>
        <p className="font-body-md text-on-surface-variant mb-xl">
          You have successfully left the session.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-on-primary hover:bg-surface-tint px-lg py-sm rounded-xl font-label-md uppercase tracking-wider transition-colors w-full"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
