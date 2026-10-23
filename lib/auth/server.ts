import { createNeonAuth } from '@neondatabase/auth/next/server'

const baseUrl = process.env.NEON_AUTH_BASE_URL
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET ?? process.env.BETTER_AUTH_SECRET

if (!baseUrl) {
  throw new Error('NEON_AUTH_BASE_URL is required to initialize Neon Auth.')
}

if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error('A Neon Auth cookie secret of at least 32 characters is required.')
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret },
})
