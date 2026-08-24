/**
 * auth 组件域的桶 —— 身份三件事(登录/注册/找回与重置密码)+ 首帧会话 + 头像 +
 * 账户菜单(对应 lib/auth;2026-08-24 组件域形制化:四态机拆八件,状态进 hooks,
 * 提交流进 functions)。BrandHead/GoogleButton/GoogleIcon/PwMeter/AuthHero/
 * AuthFields/AuthFooter 是域内小件不出桶。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
export { AccountMenu } from './accountmenu'
export { AuthForm } from './authform'
export { AuthModal } from './authmodal'
export { Avatar } from './avatar'
export { useSsrSession } from './hooks'
export { SessionProvider } from './sessionprovider'
export type { AccountMenuIn, AuthFormIn, AuthModalIn, AvatarIn, SessionProviderIn } from './types'
