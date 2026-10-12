/**
 * pnp 子桶 fit 的常量:身份对照的判词与院校条件的词(与 etl/pathways 段 6 的词表逐字相同,数据层改词这里跟着改)。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */

/**
 * 空串(没选的筛选格)。
 */
export const TEXT_NONE = ''

/**
 * 能不能走:不能。
 */
export const CAN_NO = 'no'

/**
 * 院校条件地点词:本省(= 通道所在省)。
 */
export const SP_OWN = 'own'

/**
 * 院校条件地点词:外省(加拿大境内、不是通道所在省)。
 */
export const SP_OTHER = 'other'

/**
 * 院校条件地点词:加拿大任一省。
 */
export const SP_CANADA = 'canada'

/**
 * 教育经历「院校所在地」选了国外时的值(与 streams 桶的同名常量逐字相同)。
 */
export const EDU_ABROAD = 'abroad'

/**
 * 课程时长词,由短到长(院校条件 min 与教育经历 len 同一套):一年制 / 两年制 / 三年以上 / 硕士及以上。
 */
export const LEN_ORDER = ['y1', 'y2', 'y3', 'master']
