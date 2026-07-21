// #162 版本自报(2026-07-21 事故直接产物):当天 Render 构建分钟耗尽 + $0 spend limit,
// #154-#159 六提交全 Build blocked,**生产钉在旧构建整整一天**,而我们只看「push 成功」就收工,
// Frank 连报「怎么还没变」,我逐个当前端 bug 查了一整天。根因一条,症状六个。
//
// 有了这个端点,「线上跑的是哪个提交」变成一条 curl 就能答的问题(见 etl/check_deploy.py 哨兵)。
// RENDER_GIT_COMMIT 由 Render 注入;本地 dev 没有则回 'local'。
// 只暴露提交号(公开仓库,非机密),不带任何 env/密钥。
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    commit: process.env.RENDER_GIT_COMMIT || 'local',
    branch: process.env.RENDER_GIT_BRANCH || '',
    service: process.env.RENDER_SERVICE_NAME || '',
  }, { headers: { 'cache-control': 'no-store' } })
}
