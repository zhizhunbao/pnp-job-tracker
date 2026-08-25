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
