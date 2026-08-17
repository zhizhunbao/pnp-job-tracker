// 首帧登录态的**服务端唯一入口**:只在 (frontend)/layout.tsx 调一次,往下靠 SessionProvider 分发。
// 判据只问「有没有会话票据」—— 不解 JWT、不查库。header 首帧需要的只是**账户区该占多宽**
// (匿名=「登录 + 注册」两钮 84px,已登录=头像 32px),不需要知道用户是谁;
// 是谁仍由 Header 客户端拉 /api/users/me 填。因此这里零 DB 开销,layout 不背站级查询。
// 单独成文件的理由同 lang.server.ts:next/headers 只能在服务端 import。
import { cookies } from 'next/headers'

// Payload 会话 cookie。payload.config 未配 cookiePrefix → 用默认名;
// 改名要连 api/auth/google/callback 的 Set-Cookie 一起改(那条自己签同名 token)。
const TOKEN_COOKIE = 'payload-token'

export async function ssrHasSession(): Promise<boolean> {
  try {
    return !!(await cookies()).get(TOKEN_COOKIE)?.value
  } catch {
    // 取不到 cookie 的极端情形 → 按匿名占位(匿名是绝大多数流量,猜错的代价最小)
    return false
  }
}
