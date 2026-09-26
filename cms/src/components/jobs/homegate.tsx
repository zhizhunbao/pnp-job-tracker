'use client'
/**
 * 域内小件:首屏本省闸的首帧脚本(2026-09-26 /fe 首页 Frank「首屏整表替换」)。
 * 服务端不知道访客时区(只用时区、不记上次所选、不看 IP —— Frank 09-14 / 09-18 两拍),没带省的首屏只能先渲全国 50 行
 * (爬虫要读,照渲);设备时区对得上省的访客,约 2 秒后会被换成本省 —— 那 50 行是过渡态。这段内联脚本在浏览器解析到它时
 * 当场跑、早于首帧绘制,命中就把闸的开关置上(表身与卡片流藏起、版面照占,「更新中」提示亮起),本省那一页到了再放开。
 * 只渲在服务端那份 HTML 与水合那一遍里(板上 hydrating 格):React 在客户端造出来的 script 从不执行。
 *
 * @author Frank
 * @time 2026-09-26 14:20:29
 */
import { homeGateScriptOf } from './functions'

/**
 * 渲染首帧脚本。
 *
 * @returns 一段内联脚本(浏览器解析到这里当场执行)。
 */
export function HomeGate() {
  return <script dangerouslySetInnerHTML={{ __html: homeGateScriptOf() }} />
}
