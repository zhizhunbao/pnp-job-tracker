-- G5 补漏 · pnp_ops_stats 加 stream_key(跨指标 join 键)  2026-08-04
-- 只加一列,additive,不动任何既有列/数据。**先跑本文件,再灌 seed**(顺序见文末清单)。
--
-- 为什么要这一列(病根,别当锦上添花):
--   AAIP 官网两张表对**同一条通道**措辞不一致 —— streams[] 写
--     「Accelerated Tech Pathway (eligible list of occupations includes jobs that support data centre needs…)」,
--     eoiPool[] 只写「Accelerated Tech Pathway」;「Dedicated Health Care Pathways (Express Entry and Non-Express Entry)」
--     与「Priority sector draws and other initiatives (construction, manufacturing…)」同理。
--   编排层要把一条通道的「配额 allocation + 池内人数 eoi_pool + 积压游标 assessing_up_to」拼成全貌,
--   拿 scope 字符串等值 join 就**静默漏配**(join 不上 = 当这项没有,报告少说话还不报错)。
--   金标那条 Alberta Opportunity Stream 恰好三处同名,所以旧测试测不出来。
--   实测:AB 8 条通道里只有 4 条能拼齐六项,修后 7 条(Entrepreneur Streams 官方本就没有 EOI 池行,天然缺项)。
--
-- 归一在 **ETL(mart)侧**算,不在消费端(CLAUDE.md 铁律:清洗下沉,脏活在脚本里干完):
--   etl/09_build_mart.py 的 stream_key() —— 去括号补充说明 → 小写 → 压空白 → 去首尾标点,
--   规则而非手工映射表(官网改个字映射表就失效);另带撞车检测(同一 metric 内两个不同 scope 压出同一键会报警)。
-- scope 原样保留官方措辞(报告要引用);stream_key **只做键,不展示给用户**。
-- 只有 scope_kind='stream' 的行非空;sector / category / scoreRange / 省级行一律空串。

ALTER TABLE pnp_ops_stats ADD COLUMN IF NOT EXISTS stream_key varchar;

-- 按 (province, stream_key) 拼装是编排层的主查询路径
CREATE INDEX IF NOT EXISTS pnp_ops_stats_stream_key_idx ON pnp_ops_stats (province, stream_key);

-- ⚠️ 跑完本文件后顺手做这一步(本项目栽过两次的坑,这次虽不致命也照做):
--   DELETE FROM seed_state WHERE name = 'pnp_ops_stats';
--   seed 的跳过判据是 **mart 文件裸字节哈希**。本次 mart 多了 streamKey 字段 → 哈希本来就变了、不会被跳;
--   但凡「只改列白名单、mart 内容一字未动」的改动,哈希一致 = 整表静默跳过、新列永远 NULL。养成习惯别赌。
-- 顺序:① 跑本文件 → ② DELETE seed_state 那一行 → ③ 跑 seed(带 token)→ ④ 抽查下面这条应返回 7 行:
--   SELECT stream_key, count(*) FILTER (WHERE metric='allocation') a, count(*) FILTER (WHERE metric='eoi_pool') e
--     FROM pnp_ops_stats WHERE province='AB' AND scope_kind='stream' GROUP BY 1 HAVING count(*) FILTER (WHERE metric='eoi_pool') > 0;
