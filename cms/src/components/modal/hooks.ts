'use client'
/**
 * modal 域的状态机器:窄屏判定、overlay 关闭手势、Esc 关闭、header 拖拽
 * (hooks 抽屉 —— 调用位置被 React 规则定死的单独一格,这个域有几台机器一眼数得清)。
 * 2026-09-28 并壳(Frank「别并存啊」「你都重构了 还并存什么」):拖动(useCard)与拉伸(useEdgeResize)两台、
 * 连同 advisor 浮层壳的一台(useFloatPanel:拖动 / 八向拉伸 / 尺寸记忆),合成一台 useFrame;
 * Esc 由「各挂各的」改成按打开先后排号,只有最上面那个接(弹框栈不再自己管 Esc)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { EV_CHANGE, EV_KEYDOWN, KEY_ESC, MQ_MAX_WIDTH_HEAD, MQ_MAX_WIDTH_TAIL, NARROW_BP } from './constants'
import {
  downOf, fitKeyOf, frameInitOf, frameStyleOf, heightDroppedOf, isTopEsc, joinEsc, leaveEsc, makeDragStart,
  makeResizeStart, memoOf, minSizeOf,
} from './functions'
import type { FrameBox, FrameIn, FrameOut, LayerStackOut, OverlayHandlers, PointerHandlerFn, ResizeEdge } from './types'

/**
 * 窄屏判定(E8-03,单一来源):≤640px 弹窗一律全屏。
 * 弹窗都是水合后才开,惰性初值直接读 matchMedia 无水合差异。
 *
 * @param bp 断点像素(缺省走规范值)。
 * @returns 是否窄屏。
 */
export function useIsNarrow(bp = NARROW_BP): boolean {
  const [narrow, setNarrow] = useState(function init() {
    return typeof window !== 'undefined' && window.matchMedia(MQ_MAX_WIDTH_HEAD + bp + MQ_MAX_WIDTH_TAIL).matches
  })
  useEffect(function bind() {
    const mq = window.matchMedia(MQ_MAX_WIDTH_HEAD + bp + MQ_MAX_WIDTH_TAIL)
    function onChange() {
      setNarrow(mq.matches)
    }
    mq.addEventListener(EV_CHANGE, onChange)
    function off() {
      mq.removeEventListener(EV_CHANGE, onChange)
    }
    return off
  }, [bp])
  return narrow
}

/**
 * 弹框 overlay 关闭手势:框内按下、框外松开(如滑动选中文本)时浏览器把 click 派发到
 * overlay,会误关弹框 —— 只有「按下与松开都落在 overlay 本身」才算点外面关闭。
 * 所有 overlay 弹框共用(2026-08-24 自 ui/overlay.ts 并入本抽屉)。
 *
 * @param onClose 关闭回调。
 * @returns 挂到 overlay 元素上的两枚手柄。
 */
export function useOverlayClose(onClose: () => void): OverlayHandlers {
  const downOnOverlay = useRef(false)
  function onMouseDown(e: React.MouseEvent) {
    downOnOverlay.current = e.target === e.currentTarget
  }
  function onClick(e: React.MouseEvent) {
    if (downOnOverlay.current && e.target === e.currentTarget) {
      onClose()
    }
  }
  return { onMouseDown, onClick }
}

/**
 * Esc 关闭:挂上时按打开先后领号(variables 的 CACHE),Esc 只让最上面那个关 ——
 * 2026-09-28 并壳(Frank「别并存啊」):原先各挂各的,一按全关;弹框栈(职位 → 公司 → 职位)与职位板字段弹框
 * 各自另挂一份互相让。现在谁后打开谁在上面,叠几层都是一层一层关。
 * 号只在挂上时领一次:回调换了(每渲一次都是新函数)只更新镜像格,不重新排队 —— 重排就会把底下那层抬到最上面。
 *
 * @param onClose 关闭回调。
 * @returns 无。
 */
export function useEscClose(onClose: () => void) {
  const latest = useRef(onClose)
  useEffect(function syncClose() {
    latest.current = onClose
  })
  useEffect(function bind() {
    const id = joinEsc()
    function onKey(e: KeyboardEvent) {
      if (e.key === KEY_ESC && isTopEsc(id)) {
        latest.current()
      }
    }
    window.addEventListener(EV_KEYDOWN, onKey)
    function off() {
      window.removeEventListener(EV_KEYDOWN, onKey)
      leaveEsc(id)
    }
    return off
  }, [])
}

