'use client'
/**
 * pnp 域的状态机器:省清单块、EE 类别块、联邦轮次卡与匹配明细卡各一台。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的派生与工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配(形制同 news 的 useCarousel 与 account 的 useAccountPage)。
 * 折叠状态一律用键的集合而不是 `Record<string, boolean>`:开合只是一把键在不在,
 * 集合天然不用对象展开(宪法禁 `...`),也不会留下一堆 false 的死键。
 * 2026-08-28 换装批自 Pnp.tsx 的四个组件体收进来。
 * 2026-09-23 EE 判定卡、最近抽选卡、联邦抽选近况卡撤(Frank「这三个卡片都删掉」),联邦轮次卡那一台随之删,
 * EE 类别块只剩命中类别的清单折叠。
 * 2026-09-28 省提名弹框自立(Frank「pnp 弹框自己管自己」):多两台 —— 整表懒取(usePnpData,自 advisor 迁入)与弹框整机(usePnpModal)。
 * 2026-09-30 资讯页「通道与门槛」:多一台 —— 一省的门槛卡(usePnpProvStreams,整表懒取同弹框)。
 * 2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」:多一台 —— AIP 指定雇主清单卡(useAipEmpCard)。
 * 同日 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框」:多一台 —— AIP 弹框的通道卡与抽选卡(useAipSection)。
 * 同日 Frank「这个是不是改成两个子卡片。能走哪个高亮哪个。」「你都改完」:多一台 —— 通道卡「你有 PGWP 吗」(useChannelPick)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { storedTitleOf, useTitleTrans } from '@/components/jobtitle'
import { usePagedFold } from '@/components/pager'
import { makeT } from '@/lib/i18n'
import { track } from '@/lib/track'
import {
  LANG_EN, PICK_NONE, TEXT_NONE, PROV_QC, TITLE_TRANS_GEN, TRACK_MODAL_PNP, TRACK_P_FIELD,
} from './constants'
import {
  channelListOf, drawOpenInitOf, eeGroupOf, eeHitOf, makeToggleOf, pnpBlockCardOf,
  matchResultOf, nocRowsOf, pnpMatchOf, scrollIntoHit,
  makeLoadPnpData, makeLoadQcChannels, pnpDataOf, pnpDefaultProvsOf, provGateCardsOf, qcChannelsOf,
  aipEmpDataOf, aipEmpSpecsOf, aipEmpUrlOf, aipSectionOf, channelSplitOf,
  makeLoadAipEmp, makePickOf, normName,
} from './functions'
import type {
  EeHookIn, EePanel, MmHookIn, MmPanel, PnpListHookIn, PnpListPanel, DeadFlag, PnpData, PnpDataHookIn, PnpDataPanel,
  PnpModalHookIn, PnpModalPanel, PnpProvStreamsHookIn, PnpProvStreamsPanel, QcChannel, QcChannelsHookIn,
  QcChannelsPanel, AipEmpCardHookIn, AipEmpCardPanel, AipEmpData, AipEmpRowJson, AipSectionHookIn, AipSectionPanel,
  ChannelPickHookIn,
  ChannelPickPanel,
} from './types'
import { CACHE } from './variables'

/**
 * 省提名清单块整机:取词、职业名字典、命中计算、命中行滚进视野与每张清单的折叠。
 * 高亮行随命中结论变化就近滚一次(尽量不动整个弹框)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」:多交两样 —— 本岗能走的通道(弹框顶上那张卡)与本岗那一组灰字统计的窗口起点
 * (弹框打开那一刻取一次此刻,往前 90 天;重渲不变)。
 * 同日晚 Frank「默认也别合并啊」:抽选卡的开合初值带上 DRAWS_ALL_KEY —— 其余组一打开就展开,末尾「收起」照旧可收。
 * 2026-09-28 Frank「如果是不符合清单的。本省抽选默认折叠」:初值改由 drawOpenInitOf 按本岗给 —— 可提名照旧全展开,不可提名默认折叠。
 * 2026-10-01 Frank「本省抽选默认不要折叠」:drawOpenInitOf 不再看本岗,一律展开。
 * 同晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:本岗那一组改成组头行、灰字统计撤,统计窗口起点(此刻 − 90 天)随之不再交。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:多交门槛卡的开合(默认全收,值一行就是摘要,点开看原句)。
 * 2026-09-27 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」「如果需要提那是之后的时候,在单独用卡片分开」:门槛卡不再点开,开合随之不交。
 * 2026-10-01 三弹框统一(效果图「可以,做吧」):通道职业清单挪到配额 / 抽选之前,改默认收起(只露本岗那一行),折叠态改记展开的(opened)。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:清单开合改由每张清单卡自己的 useFold(pager 桶)管,这里的 opened / toggleOf 撤。
 *
 * @param x 本岗、界面语言、扁平清单、职业名字典、译名开关与通道对照表。
 * @returns 取词函数、ref 盒、字典、命中结论、折叠状态与通道条目。
 */
