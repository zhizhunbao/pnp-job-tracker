/**
 * name 组件桶 —— 名字两行(2026-10-09 N 批):英文在上、界面语译名灰字在下;职位 / 公司点了开弹框,城市 / 省份去 Google 地图。
 * 四种名字各一个现成件(JobName / CompanyName / CityName / ProvName),各处一行换上;形不合的(把脉页不弹框)直接用 Name + subOf。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */

export { cityMapOf, provMapOf, provNameOf, subOf } from './functions'
export { CityName } from './cityname'
export { CompanyName } from './companyname'
export { JobName } from './jobname'
export { Name } from './name'
export { ProvName } from './provname'
