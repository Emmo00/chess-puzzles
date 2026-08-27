'use client'

import { useEffect } from 'react'

export default function DemoVideo() {
  useEffect(() => {
    // Redirect to YouTube video
    window.location.href = 'https://youtu.be/QiuMrUsA2es'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-black font-bold">Redirecting to demo video...</p>
      </div>
    </div>
  )
}