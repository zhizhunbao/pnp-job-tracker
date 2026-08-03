// 卡③「选省份」评估页(统一题库横向扩面第 3 张:唯一的专属题=手上有没有 offer)。
// 目标省是这张卡要算出来的东西,所以不拿它当输入问;QC 走自己体系不参与排序。
import { PlanPrView } from '../PlanPrView'

// 渲染模式跟全站一致(2026-08-03 Frank「所有页面都改成一样的,防止之后出错」):
// 原来这四页是 force-static —— 静态页里读不到 cookie,界面语言只能出默认中文,
// 英韩用户在这几页永远闪一次。四页都是纯壳(不查库),转动态只多渲一层 React 外壳。

export const metadata = {
  title: 'Which province fits your occupation | Offer2PR',
  description: 'Provinces ranked for your occupation: published-list hits with sources, local openings, and what each one is missing. 看哪个省把你这行放进了公开清单、当地在招多少。',
}

export default function PlanProvincePage() {
  return <PlanPrView decision="prov" />
}
