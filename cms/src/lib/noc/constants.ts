/**
 * NOC 显示域的死值:大分类配色。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

// eslint-disable-next-line local/no-import-in-leaf -- 配色表的格是本域 Cat 形状(特批牌形态)
import type { Cat } from './types'

/**
 * 未分类/查不到时的中性色。
 */
export const NA: Cat = { bg: '#fafafa', fg: '#9ca3af' }

/**
 * 大分类 → 配色。同一行业族共用色相(蓝=办公室、青=钱与法、天蓝紫=科技、绿紫=人、
 * 粉=文体、黄=卖、橙=吃住、红灰=蓝领、青柠=运、土色=一二产),扫一眼能按族分堆。
 * 2026-09-23 大类重排(Frank「按表来」,27 → 23):新大类沿用并入前分量最大那个旧大类的色(财会金融 = 原金融、
 * 运输物流 = 原运输……),新立的人力资源给紫;旧大类的色先留着,等数据层切完新名再清(过渡期两套都认)。
 */
export const BROAD_COLOR: Record<string, Cat> = {
  管理层: { bg: '#dbeafe', fg: '#1e40af' }, 商务: { bg: '#e0e7ff', fg: '#3730a3' },
  行政: { bg: '#eef2ff', fg: '#4338ca' }, 文员: { bg: '#f1f5f9', fg: '#334155' },
  金融: { bg: '#ccfbf1', fg: '#115e59' }, 会计: { bg: '#d1fae5', fg: '#065f46' },
  法律: { bg: '#e2e8f0', fg: '#1f2937' },
  IT: { bg: '#cffafe', fg: '#155e75' }, 工程: { bg: '#e0f2fe', fg: '#075985' },
  科学: { bg: '#ede9fe', fg: '#5b21b6' },
  医疗: { bg: '#dcfce7', fg: '#166534' }, 教育: { bg: '#fae8ff', fg: '#86198f' },
  社会服务: { bg: '#f5d0fe', fg: '#701a75' },
  艺术: { bg: '#fce7f3', fg: '#9d174d' }, 体育: { bg: '#ffe4e6', fg: '#9f1239' },
  销售: { bg: '#fef3c7', fg: '#92400e' }, 零售: { bg: '#fef9c3', fg: '#854d0e' },
  餐饮: { bg: '#ffedd5', fg: '#9a3412' }, 住宿: { bg: '#fed7aa', fg: '#7c2d12' },
  生活服务: { bg: '#fff7ed', fg: '#7c2d12' },
  技工: { bg: '#fee2e2', fg: '#991b1b' }, 建筑: { bg: '#e7e5e4', fg: '#57534e' },
  运输: { bg: '#d9f99d', fg: '#3f6212' }, 物流: { bg: '#ecfccb', fg: '#4d7c0f' },
  农业: { bg: '#dcfce7', fg: '#14532d' }, 矿业: { bg: '#fde68a', fg: '#713f12' },
  制造: { bg: '#f3f4f6', fg: '#374151' },
  高管: { bg: '#dbeafe', fg: '#1e40af' }, 人力资源: { bg: '#f3e8ff', fg: '#6b21a8' },
  行政文员: { bg: '#eef2ff', fg: '#4338ca' }, 客户服务: { bg: '#f1f5f9', fg: '#334155' },
  财会金融: { bg: '#ccfbf1', fg: '#115e59' }, 科研: { bg: '#ede9fe', fg: '#5b21b6' },
  公共服务: { bg: '#f5d0fe', fg: '#701a75' }, 文体艺术: { bg: '#fce7f3', fg: '#9d174d' },
  酒店旅游: { bg: '#fed7aa', fg: '#7c2d12' }, 零售销售: { bg: '#fef9c3', fg: '#854d0e' },
  机修技工: { bg: '#fee2e2', fg: '#991b1b' }, 运输物流: { bg: '#d9f99d', fg: '#3f6212' },
  农林矿业: { bg: '#dcfce7', fg: '#14532d' },
}

/**
 * 中文语言码(catName 判「界面是不是中文」;分类值本身就是数据层中文,中文界面零查表)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文语言码。
 */
export const LANG_KO = 'ko'

/**
 * 分类词条的 i18n 键前缀(新值)。
 */
export const KEY_CAT = 'cat.'

