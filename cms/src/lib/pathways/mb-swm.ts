// 曼尼托巴省 技术工人通道(MPNP Skilled Worker Stream — Skilled Worker in Manitoba, SWM)
// 「在曼省持续在职」就是它的定义性条件 —— 在省在职 + 雇主长期全职岗两个闸都在。
// drawFallbackProvinceWide 只对 MB 开:MPNP 是**单池单分制**(所有 selection 抽同一个 EOI 池、
// 同一把尺子);BC 是逐通道设线,对 BC 退回全省线就是拿医疗线量木匠(pnpSelfScore 里为此立过红线)。
import type { PathwayStrategy } from './types'

const MB_URL = 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility'
const MB_FETCHED = '2026-08-03'   // mb-mpnp 那轮 crawl 的抓取日,与其余省不同批

export const MB_SWM: PathwayStrategy = {
  key: 'MB-swm',
  province: 'MB',
  stream: 'MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM)',
  reqProvince: 'MB',
  reqStream: /skilled worker in manitoba/i,
  drawStream: 'MPNP Skilled Worker Stream',
  drawFallbackProvinceWide: true,
  scorer: 'MB',
  countsForeign: false,
  gates: {
    offer: { need: 'required', url: MB_URL, fetched: MB_FETCHED,
      quote: 'Your employer must demonstrate to the satisfaction of the MPNP that they are an established business with an ability to offer you full-time and long-term employment in Manitoba.' },
    // 问的是「在曼省在职」,不是「人在加拿大」(2026-08-15 拆闸:asks=provEmployment ——
    // 先前拿 inCanada 过闸,一个在安省上班的人照样被放行)
    statusInCanada: { need: 'required', asks: 'provEmployment', url: MB_URL, fetched: MB_FETCHED,
      quote: 'To apply to the Skilled Worker in Manitoba (SWM) Pathway, you must demonstrate ongoing Manitoba employment as your established connection to Manitoba.' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: MB_URL, fetched: MB_FETCHED },
  },
}
