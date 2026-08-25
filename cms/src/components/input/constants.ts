/**
 * input 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */

/**
 * 尺寸档默认(md = 筛选行高,与 select 同高)。
 */
export const SIZE_DEFAULT = 'md'

/**
 * 关浏览器自动填充(平台定值):搜索框与筛选框不该被历史地址、姓名这类填充建议盖住。
 */
export const AUTOCOMPLETE_OFF = 'off'

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,一个空格就是
 * 一次分隔 —— 分隔符写错(比如误用逗号)不会报错,只会让整串退化成一个谁也匹配不上的
 * 长类名,样式全掉光却查不出原因。本域只有 inputClsOf 用它:把基座、尺寸档、
 * 搜索留位与调用方追加类连成一串 —— select 域的镜像与真 select 也吃这份结果,
 * 断在这里两边一起掉样式。
 */
export const CLS_SEP = ' '
