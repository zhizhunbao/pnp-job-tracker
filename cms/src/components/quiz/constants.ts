/**
 * quiz 域的死值:答题壳与选职业控件下发的两段全局样式、两段样式里的类名、
 * 三问落档与职业查询的接口地址与报文词、进度文案表,以及版式与阈值档。
 * 2026-08-28 换装批自 QuizUI.tsx / OccPicker.tsx / ProvincePicker.tsx / EntryQuiz.tsx
 * 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */

/**
 * 答题壳的全局样式(由 QuizStyle 注进 `<style>`)。
 *
 * 🔴 **跨桶共用类,不许迁 module.css**(2026-08-28 记):`.plQuizPad` 由 plan 桶按类名
 * 字符串在用(`plan/constants.ts` 的 `QUIZ_PAD_CLS` / `QUIZ_PAD_SEL`),`.qzFill` 由
 * jobs 桶的 PnpScoreCard 按字符串在用,`.quizBar` 由 chat 桶的吸底避让测量按特征扫到
 * (它的注释里指名道姓写着 quizBar)。这三格等同 main.css 的一段,是**跨桶契约**;
 * 要迁 module.css 得连消费桶一起改,另立专批。
 *
 * 2026-08-28 换装批自 QuizUI.tsx 原样搬入本文件(那边是 tsx 顶层的模板字面量常量,
 * `no-constant-in-tsx` 不许住 tsx;而 `no-bare-strings` 只豁免 constants.ts 一处)。
 * 原文里的 `${UI.text}` 一族是 colors 域的**映射表**,展开后逐字就是 `var(--text)`
 * (colors/constants.ts 的表头写着「映射成 var() 而不是复制一份十六进制」),
 * 所以这里直接写 var():产出的 CSS 文本与原先逐字节相同,且 constants.ts 不许 import。
 *
 * 下面每一条的原始决策记录随注释整段搬来,一条未删。
 */
export const QUIZ_CSS = `
.qzTitle{font-size:19px;font-weight:700;line-height:1.55;color:var(--text);margin:0 0 16px}
/* 题干下的一句小注(可多选/其中含义…)。先前三个页面各写各的负 margin,间距各差 1-2px */
.qzSub{font-size:12.5px;line-height:1.55;color:var(--text3);margin:-11px 0 15px}
/* 选项两列铺开(≥900px):卡片宽度本来就有 1280,单列会让一行只放一个 15px 的选项、
   剩下的宽度全空着,题目还被拉长到要滚(2026-08-11 Frank「为什么没有按宽度展开」)。
   最多两列 —— 三列以上 A/B/C/D 的扫读顺序就乱了。 */
.qzList{display:grid;grid-template-columns:1fr;gap:10px;margin:0;padding:0;border:0}
@media(min-width:900px){.qzList{grid-template-columns:1fr 1fr}}
/* 整块卡片就是一个点击目标(2026-07-31 Frank「点一下还不行,要点好几下」):
   内边距必须在 label 上 —— 留在外层时那一圈 11-14px 不属于 label,点上去 radio 收不到 */
.qzItem{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:11px 14px;margin:0;
  background:#fff;border:1px solid var(--border);border-radius:10px;cursor:pointer}
.qzItem:hover{border-color:#93c5fd;background:#f8fbff}
.qzItem input{position:absolute;opacity:0;width:0;height:0}
.qzItem:has(input:focus-visible){outline:2px solid var(--primary);outline-offset:2px}
/* 字母徽标 A/B/C/D(原生 radio 的圆点点击目标感弱,Frank 拿三个答题项目对比过) */
.qzBadge{flex-shrink:0;width:26px;height:26px;border:1px solid var(--border);border-radius:7px;background:#fff;
  color:var(--text2);font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.qzItem--on{border-color:var(--primary);background:#eff6ff}
.qzItem--on .qzBadge{background:var(--primary);border-color:var(--primary);color:#fff}
.qzItem--on .qzText{color:var(--primary-deep);font-weight:600}
.qzText{font-size:15px;line-height:1.5}
/* 多选题与单选题是同一张卡片,只把字母徽标换成对勾;分值自成一列右对齐(多值拆列,不塞进文字尾巴) */
.qzPts{margin-left:auto;padding-left:10px;flex-shrink:0;color:var(--text3);font-size:13px;
  font-variant-numeric:tabular-nums}
.qzItem--on .qzPts{color:var(--primary-deep)}
/* 动作条:桌面粘在内容底,手机钉在视口底 —— **每一页同一个地方**
   (2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」:答题页内容短、
   撑不满一屏时 sticky 压根不触发,实测每页落点 574/619/756 各不相同) */
.quizBar{position:sticky;bottom:0;z-index:2;background:#fff;border-top:1px solid var(--hairline);
  margin-top:18px;padding:10px 0 8px;display:flex;align-items:center;justify-content:flex-end;gap:12px;
  min-height:56px;box-sizing:border-box}
/* 两颗按钮之间那句灰字**只填空隙**:永不折行(折一行按钮就跟着上下跳),窄到放不下就整句不出 ——
   375 上两颗定宽按钮之间只剩 75px,任何一句真话都装不下,截断的半句比不写更糟 */
.qzHint{flex:1;min-width:0;font-size:12.5px;color:var(--text3);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
/* 翻题不跳版:题区**最小**高 560,不是固定高 —— 固定高会把长的职业页塞进一个内层滚动框,
   于是「已选 7 个」这种动态区被推到框外看不见,还多出一根滚轮(2026-08-11 Frank 两张实拍)。
   改成 min-height 后:短题由 flex 留白撑到 560、动作条落在同一条基线;长题让页面自己长,
   动作条靠 sticky 粘在视口底 —— 照样一直点得到,而且没有内层滚轮。 */
.plQuizPad{display:flex;flex-direction:column;min-height:560px;box-sizing:border-box}
.plQuizPad .quizBar{margin-top:auto}
/* margin-top:auto 只对**弹性子项**生效:题目外面还套了层 div 的(分值卡),那层必须自己也是
   撑满的弹性列,否则动作条就贴在内容底下,每题落点各不相同(08-10 实拍:时薪题的按钮比别的题高 366px)。
   **只给内层用**:把它加到 .plQuizPad 自己身上,min-height:0 会盖掉那 560 的最小高(08-11 实撞)。 */
.qzFill{display:flex;flex-direction:column;flex:1;min-height:0}
@media(max-width:640px){
  .quizBar{position:fixed;left:0;right:0;bottom:0;margin:0;padding:10px 16px;border-top:1px solid var(--border);
    box-shadow:0 -2px 8px rgba(0,0,0,.04);z-index:30}
  /* 手机上这句灰字不出(位置只剩 75px),但**这一格要留着**——它是把上一题顶到左下角的那根撑杆 */
  .qzHint{visibility:hidden}
  .plQuizPad{height:auto;min-height:0;overflow:visible;scrollbar-gutter:auto;padding:0 0 78px}
}`

