// 卡②「拿 PR」评估页(L2 两态:答题/报告)。纯客户端状态页,SSR 只出壳 —— 答案在浏览器、报告按需 POST。
import { PlanPrView } from '../PlanPrView'

export const dynamic = 'force-static'

export const metadata = {
  title: 'PR assessment — streams, draws, gaps | Offer2PR',
  description: 'Answer 4 basic questions, get a data-backed first-pass PR report: list hits, draw cutoffs, gaps and next steps. 答 4 道基本题,出数据说话的拿 PR 粗版报告。',
}

export default function PlanPrPage() {
  return <PlanPrView />
}
