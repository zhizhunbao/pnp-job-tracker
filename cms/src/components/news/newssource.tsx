'use client'
/**
 * 域内小件:转载姿势那一行 —— © 出处方 + 非官方声明(一行)+ 原文链 ↗ + 官方发布日期
 * (日期在上方 meta 行),外加 AI 速读钮与对照开关两枚药丸。
 * 底部不再重复原文钮(P1c);底部深链钮已删(Frank 2026-07-18「不需要」),
 * 找岗入口 = 顶栏/省页块。
 * 对照按界面语言(Frank 拍板):中 → 中文 / 韩 → 韩语 / 英 → 无开关(原文即英文)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { LANG_EN, PLAIN_BTN_KIND, SRC_SEP, STATE_BUSY, STATE_ERR, TARGET_BLANK } from './constants'
import { pillClsOf, publisherOf, sumLabelOf, transLabelOf } from './functions'
import type { NewsSourceIn } from './types'
import css from './news.module.css'

/**
 * 渲染转载姿势那一行。
 *
 * @param props 出处、原文地址与两枚开关的状态手柄(逐格注释见 NewsSourceIn)。
 * @returns 出处行。
 */
export function NewsSource({
  t,
  lang,
  region,
  url,
  summary,
  sumState,
  transOn,
  trState,
  onSum,
  onTrans,
}: NewsSourceIn) {
  return (
    <div className={css.detSrc}>
      <span>
        {t('news.copy', { who: publisherOf({ region }) })}
        {SRC_SEP}
        <LinkButton className={cssOf(css.link)} href={url} target={TARGET_BLANK}>{t('news.official')}</LinkButton>
      </span>
      {summary == null && (
        <Button kind={PLAIN_BTN_KIND}
          className={pillClsOf({ on: false })}
          disabled={sumState === STATE_BUSY}
          onClick={onSum}>
          {sumLabelOf({ t, state: sumState })}
        </Button>
      )}
      {sumState === STATE_ERR && <span className={css.err}>{t('news.trErr')}</span>}
      {lang !== LANG_EN && (
        <Button kind={PLAIN_BTN_KIND}
          className={pillClsOf({ on: transOn })}
          disabled={trState === STATE_BUSY}
          onClick={onTrans}>
          {transLabelOf({ t, state: trState, on: transOn })}
        </Button>
      )}
      {trState === STATE_ERR && <span className={css.err}>{t('news.trErr')}</span>}
    </div>
  )
}
