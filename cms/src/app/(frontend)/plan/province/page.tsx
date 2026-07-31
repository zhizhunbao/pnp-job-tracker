// 卡③「选省份」评估页(统一题库横向扩面第 3 张:唯一的专属题=手上有没有 offer)。
// 目标省是这张卡要算出来的东西,所以不拿它当输入问;QC 走自己体系不参与排序。
import { PlanPrView } from '../PlanPrView'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Which province fits your occupation | Offer2PR',
  description: 'Provinces ranked for your occupation: published-list hits with sources, local openings, and what each one is missing. 看哪个省把你这行放进了公开清单、当地在招多少。',
}

export default function PlanProvincePage() {
  return <PlanPrView decision="prov" />
}
