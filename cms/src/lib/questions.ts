// 题库 = 组装器,不是题单(2026-07-31 Frank 拍板走横向后重构;设计见 docs/design/统一题库与付费面-20260731.md)。
// 题目本身在 lib/fields.ts(字段库,全站单一来源),各决定取哪些字段在 lib/decisions.ts。
// 这里只负责:决定 + 阶段 → SurveyJS JSON。加一张卡不改本文件。
// 本文件仍然无 React 无 IO —— 渲染层(survey-react-ui)照旧零改动。
import { FIELDS } from './fields'
import { fieldsOf, type Stage } from './decisions'

type L = { default: string; 'zh-cn': string; ko: string }
const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 卷面外壳(一屏一题/进度条/导航文案),两个阶段只差一个完成按钮文案。
// 版式反复两轮,结论定在**翻页**(Frank 2026-08-01「还是改成翻页的吧」):
// 中途试过一屏全放(为的是「不能同时显示出来吗」),但题库扩充到 7 道后一屏拉得太长
// —— 选职业列表加七组单选,手机上滚三四屏才看得到「出报告」。翻页回来,进度条跟着回来
// (分页后「第 3 题,共 7 题」是真信息,不是废话);题干里的 ①②③ 同批撤掉,序号由进度条给。
const chrome = (stage: Stage) => ({
  showQuestionNumbers: 'off',
  questionsOnPageMode: 'questionPerPage',
  // 2026-07-31 Frank「选完题不要自动跳,要等用户点下一题再跳」:自动前进关掉。
  // 原因不只是节奏 —— 一道题的卷(卡③)开着自动前进时,点下去当场就完成跳报告,
  // 用户看到的是「选项根本选不上」(他实拍反馈的正是这个)。选中要停得住,跳转由他自己按。
  autoAdvanceEnabled: false,
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
