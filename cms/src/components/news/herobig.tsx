'use client'
/**
 * 域内小件:头条大卡本体(整卡一条链接)—— 图区 + 徽标行 + 标题 + 摘要。
 * 头条图**不用抓来的 og 图**(Frank 2026-07-18「很多文字的图片不适合作为 banner」——
 * 政府 og 图多为文字模板图,裁剪救不回);og 图只在详情页/原文里看。
 * #205:徽标那一格原为裸档「重要 5/5」(禁裸 X/5,#132 同规矩)—— 与列表统一走
 * ImpBadge,理由与口径挂 title。
 * 2026-08-27 换装批自 News.tsx 的 FeaturedGrid 拆出成文件;轮播的箭头与圆点同批挪到
 * 卡外(见 herocontrols),原因写在 news.module.css 的 .bigWrap 上。
 * 2026-10-10 同列表卡:电脑端速读全文铺开;手机端摘要不出,英文标题下改出中文标题灰字(韩文界面暂不出)。
 * 2026-09-30 Frank「新开一个选项卡,不要在当前的选项卡」:点开新闻详情一律新选项卡(LinkButton 带 target 自动补 rel)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import { heroAiSummaryOf, heroSummaryOf, newsHrefOf, rowTitleNoteOf } from './functions'
import { HeroImage } from './heroimage'
import { ImpBadge } from './impbadge'
import { RegionTag } from './regiontag'
import type { HeroBigIn } from './types'
import css from './news.module.css'

/**
 * 渲染头条大卡。
 *
 * @param props 取词函数、界面语言与当前这一张头条。
 * @returns 大卡链接。
 */
export function HeroBig({ t, lang, hero }: HeroBigIn) {
  const summary = heroSummaryOf({ lang, hero })
  const ai = heroAiSummaryOf({ lang, hero })
  const note = rowTitleNoteOf({ lang, hero })
  return (
    <LinkButton className={cssOf(css.big)} href={newsHrefOf({ slug: hero.slug })} target={TARGET_BLANK}>
      <div className={css.bigImg}>
        <HeroImage key={hero.slug} region={hero.region} />
      </div>
      <div className={css.bigBody}>
        <div className={css.meta}>
          <ImpBadge t={t} lang={lang} importance={hero.importance} note={hero.importanceNote} />
          <RegionTag t={t} region={hero.region} />
          <span className={css.num}>{hero.date}</span>
        </div>
        <div className={css.bigTitle}>{hero.title}</div>
        {note !== TEXT_NONE && <div className={css.titleNote}>{note}</div>}
        {summary !== TEXT_NONE && (
          <div className={css.bigSum}>
            {ai !== TEXT_NONE && <span className={css.aiTag}>{t('news.aiSum')}</span>}
            {summary}
          </div>
        )}
      </div>
    </LinkButton>
  )
}
