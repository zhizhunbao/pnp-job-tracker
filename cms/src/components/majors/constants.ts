/**
 * majors 组件域(专业选择器:从 CIP 2021 全表里挑专业)的死值:取数接口、搜索的防抖与起搜门槛、结果条数、
 * 左栏「热门」键与页签 / 白卡 id 前缀、词条键、多选上限与已选一行的标签档。
 * 2026-10-05 自 gate 桶整段迁入(访客第 2 题「你学的是什么专业?」的选择器自成一域 —— gate/functions.ts 已到 992 行,
 * 逼近 1000 行闸;同日改多选、加已选一行):逐条决策注释原样带过来,各条末尾补一句搬家记录;
 * 改了名的几枚(原 GATE_* 前缀)在注释里记原名。词条键照旧是 gate.* 那几条(三语词条不跟着搬家改键)。
 * 与 gate 同名同义的 TEXT_NONE 是本域自己的一份,各家各管。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */

/**
 * 空文本(搜索框清空、要标的检索词「不标」、专业键缺省的比较基准)。与 gate 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 专业题热门清单(2026-10-04 A2;原十二枚大类胶囊 MAJOR_OPTS 随改判删):majors 域的热门分支,按名次给十几个具体专业。
 * 表还没建时接口回空清单,专业题只剩搜索框。
 * 2026-10-05 自 gate 桶迁入。
 */
export const URL_MAJORS_TOP = '/api/majors?top=1'

/**
 * 专业题搜索(拼上编码后的检索词):英 / 中 / 韩名包含匹配,接口最多回 MAJOR_HITS_MAX 条。
 * 2026-10-05 自 gate 桶迁入。
 */
export const URL_MAJORS_Q = '/api/majors?q='

/**
 * 按码取一个专业(拼上编码后的 class 码):草稿里带来的、热门里没有的那个要靠它拿名字回显;
 * 注册完没选职业时也靠它拿该专业的本站大类,回职位板按大类筛。
 * 2026-10-05 自 gate 桶迁入(回职位板那一用在 gate:它经本桶的 fetchMajor 取,不另写一份)。
 */
export const URL_MAJOR_CODE = '/api/majors?code='

/**
 * 专业搜索防抖(毫秒;停手 300ms 才发,打字途中不一字一发)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const MAJOR_DEBOUNCE_MS = 300

/**
 * 起搜字数(不含中日韩字时):单个字母匹配整张专业表没意义,2 个字起。
 * 2026-10-05 自 gate 桶迁入。
 */
export const MAJOR_Q_MIN = 2

/**
 * 起搜字数(含中日韩字时):一个汉字 / 一个韩文音节就已经有意思(「会」「법」),1 个字起。
 * 2026-10-04 A2 收口改名(原 MAJOR_Q_MIN_CJK):角色后缀 _MIN 殿后,主题在前(主题_角色)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const MAJOR_Q_CJK_MIN = 1

/**
 * 判检索词里有没有中日韩字(CJK 统一表意文字 + 韩文音节)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const CJK_RE = /[㐀-鿿가-힯]/

/**
 * 专业搜索结果最多摆几枚(与接口的上限同数;接口改大了这里照旧只摆这么多)。
 * 2026-10-05 自 gate 桶迁入(结果早已从胶囊换成行,「几枚」即几行)。
 */
export const MAJOR_HITS_MAX = 20

/**
 * 读屏的礼让播报档(专业搜索结果那一排:结果到了念出来,不打断正在念的;与 quiz 桶选职业的结果区同一档)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const ARIA_LIVE_POLITE = 'polite'

/**
 * 专业搜索框的占位提示(同时当无障碍名;专业题唯一一行字,不加解释)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_MAJOR_PH)。
 */
export const MAJOR_PH_KEY = 'gate.majorPh'

/**
 * 中文界面的语言码(专业名挑中文名)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码(专业名挑韩文名);其余界面一律官方英文名。
 * 2026-10-05 自 gate 桶迁入。
 */
export const LANG_KO = 'ko'

/**
 * 左栏第一项「热门」的键(热门 16 个专业;不和数据层的大类键撞 —— 大类键是 biz / fin / it 这类两到八个小写字母)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const MAJOR_CAT_HOT = 'hot'

/**
 * 取大类清单(majors 域 ?cats=1 分支:16 个大类,按数据层排好的序)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const URL_MAJORS_CATS = '/api/majors?cats=1'

/**
 * 取一个大类的专业类树(majors 域 ?cat= 分支;后接大类键)。
 * 2026-10-05 自 gate 桶迁入。
 */
export const URL_MAJORS_CAT = '/api/majors?cat='

/**
 * 左栏页签与面板 id 的前缀(tabs 桶 RailTabs 的 idPrefix)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_RAIL_ID,原值 'gate-major-rail';选择器不认识 gate,前缀去掉 gate-)。
 */
export const MAJOR_RAIL_ID = 'major-rail'

/**
 * 专业类白卡内容块 id 的前缀(后接专业类键;card 桶 FoldCard 的 bodyId)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_FOLD_ID,原值 'gate-major-grp-';同上去掉 gate-)。
 */
export const MAJOR_FOLD_ID = 'major-grp-'

/**
 * 左栏第一项「热门」的词条键。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_HOT_KEY)。
 */
export const MAJOR_HOT_KEY = 'gate.hot'

/**
 * 左栏的读屏名词条键(「专业分类」)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_CATS_KEY)。
 */
export const MAJOR_CATS_KEY = 'gate.majorCats'

/**
 * 专业类头行个数胶囊的词条键(「{n}个专业」)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_MAJOR_N_KEY)。
 */
export const MAJOR_N_KEY = 'gate.majorN'

/**
 * 加载中那一行的词条键(loading 桶「转圈 + 一句话」;借全站现成的「加载中…」)。
 * 2026-10-05 自 gate 桶迁入(原名 GATE_LOADING_KEY)。
 */
export const MAJOR_LOADING_KEY = 'act.loadingText'

/**
 * 最多选几个专业(2026-10-05 Frank「现在点了专业没法取消,而且不能选多个吗」→ 改多选):国内本科 + 加拿大 college / 硕士
 * 是本站用户的常见组合,给到 3。选满后没选的行一律灰着点不动,摘掉一个才恢复(不加提示文案)。
 * 与 lib/guest、lib/quiz 的同名上限同数同义,跨域各家一份。
 */
export const MAJOR_PICK_MAX = 3

/**
 * 已选专业那一行 × 的读屏名词条键(「移除 {name}」;与第 3 题已选职业的 × 同一条)。2026-10-05 立。
 */
export const MAJOR_DEL_KEY = 'ob.tagDel'

/**
 * 已选专业那一行行首灰字小标的词条键(「已选 {n}/{max}」;顺带说清最多选几个,选满后其余行变灰才有来由)。
 * 2026-10-05 Frank「这部分要不要加一个 已选 的标识」立。
 */
export const MAJOR_PICKED_KEY = 'gate.majorPicked'

/**
 * 已选专业标签的变体(tag 桶 pick 已选档:浅主色,与第 3 题已选职业的标签同色;与 profile 域同名同义,各家一份)。2026-10-05 立。
 */
export const TAG_V_PICK = 'pick'
