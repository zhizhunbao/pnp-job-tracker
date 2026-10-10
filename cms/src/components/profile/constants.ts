/**
 * profile 域(移民档案)的死值:档案六格的点选项表、区间归属表、接口地址与记号。
 * 2026-08-27 Frank 拍板自 account 域拆出;POPULAR_NOCS 等表另有 jobs/quiz/plan/chat
 * 四个域经桶在借。跨域不互相取常量 —— 与 account 同名同义的几枚(TEXT_NONE 等)
 * 是本域自己的一份,各家各管(notice 域先例)。
 * 2026-10-04 访客四题改版:访客向导那一段(2026-10-03 付费闭环批 A1 接在尾巴上的步序、题面、目标 / 专业 / 所在省点选表、
 * 埋点名、查名接口)整段迁去 gate 桶(注册前的访客门自成一域;本域只留登录用户的建档向导)。
 * 2026-10-05 × 摘除钮的字符 DEL_MARK 迁去 tag 桶(带删钮的标签收进 Tag 的 del 格,注释原样带过去)。
 * 2026-10-09「我的档案」批:首访引导向导 OnboardingWizard 退役(Frank 拍板:答题原先分两处、两种长相,只留 gate 桶的访客向导,
 * 登录用户改在「我的档案」看 / 改答案)。只为它活着的值整批删 —— 点选项表(分型 / 目标省 / 英语 / EE 分 / 工签)与区间归属表、
 * 步序与问句表、简历预填一路的态 / 接口 / 响应码、存档案的接口与方法字、钮底座、弹框宽档、标签色档,以及「弹过了」记忆键
 * OB_SEEN_KEY('jobs_onboarding_v1')与它的记号(老用户本地存储里那一格从此无人读写,不碍事)。剩热门职业表(quiz / plan
 * 经桶借)与进度条两枚(投递流经桶借 OnboardingHead)。被删值身上的决策记录摘进桶门 index.ts 文件头。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 热门职业(§3.4:热门 chips 一点即选,只显示职位名藏码)。NOC 2021 官方码,
 * 已对照 data/mart/noc_descriptions.json 逐条核。jobs/quiz/plan/chat 四个域经桶在借。
 * **按在招量降序**(2026-08-12 Frank:「cooks 应该排在第一啊」)。这只是首屏那一帧的
 * 兜底顺序 —— 真在招数一到手,OccPicker 会按真数重排;把兜底序摆成接近真序,
 * 那一下重排就几乎看不出来。量级取自 2026-08-12 生产实况,只用于定序,**不进 UI**
 * (界面上的数永远来自 /api/quiz):
 * 63200 Cooks ~2,140;73300 Transport truck drivers ~1,296;64100 Retail ~969;
 * 72106 Welders ~473;13110 Admin assistants ~456;42202 ECE ~428;
 * 75101 Material handlers ~405;65100 Cashiers ~346;65200 Servers ~299;
 * 33102 Nurse aides / PSW ~245;11100 Accountants ~213;31301 RN ~189;
 * 72200 Electricians ~186;21232 Software developers ~76。
 * (2026-08-27 自 profileOptions.ts 迁入,逐行尾注并进本块 —— 组件域注释一律 JSDoc。)
 */
export const POPULAR_NOCS = [
  { noc: '63200', key: 'prof.job.cook' },
  { noc: '73300', key: 'prof.job.truck' },
  { noc: '64100', key: 'prof.job.retail' },
  { noc: '72106', key: 'prof.job.welder' },
  { noc: '13110', key: 'prof.job.admin' },
  { noc: '42202', key: 'prof.job.ece' },
  { noc: '75101', key: 'prof.job.warehouse' },
  { noc: '65100', key: 'prof.job.cashier' },
  { noc: '65200', key: 'prof.job.server' },
  { noc: '33102', key: 'prof.job.psw' },
  { noc: '11100', key: 'prof.job.accountant' },
  { noc: '31301', key: 'prof.job.nurse' },
  { noc: '72200', key: 'prof.job.electrician' },
  { noc: '21232', key: 'prof.job.software' },
] as const

/**
 * 进度条满格的百分数(算出的比例乘它)。
 */
export const OB_PERCENT_MAX = 100

/**
 * 百分号(进度条宽度是运行时算出来的样式值,拼它才是合法的 CSS 长度)。
 */
export const OB_PERCENT_SIGN = '%'
