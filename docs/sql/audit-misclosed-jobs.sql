-- 2026-08-04:被「展示去重」误下架的岗 —— 只读核查 + 人工恢复(恢复动作 Frank 亲手跑)。
--
-- 病根(已修,见 etl/09_build_mart.py 的 seen_ids / cms/src/app/seed/route.ts 的并集防线):
--   09 的展示去重键是 `company|title`(**不含城市**),被丢掉的帖同时退出了 seed 的「本次见过」集,
--   满 30 天被「本次未见且发布超 30 天」规则静默 closed —— 而 DB 侧判重是 company×title×city,两套口径打架。
--   实测(2026-08-04 本地 data/ 快照 × 生产库):旧口径下 5,091 个 open 岗不在 mart;新口径下只剩 9 个
--   (6 个是中介 Manpower 帖=有意过滤,3 个本地 postings 快照落后于 ETL 盒)。
--
-- 修完之后,一个岗只有两条路会被下架:
--   ① 命中判死名单 closed_jobs(verify_expired 逐帖 GET 拿到 410 / <title> 含 "Job posting expired" 的**事实**);
--   ② 本轮**真的**没在 seen_ids 里见到(源数据里已经没有这条 posting)且 date_posted 超 30 天(保守**推断**)。
--   展示去重不再有下架副作用;中介过滤仍走 ②(有意为之:中介帖不该在板上)。
--
-- ⚠️ 恢复顺序很重要:抽样 20 个「近 7 天被规则关掉、且现在仍在 seen_ids 里」的岗实测 4 个仍在招、16 个已 410。
--    直接全量 reopen = 把 80% 死链重新推给用户(正是 Fort Qu'Appelle 那位撞的过期页)。
--    所以先让验尸把它们过一遍(09 修完后 mart_open_ids 已包含这批,verify_expired 才验得到),
--    再 reopen —— 那时 seen_ids 已把新判死的剔掉,剩下的才是真活的。

-- ── Q1(纯只读,DB-only 概览):谁是被规则 ② 关的 ──────────────────────────────
-- 判别式:规则 ② 的 UPDATE 是 `closed_at=$now, updated_at=$now` → 两列**完全相等**;
-- 判死名单那条是 `closed_at=COALESCE(旧值, 验尸时刻), updated_at=$now` → 两列必不等。
-- 实测校验(2026-08-04,生产库 18,124 行 closed):closed_at <> updated_at 的 9,264 行 **全部**在判死名单里(0 例外);
-- 反过来不成立(closed_at = updated_at 的 8,860 行里有 7,699 行是先被规则 ② 关、事后才验尸判死的)——
-- 所以 Q1 只是**概览**,真正的恢复口径看 Q2。
SELECT date_trunc('day', closed_at) AS day, count(*) AS closed_by_rule2
FROM jobs
WHERE status = 'closed' AND closed_at = updated_at AND closed_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;

-- ── Q2(恢复口径):closed 且**现在仍在 seen_ids 名单里**的岗 ─────────────────
-- seen_ids = 09 本轮真实见到、且**不在判死名单里**的全部 posting id(判死的已被 09 剔除,不必再 NOT IN)。
-- 名单在 data/mart/seen_ids.json(每轮 09 产出,约 49k 条),先灌进临时表再对账。
-- 灌法(二选一,都在**你的**会话里跑,ON COMMIT DROP 不留痕):
--   psql:  CREATE TEMP TABLE seen_ext_audit (external_id text PRIMARY KEY);
--          \copy seen_ext_audit FROM PROGRAM 'python -c "import json;print(*json.load(open(''data/mart/seen_ids.json'')),sep=chr(10))"'
--   node:  const ids = JSON.parse(fs.readFileSync('data/mart/seen_ids.json','utf8'))
--          await c.query('CREATE TEMP TABLE seen_ext_audit (external_id text PRIMARY KEY)')
--          await c.query('INSERT INTO seen_ext_audit SELECT unnest($1::text[])', [ids])
--
-- 2a 只读:清点 + 抽验清单(先人工点几条 apply_url 确认还在招,再决定跑不跑 2b)
SELECT j.external_id, j.title, j.city, j.province, j.date_posted, j.closed_at, j.apply_url
FROM jobs j JOIN seen_ext_audit s ON s.external_id = j.external_id
WHERE j.status = 'closed' AND j.closed_at > now() - interval '30 days'   -- N 天,按需调
ORDER BY j.closed_at DESC;
-- 2026-08-04 本地快照实测:命中 1,129 行(近 7 天 985 / 8-30 天 144;更早的 0 行)。

-- 2b 恢复(**写库,Frank 亲手跑**;务必先按上面的顺序把 verify_expired 排水跑完):
-- UPDATE jobs SET status='open', closed_at=NULL, updated_at=now()
-- FROM seen_ext_audit s
-- WHERE s.external_id = jobs.external_id AND jobs.status='closed'
--   AND jobs.closed_at > now() - interval '30 days';
-- 回滚:被恢复的岗若其实已死,下一轮验尸会把它写进 expired_ids.json → seed 的 closed_jobs 立即再关,
--       无需手工回滚;真要立刻退回,把上面 WHERE 里的 id 集合记下来批量置回 closed 即可。
-- 复查:恢复后跑一次 Q2/2a,应返回 0 行(它们已 open);再跑一次全量 09 + seed,`closed` 计数应贴近 0。
