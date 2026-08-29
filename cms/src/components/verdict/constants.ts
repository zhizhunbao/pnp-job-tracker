/**
 * verdict 域的死值:判定行的身份键与状态词、接口与埋点的名字、地址前缀、
 * 拼字用的记号与档位。2026-08-28 换装批自 TripleVerdictModal.tsx 与 ConditionGrid.tsx
 * 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */

/**
 * 「没有」的空文本(不出小注、省码缺席、译名没收录时的值)。
 */
export const TEXT_NONE = ''

/**
 * 事实瓦片查不到值时的横杠(库里没记 ≠ 值是 0)。
 */
export const TEXT_DASH = '—'

/**
 * 拼多个类名时的分隔符。
 */
export const CLS_SEP = ' '

/**
 * 指定名录多配行的项目名兜底(引擎没带项目名时,名录本身就是 AIP 那张)。
 */
export const PROGRAM_AIP = 'AIP'

/**
 * NOC 码前缀(值写「NOC 63200」,2026-08-13 Frank 点名;职业英文名不再跟在码后)。
 */
export const NOC_HEAD = 'NOC '

/**
 * TEER 层级前缀。
 */
export const TEER_HEAD = 'TEER '

/**
 * TEER 档位枚举之间的记号(全站禁「·」「/」杂糅,枚举用顿号)。
 */
export const TEER_SEP = '、'

/**
 * TEER 连续档位压成区间时的连接号(0–3 用的是 en dash,不是减号)。
 */
export const TEER_DASH = '–'

/**
 * 省名文案键的前缀(`prov.` + 省码;表里没有就原样显示省码)。
 */
export const KEY_PROV_HEAD = 'prov.'

/**
 * 关别名文案键的前缀(`tv.gate.` + 关别)。
 */
export const KEY_GATE_HEAD = 'tv.gate.'

/**
 * 通道名文案键的前缀(`jpw.p.` + 通道键)。
 */
export const KEY_PATHWAY_HEAD = 'jpw.p.'

/**
 * 枚举分隔记号的文案键(多个通道名并排时用它连,三语各有各的写法)。
 */
export const KEY_SEP = 'sep'

/**
 * 入口卡大档的标题键(详情页版式)。
 */
export const KEY_ENTRY_TITLE_LG = 'tv.entryTitle'

/**
 * 入口卡小档的标题键(弹框卡头)。
 */
export const KEY_ENTRY_TITLE = 'tv.head'

/**
 * 职业清单命中行。
 */
export const ROW_OCC_LISTED = 'tv.occ.listed'

/**
 * 职业被排除行。
 */
export const ROW_OCC_EXCLUDED = 'tv.occ.excluded'

/**
 * 职业未命中清单行。
 */
export const ROW_OCC_NOT_LISTED = 'tv.occ.notListed'

/**
 * 官方不设职业清单行(引擎已举证:资格页逐条无职业清单条目)——
 * 与「本站未收录」是反义,别混。
 */
export const ROW_OCC_NO_LIST = 'tv.occ.noList'

/**
 * 本站 TEER 粗筛行(2026-08-14 Frank 拍板整块删除,引擎照常产出、前端不渲染)。
 */
export const ROW_OCC_TEER = 'tv.occ.teer'

/**
 * 「你这边」被卡住的那道闸(与结论句同源;逐项差值仍在锁区)。
 */
export const ROW_YOU_GATE = 'tv.you.gate'

/**
 * 本站没收录门槛的通道行(说清是我们的窟窿,并指路官网 ——
 * ≠「官方不要求」,≠「你不行」)。
 */
export const ROW_YOU_NOT_COLLECTED = 'tv.you.notCollected'

/**
 * 雇主在指定名录里(AIP 一类)。
 */
export const ROW_EMP_DESIGNATED = 'tv.emp.designated'

/**
 * 名录里同名法人多家(连锁加盟),只报家数不点名 ——
 * 点名等于替用户认了一家不可证的雇主。
 */
export const ROW_EMP_DESIGNATED_MULTI = 'tv.emp.designatedMulti'

/**
 * 指定资格查不到。
 */
export const ROW_EMP_DESIGNATION_UNKNOWN = 'tv.emp.designationUnknown'

/**
 * 雇主成立年限行。
 */
export const ROW_EMP_YEARS = 'tv.emp.years'

/**
 * 雇主雇员数门槛行。
 */
export const ROW_EMP_STAFF = 'tv.emp.staff'

/**
 * 雇主营业额行(公司营业额无源,2026-08-10 永久结案 → 恒「未收录」;
 * 门槛数字按 08-14 极简令不进正文)。
 */
export const ROW_EMP_REVENUE = 'tv.emp.revenue'

/**
 * 雇主雇员数事实行(不是门槛判定,是查到的估数)。
 */
export const ROW_EMP_STAFF_FACT = 'tv.emp.staffFact'

/**
 * 公共部门雇主行。
 */
export const ROW_EMP_PUBLIC_SECTOR = 'tv.emp.publicSector'

/**
 * 「你这边」的语言成绩行。
 */
export const ROW_PERSON_LANGUAGE = 'tv.person.language'

/**
 * 「你这边」的工作经验行。
 */
export const ROW_PERSON_EXPERIENCE = 'tv.person.experience'

/**
 * 工签剩余时长行。
 */
export const ROW_TIME_PERMIT = 'tv.time.permit'

/**
 * 对省比较:目标省清单命中行。
 */
export const ROW_COMPARE_LISTED = 'tv.compare.listed'

/**
 * 对省比较:目标省清单未命中行。
 */
export const ROW_COMPARE_NOT_LISTED = 'tv.compare.notListed'

