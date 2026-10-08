'use client'
/**
 * 「今日待投」的设置清单(2026-10-08 UX 批,Frank「主要是 ux」:原先要跑三个地方才能开 —— 答四题在 /plan/pr、传简历在「我的简历」、
 * 英文名要先投一次):三行 简历 / 想做的工作 / 英文姓名,齐的打勾,缺的就地补(上传 / 去选 / 填);三样全齐才出一颗「开启智能投递」。
 *
 * @author Frank
 * @time 2026-10-08 20:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { AUTOCOMPLETE_NAME, BTN_PRIMARY, BTN_SECONDARY, NAME_MAX_LEN, URL_QUIZ } from './constants'
import { QueueInput } from './queueinput'
import { QueueStep } from './queuestep'
import type { QueueSetupIn } from './types'
import css from './queue.module.css'

/**
 * 渲染设置清单。
 *
 * @param props 整机面板与取词函数。
 * @returns 三行 + 开启钮。
 */
export function QueueSetup({ p, t }: QueueSetupIn) {
  return (
    <div className={css.setup}>
      <QueueInput onMount={p.onInputMount} onPick={p.onFile} />
      <QueueStep done={p.state.hasResume}
        label={t('qu.stepResume')}
        action={<Button kind={BTN_SECONDARY} sm onClick={p.onAdd} busy={p.uploading}>{t('qu.upload')}</Button>} />
      <QueueStep done={p.state.hasNocs}
        label={t('qu.stepNocs')}
        action={<LinkButton href={URL_QUIZ} className={css.stepLink}>{t('qu.pick')}</LinkButton>} />
      <QueueStep done={p.state.hasName}
        label={t('qu.stepName')}
        action={(
          <span className={css.nameRow}>
            <input className={css.nameInput}
              value={p.name}
              onChange={p.onName}
              maxLength={NAME_MAX_LEN}
              autoComplete={AUTOCOMPLETE_NAME}
              aria-label={t('qu.stepName')} />
            <Button kind={BTN_SECONDARY} sm onClick={p.onNameSave} disabled={p.busy}>{t('qu.save')}</Button>
          </span>
        )} />
      {p.ready && (
        <div className={css.enable}>
          <Button kind={BTN_PRIMARY} onClick={p.onEnable} disabled={p.busy}>{t('qu.enable')}</Button>
        </div>
      )}
    </div>
  )
}
