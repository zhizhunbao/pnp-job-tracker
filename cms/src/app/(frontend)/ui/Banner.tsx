'use client'
// Banner(#66 模块统一页头 → banner 图版,2026-07-19 Frank「按这个做」批设计总表)。
// 两形态一组件:images 传了=实景图 banner(恒 150px/手机 110px 定框,cover 裁剪;背景 crossfade 8s
// B类氛围轮播——前景信息恒定,区别于 news 头条的 A类内容轮播;右下小圆点,hover 暂停,
// prefers-reduced-motion 静止);不传/图挂=浅色渐变带(原形态即兜底,发布零风险)。
// 图=cms/public/img/banners/(Commons 实景,SOURCES.md 记出处,致谢挂 img title,画面无水印)。
import { useEffect, useState } from 'react'

const MODULE_STYLE: Record<string, { bg: string; fg: string; deep: string }> = {
  home: { bg: 'linear-gradient(100deg,#eff6ff,#dbeafe)', fg: '#1e40af', deep: '30,64,175' },   // L1-01 landing:主品牌蓝,与 jobs 同档不发明新色
  jobs: { bg: 'linear-gradient(100deg,#eff6ff,#dbeafe)', fg: '#1e40af', deep: '30,64,175' },
  pathways: { bg: 'linear-gradient(100deg,#f5f3ff,#ede9fe)', fg: '#5b21b6', deep: '91,33,182' },
  rank: { bg: 'linear-gradient(100deg,#fffbeb,#fef3c7)', fg: '#92400e', deep: '146,64,14' },
  stats: { bg: 'linear-gradient(100deg,#f0fdf4,#dcfce7)', fg: '#166534', deep: '22,101,52' },
  news: { bg: 'linear-gradient(100deg,#f0fdfa,#ccfbf1)', fg: '#0f766e', deep: '15,118,110' },
}

export function Banner({ module, icon, title, sub, right, images, stats, tall }: {
  module: keyof typeof MODULE_STYLE; icon?: React.ReactNode; title: React.ReactNode
  sub?: React.ReactNode; right?: React.ReactNode; images?: string[]
  stats?: { v: React.ReactNode; label: React.ReactNode }[]   // 关键数字块(≤3,Frank:「显示关键信息但不能太多」;仅图版渲染,手机藏)
  tall?: boolean   // L1-01 landing 首屏:定高 130→200(门面比二级页重),手机 150;其余槽位语法不变
}) {
  const m = MODULE_STYLE[module]
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const imgs = !dead && images && images.length ? images : null
  useEffect(() => {
    if (!imgs || imgs.length < 2 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 8000)
    return () => clearInterval(id)
  }, [imgs, imgs?.length, paused])
  if (!imgs) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', background: m.bg, color: m.fg, borderRadius: 12, padding: '16px 20px', margin: '0 0 14px' }}>
        <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</h1>
        {sub && <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>}
        {right && <span style={{ marginLeft: 'auto', fontSize: 13 }}>{right}</span>}
      </div>
    )
  }
  // 2026-07-19 Frank 批新槽位(mockups/二级导航与banner-提案):标题+副题左下,数字胶囊(数字+标签同行)
  // 右下,轮播圆点右上;高度 150→130——治「数字与标签断裂悬在标题旁」
  return (
    <div className={tall ? 'pbImgBanner pbTall' : 'pbImgBanner'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative', height: tall ? 200 : 130, borderRadius: 12, overflow: 'hidden', margin: '0 0 14px' }}>
      {imgs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" title="Wikimedia Commons" onError={() => setDead(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === idx % imgs.length ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      ))}
      {/* 模块色暗化层(左浓右淡)压图保字;对比度红线 ≥4.5:1 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(${m.deep},.82), rgba(${m.deep},.45) 55%, rgba(17,24,39,.25))` }} />
      <div className="pbBody" style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: '0 20px 13px', color: '#fff' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>{icon}{title}</h1>
          {sub && <div style={{ fontSize: 12, opacity: 0.92, marginTop: 3, textShadow: '0 1px 4px rgba(0,0,0,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {stats?.slice(0, 3).map((s, i) => (
            <span key={i} className="pbStat" style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
              <b style={{ fontSize: 14, marginRight: 4 }}>{s.v}</b>{s.label}
            </span>
          ))}
          {right && <span style={{ background: 'rgba(255,255,255,.92)', borderRadius: 8, padding: '6px 13px', fontSize: 13, whiteSpace: 'nowrap' }}>{right}</span>}
        </div>
      </div>
      {/* #212(第 26 轮体检续):切图点原来钮就是那颗 6×6 的点,手机上点不中 —— 钮改透明热区、
          圆点挪进内层 span:桌面维持 6px 间距 5(视觉不变),手机热区撑到 36×40 */}
      {imgs.length > 1 && (
        <span className="pbDots" style={{ position: 'absolute', right: 14, top: 10, display: 'flex', gap: 5, zIndex: 2 }}>
          {imgs.map((s, i) => (
            <button key={s} aria-label={`bg ${i + 1}`} onClick={() => setIdx(i)}
              style={{ width: 6, height: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx % imgs.length ? '#fff' : 'rgba(255,255,255,.45)' }} />
            </button>
          ))}
        </span>
      )}
    </div>
  )
}

// 模块 → banner 图组(1280×300 已裁,SOURCES.md 在同目录);调用点传 BANNER_IMGS.jobs 即开图版
export const BANNER_IMGS: Record<string, string[]> = {
  // home(L1-01 landing 首屏):复用既有已裁图起步(Pier 21 移民博物馆/多伦多/佩姬湾),不新增下载;换专属图=改这三个路径
  home: ['/img/banners/pathways-2.jpg', '/img/banners/jobs-1.jpg', '/img/banners/stats-3.jpg'],
  jobs: ['/img/banners/jobs-1.jpg', '/img/banners/jobs-2.jpg', '/img/banners/jobs-3.jpg'],
  pathways: ['/img/banners/pathways-1.jpg', '/img/banners/pathways-2.jpg', '/img/banners/pathways-3.jpg'],
  rank: ['/img/banners/rank-1.jpg', '/img/banners/rank-2.jpg', '/img/banners/rank-3.jpg'],
  stats: ['/img/banners/stats-1.jpg', '/img/banners/stats-2.jpg', '/img/banners/stats-3.jpg'],
  // news(2026-07-31 Frank「没有图片的 banner 加上对应的图片」):照 home 先例复用既有已裁图不新增下载 ——
  // 国会山(政策感最贴动态)/ 雾中高楼 / 卡尔加里天际线;要换专属图改这三个路径
  news: ['/img/banners/pathways-1.jpg', '/img/banners/rank-1.jpg', '/img/banners/jobs-3.jpg'],
}
