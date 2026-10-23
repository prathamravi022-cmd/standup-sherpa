import { and, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { TeamDashboard } from '@/components/team-dashboard'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { teamMember, teamUpdate } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/sign-in')

  const [memberRows, updateRows] = await Promise.all([
    db.select().from(teamMember).where(and(eq(teamMember.userId, user.id), eq(teamMember.isActive, true))).orderBy(desc(teamMember.createdAt)),
    db.select().from(teamUpdate).where(eq(teamUpdate.userId, user.id)).orderBy(desc(teamUpdate.createdAt)),
  ])

  return (
    <TeamDashboard
      members={memberRows.map((member) => ({ ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() }))}
      updates={updateRows.map((update) => ({ ...update, createdAt: update.createdAt.toISOString() }))}
      currentUser={{ name: user.name ?? '', email: user.email ?? '' }}
    />
  )
}
