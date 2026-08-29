/**
 * profile 域(移民档案)的死值:档案六格的点选项表、区间归属表、接口地址与记号。
 * 2026-08-27 Frank 拍板自 account 域拆出;POPULAR_NOCS 等表另有 jobs/quiz/plan/chat
 * 四个域经桶在借。跨域不互相取常量 —— 与 account 同名同义的几枚(TEXT_NONE 等)
 * 是本域自己的一份,各家各管(notice 域先例)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 切不出东西时的空文本(分型取消、清搜索框、档案空串归 null 前的比较基准)。
 * 与 account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * fetch 的凭据档:同源带 cookie(拉 NOC 维度过 Payload read 权限、存档案都要认人)。
 * 与 account 域同名同义,各家一份。
 */
export const CRED_INCLUDE = 'include'

/**
 * PATCH 方法字(存档案)。与 account 域同名同义,各家一份。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * JSON 请求体的头名。与 account 域同名同义,各家一份。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求体的媒体类型。与 account 域同名同义,各家一份。
 */
export const MIME_JSON = 'application/json'

/**
 * 改用户资料的接口前缀(PATCH `/api/users/:id`,本人可改;档案保存走这里)。
 * 与 account 域同名同义,各家一份。
 */
export const URL_USER_HEAD = '/api/users/'

/**
 * 保存钮忙态的钮面文字(三点省略号)。它不是文案是**状态指示**,三语一样,
 * 所以不进 i18n。与 account 域同名同义,各家一份。
 */
export const BUSY_MARK = '…'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」):
 * ghost 底最素,视觉全由本域的加倍类定形。与 account 域同名同义,各家一份。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 摘除已选职业 × 钮的字符(图标是内容不是样式,归常量不进 css)。
 * 与 account 域同名同义,各家一份。
 */
export const DEL_MARK = '×'

/**
 * 分型 chip 表(E11-04):slug 单一来源在 lib/jobs/match.ts,这里只列 UI 顺序
 * (§2.5 A–E);key = 该档标签的 i18n 键(prof.st.*,三语在 lib/i18n)。
 * 2026-08-27 自 ProfileForm.tsx 的 STATUS_SLUGS 迁入,键从拼串改成整键落表
 * (拼串在 no-bare-strings 闸里没有名字,也 grep 不到)。
 */
export const STATUS_TABS = [
  { slug: 'overseas', key: 'prof.st.overseas' },
  { slug: 'studying', key: 'prof.st.studying' },
  { slug: 'working', key: 'prof.st.working' },
  { slug: 'jobhunting', key: 'prof.st.jobhunting' },
  { slug: 'pr', key: 'prof.st.pr' },
] as const

/**
 * 目标省 chip 表:QC 走自己的体系,不进目标省(数据约定)。key = 省全名的 i18n 键
 * (#58 零黑话:chip 显示省全名三语,值仍存两字码)。
 * 2026-08-27 自 ProfileForm.tsx 的 PROVS 迁入,同上改整键落表。
 */
export const PROV_TABS = [
  { prov: 'ON', key: 'pr.ON' },
  { prov: 'BC', key: 'pr.BC' },
  { prov: 'AB', key: 'pr.AB' },
  { prov: 'SK', key: 'pr.SK' },
  { prov: 'MB', key: 'pr.MB' },
  { prov: 'NS', key: 'pr.NS' },
  { prov: 'NB', key: 'pr.NB' },
  { prov: 'NL', key: 'pr.NL' },
  { prov: 'PE', key: 'pr.PE' },
] as const

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
 * 英语水平档表(§3.4:初级/中级/流利/考过高分 → CLB 档)。match v1 不用 CLB 评分
 * (仅存 + advisor 可见),精度低风险。2026-08-27 自 profileOptions.ts 迁入。
 */
export const CLB_OPTS = [
  { key: 'prof.clbOpt.basic', value: 4 },
  { key: 'prof.clbOpt.mid', value: 6 },
  { key: 'prof.clbOpt.fluent', value: 8 },
  { key: 'prof.clbOpt.high', value: 9 },
] as const

/**
 * CLB 精确值 → 高亮哪档的归属表(存值 ≤5 归初级档、≤7 归中级档、=8 归流利档,
 * 再高归顶档;CLB 是整数标尺,闭界写成「严格小于下一档下界」不漏值)。
 * 顶档锚值在 CLB_TOP。
 */
export const CLB_BANDS = [
  { below: 6, value: 4 },
  { below: 8, value: 6 },
  { below: 9, value: 8 },
] as const

/**
 * CLB 归属的顶档锚值(高过全部档界 = 考过高分那档)。
 */
export const CLB_TOP = 9

/**
 * EE 分区间档表(§3.4:算过→区间点选,不敲具体数)。**存下界**(<400 存 399:
 * 低于任何类别抽选线,永不造成假「高于」)—— 数据完整性红线:CRS 各档存「区间下界」,
 * 保守,永不把区间上界当精确分喂给 match「差 N 分」,杜绝假「高于分数线」。
 * 2026-08-27 自 profileOptions.ts 迁入。
 */