export function usePnpList(x: PnpListHookIn): PnpListPanel {
  const t = makeT(x.lang)
  const tEn = makeT(LANG_EN)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const [drawOpen, setDrawOpen] = useState<Set<string>>(drawOpenInitOf())

  const nocRows = useMemo(function dictOf() {
    return nocRowsOf(x.nocDesc)
  }, [x.nocDesc])

  const match = useMemo(function matchOf() {
    return pnpMatchOf({ job: x.job, occ: x.occ })
  }, [x.job, x.occ])

  const defaults = useMemo(function defaultsOf() {
    return pnpDefaultProvsOf(x.pathways)
  }, [x.pathways])

  useEffect(function scrollToHit() {
    scrollIntoHit({ ref: matchRef })
  }, [match.streams])

  return {
    t,
    matchRef,
    nocRows,
    match,
    drawOpen,
    drawToggleOf: makeToggleOf({ setKeys: setDrawOpen }),
    channels: channelListOf({
      t, tEn, lang: x.lang, showZh: x.showZh, job: x.job, defaults, pathways: x.pathways, occ: x.occ,
    }),
    block: pnpBlockCardOf({ job: x.job, t }),
  }
}

/**
 * 联邦 EE 类别块整机:分组、历史轮次、命中与全景取舍,外加三处折叠
 * (类别历史单开一个、职业清单一律默认展开、全类别全景默认收起)。
 * 2026-09-23 判定卡与最近抽选卡撤:历史轮次、全景开关、类别历史折叠随之撤,展示的就是命中类别。
 * 2026-10-01 三弹框统一:职业清单改默认收起(只露本岗那一行,「展开其他 N 个」才全量),折叠态改记展开的(opened)。
 * 2026-10-02 Frank「EE 这部分默认都展开」:类别清单改回默认展开,折叠态改记收起的(closed)。
 *
 * @param x 本岗、界面语言、扁平类别与职业名字典。
 * @returns 取词函数、ref 盒、字典、命中类别与职业清单的折叠状态。
 */
