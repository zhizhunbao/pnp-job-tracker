/**
 * search 域的形状。尺寸档来自 input 域(输入件共用一套高度)。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */
import type { InputSize } from '@/components/input'

/**
 * Search(搜索框:左图标 + 可清除)的 props。
 */
export type SearchIn = {
  /**
   * 当前值。
   */
  value: string

  /**
   * 改值回调。
   */
  onChange: (v: string) => void

  /**
   * 占位提示(同时当无障碍名)。
   */
  placeholder: string

  /**
   * 尺寸档(可省 = lg,搜索框通常独占一行)。
   */
  size?: InputSize
}

