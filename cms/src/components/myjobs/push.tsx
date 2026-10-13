'use client'
/**
 * 「新岗推送」卡(2026-10-10 批 2,16b / 16d):一行「把推荐和收藏动态发到邮箱」+ 下拉 不发 / 每天 / 每周(默认不发);
 * 下一行「发到」可改的邮箱框(网页端限宽)+ 「保存」。换成别的邮箱先发确认信,点了才生效;保存后的那一句出在下面
 * (右上角提示 + 铃铛是批 5 的事,到时并过去)。
 * 2026-10-11 批 5 并过去了:已保存 / 确认信已发出 / 确认信没发出 / 没存上 改右上角提示(toast 桶);
 * 下面那一行只剩「邮箱格式不对」(要他改框的错贴在框旁边)。
 * 2026-10-12 Frank「这部分是不是太靠左了。是不是调大一些放中间,参考一下 indeed」:照 Indeed 的邮件订阅块 ——
 * 居中一列、上一行大字说明、下一行频率 / 邮箱 / 主钮「保存」排一排(「发到」两字撤,邮箱框本身说明了),
 * 钮改主钮常规号。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { ANCHOR_PUSH, EMAIL_MAX, PUSH_FREQS, SAVE_KIND, TEXT_NONE } from './constants'
import { makeFreqLabel } from './prefs'
import { usePush } from './hooks'
import { Section } from './section'
import type { PushIn } from './types'
import css from './myjobs.module.css'

/**
 * 新岗推送卡。
 *
 * @param props 取词函数。
 * @returns 白卡(设置还没拉回来不出)。
 */
export function Push({ t }: PushIn) {
  const p = usePush({ t })
  if (p.failed) {
    return (
      <Section title={t('mj.push')} count={null} anchor={ANCHOR_PUSH}>
        <div className={css.note}>{t('mj.fail')}</div>
      </Section>
    )
  }
  if (p.ready === false) {
    return null
  }
  return (
    <Section title={t('mj.push')} count={null} anchor={ANCHOR_PUSH}>
      <div className={css.pushBox}>
        <div className={css.pushLead}>{t('mj.pushRow')}</div>
        <div className={css.pushRow}>
          <Select value={p.freq} onChange={p.setFreq} opts={PUSH_FREQS} all={t('mj.freqOff')}
            labelOf={makeFreqLabel(t)} />
          <Input value={p.email} onChange={p.setEmail} maxLength={EMAIL_MAX} ariaLabel={t('mj.pushTo')}
            className={css.pushEmail} />
          <Button kind={SAVE_KIND} onClick={p.onSave} disabled={p.busy}>{t('mj.pushSave')}</Button>
        </div>
        {p.note !== TEXT_NONE && <div className={css.pushNote}>{p.note}</div>}
      </div>
    </Section>
  )
}
