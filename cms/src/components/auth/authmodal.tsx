'use client'
/**
 * auth 域的弹框壳:AuthForm 套 Modal(sm)。mode 由入口决定初始态(注册 CTA 直达注册,
 * 用户定「注册也要弹框」;默认登录;reset = 邮件链接落地设新密码)。
 * 品牌头保留(用户拍板:登录弹框是品牌触点,仅 chrome 对齐规范)。
 * 2026-08-24 自 AuthForm.tsx 拆出(一个 tsx 一个组件)。
 * 2026-08-29 Frank 实拍:右上角只留关闭 × —— 登录框是定尺寸的短表单,放大/全屏没有内容可放开,
 * 走 Modal 壳现成的 `resizable` 开关关掉(壳不必改;别的弹框不受影响)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { Modal } from '@/components/modal'
import { AuthForm } from './authform'
import { MODAL_SIZE_SM } from './constants'
import type { AuthModalIn } from './types'

/**
 * 登录/注册弹框。
 *
 * @param props 开合与入口参数(见 AuthModalIn 逐格注释)。
 * @returns 弹框。
 */
export function AuthModal({ t, onClose, onDone, mode, resetToken, z, returnTo, hero }: AuthModalIn) {
  return (
    <Modal onClose={onClose} size={MODAL_SIZE_SM} z={z} resizable={false} draggable={false}>
      <AuthForm t={t} onDone={onDone} initialMode={mode} resetToken={resetToken} returnTo={returnTo} hero={hero} />
    </Modal>
  )
}
