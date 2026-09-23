/**
 * jobtitle 域的桶 —— 职位名底下那行灰字(界面语言的标题译名)挑哪个、没有的去哪懒翻。
 * 2026-09-23 立域(Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」):职位板手机卡与职位详情页(jobs 桶)、
 * 公司页在招清单与相关职位行(companies 桶)、职位弹框(advisor 桶)同一个口径。三个桶彼此有引用
 * (jobs → companies → advisor → jobs),共用件放进哪一个都成环,所以单立这一片叶子:只依赖 React 与 fetch,谁都能取。
 *
 * @author Frank
 * @time 2026-09-23 01:45:57
 */
export { lazyTitleOf, storedTitleOf, titleSubOf, untranslatedOf } from './functions'
export { useTitleMap, useTitleTrans } from './hooks'
