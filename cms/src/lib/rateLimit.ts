// 进程内日配额计数器(E2-02 公测期防滥用;重启清零可接受,付费墙上线后按用户配额替代)。
// 单线程事件循环内 check+increment 无竞态;多配额位「全有余量才放行并各自 +1」。
const buckets = new Map<string, { day: string; n: number }>()

export function ipOf(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') // caddy 反代注入;首跳=真实客户端
  return (fwd ? fwd.split(',')[0].trim() : '') || 'local'
}

// 今日已用次数(只读):试用额度可见化用(第 5 轮 #16)——用户该知道还剩几次,而不是突然 402
export function usedToday(key: string): number {
  const b = buckets.get(key)
  return b && b.day === new Date().toISOString().slice(0, 10) ? b.n : 0
}

export function checkLimit(quotas: [string, number][]): boolean {
  const day = new Date().toISOString().slice(0, 10)
  const cur = quotas.map(([key]) => {
    const b = buckets.get(key)
    return b && b.day === day ? b.n : 0
  })
  if (cur.some((n, i) => n >= quotas[i][1])) return false
  quotas.forEach(([key], i) => buckets.set(key, { day, n: cur[i] + 1 }))
  return true
}
