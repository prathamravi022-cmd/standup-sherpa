'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, AudioLines, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'

type AuthFormProps = { mode: 'sign-in' | 'sign-up' }

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const isSignUp = mode === 'sign-up'
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: String(formData.get('name') ?? '').trim(),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password })

      if (result.error) {
        setError('We could not complete that request. Check your details and try again.')
        return
      }

      router.replace('/team')
      router.refresh()
    } catch {
      setError('We could not reach the sign-in service. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass-card" aria-labelledby="auth-title">
        <Link href="/" className="auth-brand"><span className="brand-mark"><AudioLines /></span><span>Standup <strong>Sherpa</strong></span></Link>
        <span className="eyebrow"><LockKeyhole /> PRIVATE WORKSPACE</span>
        <h1 id="auth-title">{isSignUp ? 'Start with your team.' : 'Welcome back.'}</h1>
        <p className="auth-description">{isSignUp ? 'Create your account to add teammates and keep daily updates in one private workspace.' : 'Sign in to see your team roster and the latest standup updates.'}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp && <label className="form-field"><span>Your name</span><input name="name" type="text" autoComplete="name" maxLength={100} required /></label>}
          <label className="form-field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="form-field"><span>Password</span><input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <Button type="submit" size="lg" disabled={pending} className="auth-submit">
            {pending ? 'Please wait…' : isSignUp ? 'Create workspace account' : 'Sign in'}
            {!pending && <ArrowRight data-icon="inline-end" />}
          </Button>
        </form>

        <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to Standup Sherpa?'}{' '}
          <Link href={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}>{isSignUp ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  )
}
