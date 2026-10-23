'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Archive, ArrowRight, BarChart3, Check, CheckCircle2, ChevronRight, Circle, Clock3, Database, Mail, MoreHorizontal, Phone, Plus, Sparkles, Users, Workflow } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { archiveTeamMember, addTeamMember, saveTeamUpdate } from '@/lib/team-actions'

type Member = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Update = {
  id: string
  memberId: string
  status: string
  vibe: string
  yesterday: string
  today: string
  blocker: string
  pointsCompleted: number
  pointsTotal: number
  createdAt: string
}

type TeamDashboardProps = {
  members: Member[]
  updates: Update[]
  currentUser: { name: string; email: string }
}

const filters = ['Everyone', 'Needs help', 'On PTO'] as const
const statusOptions = ['On track', 'Needs help', 'On PTO'] as const
const vibeOptions = ['Good', 'Neutral', 'Overwhelmed', 'Away'] as const

export function TeamDashboard({ members, updates, currentUser }: TeamDashboardProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof filters)[number]>('Everyone')
  const [memberFormOpen, setMemberFormOpen] = useState(members.length === 0)
  const [reportMemberId, setReportMemberId] = useState<string | null>(null)
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')

  const updatesByMember = useMemo(() => {
    const grouped = new Map<string, Update[]>()
    for (const update of updates) {
      const history = grouped.get(update.memberId) ?? []
      history.push(update)
      grouped.set(update.memberId, history)
    }
    return grouped
  }, [updates])

  const latestByMember = useMemo(() => new Map(
    [...updatesByMember].map(([memberId, history]) => [memberId, history[0]]),
  ), [updatesByMember])

  const visibleMembers = members.filter((member) => {
    if (filter === 'Everyone') return true
    return latestByMember.get(member.id)?.status === filter
  })
  const blockers = members.flatMap((member) => {
    const latest = latestByMember.get(member.id)
    return latest?.blocker ? [{ member, blocker: latest.blocker }] : []
  })
  const today = new Date().toISOString().slice(0, 10)
  const reportedToday = new Set(updates.filter((update) => new Date(update.createdAt).toISOString().slice(0, 10) === today).map((update) => update.memberId)).size
  const storyPoints = members.reduce((total, member) => {
    const update = latestByMember.get(member.id)
    return { completed: total.completed + (update?.pointsCompleted ?? 0), total: total.total + (update?.pointsTotal ?? 0) }
  }, { completed: 0, total: 0 })
  const pointProgress = storyPoints.total ? Math.round(storyPoints.completed / storyPoints.total * 100) : 0

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true)
    setNotice('')
    const result = await addTeamMember({
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      role: String(form.get('role') ?? ''),
    })
    setBusy(false)
    setNotice(result.success ? 'Teammate added to your private workspace.' : result.message)
    if (result.success) {
      formElement.reset()
      setMemberName('')
      setMemberEmail('')
      setMemberFormOpen(false)
      router.refresh()
    }
  }

  async function handleSaveUpdate(event: FormEvent<HTMLFormElement>, memberId: string) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setNotice('')
    const result = await saveTeamUpdate({
      memberId,
      status: String(form.get('status')),
      vibe: String(form.get('vibe')),
      yesterday: String(form.get('yesterday') ?? ''),
      today: String(form.get('today') ?? ''),
      blocker: String(form.get('blocker') ?? ''),
      pointsCompleted: Number(form.get('pointsCompleted') ?? 0),
      pointsTotal: Number(form.get('pointsTotal') ?? 0),
    })
    setBusy(false)
    setNotice(result.success ? 'Standup saved to the update history.' : result.message)
    if (result.success) {
      setReportMemberId(null)
      router.refresh()
    }
  }

  async function handleArchive(member: Member) {
    if (!window.confirm(`Archive ${member.name}? Their saved update history will be kept.`)) return
    setBusy(true)
    setNotice('')
    const result = await archiveTeamMember(member.id)
    setBusy(false)
    setNotice(result.success ? `${member.name} was archived. Their update history is preserved.` : result.message)
    if (result.success) router.refresh()
  }

  return (
    <div className="content-page team-page">
      <header className="page-heading team-heading">
        <span className="eyebrow"><span className="status-dot" /> ENGINEERING · DAILY PULSE</span>
        <h1>One team. <span>One clear view.</span></h1>
        <p>Your private roster, the updates your teammates submit, and the blockers that were actually reported.</p>
      </header>

      <div className="dashboard-topbar">
        <div className="date-display"><span className="date-square"><Clock3 /></span><span><strong>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date())}</strong><small>Workspace · Daily updates</small></span></div>
        <div className="dashboard-status"><span className="sync-indicator"><Activity /> Saved to your workspace</span></div>
      </div>

      <div className="team-stat-grid">
        <StatCard icon={Users} label="Team members" value={String(members.length)} detail="active in this workspace" tone="blue" />
        <StatCard icon={CheckCircle2} label="Reports today" value={`${reportedToday} / ${members.length}`} detail="members with an update today" tone="green" />
        <StatCard icon={AlertTriangle} label="Active blockers" value={String(blockers.length)} detail="reported by teammates" tone="amber" />
        <StatCard icon={BarChart3} label="Story points" value={storyPoints.total ? `${storyPoints.completed} / ${storyPoints.total}` : '—'} detail={storyPoints.total ? `${pointProgress}% of reported points` : 'no point estimates yet'} progress={pointProgress} tone="violet" />
      </div>

      {blockers.length > 0 && (
        <section className="blocker-wall glass-card" aria-labelledby="blocker-heading">
          <div className="blocker-wall-icon"><AlertTriangle /></div>
          <div className="blocker-wall-copy"><span className="eyebrow">REPORTED · {blockers.length} {blockers.length === 1 ? 'BLOCKER' : 'BLOCKERS'}</span><h2 id="blocker-heading">Someone could use a hand.</h2><p>Only blockers explicitly entered in a saved update appear here.</p></div>
          <div className="blocker-tags">{blockers.map(({ member, blocker }) => <span key={member.id}><strong>{member.name.split(' ')[0]}</strong>{blocker}</span>)}</div>
        </section>
      )}

      <div className="section-heading team-section-heading">
        <div><h2>Team standups</h2><p>Member details and the latest saved report.</p></div>
        <div className="team-heading-actions">
          <div className="team-filters" role="group" aria-label="Filter teammates">{filters.map((value) => <button type="button" key={value} className={filter === value ? 'filter-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
          <button type="button" className="add-member-button" onClick={() => { setNotice(''); setMemberFormOpen((open) => !open) }}><Plus /> Add teammate</button>
        </div>
      </div>

      {notice && <p className="team-notice" role="status">{notice}</p>}

      {memberFormOpen && (
        <section className="member-form-panel glass-card" aria-labelledby="member-form-heading">
          <div className="member-form-heading"><div><span className="eyebrow">WORKSPACE ROSTER</span><h2 id="member-form-heading">Add a teammate</h2></div><button className="form-close" type="button" onClick={() => setMemberFormOpen(false)} aria-label="Close add teammate form">×</button></div>
          <p className="member-form-note">Contact details are visible only in your workspace. Adding a teammate does not send an invitation.</p>
          <button type="button" className="use-account-button" onClick={() => { setMemberName(currentUser.name); setMemberEmail(currentUser.email) }}>Use my account details</button>
          <form className="member-form" onSubmit={handleAddMember}>
            <label className="form-field"><span>Full name</span><input name="name" autoComplete="name" maxLength={100} value={memberName} onChange={(event) => setMemberName(event.target.value)} required /></label>
            <label className="form-field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} required /></label>
            <label className="form-field"><span>Phone number</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={25} placeholder="+1 555 010 2048" required /></label>
            <label className="form-field"><span>Role or team</span><input name="role" maxLength={80} placeholder="Engineering" /></label>
            <div className="member-form-footer"><span>Required: name, email, and phone.</span><button type="submit" className="add-member-button" disabled={busy}>{busy ? 'Saving…' : 'Add to roster'}<ArrowRight /></button></div>
          </form>
        </section>
      )}

      {members.length === 0 ? (
        <section className="team-empty-state glass-card"><span className="team-empty-icon"><Users /></span><h2>Your roster starts here.</h2><p>Add your account or a teammate, then record updates to build a reliable daily view. Nothing is pre-filled.</p><button type="button" className="add-member-button" onClick={() => setMemberFormOpen(true)}><Plus /> Add the first teammate</button></section>
      ) : visibleMembers.length === 0 ? (
        <section className="team-empty-state glass-card"><span className="team-empty-icon"><Users /></span><h2>No teammates match this filter.</h2><p>Try another status to see the rest of your roster.</p></section>
      ) : (
        <div className="team-grid">{visibleMembers.map((member, index) => {
          const history = updatesByMember.get(member.id) ?? []
          const latest = history[0]
          const initials = member.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
          const status = latest?.status ?? 'Awaiting update'
          const statusClass = status.toLowerCase().replaceAll(' ', '-')
          return (
            <motion.article className="team-card glass-card" key={member.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}>
              <div className="team-card-header"><div className="team-avatar">{initials || 'TM'}</div><div className="team-identity"><h3>{member.name}</h3><span>{member.role || 'Team member'}</span></div><button type="button" className="member-menu" aria-label={`Archive ${member.name}`} disabled={busy} onClick={() => handleArchive(member)}><Archive /></button></div>
              <div className="member-contact"><a href={`mailto:${member.email}`}><Mail />{member.email}</a><a href={`tel:${member.phone}`}><Phone />{member.phone}</a></div>
              <div className="team-card-status"><span className={`status-pill status-${statusClass}`}><span />{status}</span>{latest && <span className={`vibe-pill vibe-${latest.vibe.toLowerCase()}`}>{latest.vibe}</span>}</div>
              {latest ? <>
                <div className="team-task"><span className="task-label"><Check /> YESTERDAY</span><p>{latest.yesterday || 'No completed work noted.'}</p></div>
                <div className="team-task"><span className="task-label"><Circle /> TODAY <span className="task-points">{latest.pointsCompleted} / {latest.pointsTotal} pts</span></span><p>{latest.today || 'No focus noted.'}</p></div>
                {latest.blocker && <div className="member-blocker"><AlertTriangle />{latest.blocker}</div>}
                <p className="member-updated">Last report · {formatDate(latest.createdAt)}</p>
              </> : <div className="member-no-update"><span>No standup has been added yet.</span><span>Added {formatDate(member.createdAt)}</span></div>}

              {reportMemberId === member.id ? (
                <form className="report-form" onSubmit={(event) => handleSaveUpdate(event, member.id)}>
                  <label className="form-field"><span>Yesterday</span><textarea name="yesterday" rows={2} maxLength={1200} placeholder="What did they complete?" /></label>
                  <label className="form-field"><span>Today</span><textarea name="today" rows={2} maxLength={1200} placeholder="What are they focusing on?" /></label>
                  <label className="form-field"><span>Blocker <small>— leave blank if none</small></span><textarea name="blocker" rows={2} maxLength={600} placeholder="Only add a reported blocker" /></label>
                  <div className="report-selects"><label className="form-field"><span>Status</span><select name="status" defaultValue="On track">{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="form-field"><span>Vibe</span><select name="vibe" defaultValue="Neutral">{vibeOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div>
                  <div className="report-points"><label className="form-field"><span>Points completed</span><input name="pointsCompleted" type="number" min={0} max={1000} defaultValue={0} required /></label><label className="form-field"><span>Points total</span><input name="pointsTotal" type="number" min={0} max={1000} defaultValue={0} required /></label></div>
                  <div className="report-form-actions"><button type="button" className="use-account-button" onClick={() => setReportMemberId(null)}>Cancel</button><button type="submit" className="add-member-button" disabled={busy}>{busy ? 'Saving…' : 'Save report'}</button></div>
                </form>
              ) : <div className="member-actions"><button type="button" className="member-report-button" onClick={() => { setNotice(''); setReportMemberId(member.id) }}>{latest ? 'Add daily update' : 'Record first update'}<ArrowRight /></button>{history.length > 0 && <button type="button" className="history-toggle" aria-expanded={historyMemberId === member.id} onClick={() => setHistoryMemberId(historyMemberId === member.id ? null : member.id)}>{historyMemberId === member.id ? 'Hide' : 'View'} history ({history.length})</button>}</div>}

              {historyMemberId === member.id && history.length > 0 && (
                <div className="member-history"><h4>Recent updates</h4>{history.slice(0, 5).map((update) => <article className="history-entry" key={update.id}><span>{formatDate(update.createdAt)} · {update.status}</span>{update.yesterday && <p><strong>Yesterday:</strong> {update.yesterday}</p>}{update.today && <p><strong>Today:</strong> {update.today}</p>}{update.blocker && <p className="history-blocker"><strong>Blocker:</strong> {update.blocker}</p>}</article>)}{history.length > 5 && <span className="history-more">Showing the 5 latest of {history.length} saved updates.</span>}</div>
              )}
            </motion.article>
          )
        })}</div>
      )}

      <div className="dashboard-bottom-links"><Link href="/data"><Database /> Inspect sample source data <ChevronRight /></Link><Link href="/how-it-works"><Workflow /> How the briefing is built <ChevronRight /></Link></div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail, progress, tone }: { icon: typeof Users; label: string; value: string; detail: string; progress?: number; tone: string }) {
  return <article className={`stat-card glass-card stat-${tone}`}><div className="stat-card-top"><span className="stat-icon"><Icon /></span><span className="stat-label">{label}</span><MoreHorizontal aria-hidden="true" /></div><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span>{typeof progress === 'number' && <div className="stat-progress" aria-label={`${progress}% of reported points`}><span style={{ width: `${progress}%` }} /></div>}</article>
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(date))
}
