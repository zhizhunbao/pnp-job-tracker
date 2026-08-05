'use client'
// 全站右下角对话挂件的壳(2026-08-04)。参考 Intercom / Crisp / Chatbase / Tidio 的**行为**,不引任何依赖。
//
// 为什么要它(不是锦上添花):30 天数据 67.5% 的会话只看一页,入口=出口=职位详情页
// (最大流量来自 Google 招聘富结果直落 /jobs/<id>)。/start 那个内联 ChatBox 服务的是
// **绝大多数用户根本不会经过的地方** —— 挂件把对话放到流量真正在的地方。
// 2026-08-04 傍晚 Frank 拍板再进一步:内联框整节撤掉,**挂件是全站唯一的对话入口**(含 /start)。
// 于是可发现性从「锦上添花」变成主路径要求 —— 见 HINT_MAX(提示出到用户真的点开为止)。
//
// 四条实现红线:
//   ① 平台特性优先(Ponytail 第 3 格):面板是原生 `popover`,顶层渲染,不受任何父级
//      stacking context / overflow 影响,也不用手搓一套浮层与焦点管理。用 `manual` 而非 `auto`:
//      auto 的 light-dismiss 会让「点一下页面就收起」,与 Intercom/Crisp 的手感不符;
//      Esc 关闭由下面 4 行自己挂(manual 不带 Esc)。
//   ② **绝不压住吸底动作条** —— 详情页 ApplyBar 是全站主转化。生产实测(offer2pr.com/jobs/17728077):
//      ApplyBar `position:sticky;bottom:0;z-index:5`,高 60px(1280)/ 73px(375),右缘距视口
//      227px(1280)/ 39.5px(375)—— 375 上横向压根没地方躲,窄桌面(~900)同样躲不开。
//      **固定上抬量不够**:sticky 条会在「粘住 / 停在正文末尾」之间摆动(滚到页脚它就不粘了),
//      实测 375 上滚到 scrollY=818 时,上抬 96px 的气泡照样盖住申请钮 ——
//      elementFromPoint 在申请钮中心返回的是挂件本身。所以按**它的实时位置**躲(见 useEffect 测量段)。
//      /plan/* 四张评估页的 .quizBar 手机上是 fixed 78px、z-index 30,同一套测量自动覆盖。
//      挂件自身 z-index 40:压得住 ApplyBar(5)、quizBar(30),但**在弹框 SCRIM(50)与 AuthModal(70)之下**。
//   ③ **不自动弹开** —— SaaS 挂件最招人烦的一条。首访只给一句静默提示,9 秒后自己消失,一辈子只出一次。
//   ④ 面板打开过一次就**常驻 DOM**(popover 只切显示)→ 最小化后本页会话还在;
//      刷新即丢是设计如此(对话不落库、不做长记忆)。
//
// 与 ChatBox 的边界:壳只传 compact / autoFocus 两个 prop,**不覆盖它的任何类名**
// (2026-08-04 傍晚拆掉了原来那套 .cbCard/.cbThread 父级覆盖 —— 它的类名一改就静默退化成卡中卡)。
// 「用户正在看哪个岗」的上下文透传要动 chatOrchestrate,本轮不做,Frank 单独排。
//
// 壳只管开合与避让,一句文案都不生成:正文、结论、出处全在 ChatBox / 服务端工具层。
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { IconChat, IconChevronDown } from '../Icons'
import { useLang } from '../LangProvider'
import { UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 懒加载:挂件挂在全站 layout 上,不该让每个页面都背对话那份 JS —— 第一次点开才下载。
// next/dynamic 是框架自带能力,不是新依赖。
const ChatBox = dynamic(() => import('./ChatBox').then((m) => m.ChatBox), { ssr: false })

const HINT_KEY = 'jt.chat.hint.v1'
// 挂件是全站**唯一**的对话入口(2026-08-04 傍晚 /start 内联框已撤)→ 轻提示出到用户真的点开为止,
// 但最多 3 次:再多就是牛皮癣。点开过一次就永久不再出。
const HINT_MAX = 3
const BASE = 16                 // 常规离底距离(px)
/**
 * 有吸底动作条的路由(见头注释②)→ 才开测量。为什么要这道闸而不是全站都测:
 * 职位板列表页 DOM 上千个 div,扫不到条子就每帧白扫一遍;详情页只有 39 个,可以忽略。
 * 两条:职位详情页(ApplyBar)、/plan/* 四张评估页(QuizUI 的 .quizBar,手机上 fixed)。
 */
const hasBottomBar = (p: string) => /^\/jobs\/[^/]+$/.test(p) || p.startsWith('/plan')
/**
 * 找页面的吸底动作条。按**特征**找不按 class 找:ApplyBar / quizBar 都是别的组件的内联样式,
 * 写死选择器等着被改坏;特征(bottom:0 的 sticky|fixed 块)稳定得多,以后新加的底栏自动被躲开。
 * 只扫 <main> 内 —— 挂件自己挂在 <main> 外(layout),天然不会把自己认成底栏。
 * 生产实测:详情页 39 个 div,全扫 0.3ms;找到后缓存,滚动时只剩一次 getBoundingClientRect。
 */
const findBar = (cached: HTMLElement | null): HTMLElement | null => {
  if (cached?.isConnected) return cached
  for (const el of document.querySelectorAll<HTMLElement>('main div')) {
    const s = getComputedStyle(el)
    if (s.bottom === '0px' && (s.position === 'sticky' || s.position === 'fixed') && el.offsetHeight > 24) return el
  }
  return null
}

export function ChatLauncher() {
  const [, , t] = useLang()
  const path = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)   // 打开过一次就不再卸载(会话不因最小化丢失)
  const [hint, setHint] = useState(false)
  const [noPopover, setNoPopover] = useState(false)  // 老浏览器(Safari<17)退成普通 fixed 层
  const [clear, setClear] = useState(BASE)           // 离视口底的实测距离(躲吸底动作条)
  const panel = useRef<HTMLDivElement | null>(null)
  const dock = useRef<HTMLDivElement | null>(null)

  const show = useCallback(() => {
    setMounted(true); setOpen(true); setHint(false); track('widget-open')
    try { localStorage.setItem(HINT_KEY, String(HINT_MAX)) } catch { /* ignore */ }  // 点开过=不再提示
  }, [])
  const hide = useCallback(() => { setOpen(false); track('widget-close') }, [])

  // 开合走原生 popover;`:popover-open` 的 matches() 同时充当特性检测(不支持会抛 → 退普通层)
  useEffect(() => {
    const el = panel.current
    if (!el) return
    try {
      if (open && !el.matches(':popover-open')) el.showPopover()
      else if (!open && el.matches(':popover-open')) el.hidePopover()
    } catch { setNoPopover(true) }
  }, [open, mounted])

  // Esc 关闭(manual popover 不自带)。只在打开时挂,避免全站常驻一个 keydown 监听
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hide])

  // 吸底动作条避让(红线②):量它的实时位置,不用固定上抬量。
  // 相交判定用**基准位的合成矩形**(而不是挂件的实时矩形)—— 抬起来之后就不相交了,
  // 拿实时矩形判会抬起→落下→抬起地来回抖。条子异步渲出(JD 整理完才挂)→ MutationObserver 补测。
  useEffect(() => {
    if (open || !hasBottomBar(path)) { setClear(BASE); return }
    let bar: HTMLElement | null = null
    let raf = 0
    const measure = () => {
      raf = 0
      const d = dock.current
      bar = findBar(bar)
      if (!bar || !d) { setClear(BASE); return }
      const b = bar.getBoundingClientRect()
      // 用 documentElement.clientWidth/Height 而不是 innerWidth/Height:后者**含滚动条**,
      // 而 position:fixed 是按不含滚动条的初始包含块定位的 —— 生产实测差 15px,
      // 桌面上刚好把「提示条压住动作条 7px」判成不相交。
      const de = document.documentElement
      const top = de.clientHeight - BASE - d.offsetHeight     // 挂件在基准位时的上沿
      const left = de.clientWidth - BASE - d.offsetWidth
      const clash = b.bottom > top && b.top < de.clientHeight - BASE
        && b.right > left && b.left < de.clientWidth - BASE
      setClear(clash ? Math.max(BASE, Math.round(de.clientHeight - b.top + BASE)) : BASE)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const main = document.querySelector('main')
    const mo = new MutationObserver(schedule)
    if (main) mo.observe(main, { childList: true, subtree: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mo.disconnect()
    }
  }, [path, open, hint])

  // 轻提示:延迟出场(别跟首屏抢注意力),9 秒自己走。**只是提示,不弹面板**(红线③)
  // 依赖带 open:用户在 1.6s 内就点开了的话,cleanup 掐掉待触发的定时器(否则提示会在面板开着时冒出来);
  // 关闭后本效果重跑,那时 HINT_KEY 已被 show() 写成 MAX,直接返回。
  useEffect(() => {
    if (open) return
    let n = 0
    try { n = Number(localStorage.getItem(HINT_KEY)) || 0 } catch { return }  // 隐私模式读不到就干脆不提示
    if (n >= HINT_MAX) return
    const a = setTimeout(() => {
      setHint(true)
      try { localStorage.setItem(HINT_KEY, String(n + 1)) } catch { /* ignore */ }
    }, 1600)
    const b = setTimeout(() => setHint(false), 9600)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [path, open])

  const bottom = { '--clB': clear + 'px' } as React.CSSProperties
  return (
    <>
      <style>{CSS}</style>
      {/* 启动器:面板开着时整块收走(手机是全屏接管,桌面面板正压在它头上) */}
      {!open && (
        <div ref={dock} className="clDock" style={bottom}>
          {hint && <button className="clHint" onClick={show}>{t('cw.hint')}</button>}
          <button className="clBtn" onClick={show} aria-label={t('cw.open')} title={t('cw.open')}>
            <IconChat size={24} />
          </button>
        </div>
      )}
      {mounted && (
        <div ref={panel} popover="manual" role="dialog" aria-label={t('chat.title')} style={bottom}
          className={'clPanel' + (noPopover && open ? ' clOpen' : '')}>
          <div className="clHead">
            <span className="clTitle">{t('chat.title')}</span>
            <button className="clMin" onClick={hide} aria-label={t('cw.close')} title={t('cw.close')}>
              <IconChevronDown size={18} />
            </button>
          </div>
          {/* compact/autoFocus 是 ChatBox 自己声明的契约(2026-08-04 加):壳不再靠覆盖它的类名做样式。
              autoFocus 跟着 open 翻,每次展开聚焦一次;触屏侧 ChatBox 内部会跳过 */}
          <div className="clBody"><ChatBox compact autoFocus={open} /></div>
        </div>
      )}
    </>
  )
}

// --clB = 离视口底的距离,由上面的测量段按吸底动作条的实时位置写进来(默认 16px)。
// env(safe-area-inset-bottom):iPhone 底部横条,不加会被横条压住半个钮。
const CSS = `
.clDock{--clB:16px;position:fixed;right:16px;bottom:calc(var(--clB) + env(safe-area-inset-bottom,0px));
  z-index:40;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px)}
.clBtn{width:56px;height:56px;flex:none;border-radius:50%;border:none;background:${UI.primary};color:#fff;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  box-shadow:0 8px 24px rgba(37,99,235,.34);transition:transform .08s,background .12s}
.clBtn:hover{background:${UI.primaryDeep}}
.clBtn:active{transform:scale(.93)}
/* 首访轻提示:一行放得下、点了直接开;不是气泡对话,不带尾巴 */
.clHint{min-width:0;background:${UI.card};color:${UI.text};border:1px solid ${UI.border};border-radius:999px;
  padding:8px 14px;font-size:12.5px;line-height:1.2;font-family:inherit;white-space:nowrap;cursor:pointer;
  overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 18px rgba(15,23,42,.12)}
.clHint:hover{border-color:#bfdbfe}

/* 面板:UA 给 [popover] 的 border/padding/margin/inset 全部要覆盖掉 */
.clPanel{--clB:16px;display:none;position:fixed;margin:0;padding:0;box-sizing:border-box;
  inset:auto 16px calc(var(--clB) + env(safe-area-inset-bottom,0px)) auto;z-index:45;
  width:min(380px,calc(100vw - 32px));height:min(600px,calc(100dvh - 96px));
  flex-direction:column;overflow:hidden;background:${UI.card};color:${UI.text};
  border:1px solid ${UI.border};border-radius:16px;box-shadow:0 20px 52px rgba(15,23,42,.20)}
.clPanel:popover-open{display:flex}
.clPanel.clOpen{display:flex}          /* 不支持 popover 的浏览器:退成普通 fixed 层 */
.clHead{flex:none;display:flex;align-items:center;gap:8px;padding:11px 8px 11px 14px;
  border-bottom:1px solid ${UI.hairline}}
.clTitle{flex:1;min-width:0;font-size:14px;font-weight:700;color:${UI.text};
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clMin{flex:none;width:32px;height:32px;display:flex;align-items:center;justify-content:center;
  border:none;background:none;color:${UI.text2};border-radius:8px;cursor:pointer}
.clMin:hover{background:${UI.hairline};color:${UI.text}}
/* 卡壳与历史区高度由 ChatBox 的 compact 自己管(它的 .cbFill),这里只给容器 —— 壳**不覆盖别人的类名** */
.clBody{flex:1;min-height:0;display:flex;flex-direction:column;padding:10px 12px 12px;overflow:hidden}

/* 手机:展开=全屏接管(缩在角落挤成一条没法读长答复);底部留出 iPhone 横条 */
@media(max-width:640px){
  .clPanel{inset:0;width:100%;height:100dvh;max-height:none;border:none;border-radius:0;
    padding-bottom:env(safe-area-inset-bottom,0px)}
}
@media (prefers-reduced-motion:reduce){.clBtn{transition:none}}
`