/**
 * 选职业控件的全局样式(由 OccStyle 注进 `<style>`)。
 *
 * 🔴 **跨桶共用类,不许迁 module.css**(2026-08-28 记):`.occPill` 与 `.occSelectedChip`
 * 由 modal 桶按类名字符串在用(`modal/constants.ts` 的 `DRAG_IGNORE_SEL` —— 拖动弹框时
 * 点在这两种件上不许起拖)。整段与 QUIZ_CSS 同办法处理:注入机制、类名、值一格不改,
 * 要迁 module.css 得连 modal 桶一起改,另立专批。
 *
 * 2026-08-28 换装批自 OccPicker.tsx 组件体内的 `<style>` 原样搬入(同上,`${UI.x}`
 * 逐字展开成 var(),产出的 CSS 文本与原先相同)。
 */
export const OCC_CSS = `
.occSelected{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-height:30px;margin-bottom:10px}
.occSelectedHead{display:flex;align-items:center;gap:8px;margin-right:2px}
.occSelectedChip{display:inline-flex;align-items:center;gap:5px;max-width:100%;border:1px solid #bfdbfe;
  border-radius:999px;background:#eff6ff;color:var(--primary-deep);padding:5px 8px 5px 10px;
  font:600 12.5px/1.3 inherit;cursor:pointer}
.occSearchWrap{position:relative;margin-bottom:10px}
.occResultsHead{font-size:12px;color:var(--text3);margin:0 0 7px}
.occCatSel{display:none;width:100%;height:40px;box-sizing:border-box;margin:0 0 11px;padding:0 10px;
  border:1px solid var(--border);border-radius:10px;background:#fff;color:var(--text);font:13.5px/1 inherit}
.occCatTabs{display:flex;flex-wrap:wrap;gap:14px;margin:1px 0 12px;padding:0 0 9px;
  border-bottom:1px solid var(--hairline)}
.occCatTab{border:0;border-bottom:2px solid transparent;background:transparent;padding:3px 0;
  color:var(--text2);font:400 13px/1.4 inherit;cursor:pointer}
.occCatTab--on{border-bottom-color:var(--primary);color:var(--primary);font-weight:700}
.occPills{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.occPill{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:36px;box-sizing:border-box;
  padding:7px 13px;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--text);
  font:500 13.5px/1.35 inherit;cursor:pointer;transition:border-color .12s,background .12s,color .12s}
.occPill:hover{border-color:#93c5fd;background:#f8fbff}
.occPill--on{border-color:var(--primary);background:var(--primary);color:#fff;font-weight:600}
.occPill--on:hover{border-color:var(--primary-deep);background:var(--primary-deep)}
/* 走查 #296:职业名不许截断(「Restaurant and food service m…」)——名字是用户找自己那一行的唯一线索,
   截了他就认不出。放不下就换行,胶囊变高一点没关系;别再加 ellipsis/nowrap 回来。 */
.occPillName{min-width:0;overflow-wrap:anywhere}
.occPillMeta{flex-shrink:0;color:var(--text3);font-size:11.5px;font-variant-numeric:tabular-nums}
.occPill--on .occPillMeta{color:#dbeafe}
.occPillCheck{display:inline-flex;align-items:center;font-size:12px}
.occPillSkeleton{height:36px;border-radius:999px;background:var(--hairline)}
.occMore{display:block;margin:9px auto 0;border:0;background:transparent;color:var(--primary);
  font:600 12.5px/1.4 inherit;cursor:pointer;padding:5px 10px}
@media(max-width:640px){.occCatSel{display:block}.occCatTabs{display:none}.occPills{gap:7px}
  .occPill{min-height:38px;padding:8px 12px}}`

