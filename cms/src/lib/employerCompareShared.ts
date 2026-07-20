// D3 对比:client 可安全引用的常量与类型(服务端聚合在 employerCompare.ts——那边带 payload,client 禁 import)
export const CMP_MAX = 4
export const CMP_KEY = 'cmpEmployers1'   // localStorage 选择篮(名录行/公司弹框共写)

export type CompareRow = {
  name: string
  industry: string; aliasZh: string; aliasKo: string; wiki: string; website: string
  aiBrief: string
  lmiaPositions: number | null; lmiaPositionsSkilled: number | null; lmiaLastQuarter: string
  aip: boolean
  openJobs: number; avgScore: number | null; namedJobs: number; medSalary: number | null
  mainProvince: string; diffTier: string | null
  matchHigh: number | null; matchMid: number | null   // null=未建档/未算
}
