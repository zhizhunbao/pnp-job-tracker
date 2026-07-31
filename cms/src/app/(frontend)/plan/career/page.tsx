// 卡⑥「职业规划」评估页(统一题库横向扩面第 2 张:零新题)。
// 只摆相邻职业对照(在招量、TEER、ESDC 中位),不判「你能不能转」——转换路径本站没有数据。
import { PlanPrView } from '../PlanPrView'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Career planning report — neighbouring occupations | Offer2PR',
  description: 'Occupations next to yours compared on openings, TEER and the ESDC median wage. 相邻职业的在招量、TEER 与官方中位薪资对照。',
}

export default function PlanCareerPage() {
  return <PlanPrView decision="career" />
}
