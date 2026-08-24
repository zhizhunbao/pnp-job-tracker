'use client'

// 首帧登录态的**客户端唯一状态**,照 LangProvider 的先例(2026-08-03 语言零闪那一版)。
// 治的是同一类病:SSR 先渲一个猜的、水合后再纠 —— 页面抖一下。
//
// 这里抖的是账户区宽度(2026-08-17 Frank「点击切换的时候会先伸缩一下,然后再展开」):
// 二级页 SSR 恒渲 32px 占位槽,水合后换成「登录 + 注册」实宽 84px,右侧块凭空长 52px,
// space-between 把中间整排导航往左拽 52px。localStorage 那枚 acct.seen 修不掉它 ——
// 浏览器先按 SSR 的 HTML 画一帧,useLayoutEffect 是那之后才跑的。
// 唯一能让首帧就对的位置是服务端,所以值从 layout 的 ssrHasSession() 下来。
//
// 只回答「首帧按登录态还是匿名占位」;用户是谁仍归 Header 拉 /api/users/me。
import { createContext, useContext } from 'react'

const Ctx = createContext<boolean | undefined>(undefined)

/** 首帧登录态。undefined = 不在 Provider 下(测试/存量路径)→ 调用方维持原来的 loading 占位 */
export function useSsrSession(): boolean | undefined {
  return useContext(Ctx)
}

export function SessionProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  return <Ctx.Provider value={initial}>{children}</Ctx.Provider>
}
