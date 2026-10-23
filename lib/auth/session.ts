import { auth } from '@/lib/auth/server'

export async function getCurrentUser() {
  try {
    const { data, error } = await auth.getSession()
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}
