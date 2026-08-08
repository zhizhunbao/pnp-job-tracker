-- B2 · 雇主省提名门槛判定(design/雇主省提名门槛判定-20260808.md)—— SK/AB/PE 雇主侧门槛补口
-- 惯例见 db-push-minefield:这三省之前只有 applicant 行,subject='employer' 是全新数据,不是改列,
-- 不需要 DDL(pnp_requirements 已有 subject/factor/applies_area 等全部列,E13-01/E13-02/G6 三轮建完)。
--
-- ⚠️ 本文件是手动旁路,不是权威落库路径:权威路径是 etl/pnp/build_{ab,sk,pe}_req.py(已在本轮更新,
-- 各自新增了雇主侧抓取)→ 重跑 `uv run python etl/09_build_mart.py` 产出 mart/pnp_requirements.json
-- → `/seed`(带 x-seed-token)灌库。三份 raw JSON(data/raw/pnp/{ab,sk,pe}-req.json)已重新生成并核对过。
-- 本文件只是给不想跑整条 ETL 链、只想先把这 5 行手动灌进现有生产库的场景用;两条路径产出的行**内容一致**
-- (字段值抄自同一次抓取)。跑了本文件之后如果还跑了 seed,seed 会按 mart 内容覆盖本文件插的行,不冲突。
--
-- 幂等:DELETE 这三省的 employer 行再 INSERT——**没有**用 INSERT ... ON CONFLICT,因为 pnp_requirements
-- 只有 serial id 一个唯一键,没有业务唯一约束(province+factor+stream 不保证唯一,ON 一个 factor 好几行）。
-- 重跑本文件安全:先净空这三省的 employer 行,再按下面的值重插,不会累积重复。
--
-- 官方原句锚点(URL + quote,CLAUDE.md「官方不公布是要举证的断言」红线;逐条对应下面的 INSERT 行):
--
-- 【AB】https://www.alberta.ca/job-offer-and-employer-requirements (fetched 2026-08-08)
--   empYears   "have been in continuous and active operation in Alberta for a minimum of 2 complete
--              fiscal years (the year used for tax or accounting purposes) prior to application submission"
--   empRevenue "have a minimum total gross annual revenue of $400,000 for the most recent fiscal year
--              (the year used for tax or accounting purposes)"
--   empStaff   "employment of a minimum of 3 full-time (or full-time equivalent) employees in Alberta"
--   （同页还有：达不到 400k/3人 时按经营年限换算可支持的提名人数上限；Indigenous/市/省/联邦政府雇主
--    免营业额与雇员数要求——两条是换算规则/豁免规则，不是阈值，不落成 empRevenue/empStaff 行，理由见
--    etl/pnp/build_ab_req.py 头注）
--
-- 【SK】https://www.saskatchewan.ca/residents/moving-to-saskatchewan/hire-a-foreign-worker/
--       recruit-and-hire-workers-with-sinp/apply-for-a-certificate-of-registration (fetched 2026-08-08)
--   empYears   "actively operate the business as the employer for no less than 24 consecutive months
--              in Saskatchewan"
--   （官方对雇员数/营业额**没有通用数值门槛**，只写定性的 "must provide evidence that the employer has
--    the financial capacity to hire and support the international worker's full-time employment for the
--    duration of the employment contract"；带数字的只有两条条件性分支——经营不满 24 个月的豁免路径
--    （≥5 名全职雇员 + 年营收 ≥$500,000）与住宿业/货运业续证的分档营收表——只对特定情形/特定行业成立，
--    不是「SK 雇主通用门槛」，不落库，详见 etl/pnp/build_sk_req.py 头注）
--
-- 【PE】PEI Workforce Application Guide（PDF，effective January 2026）
--       https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf
--       第 5 页 "Employer Requirements - All Streams" 段（fetched 2026-08-08；HTML 官网在 Radware WAF
--       后面，这份指南 PDF 走文件服务器不挡，同 build_pe_req.py 既有取数路径）
--   empYears   "The company has been in active and continuous operation under current ownership/
--              management in Prince Edward Island for a minimum of two years with identified labour gaps"
--   （该段是穷举式 bullet 清单，逐条读完没有雇员数/营业额字样——PE PNP 没有发布这两项的雇主侧门槛，
--    是举证过的结论，不是漏抓）

BEGIN;

DELETE FROM pnp_requirements WHERE province IN ('AB', 'SK', 'PE') AND subject = 'employer';

INSERT INTO pnp_requirements
  (province, program, stream, subject, factor, op, value, value_text, unit,
   applies_teer, applies_noc, excludes_noc, applies_area, applies_condition, applies_family_size,
   basis, label, section, seq, effective, url, page_url, fetched)
VALUES
  -- AB — AAIP job offer & employer requirements(province-wide,不分区)
  ('AB', 'PNP', 'AAIP (job offer & employer requirements, all streams)', 'employer', 'empYears', '>=',
   2, NULL, 'years', '', '', '', '', '', NULL, '',
   'The Alberta employer must have been in continuous and active operation in Alberta for a minimum of 2 complete fiscal years (the year used for tax or accounting purposes) prior to application submission',
   'Job offer and employer requirements — Employer requirements', 0, '',
   'https://www.alberta.ca/job-offer-and-employer-requirements',
   'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility', '2026-08-08'),

  ('AB', 'PNP', 'AAIP (job offer & employer requirements, all streams)', 'employer', 'empRevenue', '>=',
   400000, NULL, 'CAD/yr', '', '', '', '', '', NULL, '',
   'The Alberta employer must have a minimum total gross annual revenue of $400,000 for the most recent fiscal year (the year used for tax or accounting purposes)',
   'Job offer and employer requirements — Employer requirements', 1, '',
   'https://www.alberta.ca/job-offer-and-employer-requirements',
   'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility', '2026-08-08'),

  ('AB', 'PNP', 'AAIP (job offer & employer requirements, all streams)', 'employer', 'empStaff', '>=',
   3, NULL, 'employees', '', '', '', '', '', NULL, '',
   'Employment of a minimum of 3 full-time (or full-time equivalent) employees in Alberta (independent contractors do not count; two part-time employees may count as one full-time equivalent at an average of 30+ hours/week combined). If an employer cannot meet the revenue and staff minimums, it may still qualify but is capped on the number of nominees it can support based on years of operation (2 years -> 1 nominee, 3 years -> 2 nominees, +1 per additional year); Indigenous, municipal, provincial, Government of Canada and Government of Alberta employers are exempt from the revenue and staff minimums',
   'Job offer and employer requirements — Employer requirements', 2, '',
   'https://www.alberta.ca/job-offer-and-employer-requirements',
   'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility', '2026-08-08'),

  -- SK — SINP Employer Certificate of Registration(全体 SINP 雇主注册闸门,不分通道不分区)
  ('SK', 'PNP', 'SINP — Employer Certificate of Registration (all streams)', 'employer', 'empYears', '>=',
   24, NULL, 'months', '', '', '', '', '', NULL, '',
   '[Employer] actively operate the business as the employer for no less than 24 consecutive months in Saskatchewan; must also provide evidence of financial capacity to hire and support the international worker''s full-time employment for the duration of the employment contract (no published numeric staff/revenue bar for this general requirement — see docs/sql/b2-employer-bars-sk-ab-pe.sql header for the two conditional, non-general numeric paths)',
   'Apply for a Certificate of Registration — Qualification and Application Requirements', 0, '',
   'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/hire-a-foreign-worker/recruit-and-hire-workers-with-sinp/apply-for-a-certificate-of-registration',
   'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-occupations-in-demand',
   '2026-08-08'),

  -- PE — PEI PNP Workforce Employer Requirements(All Streams,PDF 指南第 5 页)
  ('PE', 'PNP', 'PEI PNP Workforce — Employer Requirements (all streams)', 'employer', 'empYears', '>=',
   2, NULL, 'years', '', '', '', '', '', NULL, '',
   '[Employer] The company has been in active and continuous operation under current ownership/management in Prince Edward Island for a minimum of two years with identified labour gaps (no published minimum staff count or minimum annual revenue in this section)',
   'Employer Requirements - All Streams', 0, 'January 2026',
   'https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf',
   'https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-pnp-workforce-streams',
   '2026-08-08');

COMMIT;

-- 验收(跑完自己核对,不是本文件一部分):
--   SELECT province, factor, op, value, unit, left(label, 70)
--     FROM pnp_requirements WHERE subject = 'employer' AND province IN ('AB','SK','PE')
--     ORDER BY province, factor;
--   -- 应得 5 行:AB 3 行(empYears/empRevenue/empStaff)、SK 1 行(empYears）、PE 1 行(empYears)