export const CRS_OPTS = [
  { key: 'prof.crsOpt.lt400', value: 399 },
  { key: 'prof.crsOpt.r400', value: 400 },
  { key: 'prof.crsOpt.r450', value: 450 },
  { key: 'prof.crsOpt.r500', value: 500 },
] as const

/**
 * CRS 精确值 → 高亮哪档的归属表(<400 / <450 / <500 三界,再高归顶档)。
 */
export const CRS_BANDS = [
  { below: 400, value: 399 },
  { below: 450, value: 400 },
  { below: 500, value: 450 },
] as const

/**
 * CRS 归属的顶档锚值(500+)。
 */
export const CRS_TOP = 500

/**
 * 工签剩余档表(§3.4:区间单选)。match v1 不用 PGWP(prof.pgwpNote 已诚实标注),
 * 低风险;「不确定」档存 null。2026-08-27 自 profileOptions.ts 迁入。
 */
export const PGWP_OPTS = [
  { key: 'prof.pgwpOpt.lt6', value: 3 },
  { key: 'prof.pgwpOpt.6to12', value: 9 },
  { key: 'prof.pgwpOpt.1to2', value: 18 },
  { key: 'prof.pgwpOpt.unsure', value: null },
] as const

/**
 * 工签月数 → 高亮哪档的归属表(<6 归半年内档、≤12 即 <13 归半年到一年档,
 * 月数是整数;再高归顶档)。
 */
export const PGWP_BANDS = [
  { below: 6, value: 3 },
  { below: 13, value: 9 },
] as const

/**
 * 工签归属的顶档锚值(一年以上档)。
 */
export const PGWP_TOP = 18

/**
 * 档案保存落成的落地态值(出 Notice 绿条;ProfileSaveState 的一员)。
 */
export const SAVED_OK = 'saved'

/**
 * 档案保存失败的落地态值(出 Notice 红条,不静默)。
 */
export const SAVED_ERR = 'err'

/**
 * NOC 五位码的形状(搜索框里敲的是码就按码直加,不是码才走命中兜底)。
 */
export const NOC_CODE_RE = /^\d{5}$/

/**
 * 搜索兜底一次最多显示几条命中(下拉框高 180px,8 条正好不用滚太深)。
 */
export const HITS_MAX = 8

/**
 * NOC 选项维度的拉取地址(noc-descriptions 397 行,一次全拉;登录用户过
 * Payload 默认 read 权限)。
 */
export const URL_NOC_DESC = '/api/noc-descriptions?limit=1000&depth=0'

/**
 * 职业搜索框外壳的全局类名(main.css 里 `.profNocSearch { margin-top: 8px }`)。
 * 本页专属,留在全局层是历史位置,同 NICK_BOX_CLS 的理由原样保留。
 */
export const PROF_SEARCH_CLS = 'profNocSearch'

/**
 * 职业搜索框的尺寸档(input 域的 md;表单内嵌搜索,比全站搜索矮一档)。
 */
export const NOC_SEARCH_SIZE = 'md'

/**
 * 档案存成提示条的色档(notice 四色里的绿:成功)。
 */
export const SAVE_OK_KIND = 'ok'

/**
 * 档案存挂提示条的色档(notice 四色里的红:失败要看得见,不静默)。
 */
export const SAVE_ERR_KIND = 'err'

/**
 * 首访引导向导「弹过一次」的记忆键(单一来源)。职位板首访自动弹、投递流判要不要
 * 先问求职意向、问卷收卷后置位,三处读写的都是这一个键。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 迁入本抽屉:键名与下面的值一个字都不许改,
 * 改了等于把所有老用户的「已经弹过」记录作废,他们下次进站会被重弹一次。
 */
export const OB_SEEN_KEY = 'jobs_onboarding_v1'

/**
 * 记在上面那个键里的值:弹过了就记这一个字符(读的一侧只判「有没有值」,
 * 所以值是什么不重要,但三处写入必须一致,别一处写别的)。
 */
export const OB_SEEN_MARK = '1'

/**
 * 向导第一步:问现在是什么身份(分型)。这一步永远在,分型选完才知道后面问什么。
 */
export const OB_STEP_STATUS = 'status'

/**
 * 向导的职业步:想做什么工作(简历识别出的候选 + 热门职业点选)。
 */
export const OB_STEP_NOC = 'noc'

/**
 * 向导的英语步:英语大概什么水平(区间点选)。
 */
export const OB_STEP_CLB = 'clb'

/**
 * 向导的快速通道分步:算过 EE 分吗(两段式,算过才问区间)。
 */
export const OB_STEP_CRS = 'crs'

/**
 * 向导的目标省步:想去哪个省(可多选)。
 */
export const OB_STEP_PROV = 'prov'

/**
 * 向导的工签步:工签还剩多久(区间点选)。
 */
export const OB_STEP_PGWP = 'pgwp'

