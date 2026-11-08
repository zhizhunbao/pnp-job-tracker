/**
 * E13-03 把脉首页(/start)的门 —— 2026-09-04 重构后:职业 / 雇主 / LMIA / 省份 / 城市 / 趋势六段
 * (设计:docs/design/把脉页重构-20260904.md;E13 原设计 docs/implementation/E13-把脉首页/00_总设计与口径.md)。
 * 本门只做 SSR 取数与拼装:判决区的证据数(proof)、省份段的难度档与宏观序列(macro_series,2026-09-06)与
 * 省级运营指标(pnp_ops_stats)、担保雇主三分表、职业统计标量、趋势段的逐日在招量。
 * 红线:数字全部来自库内聚合查询,不写死;单项查询失败 → 该行 / 该块整条不渲染,
 * 绝不显示 0(每条查询各自兜空,一张表缺只丢它自己那块)。
 * SSR 瘦身照旧:职业大表(occ ~3400 行,含 E13-03 派生列)不进 HTML,
 * 由 Pulse 挂载后拉 /api/stats/market;担保雇主全量同理走 /api/employers/sponsors。
 * 2026-09-04 撤:政策动态查询(段撤成一行链接)、职业筛两张字典(筛选下拉撤);抽选表 Frank 走查要求保留,查询回来。
 * 2026-08-28 换装批:聚合的组装、进程内缓存、预选省全部下沉 components/start 的 functions
 * (方案 A:连接池与 payload 在这里取好注进去,那个桶一个 `/server` 门都不 import);
 * 壳件(整页外框 Frame / 顶栏 / 页脚)拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,样张 companies)。
 * 2026-11-05 Frank「用户看到哪就加载哪部分」:SSR 只出首屏四格(数字卡 + 抓取时刻),其余各段滚到附近才拉
 * /api/stats/pulse;聚合取数(缓存 + 单飞)挪进 components/start 的 server 门,本门与那条路由共用一份。
 * 背景:原契约 4.9MB 进每次 HTML,并发几次把生产 256MB 堆顶爆(502)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { ID_BOARDS, Pulse, START_META } from '@/components/start'

export const dynamic = 'force-dynamic'

export const metadata = START_META

/**
 * 把脉首页的门:进程内缓存没命中就八条查询并发取数 → 纯函数组装 → 拼大写组件。
 * 城市行 2026-09-11 城市段重设计批自 SSR 退役(段内挂载后拉 /api/stats/city,400 张卡不再进 HTML)。
 * 缓存口径与旧版一字未改:10 分钟内给同一份,过期现查再存;抓取时刻逐请求不进缓存
 * (lib/jobs 自带 30s 缓存)。预选省 2026-09-06 随省内职业榜退役(省份段不再切省),getUser 一并撤。
 * 2026-11-05:取数与缓存挪进 start 的 server 门(getHomeCore,带单飞),本门只把首屏四格交给 Pulse。
 * 2026-11-07 拆页:本页只出职业一段(其余六段各一页,门在 `[sec]/page.tsx`)。
 * 同日外框进 `layout.tsx`(切页不刷新):取数、顶栏、页脚、banner、侧栏都挪过去,本门只给职业这一段。
 *
 * @returns 整页。
 */
export default function PulsePage() {
  return <Pulse sec={ID_BOARDS} />
}
