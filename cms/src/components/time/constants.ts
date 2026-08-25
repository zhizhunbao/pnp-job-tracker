/**
 * time 组件域的死值。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */

/**
 * 没有时间可显示时的占位符(与 row 域同一个空值口径)。
 */
export const EMPTY_MARK = '—'

/**
 * 默认显示档:纯日期。
 * 列表里的时间戳几乎都在回答「哪天发的」这一个问题,给到分秒只会把行撑宽;
 * 真要到分、到秒的地方(后台、日志)自己传 minute / second。
 */
export const GRAIN_DATE = 'date'

/**
 * 默认字色档:灰小字。
 * 时间是**注**不是事实主体(职位卡上的主角是标题与公司),所以默认压一档;
 * 要正文色的地方自己传 normal。
 */
export const TONE_DIM = 'dim'
