/**
 * name 组件桶的常量:名字两行(2026-10-09 N 批,Frank「这部分组件能不能全站统一」「按这种为模版」;
 * 模板 = companies 桶 JobMiniRow 的「英文蓝链 + 灰字译名」)。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */

/**
 * 站内蓝链的全局类名(main.css;与 companies 的 LINK_CLS 同值,各域自抄)。
 */
export const LINK_CLS = 'link'

/**
 * 外链新标签开(城市、省份去 Google 地图)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 空串(没有译名 / 没有链接)。
 */
export const TEXT_NONE = ''

/**
 * 地图查询的级别:城市(与 lib/location 的 F_CITY 同值)。
 */
export const MAP_CITY = 'city'

/**
 * 地图查询的级别:省份(与 lib/location 的 F_PROVINCE 同值)。
 */
export const MAP_PROVINCE = 'province'

/**
 * 省名词条的键头(后接省码;与 lib/location 的 PROV_KEY 同值,各域自抄)。
 */
export const PROV_KEY = 'prov.'

/**
 * 中文界面。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面。
 */
export const LANG_KO = 'ko'

/**
 * 职位页地址头(后接职位号;Ctrl 点职位名新标签开整页)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 公司页地址头(后接 slug;Ctrl 点公司名新标签开整页)。
 */
export const URL_COMPANY_HEAD = '/companies/'

/**
 * 弹框总线上公司层的种类(与 advisor / peek 的 LAYER_CO 同值,各域自抄)。
 */
export const LAYER_CO = 'company'

/**
 * 没有公司页的雇主池键头(AIP 指定雇主名单里对不上公司表的行,`n:<归一名>`;公司框认它,公司页不认)。
 */
export const POOL_KEY_HEAD = 'n:'
