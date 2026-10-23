'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AudioLines, Command, GitBranch, LayoutDashboard, Menu, Mic2, Radio, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AuthStatus } from '@/components/auth-status'
import { useCallback, useEffect, useState } from 'react'

const primaryLinks = [
  { href: '/', label: 'Voice hub', icon: Mic2 },
  { href: '/team', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/how-it-works', label: 'How it works', icon: Sparkles },
  { href: '/about', label: 'About', icon: Radio },
]

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const closeOverlays = useCallback(() => {
    setMenuOpen(false)
    setPaletteOpen(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') closeOverlays()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeOverlays])

  const navigate = (href: string) => {
    closeOverlays()
    router.push(href)
  }

  return (
    <div className="site-frame">
      <div className="ambient-field" aria-hidden="true">
        <div className="ambient-image" />
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Standup Sherpa home" onClick={closeOverlays}>
            <span className="brand-mark"><AudioLines aria-hidden="true" /></span>
            <span className="brand-name">Standup <span>Sherpa</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {primaryLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={`nav-link ${pathname === href || (href === '/team' && pathname === '/dashboard') ? 'is-active' : ''}`}>
                {label}
              </Link>
            ))}

          </nav>
          <div className="header-actions">
            <AuthStatus />
            <button className="command-trigger" type="button" onClick={() => setPaletteOpen(true)} aria-label="Open command menu">
              <Command aria-hidden="true" /><span>Quick jump</span><kbd>⌘ K</kbd>
            </button>
            <a className="header-github" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><GitBranch aria-hidden="true" /></a>
            <button className="mobile-menu-trigger" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menuOpen && (
          <motion.nav className="mobile-nav" aria-label="Mobile navigation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeOverlays}>{link.label}</Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <main className="site-main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pathname} className="route-view" initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }} transition={{ duration: 0.28, ease: 'easeOut' }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span className="footer-demo"><span className="status-dot" /> Private workspace · your team data stays yours</span>
          <span className="footer-credit">A calmer start to every engineering day <span className="alexa-badge">Powered by Groq</span></span>
        </div>
      </footer>
      <AnimatePresence>
        {paletteOpen && (
          <motion.div className="palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="command-palette" role="dialog" aria-modal="true" aria-labelledby="palette-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}>
              <div className="palette-heading"><div><span className="eyebrow">Navigate</span><h2 id="palette-title">Jump to a destination</h2></div><kbd>ESC</kbd></div>
              <div className="palette-options">
                {primaryLinks.map(({ href, label, icon: Icon }, index) => (
                  <button key={href} type="button" className="palette-option" onClick={() => navigate(href)}><span className="palette-option-icon"><Icon /></span><span>{label}</span><kbd>{index + 1}</kbd></button>
                ))}
              </div>
              <p className="palette-hint">Tab to navigate <span>↵</span> to select <span>ESC</span> to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
