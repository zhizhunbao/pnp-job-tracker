/**
 * 货架页 Frank 08-08 拍板整页下架(「这个页面就不要了」):担保雇主唯一承载=把脉页三分表橱窗。
 * 路由保留 308(旧收录/外链不断链;弹框雇主线、报告卡互通链、看全部钮已同批摘除)。
 * 旧名录 `?type=aip|lmia` 与 B2 货架视图同批退役;`/employers/compare`(Pro 对比页)不受影响。
 *
 * @author Frank
 * @time 2026-07-19 00:37:13
 */
import { permanentRedirect } from 'next/navigation'

/**
 * 下架页的门:整页 308 到把脉页,不渲任何正文。
 *
 * @returns 无(permanentRedirect 直接中断渲染)。
 */
export default function EmployersPage() {
  permanentRedirect('/start')
}
