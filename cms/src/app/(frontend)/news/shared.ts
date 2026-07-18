// 移民动态共享常量/类型(E12-06)—— 非 client 模块:服务端页面(generateMetadata/SQL)与客户端视图共用(老坑 6)。
import { PROV_NAME } from '../stats/shared'

export type NewsCard = {
  region: string; title: string; date: string; slug: string
  ogImage: string | null; excerpt: string
}
export type NewsRow = NewsCard & { url: string; bodyEn: string; citation: string; fetched: string }

// chips/分组展示顺序:联邦在前,省按职位板惯例
export const NEWS_REGIONS = ['federal', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS'] as const

// © 出处方(转载姿势四件套之一):联邦=加拿大政府;QC 官方法文名;其余省政府
export const newsPublisher = (region: string): string => {
  if (region === 'federal') return 'Government of Canada'
  if (region === 'QC') return 'Gouvernement du Québec'
  return `Government of ${PROV_NAME[region] || region}`
}
export const newsRegionName = (region: string): string => (region === 'federal' ? '' : PROV_NAME[region] || region)