/**
 * 题干行的类(答题壳)。
 */
export const CLS_TITLE = 'qzTitle'

/**
 * 题干下小注的类(答题壳)。
 */
export const CLS_SUB = 'qzSub'

/**
 * 选项组的类(答题壳;≥900px 两列)。
 */
export const CLS_LIST = 'qzList'

/**
 * 一张选项卡片的类(答题壳;整块卡片就是点击目标)。
 */
export const CLS_ITEM = 'qzItem'

/**
 * 选中态选项卡片的加倍类(答题壳)。
 */
export const CLS_ITEM_ON = 'qzItem--on'

/**
 * 选项卡片左侧字母/对勾徽标的类(答题壳)。
 */
export const CLS_BADGE = 'qzBadge'

/**
 * 选项文字的类(答题壳)。
 */
export const CLS_TEXT = 'qzText'

/**
 * 选项右侧分值列的类(答题壳;多值拆列)。
 */
export const CLS_PTS = 'qzPts'

/**
 * 底部动作条的类(答题壳;chat 桶的吸底避让按特征扫它)。
 */
export const CLS_BAR = 'quizBar'

/**
 * 动作条中间那句灰字的类(答题壳;只填空隙,手机上隐藏但保留撑杆)。
 */
export const CLS_HINT = 'qzHint'

/**
 * 已选职业区的类(选职业控件)。
 */
export const CLS_OCC_SELECTED = 'occSelected'

/**
 * 已选职业区标题行的类(选职业控件)。
 */
export const CLS_OCC_SELECTED_HEAD = 'occSelectedHead'

/**
 * 一颗已选职业胶囊的类(选职业控件;modal 桶的拖动忽略表按名字认它)。
 */
export const CLS_OCC_CHIP = 'occSelectedChip'

/**
 * 搜索框外壳的类(选职业控件)。
 */
export const CLS_OCC_SEARCH_WRAP = 'occSearchWrap'

/**
 * 搜索结果计数行的类(选职业控件)。
 */
export const CLS_OCC_RESULTS_HEAD = 'occResultsHead'

/**
 * 手机端分类下拉的类(选职业控件;桌面隐藏)。
 */
export const CLS_OCC_CAT_SEL = 'occCatSel'

/**
 * 桌面端分类页签排的类(选职业控件;手机隐藏)。
 */
export const CLS_OCC_CAT_TABS = 'occCatTabs'

/**
 * 一个分类页签的类(选职业控件)。
 */
export const CLS_OCC_CAT_TAB = 'occCatTab'

/**
 * 当前分类页签的加倍类(选职业控件)。
 */
export const CLS_OCC_CAT_TAB_ON = 'occCatTab--on'

/**
 * 职业胶囊排的类(选职业控件)。
 */
export const CLS_OCC_PILLS = 'occPills'

