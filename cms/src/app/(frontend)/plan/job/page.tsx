// 卡①「找工作」评估页(统一题库横向扩面第 1 张:零新题,共用底座已覆盖)。
// 与 /plan/pr 同一个视图组件、同一个答题器、同一份 Report 契约——差别只有 decision 一个参数。
import { PlanPrView } from '../PlanPrView'

// 渲染模式跟全站一致(2026-08-03 Frank「所有页面都改成一样的,防止之后出错」):
// 原来这四页是 force-static —— 静态页里读不到 cookie,界面语言只能出默认中文,
// 英韩用户在这几页永远闪一次。四页都是纯壳(不查库),转动态只多渲一层 React 外壳。

export const metadata = {
  title: 'Job search report — openings, wages, sponsors | Offer2PR',
  description: 'Openings for your occupation in your target province, posted pay vs the ESDC median, and employers that have posted named-stream jobs. 看你这行在目标省的在招量、薪资对比与担保记录。',
}

export default function PlanJobPage() {
  return <PlanPrView decision="job" />
}
