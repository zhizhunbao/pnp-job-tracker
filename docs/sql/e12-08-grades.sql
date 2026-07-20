-- E12-08 多维评分档位(2026-07-20,1-5 档制拍板):jobs 通道档+职位三维明细,companies 担保档+四维明细。
-- additive 幂等;生产已代跑(run_ddl 惯例)。Payload collections 对应字段同批加(gradeChannel/scoreDetail 等)。
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS grade_channel smallint;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_detail jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sponsor_grade smallint;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS score_detail jsonb
