/**
 * version 域的 HTTP 芯:GET /api/version —— 线上此刻跑的是哪个提交。
 *
 * 由来(#162,2026-07-21 事故的直接产物):当天 Render 构建分钟耗尽 + $0 spend limit,
 * #154-#159 六个提交全部 Build blocked,**生产钉在旧构建整整一天**;而我们只看「push 成功」
 * 就收工,Frank 连报「怎么还没变」,我逐个当前端 bug 查了一整天。根因一条,症状六个。
 * 有了这个端点,「线上跑的是哪个提交」变成一条 curl 就能答的问题(哨兵见 etl/check_deploy.py)。
 *
 * 只暴露提交号与分支/服务名(公开仓库,非机密),不带任何 env 或密钥。
 * 2026-08-24 自 app/api/version/route.ts 下沉成域:那个壳此前从没进过任何闸名单
 * (名单枚举漏了它),壳里带着实现也一直没人发现。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */
import { CACHE_NO_STORE } from './constants'
import { HDR_CACHE_CONTROL } from '../http'
import { deployIdentOf } from './functions'

/**
 * GET /api/version 的芯。
 *
 * @returns 部署身份的 JSON,带 no-store。
 */
export function versionRoute(): Response {
  return Response.json(deployIdentOf(), { headers: { [HDR_CACHE_CONTROL]: CACHE_NO_STORE } })
}
