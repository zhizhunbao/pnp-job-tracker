'use client'
/**
 * 全站右下角对话挂件的壳(2026-08-04)。参考 Intercom / Crisp / Chatbase / Tidio 的
 * **行为**,不引任何依赖。为什么要它:30 天数据 67.5% 的会话只看一页,入口=出口=
 * 职位详情页 —— 挂件把对话放到流量真正在的地方;2026-08-04 傍晚 Frank 拍板内联框
 * 整节撤掉,**挂件是全站唯一的对话入口**。
 * 五条实现红线(细节见 hooks/functions 各件):① 面板是原生 popover(manual),
 * 但 popover 只是增强不是可见性依据;② 绝不压住吸底动作条(按实时位置躲);
 * ③ 不自动弹开(首访一句静默提示);④ 面板壳首帧常驻 DOM(内容懒加载,最小化
 * 不丢会话;刷新即丢是设计如此 —— 对话不落库);⑤「呼不出来」不可接受(可见性
 * 单一真相 = open;PanelGuard 兜 chunk;两级看门狗)。
 * 面板**首帧就在 DOM 里**(display:none),不再「点了才创建」:ref 从第一次 commit
 * 就存在,showPopover 永远撞不上「元素还没连接」;懒加载内容仍等 mounted。
 * ChatBox 的 key 跟 resetN 走:一变整个重挂 = 会话清空回空态(makeDoReset 的注释)。
 * 与 ChatBox 的边界:壳只传 compact/autoFocus/prefill,**不覆盖它的任何类名**;
 * 壳只管开合与避让,一句文案都不生成。懒加载:挂件挂在全站 layout 上,不该让
 * 每个页面都背对话那份 JS —— 第一次点开才下载(next/dynamic 是框架自带能力)。
 * 2026-08-27 换装批自 ChatLauncher.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { GRIPS, PATH_ROOT, PLAIN_BTN_KIND, POPOVER_MANUAL, ROLE_DIALOG } from './constants'
import { isNarrowOffPath, loadChatBox, reloadPage } from './functions'
import { useChatLauncher } from './hooks'
import { ChatLoading } from './chatloading'
import { ChatDock } from './chatdock'
import { ChatHead } from './chathead'
import { PanelGuard } from './panelguard'
import css from './chat.module.css'

/**
 * 懒加载的对话框(取件函数在 functions,等待帧在 chatloading 件里)。
 */
const LazyChatBox = dynamic(loadChatBox, { ssr: false, loading: ChatLoading })

/**
 * 挂件(启动器 + 面板)。
 *
 * @returns 挂件整块。
 */
export function ChatLauncher() {
  const { p, panelEl, dockEl } = useChatLauncher()
  const rawPath = usePathname()
  let path = PATH_ROOT
  if (rawPath != null && rawPath !== '') {
    path = rawPath
  }
  const grips = []
  if (p.wide && p.max === false) {
    for (const d of GRIPS) {
      grips.push(<div key={d} className={css.clGrip} data-d={d} onPointerDown={p.gripDownOf(d)} />)
    }
  }
  let panelCls = css.clPanel
  if (p.open) {
    panelCls = `${css.clPanel} ${css.clOpen}`
  }
  if (p.max) {
    panelCls = `${panelCls} ${css.clMaxed}`
  }
  return (
    <>
      {p.open === false && <ChatDock p={p} dockEl={dockEl} narrowOff={isNarrowOffPath({ path })} />}
      <div ref={panelEl}
        popover={POPOVER_MANUAL}
        role={ROLE_DIALOG}
        aria-label={p.t('chat.title')}
        // eslint-disable-next-line react/forbid-dom-props -- 运行时几何:避让距离变量 + 看门狗强制显示 + 用户拖出的框,非静态样式
        style={p.panelStyle}
        className={panelCls}>
        {p.mounted && (
          <>
            {grips}
            <ChatHead p={p} />
            <div className={css.clBody}>
              <PanelGuard fallback={
                <div className={css.clFail}>
                  <span>{p.t('chat.err.net')}</span>
                  <Button kind={PLAIN_BTN_KIND} className={cssOf(css.clRetry)} onClick={reloadPage}>
                    {p.t('chat.retry')}
                  </Button>
                </div>
              }>
                <LazyChatBox key={p.resetN} compact autoFocus={p.open} prefill={p.prefill} />
              </PanelGuard>
            </div>
          </>
        )}
      </div>
    </>
  )
}
