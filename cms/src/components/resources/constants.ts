/**
 * resources 域(官方资源导航页)的死值:版式档、i18n 键前缀、全局规范类、
 * 新开页目标、页面元信息,以及 ItemList 结构化数据的词。
 * 2026-08-28 换装批自 Resources.tsx 与它的页面门收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */

/**
 * 正文轨的上内衬档(px;原内联 1rem = 16,走 Shell 的 16 档)。
 */
export const SHELL_TOP = 16

/**
 * 本页在 banner 域里的模块名(定配色档与图组 —— 官方资源属通道模块,不发明新配色)。
 */
export const BANNER_MODULE = 'pathways'

/**
 * 「没有」的空文本(搜索框初值、判空基准)。与 companies/account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 分区小标题的 i18n 键前缀(拼上分组名 = 那一区的标题词,如 `res.cat.federal`)。
 */
export const CAT_KEY_HEAD = 'res.cat.'

/**
 * 整卡可点的全局 hover 类(卡 = 蓝框 + 浅底)。真身在 main.css,靠 `!important` 压行内,
 * 全站共用 —— 留全局,不进本域。
 * 本域原先那套 resTile 自有 hover 已退役换成它(hover统一-20260731,值相同零视觉变化)。
 */
export const CLS_CARD_HOVER = 'cardHover'

/**
 * 类名之间的分隔(拼全局规范类与本域 module 类时用)。
 */
export const CLS_SEP = ' '

/**
 * 资源卡的新开页目标(官方站是站外去处,不抢本站这一页;rel 由 LinkButton 自动补)。
 */
export const LINK_TARGET_BLANK = '_blank'

/**
 * 结构化数据脚本的 MIME(搜索引擎按它认出这是 JSON-LD)。
 */
export const MIME_LD_JSON = 'application/ld+json'

/**
 * JSON-LD 的词汇表地址(schema.org 定死的值)。
 */
export const LD_CONTEXT = 'https://schema.org'

/**
 * 上下文格的键名(schema.org 定死;JS 侧要读所以留常量,值一个字不能改)。
 */
export const LD_KEY_CONTEXT = '@context'

/**
 * 类型格的键名(整张单子与单子里每一条都用它报自己的类型)。
 */
export const LD_KEY_TYPE = '@type'

/**
 * 整张单子的类型:有序清单。
 */
export const LD_TYPE_LIST = 'ItemList'

/**
 * 清单条目格的键名。
 */
export const LD_KEY_ELEMENTS = 'itemListElement'

/**
 * 单子里一条的类型。
 */
export const LD_TYPE_ITEM = 'ListItem'

/**
 * 序号格的键名(清单条目要按 1 起的序号排,缺了它整张单子不成立)。
 */
export const LD_KEY_POSITION = 'position'

/**
 * 名称格的键名。
 */
export const LD_KEY_NAME = 'name'

/**
 * 地址格的键名。
 */
export const LD_KEY_URL = 'url'

/**
 * 清单序号的起点(schema.org 的 position 从 1 数起,不是 0)。
 */
export const LD_POS_FIRST = 1

/**
 * 页面标题(SEO 落地页的门面;这一条不进 i18n —— 元信息不随界面语切换,
 * 一页一份中英合写,与 news/cases 各页同口径)。
 */
export const RES_META_TITLE = '加拿大移民官方资源导航 — IRCC/省提名/工资/LMIA 官方入口 | Offer2PR'

/**
 * 页面摘要(搜索结果里的那两行;同上不进 i18n)。
 */
export const RES_META_DESC = '加拿大移民官方资源一页汇总:IRCC 快速通道与 CRS、各省提名(PNP)、Job Bank 工资、'
  + 'LMIA/AIP 雇主担保、处理时间与费用、持牌顾问核验。'
  + 'Official Canadian immigration resources in one place.'
