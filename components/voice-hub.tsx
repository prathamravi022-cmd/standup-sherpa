'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, AudioLines, Check, CircleHelp, Copy, GitBranch, Mic, MicOff, Pause, Play, Send, Sparkles, Users, Volume2, VolumeX, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceOrb } from '@/components/voice-orb'
import Link from 'next/link'

type OrbState = 'idle' | 'listening' | 'processing' | 'done'
type Briefing = { yesterday: string[]; today: string[]; blockers: string[] }

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const examples = ['“Alexa, prep my standup”', '“Hey Sherpa”', '“Computer, standup”', '“Mera standup prep karo”']
export function VoiceHub() {
  const [voiceState, setVoiceState] = useState<OrbState>('idle')
  const [command, setCommand] = useState('')
  const [transcript, setTranscript] = useState('')
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [nextStep, setNextStep] = useState<'sign-in' | 'dashboard' | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const spaceActiveRef = useRef(false)
  const voiceStateRef = useRef<OrbState>('idle')
  const recognizedTextRef = useRef('')

  const generateBriefing = useCallback(async (value: string) => {
    const normalized = value.trim()
    if (!normalized) return
    setCommand(normalized)
    setTranscript(`“${normalized}”`)
    setNextStep(null)
    setLatencyMs(null)
    voiceStateRef.current = 'processing'
    setVoiceState('processing')
    setBriefing(null)

    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: normalized }),
      })
      const payload = await response.json() as { briefing?: Briefing; latencyMs?: number; error?: string }
      if (!response.ok || !payload.briefing) {
        setTranscript(payload.error ?? 'Could not prepare your briefing. Please try again.')
        if (response.status === 401) setNextStep('sign-in')
        if (response.status === 422) setNextStep('dashboard')
        voiceStateRef.current = 'idle'
        setVoiceState('idle')
        return
      }
      setBriefing(payload.briefing)
      setLatencyMs(payload.latencyMs ?? null)
      voiceStateRef.current = 'done'
      setVoiceState('done')
    } catch {
      setTranscript('Could not reach the briefing service. Please try again.')
      voiceStateRef.current = 'idle'
      setVoiceState('idle')
    }
  }, [])

  const startListening = useCallback(() => {
    if (voiceStateRef.current === 'listening') return
    recognizedTextRef.current = ''
    const SpeechAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechAPI) {
      setTranscript('Voice recognition is not available in this browser. Try a typed command instead.')
      return
    }
    try {
      const recognition = new SpeechAPI()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-IN'
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1]
        const text = result?.[0]?.transcript ?? ''
        if (text) {
          recognizedTextRef.current = text
          setTranscript(text)
          setCommand(text)
        }
      }
      recognition.onerror = () => {
        voiceStateRef.current = 'idle'
        setVoiceState('idle')
      }
      recognition.onend = () => {
        if (voiceStateRef.current === 'listening') {
          voiceStateRef.current = 'idle'
          setVoiceState('idle')
        }

        if (recognizedTextRef.current.trim()) generateBriefing(recognizedTextRef.current)
      }
      recognitionRef.current = recognition
      setTranscript('Listening for your standup…')
      voiceStateRef.current = 'listening'
      setVoiceState('listening')
      recognition.start()
    } catch {
      voiceStateRef.current = 'idle'
      setVoiceState('idle')
      setTranscript('Microphone access was unavailable. You can still type a command below.')
    }
  }, [generateBriefing])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && voiceStateRef.current === 'listening') recognitionRef.current.stop()
    else if (voiceStateRef.current === 'listening') {
      voiceStateRef.current = 'idle'
      setVoiceState('idle')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (event.code === 'Space' && !isTyping && !event.repeat) {
        event.preventDefault()
        spaceActiveRef.current = true
        startListening()
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && spaceActiveRef.current) {
        spaceActiveRef.current = false
        stopListening()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [startListening, stopListening])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    generateBriefing(command || 'Prep my standup')
  }

  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) return
    if (event.key === 'Enter') generateBriefing(command)
  }

  const speakSummary = () => {
    if (muted) return
    if (isSpeaking) {
      window.speechSynthesis?.pause()
      setIsSpeaking(false)
      return
    }
    if (!briefing) return
    const summary = [...briefing.yesterday, ...briefing.today, ...briefing.blockers].join('. ')
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(summary)
      utterance.rate = speed
      utterance.onend = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
      setIsSpeaking(true)
    }
  }

  const copyBriefing = async () => {
    if (!briefing) return
    const data = briefing
    const markdown = `*Yesterday:*\n${data.yesterday.map((item) => `• ${item}`).join('\n')}\n\n*Today:*\n${data.today.map((item) => `• ${item}`).join('\n')}\n\n*Blockers:*\n${data.blockers.length ? data.blockers.map((item) => `• ${item}`).join('\n') : 'None reported'}`
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setTranscript('Clipboard access is unavailable in this browser.')
    }
  }

  return (
    <div className="voice-page">
      <section className="voice-hero" aria-labelledby="home-heading">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="kicker-line" /> YOUR ENGINEERING MORNING, IN SYNC <span className="kicker-line" /></div>
          <h1 id="home-heading">Walk into standup <span>ready.</span></h1>
          <p className="hero-subtitle">Speak a command — your saved team updates become<br className="desktop-break" /> a clear, source-grounded standup briefing.</p>
        </div>

        <div className="voice-interaction">
          <div className="orb-wrap">
            <VoiceOrb state={voiceState} />
            <button type="button" className={`mic-core-button ${voiceState === 'listening' ? 'mic-is-listening' : ''}`} onClick={() => voiceState === 'listening' ? stopListening() : startListening()} aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice command'}>
              {voiceState === 'listening' ? <AudioLines aria-hidden="true" /> : <Mic aria-hidden="true" />}
            </button>
            <span className="orb-state-label">{voiceState === 'idle' ? 'VOICE CORE · READY' : voiceState === 'listening' ? 'LISTENING' : voiceState === 'processing' ? 'SYNTHESIZING' : 'BRIEFING READY'}</span>
          </div>

          <div className={`voice-meter ${voiceState === 'listening' ? 'meter-active' : ''}`} aria-label="Voice activity visualization">
            {Array.from({ length: 34 }, (_, index) => <span key={index} style={{ '--bar-index': index } as React.CSSProperties} />)}
          </div>
          <p className="mic-instruction">{voiceState === 'listening' ? 'Listening now. Speak naturally, then pause.' : voiceState === 'processing' ? 'Pulling your work together…' : 'Tap the mic or hold Spacebar and speak'}</p>
          <AnimatePresence mode="wait"><motion.p key={transcript || 'empty'} className={`live-transcript ${transcript ? 'has-transcript' : ''}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{transcript || ' '}</motion.p></AnimatePresence>
          {nextStep && <Link className="briefing-next-step" href={nextStep === 'sign-in' ? '/auth/sign-in' : '/team'}>{nextStep === 'sign-in' ? 'Sign in to continue' : 'Open your team dashboard'} <ArrowUpRight /></Link>}
          <div className="example-prompts" aria-label="Try a voice command">
            {examples.map((example) => <button key={example} type="button" onClick={() => generateBriefing(example.replace(/[“”]/g, ''))}>{example}</button>)}
          </div>
          <form className="command-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="standup-command">Standup command</label>
            <input id="standup-command" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={handleEnter} placeholder="Type ‘prep my standup’ or press Enter" />
            <Button type="submit" className="send-button" aria-label="Send command"><span>Prepare</span><Send aria-hidden="true" /></Button>
          </form>
          <div className="voice-shortcuts"><span>Push-to-talk <kbd>Space</kbd></span><i /> <span>Command menu <kbd>⌘ K</kbd></span><i /> <span>Silence auto-stops after 2s</span></div>
        </div>
      </section>

      <AnimatePresence>
        {briefing && (
          <motion.section className="briefing-panel glass-panel" aria-label="Your standup briefing" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.35 }}>
            <div className="briefing-topline"><div><span className="eyebrow">TODAY · ENGINEERING</span><h2>Your standup is ready</h2></div><div className="briefing-meta"><span className="latency-pill"><Zap /> {latencyMs === null ? 'Generated from saved updates' : `Generated in ${latencyMs}ms via Groq`}</span><button type="button" className="icon-action" onClick={speakSummary} aria-label={isSpeaking ? 'Pause voice summary' : 'Play voice summary'}>{isSpeaking ? <Pause /> : <Play />}</button><button type="button" className="icon-action" onClick={() => { setSpeed((current) => current >= 2 ? 1 : current + 0.25) }} aria-label={`Playback speed ${speed}x`}>{speed.toFixed(speed % 1 ? 2 : 0)}x</button><button type="button" className="icon-action" onClick={() => setMuted((value) => { const next = !value; if (next) { window.speechSynthesis?.cancel(); setIsSpeaking(false) } return next })} aria-label={muted ? 'Unmute audio' : 'Mute audio'}>{muted ? <VolumeX /> : <Volume2 />}</button></div></div>
            <div className="briefing-columns">
              <BriefingColumn label="Yesterday" icon={<GitBranch />} items={briefing.yesterday} accent="blue" />
              <BriefingColumn label="Today" icon={<Sparkles />} items={briefing.today} accent="violet" />
              <BriefingColumn label="Blockers" icon={<CircleHelp />} items={briefing.blockers.length ? briefing.blockers : ['No blockers reported']} accent="green" />
            </div>
            <div className="briefing-bottom"><span className="verified-note"><Check /> Blockers are shown only when verified in source data</span><Button variant="outline" className="copy-button" onClick={copyBriefing}>{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? 'Copied' : 'Copy for Slack'}<ArrowUpRight data-icon="inline-end" /></Button></div>
          </motion.section>
        )}
      </AnimatePresence>
      <div className="home-proof-row">
        <div className="proof-item"><span className="proof-icon"><Users /></span><span><strong>Private roster</strong><small>Workspace-scoped members</small></span></div>
        <div className="proof-divider" />
        <div className="proof-item"><span className="proof-icon"><Check /></span><span><strong>Saved daily reports</strong><small>History stays in your workspace</small></span></div>
        <div className="proof-divider" />
        <div className="proof-item"><span className="proof-icon"><MicOff /></span><span><strong>Source-grounded</strong><small>No invented blockers</small></span></div>
      </div>
    </div>
  )
}

function BriefingColumn({ label, icon, items, accent }: { label: string; icon: React.ReactNode; items: string[]; accent: string }) {
  return <div className={`briefing-column accent-${accent}`}><div className="briefing-column-title">{icon}<h3>{label}</h3></div><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>
}
