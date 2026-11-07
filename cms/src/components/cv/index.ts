/**
 * 生成简历桶的门(2026-11-07 立):「我的简历」页与投递第 1 步都只挂这一个窗口。
 * 外加窗口开关 useCvOpen(两处宿主同一套:开、关、存成了先关再交宿主)。门里只有转发。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */

export { CvBuilder } from './cvbuilder'
export { useCvOpen } from './hooks'
