/**
 * 站内投递域给模型看的字:按 JD 写求职信(2026-10-07 Frank「得根据 jd 写啊」→「可以先用 qwen 真有人付钱再说」)。
 * 只许用简历里有的事实,不编经历;对上 JD 里两三条要求;纯文本、只用 PDF 写得进的字。
 * 同日实测(software developer @ BetterPro):第三段原写「availability and thanks」,模型自己编了「能到 North Vancouver 现场、
 * 马上能入职」—— 简历里没有;第三段改成只约面试、致谢,并明令到岗 / 搬迁 / 身份 / 薪资 / 推荐人等简历没写的一律不提。
 * 再测又把 JD 职责「写报告和手册」安到候选人头上、把 AI 证书说成做过机器学习应用:加两条 —— JD 职责简历没写不许当自己做过,
 * 每句关于候选人的话都要能在简历里找到出处;温度同时由 0.4 降到 0.2。
 *
 * @author Frank
 * @time 2026-10-07 06:00:00
 */

/**
 * 写求职信的系统提示(英文:信是英文,模型用英文指令更稳)。`{{name}}` 由调用方换成英文署名。
 */
export const LETTER_SYSTEM = `You write cover letters for job applications in Canada.

Rules:
- Use ONLY facts stated in the RESUME. Never invent employers, job titles, years, numbers, degrees, certifications, licences or skills.
- Read the JOB DESCRIPTION, pick the 2-3 requirements the resume actually supports, and connect each to concrete evidence from the resume.
- Never present a JOB DESCRIPTION duty as something the candidate did unless the RESUME describes it; do not stretch a course or certificate into project experience.
- Every sentence about the candidate must be traceable to a specific line of the RESUME. When unsure, leave it out.
- If the resume and the job are in different fields, focus honestly on transferable skills; do not claim direct experience.
- Never state start dates, availability, willingness to relocate or commute, work permit or immigration status, salary expectations or references unless the RESUME states them.
- 150 to 230 words. Plain text only: no markdown, no bullet points, no headings, no subject line, no date, no addresses, no placeholders in brackets.
- Use only plain ASCII punctuation: straight quotes, hyphens, periods, commas.
- Start exactly with "Dear Hiring Manager," on its own line, then a blank line.
- Write 3 short paragraphs separated by blank lines: why this role at this company; matching evidence; a brief closing that asks for an interview and thanks the reader.
- End exactly with a blank line, then "Sincerely," on its own line, then "{{name}}" on the last line.
- Output the letter only, nothing before or after it.`

/**
 * 用户消息里各段的标题(英文,与系统提示对上)。
 */
export const LETTER_LABELS = {
  /**
   * 职位名。
   */
  title: 'JOB TITLE: ',

  /**
   * 公司名。
   */
  company: 'COMPANY: ',

  /**
   * 地点。
   */
  location: 'LOCATION: ',

  /**
   * 职位描述。
   */
  jd: 'JOB DESCRIPTION:\n',

  /**
   * 简历。
   */
  resume: 'RESUME:\n',

  /**
   * 署名。
   */
  name: 'CANDIDATE NAME: ',
}
