-- E13-02 · 规则引擎第二刀(ON / OINP)——给 pnp_requirements 补两列「NOC 适用范围」
-- 惯例见 db-push-minefield:dev 默认不推 schema,加列一律手写 SQL。纯 ADD,BC 那 20 行全为空。
--
-- 为什么需要这两列:ON 的语言门槛按**职业是不是官方列的技工**分档 ——
--   TEER 0-3 非技工 CLB 6;TEER 0-3 技工 CLB 5(NOC 大组 72/73/82/83/93/6320/62200,
--   其中排除 Sub-Major Group 726 与 932)。
-- 只有 applies_teer 表达不了这一档,少了它会把技工的门槛说高一档(用户照着它多考一次雅思)。
--
-- 存的是 **NOC 码前缀**(2-5 位),引擎按前缀匹配、更长的前缀优先;excludes_noc 命中则该行不适用。

ALTER TABLE pnp_requirements ADD COLUMN IF NOT EXISTS applies_noc  varchar;
ALTER TABLE pnp_requirements ADD COLUMN IF NOT EXISTS excludes_noc varchar;
