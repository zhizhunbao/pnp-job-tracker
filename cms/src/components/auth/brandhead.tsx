'use client'
/**
 * auth 域的品牌头小件:枫叶 + 站名(用户拍板保留 —— 登录弹框是品牌触点)。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import css from './auth.module.css'

/**
 * 品牌头(死内容无 props)。
 *
 * @returns 品牌头。
 */
export function BrandHead() {
  return (
    <div className={css.brand}>
      <div className={css.brandLeaf}>🍁</div>
      <div className={css.brandName}>Offer2PR</div>
    </div>
  )
}
