// 题库 = 组装器,不是题单(2026-07-31 Frank 拍板走横向后重构;设计见 docs/design/统一题库与付费面-20260731.md)。
// 题目本身在 lib/fields.ts(字段库,全站单一来源),各决定取哪些字段在 lib/decisions.ts。
// 这里只负责:决定 + 阶段 → SurveyJS JSON。加一张卡不改本文件。
// 本文件仍然无 React 无 IO —— 渲染层(survey-react-ui)照旧零改动。
import { FIELDS } from './fields'
import { fieldsOf, type Stage } from './decisions'

type L = { default: string; 'zh-cn': string; ko: string }
const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 卷面外壳(一屏一题/进度条/导航文案),两个阶段只差一个完成按钮文案
const chrome = (stage: Stage) => ({
  showQuestionNumbers: 'off',
  questionsOnPageMode: 'questionPerPage',
  // v2 正名 autoAdvance*(旧名是弃用别名)。答完即出报告=设计:逐题点选零冗余点击;
  // 预填(三问/上次答案)把题补满时会链跳直达报告 —— 等价「看上次结果」,报告页「改答案」可回
  autoAdvanceEnabled: true,
  autoAdvanceAllowComplete: true,
  showProgressBar: 'top',
  progressBarType: 'questions',
  showTitle: false,
  pagePrevText: l('Previous', '上一题', '이전'),
  pageNextText: l('Next', '下一题', '다음'),
  completeText: stage === 'explore'
    ? l('Update my report', '更新报告', '보고서 갱신')
    : l('See my report', '出报告', '보고서 보기'),
})

export function buildSurvey(decision: string, stage: Stage, batch = 0) {
  return { ...chrome(stage), elements: fieldsOf(decision, stage, batch).map((n) => FIELDS[n].q) }
}

// 站内品牌主题(SurveyJS v2 theme:面板拍平贴站内白卡风,主色=站蓝,圆角同站)
export const SURVEY_THEME = {
  themeName: 'default',
  colorPalette: 'light',
  isPanelless: true,
  cssVariables: {
    '--sjs-primary-backcolor': '#2563eb',
    '--sjs-primary-backcolor-dark': '#1d4ed8',
    '--sjs-primary-backcolor-light': '#eff6ff',
    '--sjs-general-backcolor-dim': '#f9fafb',
    '--sjs-corner-radius': '12px',
    '--sjs-font-size': '15px',
  },
} as const
