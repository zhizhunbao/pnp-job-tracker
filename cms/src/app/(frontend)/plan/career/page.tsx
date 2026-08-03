// 卡⑥「职业规划」评估页(统一题库横向扩面第 2 张:零新题)。
// 只摆相邻职业对照(在招量、TEER、ESDC 中位),不判「你能不能转」——转换路径本站没有数据。
import { PlanPrView } from '../PlanPrView'

// 渲染模式跟全站一致(2026-08-03 Frank「所有页面都改成一样的,防止之后出错」):
// 原来这四页是 force-static —— 静态页里读不到 cookie,界面语言只能出默认中文,
// 英韩用户在这几页永远闪一次。四页都是纯壳(不查库),转动态只多渲一层 React 外壳。

export const metadata = {
  title: 'Career planning report — neighbouring occupations | Offer2PR',
  description: 'Occupations next to yours compared on openings, TEER and the ESDC median wage. 相邻职业的在招量、TEER 与官方中位薪资对照。',
}

export default function PlanCareerPage() {
  return <PlanPrView decision="career" />
}
