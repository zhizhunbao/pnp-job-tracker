/**
 * LMIA 低薪冻结口径(E8-04,2026-07-06):把「LMIA 历史记录」升级为「今天这条路还通不通」。
 *
 * 政策事实(抓自 canada.ca 官方页,httpx 直取,2026-04 生效):
 *  · 低薪岗 LMIA 在「失业率 ≥6% 的大都市区(CMA)」暂停受理(2024-09-26 起;CMA 清单每季更新,下次 2026-07-10)。
 *  · 低薪 = 工资 **低于所在省/地区的中位时薪门槛**(下表)。高薪岗完全不受此冻结影响。
 *  · 豁免行业(即使低薪也照常受理):初级农业、建筑(NAICS 23)、食品制造(311)、医院(622)、
 *    护理及居家照护(623)、特定居家看护 NOC(31301/32101/44100/44101)。
 *  · 农村地区(CMA 外)另有 2026-04 起的临时宽松措施。
 *
 * 维护:这是**政策维护表**(季度性),每季对照下方源 URL 核对门槛与规则。
 * 源:https://www.canada.ca/en/employment-social-development/services/foreign-workers/median-wage.html
 *     https://www.canada.ca/en/employment-social-development/services/foreign-workers/refusal.html
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 省/地区 → 中位时薪门槛(CAD/hr);工资 ≥ 门槛 = 高薪类(不受低薪冻结)。
 * 抓自 canada.ca median-wage 页。
 */
export const PROV_MEDIAN_HOURLY: Record<string, number> = {
  AB: 35.40, BC: 34.62, MB: 30.00, NB: 28.85, NL: 31.20, NT: 47.09,
  NS: 28.80, NU: 42.00, ON: 34.07, PE: 28.80, QC: 32.96, SK: 32.40, YT: 43.20,
}

/**
 * 特定居家看护的豁免 NOC(官方点名的四个码)。
 */
export const EXEMPT_CAREGIVER = new Set(['31301', '32101', '44100', '44101'])

/**
 * 工资分类:高薪(不受低薪冻结)。
 */
export const WAGE_HIGH = 'high'

/**
 * 工资分类:低薪。
 */
export const WAGE_LOW = 'low'

/**
 * 医疗/护理/看护的 NOC 首位(大类 3 全体按豁免近似)。
 */
export const NOC_HEALTH_P1 = '3'

/**
 * 建筑技工的 NOC 前两位。
 */
export const TRADES_P2 = new Set(['72', '73'])

/**
 * 初级农业的 NOC 前两位。
 */
export const AGRI_P2 = new Set(['84', '86'])

/**
 * NOC 大类(前两位)截取长度:`TRADES_P2` / `AGRI_P2` 两张表的键就是这个长度的码前缀,
 * 判定时把五位码截到同一长度再查表。
 */
export const NOC_GROUP_LEN = 2

/**
 * 全职年工时(40 小时/周 × 52 周 = 2080):年薪 ÷ 它 = 时薪,拿去和
 * `PROV_MEDIAN_HOURLY` 的省门槛比。这是官方低薪/高薪口径的换算锚点 ——
 * 官方门槛按**时薪**公布,而库里存的是年薪,两边必须换到同一单位才能比。
 * ⚠️ 兼职/季节岗按全职年工时折算会把时薪算低(偏保守,宁可多标低薪也不误标高薪)。
 */
export const FULL_YEAR_HOURS = 2080

/**
 * 没给省码时用的空串:`lmiaWageClass` 收的省码可能是 null,先折成空串再查
 * PROV_MEDIAN_HOURLY —— 空串必然查不到门槛,于是返回 null(判不了),而不是拿某个
 * 省的门槛顶上。🔴 这是「宁可留空也不瞎猜」在本域的落点:省份决定门槛,省份不明
 * 就没有门槛可比,任何默认省都是替官方编一个口径。
 */
export const PROV_NONE = ''
