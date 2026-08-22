/**
 * 新斯科舍省 技术工人通道(Nova Scotia Nominee Program — Skilled Worker stream)
 *
 * 注:NS **不设官方分值表** —— 2025-11-28 起 NSNP 全通道 + AIP 指定改 EOI,选谁由厅里按当期
 * 优先级酌情定(原句见 Decision 的 NO_POINTS_GRID)。所以分值卡里没有 NS 页签,那是
 * 官方的做法,不是本站的窟窿 —— 两句话在用户那儿意思相反,不许混。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const NS_URL = 'https://liveinnovascotia.com/skilled-worker'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const NS_SW: PathwayStrategy = {
  key: 'NS-sw',
  province: 'NS',
  stream: 'Nova Scotia Nominee Program — Skilled Worker stream',
  reqProvince: 'NS',
  reqStream: /nova scotia nominee/i,
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: { need: 'required', url: NS_URL, fetched: D,
      quote: 'To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer', note: null, asks: null },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: NS_URL, fetched: D, note: null },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: NS_URL, fetched: D, note: null },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}