/**
 * 叠开的弹框栈(2026-09-21 Frank「点公司就弹公司的框?然后还能点回来,还能看该公司其他的职位?」):
 * 职位 → 公司 → 另一条职位……一层层往上叠,关掉最上面一层就回到下面那层。Esc 也只关最上面一层 ——
 * 原先各宿主各挂一个 Esc、一按全关(职位板 closeBoth、公司页 useCompanyPeek),叠起来就回不去了。
 * 各层是什么、点了往上叠还是同框换,由宿主与渲染件(advisor 的 PeekStack)定;这里只管次序。
 * 2026-09-28 并壳:栈不再自己挂 Esc —— 每一层都是 Modal,Modal 按打开先后排号接 Esc(useEscClose),最上面那层关的就是 pop。
 *
 * @returns 各层与三个手柄。
 */
export function useLayerStack<L>(): LayerStackOut<L> {
  const [layers, setLayers] = useState<L[]>([])
  const push = useCallback(function pushLayer(layer: L): void {
    setLayers(function withTop(prev: L[]): L[] {
      return prev.concat([layer])
    })
  }, [])
  const swapTop = useCallback(function swapTopLayer(layer: L): void {
    setLayers(function withNewTop(prev: L[]): L[] {
      return prev.slice(0, -1).concat([layer])
    })
  }, [])
  const pop = useCallback(function popLayer(): void {
    setLayers(function withoutTop(prev: L[]): L[] {
      return prev.slice(0, -1)
    })
  }, [])
  return { layers, push, swapTop, pop }
}

/**
 * 白卡整机(2026-09-28 并壳,一台管全站弹框):拖动 + 八向拉伸 + 尺寸记忆。
 * 普通弹框照遮罩居中、宽高跟档位与内容走,第一次拖动 / 拉伸时量一下此刻的位置钉在视口上;
 * 窗口形(带标题栏)首帧就按记忆尺寸居中钉住,拉完把宽高写回记忆。窄屏(E8-03)强制全屏:不拖、不拉、不出把手。
 * 拖动只挂一块手柄:窗口形挂标题栏(正文要能选字),普通弹框挂整张白卡(按钮、输入件这类豁免)。
 * 2026-09-21 Frank「会出现 先一个小框，然后在放大」:首帧就按记忆算(frameInitOf),不在挂载后再跳。
 * 2026-09-23 Frank「这个带全屏的都去掉吧」:全屏钮撤,全屏态只剩窄屏强制那一种。
 * 2026-10-05 Frank「这个也是很多空白」:多收一个换屏键(fitKey)—— 键一变(访客向导换了一题),拉出来的高撤掉回到随内容,
 * 位置与宽不动;在渲染里比对上一次的键(React 文档「props 变了调整 state」的写法),不另起 effect,不多闪一帧。
 *
 * 外层也可以自己起一台交给 Modal(frame):职位描述弹框重新翻译后整块重挂内容,位置尺寸跟着外层走不丢
 * (原浮层壳的 useFloatPanel 就是外层起的,同一个理由)。
 *
 * @param x 窗口形尺寸规格与普通弹框的两个开关。
 * @returns 机器面板(连同窄屏态)。
 */
export function useFrame(x: FrameIn): FrameOut {
  const narrow = useIsNarrow()
  const [box, setBox] = useState<FrameBox | null>(function initBox(): FrameBox | null {
    return frameInitOf({ win: x.win })
  })
  const fitKey = fitKeyOf(x)
  const [fit, setFit] = useState(fitKey)
  if (fit !== fitKey) {
    setFit(fitKey)
    setBox(heightDroppedOf(box))
  }
  const win = x.win != null
  const live = narrow === false
  const canDrag = live && (win || x.draggable)
  const canSize = live && (win || x.edgeResize)
  const memo = memoOf(x)
  const min = minSizeOf({ win })
  const onDrag = makeDragStart({ enabled: canDrag, box, setBox })

  function startOf(edge: ResizeEdge): PointerHandlerFn {
    return makeResizeStart({ enabled: canSize, box, setBox, edge, memo, min })
  }

  return {
    narrow,
    style: frameStyleOf({ narrow, box }),
    onCardDown: downOf({ on: win === false, fn: onDrag }),
    onBarDown: downOf({ on: win, fn: onDrag }),
    startOf,
    resizable: canSize,
  }
}