/**
 * 一颗职业胶囊的类(选职业控件;modal 桶的拖动忽略表按名字认它)。
 */
export const CLS_OCC_PILL = 'occPill'

/**
 * 选中态职业胶囊的加倍类(选职业控件)。
 */
export const CLS_OCC_PILL_ON = 'occPill--on'

/**
 * 职业胶囊里名字那一格的类(选职业控件;名字不许截断,放不下换行)。
 */
export const CLS_OCC_PILL_NAME = 'occPillName'

/**
 * 职业胶囊里灰字小注那一格的类(选职业控件;重名的官方名与在招数都走它)。
 */
export const CLS_OCC_PILL_META = 'occPillMeta'

/**
 * 职业胶囊里对勾那一格的类(选职业控件)。
 */
export const CLS_OCC_PILL_CHECK = 'occPillCheck'

/**
 * 占位骨架胶囊的类(选职业控件;高与圆角照真胶囊,宽度由本域 module.css 逐档给)。
 */
export const CLS_OCC_PILL_SKELETON = 'occPillSkeleton'

/**
 * 拼类名用的分隔符(一个空格)。
 */
export const CLS_SEP = ' '

/**
 * 兜底常用职业的在招数小查询(拼上逗号连接的 NOC 码表)——
 * 让首屏那 14 个内置职业的数字尽快出现,不阻塞控件。
 */
export const URL_QUIZ_COUNTS = '/api/quiz?counts='

/**
 * 真实热门榜(前 24)。24 与服务端启动预热、缓存键完全一致 —— 改成 200 会绕过预热,
 * 冷启动重新 GROUP BY 全表,实测把职业题首屏从几十毫秒拖到 2.8 秒。
 */
export const URL_QUIZ_TOP = '/api/quiz?top=24'

/**
 * 按大分类取职业清单的地址头(拼上编码后的分类 slug;接口硬顶 60 条,不分页)。
 */
export const URL_QUIZ_BROAD = '/api/quiz?broad='

/**
 * 按关键词搜职业的地址头(拼上编码后的查询词)。
 */
export const URL_QUIZ_Q = '/api/quiz?q='

/**
 * 按 NOC 码查单个职业事实的地址头(拼上编码后的五位码;已选胶囊的名字回填走它)。
 */
export const URL_QUIZ_NOC = '/api/quiz?noc='

/**
 * 当前登录用户(三问落档前先读回既有档案)。
 */
export const URL_ME = '/api/users/me'

/**
 * 用户档案整组更新的地址头(拼上用户 id)。
 */
export const URL_USERS_HEAD = '/api/users/'

/**
 * 带上站内 Cookie(落档要认人)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 档案整组更新用 PATCH(Payload 的用户集合口径)。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * 请求体类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 请求体类型:JSON。
 */
export const MIME_JSON = 'application/json'

/**
 * 中止异常的名字。**abort 不算拿不到**:StrictMode/切页会中止第一次请求,
 * 把它当失败会立刻撤掉骨架,骨架一撤、真榜再到,列表照样长一次
 * (2026-08-12 实撞,探针打出 topLoaded=true 才看出来)。
 */
export const ABORT_NAME = 'AbortError'

/**
 * 多个 NOC 码拼进 counts 查询时的连接符。
 */
export const SEP_COMMA = ','

/**
 * 建档向导「已经问过」的记忆键的值(答完三问就写它,别再弹建档向导)。
 */
export const SEEN_ONE = '1'

/**
 * 「没有」的空文本(没答、名字还没拉到、不重名时那一格的返回值)。
 * 与 companies/account 等域同名同义,各家一份(跨域不互相取常量)。
 */
export const TEXT_NONE = ''

/**
 * 进度文字的三语表(先前是覆盖 SurveyJS 的 questionsProgressText;
 * 「已答 0/2 题」那套考试口吻 2026-07-31 被 Frank 点名,改成建档口吻)。
 * 身份 + 三语一体的表按域管(宪法 08-22),所以住本域不进 lib/i18n。
 */
export const PROGRESS = {
  /**
   * 中文。
   */
  zh: '已填 {0}/{1} 项',

  /**
   * 英文。
   */
  en: '{0}/{1} completed',

  /**
   * 韩文。
   */
  ko: '{0}/{1} 완료',
}

/**
 * 进度文案里「已填几项」的占位符。
 */
export const SLOT_DONE = '{0}'

/**
 * 进度文案里「一共几项」的占位符。
 */
export const SLOT_TOTAL = '{1}'

