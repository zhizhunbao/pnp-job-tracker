'use client'
/**
 * icons 域的词汇表:全站唯一图标出口(替代 UI emoji;品牌枫叶除外)。
 * lucide-react 线条风,stroke=currentColor 跟随文字颜色;规格(1em + 基线下沉 +
 * aria-hidden)统一在 functions 的 makeIcon,这里只做「哪个名字对应哪枚 lucide」。
 * 加图标 = 从 lucide-react 挑一个、在这里包一行并写清它代表什么;调用点只从桶取。
 * 2026-08-24 形制化(原样搬进来的那份:箭头函数/展开/行尾注释清零,style 迁 module)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import {
  ArrowUp, ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, ClipboardList, Compass, Lock, Mail,
  Map as LMap, MapPin, Maximize, Medal, Menu, MessageCircle, Mic, Minimize, Minus, Newspaper, Paperclip, Pause, Play,
  Rocket, RotateCcw, Save, Scale, Search, Settings, Square, Star, Target, ThumbsDown, ThumbsUp, TriangleAlert, User,
  Users, Volume2, X,
} from 'lucide-react'

import { makeIcon } from './functions'

/**
 * 对话发送(输入框右侧的上箭头钮)。
 */
export const IconArrowUp = makeIcon(ArrowUp)

/**
 * 就业把脉(顶栏入口);柱状图 = 数据视角。
 */
export const IconChart = makeIcon(ChartColumn)

/**
 * 右下角对话挂件的气泡钮(ChatLauncher)。
 */
export const IconChat = makeIcon(MessageCircle)

/**
 * 喇叭(字典弹层读音钮 —— Frank 2026-09-04「人家的播放按钮也是蓝方块吗」)。
 */
export const IconVolume = makeIcon(Volume2)

/**
 * 播放(pte 播放条圆钮)。
 */
export const IconPlay = makeIcon(Play)

/**
 * 暂停(pte 播放条圆钮在播态)。
 */
export const IconPause = makeIcon(Pause)

/**
 * 麦克风(pte 录音条圆钮)。
 */
export const IconMic = makeIcon(Mic)

/**
 * 重来(pte 录音条 ↻)。
 */
export const IconRedo = makeIcon(RotateCcw)

/**
 * 命中/已选(定价清单、匹配结果的绿勾)。
 */
export const IconCheck = makeIcon(Check)

/**
 * 整块成立(带圈的勾,比裸勾更重的肯定)。
 */
export const IconCheckCircle = makeIcon(CircleCheck)

/**
 * 展开态(下拉触发器、抽屉分组、挂件面板头的收起钮)。
 */
export const IconChevronDown = makeIcon(ChevronDown)

/**
 * 上一页(翻页钮;2026-08-24 替 ‹ 字符)。
 */
export const IconChevronLeft = makeIcon(ChevronLeft)

/**
 * 下一页 / 抽屉分组的收起态(2026-08-24 替 › ▸ 字符)。
 */
export const IconChevronRight = makeIcon(ChevronRight)

/**
 * 职位板与存查(清单类内容)。
 */
export const IconClipboard = makeIcon(ClipboardList)

/**
 * 拿 PR 评估(找路 = 罗盘)。
 */
export const IconCompass = makeIcon(Compass)

/**
 * 付费锁(打码区、Pro 门槛)。
 */
export const IconLock = makeIcon(Lock)

/**
 * 邮件订阅与提醒。
 */
export const IconMail = makeIcon(Mail)

/**
 * 地区视角(省/市下钻)。
 */
export const IconMap = makeIcon(LMap)

/**
 * 具体地点(职位所在城市/区)。
 */
export const IconMapPin = makeIcon(MapPin)

/**
 * 挂件面板放大。
 */
export const IconMaximize = makeIcon(Maximize)

/**
 * 排名/榜单名次。
 */
export const IconMedal = makeIcon(Medal)

/**
 * 窄屏汉堡(2026-08-24 Frank「统一用 icons」,替 ☰ 字符)。
 */
export const IconMenu = makeIcon(Menu)

/**
 * 挂件面板还原。
 */
export const IconMinimize = makeIcon(Minimize)

/**
 * 挂件最小化(收成一条)。
 */
export const IconMinus = makeIcon(Minus)

/**
 * 移民动态(E12-06)。
 */
export const IconNews = makeIcon(Newspaper)

/**
 * 附件/简历上传。
 */
export const IconPaperclip = makeIcon(Paperclip)

/**
 * 对话重置(2026-08-06 Frank「重置两个字别扭」→ 图标化)。
 */
export const IconRefresh = makeIcon(RotateCcw)

/**
 * 开始规划(L1-01 landing 顶栏入口)。
 */
export const IconRocket = makeIcon(Rocket)

/**
 * 保存的搜索/订阅条件。
 */
export const IconSave = makeIcon(Save)

/**
 * 法务与免责(天平)。
 */
export const IconScale = makeIcon(Scale)

/**
 * 搜索框与筛选入口。
 */
export const IconSearch = makeIcon(Search)

/**
 * 账户设置。
 */
export const IconSettings = makeIcon(Settings)

/**
 * 挂件全屏(占满一格)。
 */
export const IconSquare = makeIcon(Square)

/**
 * 收藏与 Pro 标(付费档也用它,琥珀色由调用点给)。
 */
export const IconStar = makeIcon(Star)

/**
 * 我的匹配(靶心 = 按档案对准)。
 */
export const IconTarget = makeIcon(Target)

/**
 * 答复反馈「没帮助」—— 点踩 = 数据缺口报警器,不是装饰。
 */
export const IconThumbDown = makeIcon(ThumbsDown)

/**
 * 答复反馈「有帮助」(ChatAnswer)。
 */
export const IconThumbUp = makeIcon(ThumbsUp)

/**
 * 个人档案。
 */
export const IconUser = makeIcon(User)

/**
 * 雇主名录(B4-01)与资料库。
 */
export const IconUsers = makeIcon(Users)

/**
 * 警示(风险提示、报错框)。
 */
export const IconWarn = makeIcon(TriangleAlert)

/**
 * 关闭(弹框、抽屉、筛选清除;2026-08-24 替 × ✕ 字符)。
 */
export const IconX = makeIcon(X)
