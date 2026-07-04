// 服务端鉴权/权益工具(E3-01):服务器组件与 API route 共用,前端永远只做展示引导。
import { getPayload } from 'payload'
import config from '@/payload.config'

export type SessionUser = {
  id: string | number
  email: string
  role?: 'user' | 'admin'
  proUntil?: string | null
} | null

// 从请求 headers(httpOnly payload-token cookie)解出当前用户;未登录返回 null。
export async function getUser(headers: Headers): Promise<SessionUser> {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  return (user as SessionUser) ?? null
}

// 时长包语义:到期日在未来 = Pro。没有订阅状态机。
export function isPro(user: SessionUser): boolean {
  return !!user?.proUntil && new Date(user.proUntil) > new Date()
}
