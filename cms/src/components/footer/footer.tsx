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
import { useLang } from '@/components/i18n'
import { COPYRIGHT, LEGAL_LINKS, SF_LINKS_CLS, TAP_PAD_CLS } from './constants'
import { LinkButton } from '@/components/button'
import css from './footer.module.css'

/**
 * 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个 header 和 footer」)。
 * 取词函数 2026-08-27 起自己在体内接 LangProvider(与 Header 同批吸收):
 * 服务端页面门造不出 t,吸收后两种门都是 `<Footer />` 一行。
 *
 * @returns 页脚。
 */
export function Footer(x: {
  /**
   * 过渡格(2026-08-29):旧调用点(cases/ruling 批未落)还在传 t,体内不读;
   * 那批收口后同批删除本参。
   */
  t?: (k: string) => string
}) {
  void x

  const [, , t] = useLang()
  const links = []
  for (const l of LEGAL_LINKS) {
    links.push(<LinkButton key={l.href} href={l.href} className={TAP_PAD_CLS}>{t(l.key)}</LinkButton>)
  }
  return (
    <footer className={css.foot}>
      <div className={css.inner}>
        <span>{t('foot.disclaimer')}</span>
        <span className={`${SF_LINKS_CLS} ${css.links}`}>
          {links}
          <span className={css.copy}>{COPYRIGHT}</span>
        </span>
      </div>
    </footer>
  )
}
