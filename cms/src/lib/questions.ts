// 题库=配置(L2-02 拍板原文:「题库是配置 lib/questions.ts」;2026-07-31 Frank「用框架吧」→ SurveyJS JSON)。
// 铁律不变:每题绑定一个字段、影响至少一条结论;四选一含兜底;跨卡复用的字段名与 EntryQuiz/profile 对齐。
// 本文件只有 JSON,无 React 无 IO —— 加一张卡的题 = 加一段配置,渲染层(SurveyJS)零改动。
// 本地化用 SurveyJS 原生多语对象({ default: en, 'zh-cn': …, ko: … }),不再走 makeT(框架内文案框架管)。

type L = { default: string; 'zh-cn': string; ko: string }
const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 卡②「拿 PR」基本 4 题(L2-02 §卡② 原表):status 跨卡复用(与 EntryQuiz/currentStatus 同 slug);
// clb/exp/prov 收「档位」(1-4),映射成引擎输入在 PlanPrView(CLB/EXP/PROVS 表)——题库不做换算。
export const PR_BASIC_SURVEY = {
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
  completeText: l('See my report', '出报告', '보고서 보기'),
  elements: [
    {
      type: 'radiogroup', name: 'status', isRequired: true,
      title: l('Where are you today?', '你现在的情况?', '현재 상황은?'),
      choices: [
        { value: 'overseas', text: l('Outside Canada, planning the move', '还在境外,想来加拿大工作', '해외에서 캐나다 취업 준비 중') },
        { value: 'studying', text: l('Studying in Canada', '在加拿大读书', '캐나다에서 유학 중') },
        { value: 'working', text: l('Working in Canada', '已经在加拿大工作', '캐나다에서 근무 중') },
        { value: 'jobhunting', text: l('In Canada, job hunting', '在加拿大找工作', '캐나다에서 구직 중') },
      ],
    },
    {
      type: 'radiogroup', name: 'clbBand', isRequired: true,
      title: l('Where is your English?', '英语到哪一档?', '영어 수준은?'),
      choices: [
        { value: 1, text: l('Basic', '初级', '초급') },
        { value: 2, text: l('Intermediate', '中级', '중급') },
        { value: 3, text: l('Fluent', '流利', '유창') },
        { value: 4, text: l('Not tested yet', '还没考', '시험 전') },
      ],
    },
    {
      type: 'radiogroup', name: 'expBand', isRequired: true,
      title: l('Canadian experience in this occupation?', '在加拿大做过这行多久?', '캐나다에서 이 직종 경력은?'),
      choices: [
        { value: 1, text: l('None', '没有', '없음') },
        { value: 2, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2+ years', '2 年以上', '2년 이상') },
      ],
    },
    {
      type: 'radiogroup', name: 'provBand', isRequired: true,
      title: l('Target province?', '目标省?', '희망 주?'),
      choices: [
        { value: 1, text: l('BC', 'BC', 'BC') },
        { value: 2, text: l('Ontario', '安省', '온타리오') },
        { value: 3, text: l('Prairies', '草原三省', '프레리 3주') },
        { value: 4, text: l('Show me what is reachable', '先看哪个够得着', '가능한 곳부터 보기') },
      ],
    },
  ],
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
