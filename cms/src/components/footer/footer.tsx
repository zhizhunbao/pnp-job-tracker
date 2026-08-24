'use client'
/**
 * footer 域的结构:免责短句 + 法务四链 + 版权,窄屏自动换行;与 Header 配对使用。
 * 样式在 Footer.module.css,链表在 constants —— tsx 只剩结构。
 * maxWidth prop 2026-08-24 连根拔:19 处调用无一传非默认值(3 处显式 1320=默认),
 * 未被用过的自由度不保留,轨宽定死在 css(07-30 拍板值与头轨同宽)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import { COPYRIGHT, LEGAL_LINKS } from './constants'
import { LinkButton } from '@/components/button'
import type { FooterIn } from './types'
import css from './footer.module.css'

/**
 * 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个 header 和 footer」)。
 *
 * @param props 界面语翻译函数(签名里的 { t } 是解构:props.t 拆进局部名)。
 * @returns 页脚。
 */
export function Footer({ t }: FooterIn) {
  const links = []
  for (const l of LEGAL_LINKS) {
    links.push(<LinkButton key={l.href} href={l.href} className="tapPad">{t(l.key)}</LinkButton>)
  }
  return (
    <footer className={css.foot}>
      <div className={css.inner}>
        <span>{t('foot.disclaimer')}</span>
        <span className={`sfLinks ${css.links}`}>
          {links}
          <span className={css.copy}>{COPYRIGHT}</span>
        </span>
      </div>
    </footer>
  )
}
