'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useMiniApp, MiniAppSDK, MiniAppContext } from '../hooks/useMiniApp'

interface MiniAppProviderValue {
  sdk: MiniAppSDK | null
  isInMiniApp: boolean
  isLoading: boolean
  user?: MiniAppContext['user']
  client?: MiniAppContext['client']
}

const MiniAppContext = createContext<MiniAppProviderValue | undefined>(undefined)

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const miniAppState = useMiniApp()

  return (
    <MiniAppContext.Provider value={miniAppState}>
      {children}
    </MiniAppContext.Provider>
  )
}

export function useMiniAppContext() {
  const context = useContext(MiniAppContext)
  if (context === undefined) {
    throw new Error('useMiniAppContext must be used within a MiniAppProvider')
  }
  return context
}

export type { MiniAppProviderValue }