/**
 * 分型 → 这一型接着问哪几步(E11-05 ② §2.5 分叉;第一步永远是分型本身,不进表)。
 * 逐型的取舍是产品决策,搬家时原样保留:
 * A 海外直申(overseas)不问工签 —— 人还没来,没有工签可言;
 * B 在加留学(studying)只问目标省与职业 —— 毕业时间与专业没有真收进档案的位置,略过;
 * C 工签在职(working)问职业、目标省、工签剩余;
 * D 在加找工作(jobhunting)四样都问,只差 EE 分;
 * E 已拿枫叶卡或纯找工(pr)移民信号弱化,只问职业与目标省。
 */
export const OB_BRANCHES = [
  { slug: 'overseas', steps: ['noc', 'clb', 'crs', 'prov'] },
  { slug: 'studying', steps: ['prov', 'noc'] },
  { slug: 'working', steps: ['noc', 'prov', 'pgwp'] },
  { slug: 'jobhunting', steps: ['noc', 'clb', 'prov', 'pgwp'] },
  { slug: 'pr', steps: ['noc', 'prov'] },
] as const

/**
 * 第一问「你现在是什么情况」的文案键。单独起名是因为它同时是取问句时的兜底 ——
 * 步名与下面那张表对不上时,退回问第一问,而不是让题面开天窗。
 */
export const OB_QUESTION_STATUS = 'prof.status'

/**
 * 每一步问句的文案键(与档案表单的六行标签共用同一批文案,三语在 lib/i18n)。
 * 2026-08-28 自旧件的拼串写法(`prof.` 接步名)改成整键落表:拼出来的键在文案闸里
 * 没有名字,也 grep 不到,与 STATUS_TABS 当初的改法同一个理由。
 */
export const OB_QUESTIONS = [
  { step: 'status', key: OB_QUESTION_STATUS },
  { step: 'noc', key: 'prof.noc' },
  { step: 'clb', key: 'prof.clb' },
  { step: 'crs', key: 'prof.crs' },
  { step: 'prov', key: 'prof.prov' },
  { step: 'pgwp', key: 'prof.pgwp' },
] as const

/**
 * 简历解析:还没上传的初始态(空串,与「解析完」等态区分开)。
 */
export const RESUME_IDLE = ''

/**
 * 简历解析:上传中、模型还在读(这期间上传钮不可再点)。
 */
export const RESUME_BUSY = 'busy'

/**
 * 简历解析:读出来了(绿字提示识别到几个职业方向)。
 */
export const RESUME_DONE = 'done'

/**
 * 简历解析:读不到文字(多半是扫描件),请用户换一份或手动点选。
 */
export const RESUME_SCAN = 'scan'

/**
 * 简历解析:今天的免费解析次数用完了。
 */
export const RESUME_LIMIT = 'limit'

/**
 * 简历解析:其余的失败(网络断了、服务端出错),一律回退手动点选,不卡住向导。
 */
export const RESUME_FAIL = 'fail'

/**
 * 简历解析接口(POST 一份文件,回职业候选与英语水平)。
 */
export const URL_RESUME = '/api/resume'

/**
 * 取当前登录人的接口(向导要拿到人的编号才知道档案存给谁)。
 */
export const URL_ME = '/api/users/me'

/**
 * 职位板首页(向导填完没东西可存时回这里)。
 */
export const URL_HOME = '/'

/**
 * 带匹配视图参数的职位板(填出了东西 → 整页跳这里,让服务端重算并亮出匹配度)。
 */
export const URL_MATCH_VIEW = '/?view=match'

/**
 * 上传简历用的方法字(与档案保存的 PATCH 各一枚,别互相借)。
 */
export const METHOD_POST = 'POST'

/**
 * 上传时装文件的表单字段名(服务端按这个名字取件,改名就是静默 400)。
 */
export const RESUME_FIELD = 'file'

/**
 * 隐藏文件框的 type 属性值(点上传钮时替用户去点它)。
 */
export const RESUME_INPUT_TYPE = 'file'

/**
 * 文件框只收这两种简历(与服务端解析器支持的格式一致)。
 */
export const RESUME_ACCEPT = '.pdf,.docx'

/**
 * 换过一份文件后把文件框的值清成空串:不清的话选同一个文件不会再触发变更事件。
 */
export const RESUME_INPUT_RESET = ''

/**
 * 解析次数超限的响应码(对应「今天的次数用完了」那句提示)。
 */
export const HTTP_LIMIT = 429

/**
 * 文件读不出文字的响应码(对应「可能是扫描件」那句提示)。
 */
export const HTTP_UNREADABLE = 422

/**
 * 解析结果里最多替用户预选几个职业(前两个;识别出更多的仍然全部列出来供点选)。
 * 只预选两个是保守取舍:多勾的用户随手取消,漏勾的用户点一下就补上,前者更烦人。
 */
export const RESUME_PREFILL_MAX = 2

/**
 * 进度条满格的百分数(算出的比例乘它)。
 */
export const OB_PERCENT_MAX = 100

/**
 * 百分号(进度条宽度是运行时算出来的样式值,拼它才是合法的 CSS 长度)。
 */
export const OB_PERCENT_SIGN = '%'

/**
 * 向导用的弹框宽度档(中档 560,一问一答的题面正好,再宽点选行就散了)。
 */
export const OB_MODAL_SIZE = 'md'