/**
 * 对省比较:没设目标省行。
 */
export const ROW_COMPARE_NO_TARGET = 'tv.compare.noTarget'

/**
 * 最快通道行。
 */
export const ROW_ROUTE_FASTEST = 'tv.route.fastest'

/**
 * 下一步找雇主行。
 */
export const ROW_NEXT_EMPLOYER = 'tv.next.employer'

/**
 * 职业关行键的前缀。
 */
export const ROW_OCC_HEAD = 'tv.occ.'

/**
 * 雇主关行键的前缀。
 */
export const ROW_EMP_HEAD = 'tv.emp.'

/**
 * 「你这边」行键的前缀。
 */
export const ROW_YOU_HEAD = 'tv.you.'

/**
 * 个人条件行键的前缀(income/funds 等其余 factor 走通用句)。
 */
export const ROW_PERSON_HEAD = 'tv.person.'

/**
 * 对省比较行键的前缀。
 */
export const ROW_COMPARE_HEAD = 'tv.compare.'

/**
 * 指定名录行键的前缀(designated 与 designationUnknown 共用一个灰标签)。
 */
export const ROW_DESIGNAT_HEAD = 'tv.emp.designat'

/**
 * 雇员数行键的前缀(门槛判定与事实估数共用一个灰标签)。
 */
export const ROW_STAFF_HEAD = 'tv.emp.staff'

/**
 * 判定态:达标。
 */
export const STATE_PASS = 'pass'

/**
 * 判定态:差着。
 */
export const STATE_GAP = 'gap'

/**
 * 判定态:被排除。
 */
export const STATE_EXCLUDED = 'excluded'

/**
 * 判定态:判不了(不编)。
 */
export const STATE_UNKNOWN = 'unknown'

/**
 * 判定态:摆事实不报警(2026-08-16 Frank「感叹号去掉 颜色去掉」——深灰无符号)。
 */
export const STATE_INFO = 'info'

/**
 * 判定态:本站粗筛(设计 §跨步规矩 B1)。对错符号只归官方门槛行,粗筛不配 ——
 * 中性圆点不渲染,正文退深灰(2026-08-14 Frank「感叹号去掉」)。
 */
export const STATE_COARSE = 'coarse'

/**
 * 判定行状态 → 扫读符号。只有官方门槛判出来的三态配符号:
 * 中性点 `•`、问号 `?`、信息号 `i` 2026-08-13 与 08-16 两次拍板撤掉
 * (「前面不需要问号吧」「感叹号去掉」——事实态措辞自解释,符号是再说一遍),
 * 于是这张表只留三格,查不到就不出符号。
 */
export const ROW_SIGN_CH: Record<string, string> = {
  /**
   * 达标(色弱用户靠符号兜底,可访问性不上砧板)。
   */
  pass: '✓',

  /**
   * 差着。
   */
  gap: '!',

  /**
   * 被排除。
   */
  excluded: '✗',
}

/**
 * 免费档判定行(付费行的逐项差值仍在服务端锁着)。
 */
export const TIER_FREE = 'free'

/**
 * 职业匹配关。
 */
export const GATE_OCCUPATION = 'occupation'

/**
 * 雇主资质关。
 */
export const GATE_EMPLOYER = 'employer'

/**
 * 中文界面的语言码(NOC 职业名中译只在它下面出)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 判定接口(POST 带本地答案:2026-08-12 Frank「匿名也可以访问」——
 * 没登录也判得出个人条件;服务端逐槽以落档的档案优先,本地答案只补它缺的那几样)。
 */
export const API_VERDICT = '/api/ruling/verdict'

/**
 * 判定接口的请求方法。
 */
export const HTTP_POST = 'POST'

/**
 * 带上同源 cookie(登录态决定付费行锁不锁)。
 */
export const CREDENTIALS_INCLUDE = 'include'

/**
 * 请求体类型头的名字。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 请求体类型头的值。
 */
export const MIME_JSON = 'application/json'

/**
 * 打开顾问弹窗的自定义事件名(打错是静默失效:监听器绑不上不报错)。
 */
export const EVT_CHAT_OPEN = 'o2p:chat-open'

/**
 * 判定面板挂载埋点(「有多少人真看了判定」这个数靠它)。
 */
export const TRACK_OPEN = 'tv-open'

/**
 * 点「去建档」埋点。
 */
export const TRACK_BUILD_PROFILE = 'tv-build-profile'

/**
 * 点卡头「看职位」埋点。
 */
export const TRACK_OPEN_JOB = 'tv-open-job'

/**
 * 点卡头「该雇主在招职位」埋点(裸「下一步」动作条 2026-08-13 Frank 点名撤销后,
 * 这个入口收进雇主资质卡的头部动作位)。
 */
export const TRACK_NEXT_EMPLOYER = 'tv-next-employer'

/**
 * 职位详情页地址前缀(散写路径打错是静默 404)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 职位板按雇主搜索的地址前缀。
 */
export const URL_JOBS_Q_HEAD = '/jobs?q='

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 加载占位的横条数(铁律:加载区必占位。SSR 进来时判定已经有值,这块根本不出)。
 */
export const SKEL_ROWS = 3

/**
 * 判定卡②里那组省页签的 aria id 前缀(同页另有摘要卡与估分卡各一组,前缀不许撞)。
 */
export const GRID_ID_COND = 'tvCond'

/**
 * 不匹配小标前面那个记号(琥珀胶囊里 ⚠ 与短语之间留一个空格)。
 */
export const WARN_SIGN = '⚠ '

/**
 * 只渲共用题那半。
 */
export const ONLY_SHARED = 'shared'

/**
 * 只渲省专属题那半。
 */
export const ONLY_PROV = 'prov'
