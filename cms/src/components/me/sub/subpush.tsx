'use client'
/**
 * me 桶子桶 sub 的结构:「新岗推送」一段(2026-10-10 批 2 立在「我的求职」,16b / 16d;2026-11-07 照 Fluent 效果图挪到「我的订阅」)。
 * 上一行「把推荐和收藏动态发到邮箱」,下一行 频率下拉(不发 / 每天 / 每周,默认不发)+ 邮箱框 + 主钮「保存」;
 * 换成别的邮箱先发确认信,点了才生效。
 * 2026-10-11 批 5:已保存 / 确认信已发出 / 确认信没发出 / 没存上 改右上角提示(toast 桶);框下面只剩「邮箱格式不对」。
 * 2026-10-12 Frank「这部分是不是太靠左了。是不是调大一些放中间,参考一下 indeed」:那时居中一列、大字说明;
 * 2026-11-07 效果图里各段一律靠左、正文字号,居中撤(排一排与主钮「保存」照旧)。效果图画的是一颗开关,
 * 开关只有开 / 关,装不下每天 / 每周两档,下拉留着。
 * 设置没拉回来时卡里先空着(卡头占位),拉失败出一句。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { EMAIL_MAX, PUSH_FREQS, SAVE_KIND, TEXT_NONE } from './constants'
import { makeFreqLabel } from './functions'
import { SubSec } from './subsec'
import type { SubPartIn } from './types'
import css from './sub.module.css'

/**
 * 「新岗推送」。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 一张分区卡。
 */
export function SubPush({ s, t }: SubPartIn) {
  const p = s.push
  return (
    <SubSec title={t('mj.push')}>
      {p.failed && <div className={cssOf(css.note)}>{t('mj.fail')}</div>}
      {p.failed === false && p.ready && (
        <div className={cssOf(css.push)}>
          <div>{t('mj.pushRow')}</div>
          <div className={cssOf(css.pushRow)}>
            <Select value={p.freq} onChange={p.setFreq} opts={PUSH_FREQS} all={t('mj.freqOff')}
              labelOf={makeFreqLabel(t)} />
            <Input value={p.email} onChange={p.setEmail} maxLength={EMAIL_MAX} ariaLabel={t('mj.pushTo')}
              className={cssOf(css.pushEmail)} />
            <Button kind={SAVE_KIND} onClick={p.onSave} disabled={p.busy}>{t('mj.pushSave')}</Button>
          </div>
          {p.note !== TEXT_NONE && <div className={cssOf(css.pushNote)}>{p.note}</div>}
        </div>
      )}
    </SubSec>
  )
}
