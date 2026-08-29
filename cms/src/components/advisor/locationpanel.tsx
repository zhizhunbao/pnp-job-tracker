'use client'
/**
 * 地点弹框主体(E8-12)。入口语义 = 内容(Frank「点省看省,点市看市」+「点区看区」):
 * 省格出省卡组、市格出市卡组、区格出区卡组;区列点开但该岗无区值时退回市级,不出空面板。
 * 竖排单列(Frank 2026-07-23「别横着排列,其他的弹框都是竖着排列的」—— 两列版当天推翻,
 * 与全弹框族一致)。
 * AI 解读(Frank 2026-07-23「AI 解读呢?」)与分类弹框的速读同一台机器:点了才生成、流式、
 * 统一额度池;事实块 = 面板同源数字(provRead 按省缓存 / cityRead 按市|区缓存),
 * 模型被禁越出事实(advisor 路由的 GROUNDING_RULES)。
 * ⚠️ 中文对照开关(Frank 走查#2)是「以后加英文」的**前置占位** —— 切换态在、钮在,
 * 但地点内容现已本地化,所以它眼下只换钮上的字,待英文正文接入即生效。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(两级取数与 AI 迁 hooks,三段卡组各成一件)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { useState } from 'react'
import { makeT } from '@/lib/i18n'
import { parseLoc } from '@/lib/location'
import { ADV_IDLE, LEVEL_CITY, LEVEL_DISTRICT, LEVEL_PROVINCE, TRACK_AI_READ } from './constants'
import { AiReadCard } from './aireadcard'
import { CityCards } from './citycards'
import { DistrictCards } from './districtcards'
import { aiFieldOf, aiIdOf, factsReadyOf, levelOf, makeToggle } from './functions'
import { useAiRead, useLocationData } from './hooks'
import { LocationActs } from './locationacts'
import { LocationCard } from './locationcard'
import { ProvinceCards } from './provincecards'
import type { LocationPanelIn } from './types'

/**
 * 渲染地点弹框主体。
 *
 * @param props 这一岗、界面语言、分层态、点进来的那一格与三张表。
 * @returns 钮条 + AI 解读卡 + 地点身份卡 + 该层级的卡组。
 */
export function LocationPanel({ job, lang, plan, srcField, pnpDraws, news, desigEmp }: LocationPanelIn) {
  const t = makeT(lang)
  const loc = parseLoc(job)
  const level = levelOf({ srcField, district: loc.district })
  const data = useLocationData({ job, city: loc.city, district: loc.district, level })
  const ai = useAiRead({
    field: aiFieldOf(level),
    id: aiIdOf({ level, job, city: loc.city, district: loc.district }),
    lang,
    trackName: TRACK_AI_READ,
  })
  const [showZh, setShowZh] = useState(false)
  return (
    <>
      <LocationActs t={t} lang={lang} province={job.province}
        showZh={showZh}
        onToggleZh={makeToggle({ on: showZh, set: setShowZh })}
        ai={ai}
        factsReady={factsReadyOf({ level, prov: data.prov, cityInfo: data.cityInfo })} />
      {ai.on && ai.status !== ADV_IDLE && <AiReadCard t={t} loggedIn={plan.loggedIn} ai={ai} />}
      <LocationCard t={t} job={job} srcField={srcField} />
      {level === LEVEL_PROVINCE && (
        <ProvinceCards t={t} lang={lang} job={job} prov={data.prov} pnpDraws={pnpDraws} news={news} />
      )}
      {level === LEVEL_CITY && (
        <CityCards t={t} job={job} city={loc.city} cityInfo={data.cityInfo} desigEmp={desigEmp} />
      )}
      {level === LEVEL_DISTRICT && <DistrictCards t={t} district={loc.district} cityInfo={data.cityInfo} />}
    </>
  )
}
