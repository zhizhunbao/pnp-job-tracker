// 卡①「找工作」评估页(统一题库横向扩面第 1 张:零新题,共用底座已覆盖)。
// 与 /plan/pr 同一个视图组件、同一个答题器、同一份 Report 契约——差别只有 decision 一个参数。
import { PlanPrView } from '../PlanPrView'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Job search report — openings, wages, sponsors | Offer2PR',
  description: 'Openings for your occupation in your target province, posted pay vs the ESDC median, and employers that have posted named-stream jobs. 看你这行在目标省的在招量、薪资对比与担保记录。',
}

export default function PlanJobPage() {
  return <PlanPrView decision="job" />
}
