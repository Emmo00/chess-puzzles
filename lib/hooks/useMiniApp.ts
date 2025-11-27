'use client'

import { useEffect, useState } from 'react'

// Miniapp SDK types and functions
interface MiniAppContext {
  user?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }
  client?: {
    platformType?: 'web' | 'mobile'
    clientFid: number
    added: boolean
  }
}

interface MiniAppSDK {
  context: MiniAppContext
  actions: {
    ready: () => Promise<void>
    signIn: (options: { nonce: string; acceptAuthAddress?: boolean }) => Promise<{ message: string; signature: string }>
    composeCast: (options: { text?: string; embeds?: string[] }) => Promise<{ cast: any } | undefined>
    addMiniApp: () => Promise<void>
    close: () => Promise<void>
  }
  quickAuth: {
    getToken: () => Promise<{ token: string }>
    fetch: (url: string, options?: RequestInit) => Promise<Response>
  }
}

// Mock SDK for development/non-miniapp environments
const createMockSDK = (): MiniAppSDK => ({
  context: {
    user: undefined,
    client: {
      platformType: 'web',
      clientFid: 0,
      added: false
    }
  },
  actions: {
    ready: async () => {
      console.log('Mock SDK: ready() called')
    },
    signIn: async ({ nonce }) => {
      console.log('Mock SDK: signIn() called with nonce:', nonce)
      return {
        message: 'mock-message',
        signature: 'mock-signature'
      }
    },
    composeCast: async (options) => {
      console.log('Mock SDK: composeCast() called with:', options)
      return undefined
    },
    addMiniApp: async () => {
      console.log('Mock SDK: addMiniApp() called')
    },
    close: async () => {
      console.log('Mock SDK: close() called')
    }
  },
  quickAuth: {
    getToken: async () => {
      console.log('Mock SDK: quickAuth.getToken() called')
      return { token: 'mock-token' }
    },
    fetch: async (url, options) => {
      console.log('Mock SDK: quickAuth.fetch() called with:', url)
      return fetch(url, options)
    }
  }
})

export function useMiniApp() {
  const [sdk, setSdk] = useState<MiniAppSDK | null>(null)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initializeMiniApp = async () => {
      try {
        // Try to dynamically import the miniapp SDK
        const { sdk: miniAppSdk } = await import('@farcaster/miniapp-sdk')
        
        // Check if we're actually in a miniapp environment
        const inMiniApp = await miniAppSdk.isInMiniApp()
        
        if (mounted) {
          setIsInMiniApp(inMiniApp)
          setSdk(miniAppSdk)
          
          // Call ready() to hide splash screen if in miniapp
          if (inMiniApp) {
            await miniAppSdk.actions.ready()
          }
        }
      } catch (error) {
        console.log('Miniapp SDK not available, using mock SDK')
        if (mounted) {
          setIsInMiniApp(false)
          setSdk(createMockSDK())
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeMiniApp()

    return () => {
      mounted = false
    }
  }, [])

  return {
    sdk,
    isInMiniApp,
    isLoading,
    user: sdk?.context.user,
    client: sdk?.context.client
  }
}

export type { MiniAppSDK, MiniAppContext }