export function useEeCategory(x: EeHookIn): EePanel {
  const t = makeT(x.lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [cmpOpen, setCmpOpen] = useState<Set<string>>(new Set())

  const nocRows = useMemo(function dictOf() {
    return nocRowsOf(x.nocDesc)
  }, [x.nocDesc])

  const grouped = useMemo(function groupsOf() {
    return eeGroupOf({ cats: x.cats })
  }, [x.cats])

  useEffect(function scrollToHit() {
    scrollIntoHit({ ref: matchRef })
  }, [grouped])

  const hit = eeHitOf({ grouped, eeCategory: x.job.eeCategory })
  return {
    t,
    matchRef,
    nocRows,
    grouped,
    hit,
    shown: hit,
    closed,
    listToggleOf: makeToggleOf({ setKeys: setClosed }),
    cmpOpen,
    cmpToggleOf: makeToggleOf({ setKeys: setCmpOpen }),
  }
}

/**
 * 匹配明细卡整机:取词 + 用同一 match() 在弹框端重算依据链(与服务端列一致)。
 *
 * @param x 本岗、界面语言、身份与档案、两张维度清单。
 * @returns 取词函数与匹配结论。
 */
export function useMeansForMe(x: MmHookIn): MmPanel {
  const t = makeT(x.lang)

  const result = useMemo(function resultOf() {
    return matchResultOf({ job: x.job, plan: x.plan, pnpOcc: x.pnpOcc, eeOcc: x.eeOcc })
  }, [x.job, x.plan, x.pnpOcc, x.eeOcc])

  return { t, result }
}

/**
 * 省提名几张整表的取数机器(2026-09-26 /fe 首页 Frank:首页不再内联清单与抽选,弹框打开才懒取):
 * 要取才取;取到一次记进 CACHE,再开弹框当场就有、不再出加载行;取挂了落 failed,不再重取(下次开框重来)。
 * 2026-09-28 自 advisor 迁入(Frank「pnp 弹框自己管自己」):「哪几组要取」原是 advisor 的分组表,现在由调用方给 enabled。
 *
 * @param x 要不要取。
 * @returns 能不能渲、失败没与整表。
 */
export function usePnpData(x: PnpDataHookIn): PnpDataPanel {
  const [data, setData] = useState<PnpData | null>(CACHE.pnpData)
  const [failed, setFailed] = useState(false)
  const needs = x.enabled
  const waiting = needs && data == null && failed === false

  useEffect(function loadPnpData() {
    const flag: DeadFlag = { dead: false }
    if (waiting) {
      makeLoadPnpData({ setData, setFailed })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [waiting])

  const got = pnpDataOf(data)
  return {
    ready: needs === false || data != null,
    failed: needs && failed,
    occ: got.occ,
    draws: got.draws,
    ops: got.ops,
    reqs: got.reqs,
    pathways: got.pathways,
  }
}

/**
 * 魁省一个职业的通道取数机器(2026-09-30 魁省门槛弹框;照 usePnpData 的形):要取才取(魁省岗),取到落格;
 * 取挂了落 failed,不重取(下次开框重来)。一个职业一小段,不进 CACHE。
 *
 * @param x 职业码与要不要取。
 * @returns 能不能渲、失败没与通道列。
 */
export function useQcChannels(x: QcChannelsHookIn): QcChannelsPanel {
  const [channels, setChannels] = useState<QcChannel[] | null>(null)
  const [failed, setFailed] = useState(false)
  const needs = x.enabled
  const waiting = needs && channels == null && failed === false
  const noc = x.noc

  useEffect(function loadQcChannels() {
    const flag: DeadFlag = { dead: false }
    if (waiting) {
      makeLoadQcChannels({ noc, setChannels, setFailed })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [waiting, noc])

  return { ready: needs === false || channels != null, failed: needs && failed, channels: qcChannelsOf(channels) }
}

/**
 * 省提名弹框整机(2026-09-28 自立,Frank「pnp 弹框自己管自己」):取词、整表懒取、岗名下那行灰字(标题译名,与职位描述弹框
 * 同一台 useTitleTrans)与打开埋点(沿用字段弹框那一条 modal-pnp,漏斗不断档)。
 *
 * @param x 这一岗、界面语言与从哪一格点进来的。
 * @returns 取词函数、整表、魁省通道(2026-09-30;魁省岗才取)与灰字。
 */
export function usePnpModal(x: PnpModalHookIn): PnpModalPanel {
  const t = makeT(x.lang)
  const data = usePnpData({ enabled: true })
  const qc = useQcChannels({ noc: x.job.noc, enabled: x.job.province === PROV_QC })
  const sub = useTitleTrans({
    title: x.job.title,
    id: x.job.id,
    lang: x.lang,
    cached: storedTitleOf({ row: x.job, lang: x.lang }),
    gen: TITLE_TRANS_GEN,
  })
  const field = x.field

  useEffect(function trackOpen() {
    track(TRACK_MODAL_PNP, { [TRACK_P_FIELD]: field })
  }, [field])

  return { t, data, qc, sub }
}

/**
 * 资讯页「通道与门槛」整机(2026-09-30 通道与门槛批 2):整表懒取同省提名弹框(usePnpData;取到一次进 CACHE,两处谁先开谁取,
 * 另一处当场就有),一省的门槛卡随省与界面语言现算(一省十张以内,不记忆)。
 *
 * @param x 界面语言与省码。
 * @returns 取词函数、能不能渲、失败没与卡片。
 */
export function usePnpProvStreams(x: PnpProvStreamsHookIn): PnpProvStreamsPanel {
  const t = makeT(x.lang)
  const data = usePnpData({ enabled: true })
  return {
    t,
    ready: data.ready,
    failed: data.failed,
    cards: provGateCardsOf({ t, lang: x.lang, province: x.province, pathways: data.pathways, reqs: data.reqs }),
  }
}

/**
 * AIP 指定雇主清单卡整机(2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」):高亮行就近滚进视野(形照省提名清单块 usePnpList)。
 * 2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」):不再拿四省整表在浏览器里逐家对名字 —— 弹框打开才按省 +
 * 本岗公司归一名(normName,与数据层 AIP 打标同一把尺子)
 * 取本岗雇主那一行与同招牌的几家(makeLoadAipEmp);本岗没有公司名就不取、卡只留链接。取挂了落 failed,不重取(下次开框重来)。
 *
 * 2026-10-02 Frank「这个怎么改成跳转了啊」「之前设计的 表格呢?」「不是展开收起吗?」「展开如果太多就一次展开 20 个」:卡底跳雇主板的链接撤,改原地「展开其他 N 家」—— 一次取 20
 * 家往后接、可收起(收起后再展开不重取)。
 * 同日 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:按页取 + 展开收起那套并进 pager 桶 usePagedFold(相似雇主卡同一台)。
 * 2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」):首屏服务端给满 20 家(本岗、同招牌在前),续取的跳过家数从整表数起。
 *
 * @param x 取词函数与本岗。
 * @returns ref 盒、能不能渲、失败没、展示行、同招牌家数、本省总家数与卡底两只钮。
 */
export function useAipEmpCard(x: AipEmpCardHookIn): AipEmpCardPanel {
  const matchRef = useRef<HTMLDivElement | null>(null)
  const [data, setData] = useState<AipEmpData | null>(null)
  const [failed, setFailed] = useState(false)
  const province = x.job.province
  const key = normName(x.job.company)
  const waiting = key !== TEXT_NONE && data == null && failed === false

  useEffect(function loadAipEmp() {
    const flag: DeadFlag = { dead: false }
    if (waiting) {
      makeLoadAipEmp({ province, key, setData, setFailed })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [waiting, province, key])

  useEffect(function scrollToHit() {
    scrollIntoHit({ ref: matchRef })
  }, [data])

  const got = aipEmpDataOf(data)
  const paged = usePagedFold<AipEmpRowJson>({
    top: got.rows, total: got.total, url: aipEmpUrlOf({ province, key }), skip: got.rows.length,
  })
  return {
    matchRef,
    ready: data != null || key === TEXT_NONE,
    failed,
    rows: aipEmpSpecsOf(paged.rows),
    brandN: got.brandN,
    total: got.total,
    hidden: paged.hidden,
    extra: paged.extra,
    busy: paged.busy,
    onMore: paged.onMore,
    onFold: paged.onFold,
  }
}

/**
 * AIP 弹框里通道卡与抽选卡的整机(2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框」「都做吧」):整表懒取同省提名弹框
 * (usePnpData;取到一次进 CACHE,两边谁先开谁取),抽选卡开合初值同省提名弹框(drawOpenInitOf)。
 *
 * @param x 本岗与界面语言。
 * @returns 取词函数、能不能渲、失败没、AIP 那条通道与抽选卡、抽选卡的开合。
 */
export function useAipSection(x: AipSectionHookIn): AipSectionPanel {
  const t = makeT(x.lang)
  const tEn = makeT(LANG_EN)
  const data = usePnpData({ enabled: true })
  const [drawOpen, setDrawOpen] = useState<Set<string>>(drawOpenInitOf())
  return {
    t,
    ready: data.ready,
    failed: data.failed,
    section: aipSectionOf({
      t,
      tEn,
      lang: x.lang,
      showZh: x.lang !== LANG_EN,
      job: x.job,
      occ: data.occ,
      draws: data.draws,
      ops: data.ops,
      reqs: data.reqs,
      pathways: data.pathways,
    }),
    drawOpen,
    drawToggleOf: makeToggleOf({ setKeys: setDrawOpen }),
  }
}

/**
 * 通道卡「你有 PGWP 吗」整机(2026-10-01 Frank「这个是不是改成两个子卡片。能走哪个高亮哪个。」「你都改完」):卡里同时有 PGWP 互补的
 * 两条才出;选项只活在这次打开的弹框里(不记、不读档案 —— 多数访客没登录)。
 *
 * @param x 卡里的通道条目。
 * @returns 出不出、当前选项与点击手柄工厂。
 */
export function useChannelPick(x: ChannelPickHookIn): ChannelPickPanel {
  const [pick, setPick] = useState<string>(PICK_NONE)
  return { show: channelSplitOf(x.channels), pick, pickOf: makePickOf({ setPick }) }
}
