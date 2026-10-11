/**
 * name 组件桶 —— 名字两行(2026-10-09 N 批):英文在上、界面语译名灰字在下;职位 / 公司点了开弹框,城市 / 省份去 Google 地图。
 * 四种名字各一个现成件(JobName / CompanyName / CityName / ProvName),各处一行换上;形不合的(把脉页不弹框)直接用 Name + subOf。
 * 2026-10-11 批 4:加地点一行 PlaceName(照 Indeed,表格外的职位地点唯一出口)与工时 / 雇佣期两件 HoursName / TermName
 * (自 myjobs 桶收过来,职位板 + 我的求职共用)。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */

export {
  cityMapOf, hoursNameOf, placeHrefOf, placeSubOf, provMapOf, provNameOf, subOf, termNameOf,
} from './functions'
export { CityName } from './cityname'
export { CompanyName } from './companyname'
export { HoursName } from './hoursname'
export { JobName } from './jobname'
export { Name } from './name'
export { PlaceName } from './placename'
export { ProvName } from './provname'
export { TermName } from './termname'
