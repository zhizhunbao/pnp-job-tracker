/**
 * 给模型看的字：新闻速读的三语指令（instr 进 prompt 正文，system 钉语种）。
 * 用户永远看不到，不进 i18n。
 *
 * @author Frank
 * @time 2026-08-23 09:00:00
 */

/**
 * 速读指令：语种 → { prompt 正文指令, system 钉语 }（措辞红线：只依据原文，无开场白无 Markdown）。
 * 两格具名不用二元组 —— 按位置取 `[0]`/`[1]` 读的人要回来数括号，闸 `no-literal-index` 也咬。
 */
export const NEWS_SUMMARY_INSTR: Record<string, {
  /**
   * 正文指令：拼在标题与正文之前,交代要写成什么样。
   */
  prompt: string,

  /**
   * 钉语种的 system：只说「用哪门语言回答」,不带任务内容。
   */
  system: string,
}> = {
  /**
   * 中文速读。
   */
  zh: {
    prompt: '用中文 2-3 句总结这篇加拿大官方移民新闻，讲清「发生了什么、对谁有影响」；只依据原文，不要任何开场白或 Markdown 记号。',
    system: 'Always answer in Chinese.',
  },

  /**
   * 韩文速读。
   */
  ko: {
    prompt: '이 캐나다 공식 이민 뉴스를 한국어 2-3문장으로 요약하세요: 무엇이 일어났고 누구에게 영향이 있는지. 원문에만 근거하고 서두나 Markdown 기호 없이.',
    system: 'Always answer in Korean.',
  },

  /**
   * 英文速读。
   */
  en: {
    prompt: 'Summarize this official Canadian immigration news in 2-3 sentences: what happened and who is affected. Base it only on the text; no preamble, no Markdown.',
    system: 'Always answer in English.',
  },
}

/**
 * 速读 prompt 里标题行的头。
 */
export const SUMMARY_TITLE_HEAD = '\n\n标题：'

/**
 * 速读 prompt 里正文行的头。
 */
export const SUMMARY_BODY_HEAD = '\n\n正文：\n'
