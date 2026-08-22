/**
 * 新不伦瑞克省 技术工人通道(NB Experience pathway)
 *
 * 原先三类闸全 unknown —— crawl 的 nb-imm 只有 1 页门户。**根因是官网换版**:老地址
 * www2.gnb.ca/.../nb-skilled-worker-stream.html 现在 302 到 www.gnb.ca 新站,资格条文搬到了新页
 * (链接从重定向后的 PNP 总览页上现取,不是猜的)。
 * 🔴 同一处换版还坐实了另一件事:etl/pnp/build_nb_req.py 的 guide_urls() 现在返回空 —— 它照老地址
 * 去找三份指南 PDF,而重定向落在总览页上、那页没有指南链接 → **NB 的门槛行已经在冻结状态**(另账)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D, NB_SW_URL } from './constants'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const NB_SW: PathwayStrategy = {
  key: 'NB-sw',
  province: 'NB',
  stream: 'New Brunswick Skilled Worker stream(NB Experience pathway)',
  reqProvince: 'NB',
  reqStream: /new brunswick skilled worker/i,
  drawStream: 'Skilled Worker (NB Experience)',
  countsForeign: false,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: { need: 'required', url: NB_SW_URL, fetched: D,
      quote: 'have the support of an eligible employer who has been actively operating in New Brunswick for the past 24 months, providing goods or services',
      note: 'Experience pathway 另写「be working full time in a non-seasonal position for the employer who is supporting your application」—— 雇主支持是硬闸', asks: null },
    // 问的是「住在新省满 6 个月」,不是「人在加拿大」(2026-08-15 拆闸:asks=provResidence)
    statusInCanada: { need: 'required', asks: 'provResidence', url: NB_SW_URL, fetched: D,
      quote: 'have lived in New Brunswick for the past six months',
      note: 'Experience pathway 专条;另两条 pathway(Graduates / Priority Occupations)不是本站 NB-sw 判的那条' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: NB_SW_URL, fetched: D,
      note: '资格清单只写「have at least a high school diploma」,**没写必须是加拿大学历**;要加拿大学历的是 Graduates 那条 pathway' },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}
