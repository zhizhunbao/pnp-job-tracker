// 移民动态共享常量/类型(E12-06)—— 非 client 模块:服务端页面(generateMetadata/SQL)与客户端视图共用(老坑 6)。
import { PROV_NAME } from '../stats/shared'

export type NewsCard = {
  region: string; title: string; date: string; slug: string
  ogImage: string | null; excerpt: string | null
  importance: number | null; importanceNote: string | null
}
export type NewsHero = NewsCard & { summaryZh: string | null; summaryKo: string | null }
export type NewsRow = NewsCard & {
  url: string; bodyEn: string; bodyZh: string | null; bodyKo: string | null
  summaryZh: string | null; summaryKo: string | null; summaryEn: string | null
  citation: string; fetched: string
}
// F 件(E8-07):id/parentId=楼中楼一层;pinned=置顶楼;official=admin 号发的(SQL join users.role 派生)
export type NewsComment = { id: number; parentId: number | null; pinned: boolean; official: boolean; authorName: string; body: string; date: string }

// chips/分组展示顺序:联邦在前,省按职位板惯例
export const NEWS_REGIONS = ['federal', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS'] as const

// © 出处方(转载姿势四件套之一):联邦=加拿大政府;QC 官方法文名;其余省政府
export const newsPublisher = (region: string): string => {
  if (region === 'federal') return 'Government of Canada'
  if (region === 'QC') return 'Gouvernement du Québec'
  return `Government of ${PROV_NAME[region] || region}`
}
export const newsRegionName = (region: string): string => (region === 'federal' ? '' : PROV_NAME[region] || region)
