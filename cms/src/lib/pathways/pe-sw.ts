/**
 * 爱德华王子岛省 技术工人 / 紧缺职业(PEI PNP Workforce)
 *
 * 三类闸原先全标 unknown —— **不是官方没写,是我们没扫到**:crawl 的 pe-imm 只有 7 页
 * (门户 + 4 条新闻 + 1 个 stream 页,HTML 页挡在 Radware 后面),而资格条文一直在这份指南 PDF 里,
 * 我们自己的 build_pe_req.py 早就在读它。2026-08-12 取证器加了 PDF 源后逐条读出来。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D, PE_GUIDE } from './constants'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const PE_SW: PathwayStrategy = {
  key: 'PE-sw',
  province: 'PE',
  stream: 'PEI PNP Workforce — Skilled Worker / Occupations in Demand',
  reqProvince: 'PE',
  reqStream: /pei pnp workforce/i,
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  drawFallbackProvinceWide: false,
  listRequired: { province: 'PE', streamRe: /occupations in demand/i },
  gates: {
    offer: { need: 'required', url: PE_GUIDE, fetched: D,
      quote: 'have a full-time, non-seasonal (permanent or minimum of two years) job offer from a PEI employer in a high skilled occupation defined by the Training, Education, Experience, and Responsibility classification system as TEER category 0, 1, 2, or 3', note: null, asks: null },
    // 问的是「有没有有效工签」(2026-08-15 拆闸:asks=workPermit,同 AB)
    statusInCanada: { need: 'required', asks: 'workPermit', url: PE_GUIDE, fetched: D,
      quote: 'have a valid work permit to be working in Canada',
      note: '同页 Note 留了境外招募的口子:「The Skilled Worker Stream may be utilized for talent recruitment outside of Canada, if the Prince Edward Island Employer has received authorization from the Office of Immigration prior to issuing a job offer.」—— 但那道口子要**雇主事先获授权**,不是申请人自己能满足的条件,故资格闸按 bullet 记' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: PE_GUIDE, fetched: D,
      note: '资格清单里确有学历要求(「have successfully completed a post-secondary degree or diploma (minimum two-year program)」),但**没写必须是加拿大学历** —— 学历闸有、加拿大学历闸无' },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}