/**
 * 分类词条的 i18n 键前缀(老值仍在库里,回退用)。
 * 2026-09-18 Frank「都叫科技」:大类 `IT` 的显示名改成「科技 / Tech / 테크」(公司行业那一类同名),
 * 改的只是 `broad.IT` 这条文案与维度表的英韩名;键仍是 `IT`,库值、`?broad=IT` 与统计页的 `it` 路径都不动。
 */
export const KEY_BROAD = 'broad.'

/**
 * 职责/要求翻译的 IP 日限。
 */
export const NOCTR_IP_DAILY = 80

/**
 * 职责/要求翻译限额键前缀。
 */
export const NOCTR_LIMIT_PREFIX = 'noctr:'

/**
 * 「没有名字可显示」的表示:空串。职业名一路回退(短名 → 完整译名 → 官方英文名)
 * 到底还是没有、或者英文界面本来就不渲译名时给它 —— 调用方拿到空串就整格不渲染
 * (灰字小注不出现),而不是渲一个空盒子。本域里空串只有这一种含义。
 */
export const NAME_NONE = ''

/**
 * 请求体里没取到的参数(noc / lang)的初值:空串 = 「没给」。body 解析失败也落回它,
 * 随后被 `noc === '' || TRANS_LANGS.includes(lang) === false` 一把挡下 → 400。
 * 用空串而不是 null,是因为这两道闸一个比字面量、一个查白名单,空串照样进得去,
 * 少一次判空。
 */
export const PARAM_NONE = ''

/**
 * 没有原文时的译文:空串。官方职责/任职要求常常只有一半有内容,空的那一半不调模型
 * (省一次上游往返),直接给空译文并算「完整」(full),缓存才敢收下这一份。
 */
export const TRANS_TEXT_NONE = ''

/**
 * 生成简历「导入职责」搜职业(2026-11-07):检索词最短几个字(一个字母能搜出半张表,没意义)。
 */
export const DUTY_Q_MIN = 2

/**
 * 检索词最长几个字(职位名不会更长;超长截断)。
 */
export const DUTY_Q_MAX = 60

/**
 * 库里最多捞几行再排序(全表 509 个职业,常见词命中几十行)。
 */
export const DUTY_SCAN_ROWS = 60

/**
 * 回给前端几个职业。
 */
export const DUTY_HITS_MAX = 8

/**
 * 「导入职责」搜职业的 IP 日限(边打边搜,一次填表十几次)。
 */
export const DUTY_IP_DAILY = 400

/**
 * 「导入职责」搜职业限额键前缀。
 */
export const DUTY_LIMIT_PREFIX = 'nocduty:'

/**
 * 查询参数:检索词。
 */
export const P_Q = 'q'

/**
 * `LIKE` 的通配符,前后各一个 = 子串匹配。
 */
export const LIKE_ANY = '%'

/**
 * 检索词里的 LIKE 元字符(拼模式串前转义)。
 */
export const LIKE_SPECIAL_RE = /[%_\\]/g

/**
 * LIKE 元字符的转义写法(前面加反斜杠;Postgres ILIKE 默认转义符就是反斜杠)。
 */
export const LIKE_ESCAPE = '\\$&'

/**
 * 职责、示例职位名在库里一行一条。
 */
export const LINE_SEP = '\n'

/**
 * 搜职业的响应缓存(五分钟)。
 * 2026-11-07 本地实测撞见:原先给一天,浏览器把改搜法前的「没找到」留了一整天 —— 搜法一改,用户要等一天才看到。
 */
export const DUTY_CACHE = 'public, max-age=300'

/**
 * 排名档:职业名或某个示例职位名与检索词一字不差。
 */
export const RANK_EXACT = 0

/**
 * 排名档:职业名或某个示例职位名以检索词开头。
 */
export const RANK_START = 1

/**
 * 排名档:职业名里含检索词。
 */
export const RANK_TITLE = 2

/**
 * 排名档:只有示例职位名里含检索词。
 */
export const RANK_EXAMPLE = 3

/**
 * 排名档:整句哪儿都没有,只是每个词都出现(「Big data architect」→ 示例名里有 data architect、big data analyst)。
 */
export const RANK_WORDS = 4

/**
 * 检索词按空白拆成词。
 */
export const WORD_SPLIT_RE = /\s+/

/**
 * 一个词最短几个字(更短的不参与按词搜)。
 */
export const DUTY_WORD_MIN = 2

/**
 * 最多按几个词搜。
 */
export const DUTY_WORDS_MAX = 5
