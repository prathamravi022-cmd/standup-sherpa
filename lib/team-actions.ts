'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { teamMember, teamUpdate } from '@/lib/db/schema'

const memberSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Name is too long.'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(25).regex(/^\+?[\d\s().-]+$/, 'Enter a valid phone number.'),
  role: z.string().trim().max(80).default('Team member'),
})

const updateSchema = z.object({
  memberId: z.string().uuid(),
  status: z.enum(['On track', 'Needs help', 'On PTO']),
  vibe: z.enum(['Good', 'Neutral', 'Overwhelmed', 'Away']),
  yesterday: z.string().trim().max(1200),
  today: z.string().trim().max(1200),
  blocker: z.string().trim().max(600),
  pointsCompleted: z.number().int().min(0).max(1000),
  pointsTotal: z.number().int().min(0).max(1000),
}).refine((value) => value.pointsCompleted <= value.pointsTotal, {
  message: 'Completed points cannot exceed total points.',
  path: ['pointsCompleted'],
})

export type TeamActionResult = { success: true } | { success: false; message: string }

export async function addTeamMember(input: unknown): Promise<TeamActionResult> {
  const parsed = memberSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the member details.' }

  const user = await getCurrentUser()
  if (!user) return { success: false, message: 'Your session has expired. Sign in again to continue.' }

  try {
    const email = parsed.data.email.toLowerCase()
    const [existing] = await db.select({ id: teamMember.id, isActive: teamMember.isActive }).from(teamMember).where(and(
      eq(teamMember.userId, user.id),
      eq(teamMember.email, email),
    )).limit(1)

    if (existing?.isActive) return { success: false, message: 'A teammate with that email is already in this workspace.' }

    if (existing) {
      await db.update(teamMember).set({
        name: parsed.data.name,
        phone: parsed.data.phone,
        role: parsed.data.role || 'Team member',
        isActive: true,
        updatedAt: new Date(),
      }).where(and(eq(teamMember.id, existing.id), eq(teamMember.userId, user.id)))
    } else {
      await db.insert(teamMember).values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: parsed.data.name,
        email,
        phone: parsed.data.phone,
        role: parsed.data.role || 'Team member',
      })
    }

    revalidatePath('/team')
    return { success: true }
  } catch {
    return { success: false, message: 'Could not save this teammate. Please try again.' }
  }
}

export async function saveTeamUpdate(input: unknown): Promise<TeamActionResult> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the standup details.' }

  const user = await getCurrentUser()
  if (!user) return { success: false, message: 'Your session has expired. Sign in again to continue.' }

  try {
    const member = await db.select({ id: teamMember.id }).from(teamMember).where(and(
      eq(teamMember.id, parsed.data.memberId),
      eq(teamMember.userId, user.id),
      eq(teamMember.isActive, true),
    )).limit(1)

    if (!member.length) return { success: false, message: 'That teammate is no longer in this workspace.' }

    await db.insert(teamUpdate).values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...parsed.data,
    })
    revalidatePath('/team')
    return { success: true }
  } catch {
    return { success: false, message: 'Could not save this standup. Please try again.' }
  }
}

export async function archiveTeamMember(memberId: string): Promise<TeamActionResult> {
  const parsedId = z.string().uuid().safeParse(memberId)
  if (!parsedId.success) return { success: false, message: 'That teammate could not be found.' }

  const user = await getCurrentUser()
  if (!user) return { success: false, message: 'Your session has expired. Sign in again to continue.' }

  try {
    await db.update(teamMember).set({ isActive: false, updatedAt: new Date() }).where(and(
      eq(teamMember.id, parsedId.data),
      eq(teamMember.userId, user.id),
    ))
    revalidatePath('/team')
    return { success: true }
  } catch {
    return { success: false, message: 'Could not archive this teammate. Please try again.' }
  }
}
