// 卡②「拿 PR」评估页(L2 两态:答题/报告)。纯客户端状态页,SSR 只出壳 —— 答案在浏览器、报告按需 POST。
import { PlanPrView } from '../PlanPrView'

// 渲染模式跟全站一致(2026-08-03 Frank「所有页面都改成一样的,防止之后出错」):
// 原来这四页是 force-static —— 静态页里读不到 cookie,界面语言只能出默认中文,
// 英韩用户在这几页永远闪一次。四页都是纯壳(不查库),转动态只多渲一层 React 外壳。

export const metadata = {
  title: 'PR assessment — streams, draws, gaps | Offer2PR',
  description: 'Answer 4 basic questions, get a data-backed first-pass PR report: list hits, draw cutoffs, gaps and next steps. 答 4 道基本题,出数据说话的拿 PR 粗版报告。',
}

export default function PlanPrPage() {
  return <PlanPrView />
}
