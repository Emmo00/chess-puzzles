'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useMiniAppContext } from '../lib/contexts/MiniAppContext'
import { Loader2, User, Crown, Zap } from 'lucide-react'

interface AuthenticatedUser {
  fid?: number
  username?: string
  displayName?: string
  pfpUrl?: string
  token?: string
}

export function MiniAppAuth() {
  const { sdk, isInMiniApp, isLoading, user: miniAppUser } = useMiniAppContext()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // If we have a miniapp user context, use it
    if (miniAppUser) {
      setUser({
        fid: miniAppUser.fid,
        username: miniAppUser.username,
        displayName: miniAppUser.displayName,
        pfpUrl: miniAppUser.pfpUrl
      })
    }
  }, [miniAppUser])

  const handleQuickAuth = async () => {
    if (!sdk) return

    setIsAuthenticating(true)
    setAuthError(null)

    try {
      const { token } = await sdk.quickAuth.getToken()
      
      // You could verify this token on your backend here
      setUser({
        ...miniAppUser,
        token
      })
    } catch (error) {
      console.error('Quick auth failed:', error)
      setAuthError('Authentication failed. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSignIn = async () => {
    if (!sdk) return

    setIsAuthenticating(true)
    setAuthError(null)

    try {
      // Generate a nonce (in production, get this from your backend)
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true
      })
      
      // In production, send result.message and result.signature to your backend for verification
      console.log('Sign in result:', result)
      
      setUser({
        ...miniAppUser,
        token: 'signed-in' // Placeholder - use real token from backend verification
      })
    } catch (error) {
      console.error('Sign in failed:', error)
      setAuthError('Sign in failed. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddApp = async () => {
    if (!sdk) return

    try {
      await sdk.actions.addMiniApp()
    } catch (error) {
      console.error('Add app failed:', error)
    }
  }

  const handleSharePuzzle = async () => {
    if (!sdk) return

    try {
      await sdk.actions.composeCast({
        text: "Just solved an amazing chess puzzle! 🏁♟️",
        embeds: [window.location.href]
      })
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {user.pfpUrl ? (
              <img 
                src={user.pfpUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="h-6 w-6" />
            )}
            Welcome, {user.displayName || user.username || `FID ${user.fid}`}!
          </CardTitle>
          <CardDescription>
            {isInMiniApp ? (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Farcaster Mini App
              </Badge>
            ) : (
              <Badge variant="outline">Web Browser</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {isInMiniApp && (
              <>
                <Button onClick={handleAddApp} size="sm" variant="outline">
                  Add to Apps
                </Button>
                <Button onClick={handleSharePuzzle} size="sm" variant="outline">
                  <Zap className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Chess Puzzles</CardTitle>
        <CardDescription>
          {isInMiniApp 
            ? "You're using the Farcaster Mini App! Sign in to track your progress."
            : "Sign in to track your puzzle solving progress."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {authError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {authError}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {isInMiniApp && (
            <Button 
              onClick={handleQuickAuth}
              disabled={isAuthenticating}
              className="w-full"
            >
              {isAuthenticating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Quick Auth
            </Button>
          )}
          
          <Button 
            onClick={handleSignIn}
            disabled={isAuthenticating}
            variant={isInMiniApp ? "outline" : "default"}
            className="w-full"
          >
            {isAuthenticating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Sign In with Farcaster
          </Button>
        </div>

        {!isInMiniApp && (
          <div className="text-xs text-gray-600 text-center">
            For the best experience, try this as a Farcaster Mini App!
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { AuthenticatedUser }