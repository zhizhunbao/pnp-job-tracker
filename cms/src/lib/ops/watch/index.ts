/**
 * ops 桶的子桶 watch —— 报警规则、探活、事件与 AI 通道页。依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */

export {
  channelsBoard, freshBoard, incidentsBoard, makeMailNotify, rulesBoard, runRules, saveProbes, setAlertState, signalsOf, toAlertAct, toFreshFact,
  toOllamaProbe,
} from './functions'
export type { AlertActJson, ProbeFact, TickJson } from './types'
