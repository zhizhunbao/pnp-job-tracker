// 新斯科舍省 技术工人通道(Nova Scotia Nominee Program — Skilled Worker stream)
//
// 注:NS **不设官方分值表** —— 2025-11-28 起 NSNP 全通道 + AIP 指定改 EOI,选谁由厅里按当期
// 优先级酌情定(原句见 Decision 的 NO_POINTS_GRID)。所以分值卡里没有 NS 页签,那是
// 官方的做法,不是本站的窟窿 —— 两句话在用户那儿意思相反,不许混。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const NS_URL = 'https://liveinnovascotia.com/skilled-worker'

export const NS_SW: PathwayStrategy = {
  key: 'NS-sw',
  province: 'NS',
  stream: 'Nova Scotia Nominee Program — Skilled Worker stream',
  reqProvince: 'NS',
  reqStream: /nova scotia nominee/i,
  countsForeign: true,
  gates: {
    offer: { need: 'required', url: NS_URL, fetched: D,
      quote: 'To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: NS_URL, fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: NS_URL, fetched: D },
  },
}
