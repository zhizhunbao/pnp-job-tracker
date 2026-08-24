// Next instrumentation(判定合一批3 前置):进程启动预热。
// 冷启动后的第一位访客实测吃 8.4s(payload 初始化 + 连接池 + top 聚合三层全冷,08-10 生产探针)——
// 起服 5 秒后自热这三层,真人几乎不再撞冷。失败不拦启动(纯优化,壮死无声)。
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  setTimeout(async () => {
    try {
      const { getDb } = await import('@/lib/db/server')
      const { getTopNocsCached } = await import('@/lib/quiz/server')
      const { loadTopNocs } = await import('@/lib/jobs/server')
      await getTopNocsCached({ db: await getDb(), n: 24, load: loadTopNocs })
    } catch { /* 预热失败:第一位访客回到冷路径,行为同预热前 */ }
  }, 5000)
}
