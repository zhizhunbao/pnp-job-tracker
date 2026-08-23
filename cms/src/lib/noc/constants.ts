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
