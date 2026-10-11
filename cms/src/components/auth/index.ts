/**
 * auth 组件域的桶 —— 身份三件事(登录/注册/找回与重置密码)+ 首帧会话 + 头像 +
 * 账户菜单(对应 lib/auth;2026-08-24 组件域形制化:四态机拆八件,状态进 hooks,
 * 提交流进 functions)。BrandHead/GoogleButton/GoogleIcon/PwMeter/AuthHero/
 * AuthFields/AuthFooter 是域内小件不出桶。
 * 2026-10-11 批 5:点外面关弹层的 useClickOutside 出桶(顶栏铃铛面板与账户下拉同一种「挂在钮下的弹层」,关法用同一份)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
export { AccountMenu } from './accountmenu'
export { AuthForm } from './authform'
export { AuthModal } from './authmodal'
export { Avatar } from './avatar'
export { useClickOutside, useSsrSession } from './hooks'
export { SessionProvider } from './sessionprovider'
export type { AccountMenuIn, AuthFormIn, AuthModalIn, AvatarIn, SessionProviderIn } from './types'
