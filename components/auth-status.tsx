'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth/client'

export function AuthStatus() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null

  if (!session?.user) {
    return <Link className="auth-status-link" href="/auth/sign-in">Sign in</Link>
  }

  async function signOut() {
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError('Sign out failed. Try again.')
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Sign out failed. Try again.')
    }
  }

  return (
    <div className="auth-status-wrap">
      <button className="auth-status-button" type="button" onClick={signOut} aria-label="Sign out of your workspace">
        <LogOut aria-hidden="true" /><span>Sign out</span>
      </button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div>
  )
}
