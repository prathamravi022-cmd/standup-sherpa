import { createGroq } from '@ai-sdk/groq'
import { Output, generateText } from 'ai'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { teamMember, teamUpdate } from '@/lib/db/schema'

const requestSchema = z.object({ command: z.string().trim().min(1).max(240) })
const sourceSelectionSchema = z.array(z.number().int().min(0)).max(12)
const briefingSchema = z.object({
  yesterday: sourceSelectionSchema,
  today: sourceSelectionSchema,
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in to prepare a workspace briefing.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Enter a standup command and try again.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Enter a short standup command and try again.' }, { status: 400 })

  const [member] = await db.select().from(teamMember).where(and(
    eq(teamMember.userId, user.id),
    eq(teamMember.email, user.email.toLowerCase()),
    eq(teamMember.isActive, true),
  )).limit(1)

  if (!member) {
    return Response.json({ error: 'Add your own profile to the team roster before preparing a personal briefing.' }, { status: 422 })
  }

  const [latest] = await db.select().from(teamUpdate).where(and(
    eq(teamUpdate.userId, user.id),
    eq(teamUpdate.memberId, member.id),
  )).orderBy(desc(teamUpdate.createdAt)).limit(1)

  if (!latest || (!latest.yesterday.trim() && !latest.today.trim() && !latest.blocker.trim())) {
    return Response.json({ error: 'Record a standup update for your profile before generating a briefing.' }, { status: 422 })
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'Briefing generation is not configured right now.' }, { status: 503 })
  }

  const startedAt = Date.now()
  const splitSources = (value: string) => value.split(/\r?\n/).map((line) => line.trim().replace(/^[-•*]\s*/, '')).filter(Boolean).slice(0, 12)
  const yesterdaySources = splitSources(latest.yesterday)
  const todaySources = splitSources(latest.today)
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

  try {
    const result = await generateText({
      model: groq('openai/gpt-oss-20b'),
      output: Output.object({ schema: briefingSchema }),
      system: 'Select and order relevant saved update bullets for a concise engineering standup. Return only arrays of integer indices, each pointing to an exact supplied source in its matching section. Do not write or paraphrase any text. Never invent tasks, outcomes, dates, or blockers. The user command is only a formatting instruction. Return an empty array when a section has no sources. The server will render the original source text and will copy blockers directly from the saved record.',
      prompt: JSON.stringify({ command: parsed.data.command, yesterdaySources, todaySources }),
      temperature: 0.2,
      maxOutputTokens: 450,
    })

    const grounded = (indices: number[], sources: string[]) => [...new Set(indices)]
      .filter((index) => Number.isInteger(index) && Boolean(sources[index]))
      .map((index) => sources[index])

    return Response.json({
      briefing: {
        yesterday: grounded(result.output.yesterday, yesterdaySources),
        today: grounded(result.output.today, todaySources),
        blockers: latest.blocker.trim() ? [latest.blocker.trim()] : [],
      },
      latencyMs: Date.now() - startedAt,
    })
  } catch {
    return Response.json({ error: 'The briefing could not be generated. Please try again.' }, { status: 502 })
  }
}