/**
 * 百分比满值(进度条宽度按它折算)。
 */
export const PERCENT_MAX = 100

/**
 * 百分号(拼进进度条的行内宽度)。
 */
export const PERCENT_SIGN = '%'

/**
 * 分母下限(题数为 0 时不许除 0)。
 */
export const TOTAL_MIN = 1

/**
 * 字母徽标 A 的码位(第 i 个选项标 A/B/C/D)。
 */
export const ALPHA_A = 65

/**
 * 正分前面的加号(加分项有负分,符号跟着分值走,不拼「+-100」)。
 */
export const SIGN_PLUS = '+'

/**
 * 分值的正负分界(≥0 才补加号)。
 */
export const PTS_ZERO = 0

/**
 * 热门榜与占位骨架的格子数:从头到尾都是 24,列表不会长一次、也就不会重排。
 */
export const TOP_N = 24

/**
 * 起搜字数:少于 2 个字不发请求(整表模糊匹配没意义)。
 */
export const QUERY_MIN = 2

/**
 * 搜索防抖(毫秒)。
 */
export const SEARCH_DEBOUNCE_MS = 180

/**
 * 判「同名不同码」的门槛:同一个显示名出现超过 1 次才挂官方名区分,
 * 不重名的什么都不挂(甩个 5 位码只添噪音,2026-07-27 拍板)。
 */
export const DUP_MIN = 1

/**
 * 骨架宽度档的个数(按索引取模,占位与实物差得越少,填上去那一下越看不出来)。
 */
export const SKEL_KINDS = 6

/**
 * 空列表的长度(「一个都没选」「一条都没搜到」的判据)。
 */
export const LEN_ZERO = 0

/**
 * 补位骨架的 React key 前缀(与真胶囊的 NOC 码 key 分开,免得两批撞键)。
 */
export const KEY_SKEL_HEAD = 'ph'

/**
 * 在招数的千分位格式(en-CA;数字全站同一套写法)。
 */
export const LOCALE_NUM = 'en-CA'

/**
 * 单选控件的原生类型(同名 radio 的方向键切换、Tab 焦点、读屏播报全是浏览器自带的)。
 */
export const INPUT_RADIO = 'radio'

/**
 * 多选控件的原生类型。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 单选题选项组的 ARIA 角色。
 */
export const ROLE_RADIOGROUP = 'radiogroup'

/**
 * 搜索结果区的实时播报档(结果条数变了要念出来)。
 */
export const ARIA_LIVE_POLITE = 'polite'

/**
 * 弹层关闭钮的无障碍名。
 */
export const ARIA_CLOSE = 'close'

/**
 * 多选卡片选中时的对勾字。
 */
export const MARK_CHECK = '✓'

/**
 * 弹层关闭钮上的叉。
 */
export const MARK_CLOSE = '×'

/**
 * 搜索在途时结果计数行上的省略号。
 */
export const MARK_ELLIPSIS = '…'

/**
 * 表单内的辅助钮明确不提交。
 */
export const BTN_TYPE = 'button'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 主行动钮的变体(「下一题」与弹层底部那颗通栏钮)。
 */
export const PRIMARY_BTN_KIND = 'primary'

/**
 * 十省的省码(QC 走自己的体系,清单里留着是因为「目标省」问的是去哪儿,不是判 PNP)。
 */
export const CANADA_PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'] as const

/**
 * 省名取词键的前缀(拼上两位省码)。
 */
export const KEY_PROV_HEAD = 'prov.'

/**
 * 大分类取词键的前缀(拼上分类 slug)。
 */
export const KEY_BROAD_HEAD = 'broad.'

/**
 * 分类学尾巴的正则(「、及其他相关职业」「和相关工作」这一族)。
 * NOC 官方职业名是**分类名**不是岗位名,天生很长(「食品柜台服务员、厨房助手及相关辅助职业」)。
 * Frank 2026-07-27「很多职业名字是不是太长了啊」:选职业的人只需要认出**头一个**是不是自己那行。
 */
export const OCC_TAIL_RE = /[、,]?\s*(?:及|和)?其?(?:他)?相关[^、,]*(?:职业|工作)$/

/**
 * 顿号/逗号切分(只取第一段)。
 */
export const OCC_COMMA_RE = /[、,]/

/**
 * 「及」切分(只在「、」「及」处切 —— 不切「和」,中文译名里
 * 「汽车服务技师卡车和公共汽车机械师」切了会更怪)。
 */
export const OCC_AND_RE = /及/
