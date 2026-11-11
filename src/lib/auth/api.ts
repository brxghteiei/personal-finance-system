import 'server-only'

import { NextResponse } from 'next/server'
import { getCurrentUser, type AuthUser } from './session'
import { sameOriginFailure } from './security'

type ApiUserResult =
  | { user: AuthUser; response: null }
  | { user: null; response: NextResponse }

export async function requireApiUser(request: Request, mutating = false) {
  if (mutating) {
    const originError = sameOriginFailure(request)
    if (originError) return { user: null, response: originError } satisfies ApiUserResult
  }
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 }),
    } satisfies ApiUserResult
  }
  return { user, response: null } satisfies ApiUserResult
}
