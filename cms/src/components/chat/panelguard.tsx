'use client'
/**
 * 🔴 面板内容的错误边界 —— **2026-08-04 生产事故的正主**(手机「呼不出来」)。
 * next/dynamic 给的是 Suspense **不是** ErrorBoundary:懒加载 chunk 取不到时
 * ChunkLoadError 会一路冒到 Next 的全局边界,**整站被替换成「This page couldn't
 * load」**(playwright 复现:拦掉 chunks 后点挂件 → main 内容清零、启动器一起消失)。
 * 为什么偏偏是手机:① 弱网/切后台 fetch 被掐;② 手机标签页能活好几天,期间任何
 * 一次部署都会换 chunk 哈希 → 旧页面点开必 404。桌面刚部署完就刷新,永远撞不上。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Component } from 'react'
import { track } from '@/lib/track'
import { EV_W_LOAD_FAIL, WARN_CHUNK } from './constants'
import type { PanelGuardIn, PanelGuardState } from './types'

/**
 * 错误边界(React 里没有函数式错误边界,这个 class 是外部库定死的垫片形态 ——
 * Ponytail 第 6 格的最小必要实现)。
 */
// eslint-disable-next-line local/no-class -- React 错误边界只有 class 一种写法(库定死的垫片,宪法钦定豁免)
export class PanelGuard extends Component<PanelGuardIn, PanelGuardState> {
  /**
   * 初始:没挂。
   */
  // eslint-disable-next-line local/doc-every-member -- React class state 的初始化字面量,形状由上面的泛型第二参定死
  state = { dead: false }

  /**
   * 库定死的静态钩子:子树抛错 → 切兜底。
   *
   * @returns 死档状态。
   */
  static getDerivedStateFromError() {
    // eslint-disable-next-line local/doc-every-member -- React 定死的派生返回,形状同 state 泛型
    return { dead: true }
  }

  /**
   * 库定死的实例钩子:留痕 + 打点(下次出问题有据可查)。
   *
   * @param err 子树抛上来的错。
   */
  componentDidCatch(err: unknown) {
    console.warn(WARN_CHUNK, err)
    track(EV_W_LOAD_FAIL)
  }

  /**
   * 库定死的渲染钩子。
   *
   * @returns 兜底或内容。
   */
  render() {
    if (this.state.dead) {
      return this.props.fallback
    }
    return this.props.children
  }
}
