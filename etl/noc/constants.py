"""
noc 域常量 —— 域词汇表(NOC 2021 分类法 + 本站浏览分类桶 + 两个官方 CSV 步骤的路径与文案;
照 company/pnp 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

沿革:2026-08-31 Frank 拍板「noc 就叫 noc」—— 原根上 noc.py / noc_buckets.py 两库与
noc_facts/ 两个步骤文件并为本域(同名包遮蔽同名模块,库不并进来 import noc 当场断)。
两库文件头的决策记录逐字折进对应段与常量的 docstring,一条不删。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`。注释方言(2026-08-30):每个常量用赋值后的裸字符串
docstring,行内 # 退役。零字符串令:functions 里除空串/数值外一切字面量住这;
文案模板一律 *_TPL,JSON/wire 键一律 K_ 词族(employers 先例)。
"""
import re

import paths

# =========================================================================
# 1. 分类库(NOC → TEER/大类/中类/小类;原 etl/noc.py,2026-08-31 并入)
# =========================================================================

UNCLASSIFIED = "未分类"
"""所有查不到/非法 NOC 的统一说法 —— 不硬塞、不拿官方组名顶(2026-08-03 换血拍板:
中/小分类不再手搓;原 60 行 NOC_INFO + 19 条前缀规则覆盖不到就拿大类名顶,491 个职业里
381 个「小类 == 中类」等于没有小类,`^2 → IT` 把 22 开头各行业技术员全塞进 IT,Frank 实见)。"""

TEER_TPL = "TEER {t}"
"""TEER 档位的显示文案(classify 的 teerLabel 格)。"""

OFFICIAL_BROAD = {
    "0": "管理", "1": "商务", "2": "科技", "3": "医疗", "4": "教育",
    "5": "文体", "6": "服务", "7": "技工", "8": "资源", "9": "制造",
}
"""官方大分类(NOC 第 1 位)——**不再直接当浏览分类**(2026-08-03 拍板走本站分类树,
理由见第 2 段段头:官方是统计口径,把 IT/工程/生物/园艺编在同一组)。
留着它只为体检脚本并排打印「本站分类 vs 官方组」。
(原 noc.py 还挂了 `BROAD = OFFICIAL_BROAD` 旧名兼容 —— 2026-08-31 并域时全仓 grep
零消费者,按方言律⑨「零消费者退役」摘除,记录在此。)"""

STRUCT_ENV = "NOC_STRUCTURE"
"""官方层级表路径的环境变量覆盖口(测试/容器改道用;不设则读 OUT_STRUCT)。"""

K_LEVELS = "levels"
"""structure.json 顶层键:层级表本体。"""

K_FETCHED = "fetched"
"""产出 JSON 的抓取日期键(= 真正被取回那天)。"""

K_SOURCE = "source"
"""产出 JSON 的来源键。"""

K_LEVEL = "level"
"""层级表条目键:层级(1=大类 3=中类 4=小类)。"""

K_EN = "en"
"""层级表条目键:官方英文全名(引用依据,永不改)。"""

K_EN_SHORT = "enShort"
"""层级表条目键:确定性剥前缀后的英文短名。"""

K_ZH = "zh"
"""层级表条目键:中文官方名译文;也是 classify/mid_of 的语言码。"""

K_KO = "ko"
"""层级表条目键:韩文官方名译文;也是语言码。"""

K_ZH_UI = "zhUi"
"""层级表条目键:中文人话名(界面主文案;官方名退灰字小注)。"""

K_KO_UI = "koUi"
"""层级表条目键:韩文人话名。"""

K_EN_UI = "enUi"
"""层级表条目键:英文人话名(= 英文短名,不过模型)。"""

UI_KEY_BY_LANG = {"zh": K_ZH_UI, "ko": K_KO_UI}
"""语言码 → 人话名键(小类显示用;缺席语言走 UI_KEY_DEFAULT)。"""

UI_KEY_DEFAULT = K_EN_UI
"""人话名键的默认档(zh/ko 之外一律英文人话名)。"""

K_TEER = "teer"
"""classify 产出键:TEER 档(int | None)。"""

K_TEER_LABEL = "teerLabel"
"""classify 产出键:TEER 显示文案。"""

K_BROAD = "broad"
"""classify 产出键:本站大类(中文,库里存的键)。"""

K_BROAD_EN = "broadEn"
"""classify 产出键:大类英文名。"""

K_BROAD_KO = "broadKo"
"""classify 产出键:大类韩文名。"""

K_MID = "mid"
"""classify 产出键:本站中类(人话桶)。"""

K_MID_EN = "midEn"
"""classify 产出键:中类英文名。"""

K_MID_KO = "midKo"
"""classify 产出键:中类韩文名。"""

K_FINE = "fine"
"""classify 产出键:小类(官方 Minor 人话名;被 BUCKETS5 挪过窝的退回中类)。"""

K_FINE_EN = "fineEn"
"""classify 产出键:小类英文名。"""

K_FINE_KO = "fineKo"
"""classify 产出键:小类韩文名。"""

# =========================================================================
# 2. 浏览分类桶(本站分类树:官方码 → (大类, 中类);原 etl/noc_buckets.py,2026-08-31 并入)
# =========================================================================

BROADS = [
    "管理层", "商务", "行政", "文员", "金融", "会计", "法律",
    "IT", "工程", "科学", "医疗", "教育", "社会服务", "艺术", "体育",
    "销售", "零售", "餐饮", "住宿", "生活服务",
    "技工", "建筑", "运输", "物流", "农业", "矿业", "制造",
]
"""本站大类(27 个)—— 值即库里存的键(jobs.broad / URL ?broad=),显示名走 i18n 的
broad.*。顺序 = 前端下拉的展示顺序:办公室 → 专业 → 服务 → 蓝领 → 一产/二产。

本段总纲(原 noc_buckets.py 文件头,2026-08-31 并域逐字折此)——
为什么不直接用官方层级(2026-08-03 Frank 拍板走这条):
NOC 是按「技能类型 + 教育层级」编的**统计口径**,不是按行业编的浏览树 ——
第 2 组把生物、地质、景观园艺技术员和 IT、工程全塞进「自然与应用科学」;
第 4 组把教师、律师、社工、家庭护理员塞进同一栏。拿它当浏览分类,名字怎么起都别扭
(Frank 实机:「科技」里蹲着景观园艺技师、家电维修技师;「你现在这个大类中类小类让人看不懂」)。
所以:**浏览分类本站自己定,每个节点映射到官方码留痕**。官方层级仍在 structure.json
(出处/小注/可核),体检脚本(audit_noc_classes)并排打印「本站分类 vs 官方组名」。
**大类名一个概念一个词,不许组合**(2026-08-02 Frank 实机拍板:「技工就叫技工,不要叫
技工与建筑」「艺术就叫艺术,体育就叫体育」)。原 17 个大类里 10 个「A与B」组合名全拆:
技工/建筑、餐饮/住宿、销售/零售、运输/物流、农业/矿业、教育/社会服务、艺术/体育、
金融/会计、行政/文员;同义堆叠砍短(制造与生产→制造、科学与环境→科学)。
判据:**求职者会去哪个分类里找这份工作**。各行业中层管理留在本行业(零售经理→零售、
技工主管→技工),只有 000(立法与高级管理)独立成「管理层」。
查表顺序:5 位 → 4 位 → 3 位。一个职业必须被覆盖(体检脚本硬检查,没有兜底)。"""

BUCKETS3: dict[str, tuple[str, str]] = {
    "000": ("管理层", "高级管理"),
    "100": ("商务", "商务管理"), "200": ("工程", "科技管理"), "300": ("医疗", "医疗管理"),
    "400": ("社会服务", "公共管理"), "500": ("艺术", "艺术管理"),
    "600": ("零售", "零售管理"), "700": ("建筑", "建筑管理"),
    "800": ("矿业", "矿业管理"), "900": ("制造", "生产管理"),
    "111": ("金融", "金融"), "112": ("商务", "商务与人力"),
    "120": ("行政", "行政主管"), "121": ("行政", "专业行政"),
    "122": ("会计", "会计与保险"), "131": ("行政", "行政"),
    "132": ("物流", "物流协调"), "141": ("文员", "办公支持"),
    "142": ("金融", "金融支持"), "143": ("文员", "办公支持"),
    "144": ("物流", "供应链协调"),
    "211": ("科学", "科研"), "212": ("IT", "IT"), "213": ("工程", "工程"),
    "221": ("科学", "实验与检测"), "222": ("IT", "IT 支持"), "223": ("工程", "工程技术员"),
    "311": ("医疗", "医疗专业"), "312": ("医疗", "康复治疗"), "313": ("医疗", "护理"),
    "321": ("医疗", "医疗技术"), "322": ("医疗", "自然疗法"), "331": ("医疗", "医疗辅助"),
    "411": ("法律", "法律"), "412": ("教育", "教育"),
    "413": ("社会服务", "社会服务"), "414": ("社会服务", "公共服务"),
    "421": ("生活服务", "公共安全"), "422": ("社会服务", "社会服务辅助"),
    "431": ("教育", "教育辅助"), "432": ("生活服务", "公共安全辅助"),
    "441": ("医疗", "照护"),
    "442": ("生活服务", "公共安全"), "451": ("教育", "校园辅助"),
    "511": ("艺术", "文化艺术"), "521": ("艺术", "文艺技术"),
    "531": ("艺术", "文化艺术"), "532": ("体育", "体育"),
    "541": ("体育", "体育辅助"), "551": ("艺术", "文艺辅助"),
    "620": ("零售", "零售主管"), "621": ("销售", "专业销售"),
    "622": ("生活服务", "专业服务"), "631": ("销售", "销售"),
    "632": ("餐饮", "厨房"), "641": ("零售", "零售"),
    "642": ("生活服务", "个人服务"), "643": ("餐饮", "餐饮服务"),
    "644": ("生活服务", "客服与安保"), "651": ("零售", "销售支持"),
    "652": ("餐饮", "餐饮支持"), "653": ("生活服务", "清洁"),
    "720": ("技工", "技工主管"), "721": ("技工", "工业技工"),
    "722": ("技工", "电气技工"), "723": ("建筑", "建筑技工"),
    "724": ("技工", "维修技工"), "725": ("技工", "设备操作"),
    "726": ("运输", "运输调度"), "729": ("技工", "其他技工"),
    "731": ("建筑", "建筑工种"), "732": ("技工", "楼宇维修"),
    "733": ("运输", "运输"), "734": ("矿业", "钻探爆破"),
    "741": ("运输", "邮递"), "742": ("运输", "运输设备操作"),
    "751": ("建筑", "建筑小工"), "752": ("运输", "货运司机"),
    "820": ("矿业", "矿业主管"), "831": ("矿业", "采掘作业"),
    "841": ("矿业", "矿业服务"), "851": ("农业", "农林劳工"),
    "920": ("制造", "生产主管"), "921": ("制造", "公用事业操作"),
    "931": ("制造", "过程控制"), "932": ("制造", "航空装配"),
    "941": ("制造", "机器操作"), "942": ("制造", "装配与检验"),
    "951": ("制造", "生产劳工"),
}
"""官方 3 位(Sub-major)→ (大类, 中类)。原表行间注释逐字折此(2026-08-31 并域):
0 立法与高级管理 —— 000 是唯一独立成「管理层」的;其余各行业中层管理见各自大类。
1 商务 / 行政 / 文员 / 金融 / 会计。2 科学 / IT / 工程(细分见 BUCKETS4/5:官方把它们
混在一起,这里拆开)。3 医疗。4 法律 / 教育 / 社会服务 / 公共安全;441 家庭护理员:
求职者在「医疗」里找,不在「教育」里找。5 艺术 / 体育。6 销售 / 零售 / 餐饮 / 住宿 /
生活服务。7 技工 / 建筑 / 运输。8 农业 / 矿业(官方把农林渔和矿油气编在一起,
这里全按 4 位拆)。9 制造。"""

BUCKETS4: dict[str, tuple[str, str]] = {
    "1001": ("行政", "行政管理"), "1002": ("金融", "金融管理"), "1003": ("商务", "商务管理"),
    "1411": ("文员", "数据录入"),
    "2120": ("工程", "建筑与规划"),
    "2121": ("IT", "数据分析"),
    "2122": ("IT", "IT"), "2123": ("IT", "IT"),
    "2221": ("工程", "建筑与制图"),
    "2222": ("IT", "IT 支持"),
    "2223": ("工程", "检验与安全"),
    "4002": ("教育", "教育管理"), "4004": ("生活服务", "公共安全管理"),
    "6001": ("销售", "销售管理"), "6004": ("生活服务", "服务管理"),
    "6320": ("餐饮", "厨房"),
    "6321": ("生活服务", "美发美容"),
    "6322": ("生活服务", "修补与手作"),
    "6430": ("餐饮", "餐饮服务"), "6431": ("住宿", "住宿服务"), "6432": ("住宿", "旅游服务"),
    "6520": ("餐饮", "餐饮支持"),
    "6521": ("住宿", "旅宿支持"),
    "6522": ("生活服务", "宠物与动物照护"),
    "6531": ("生活服务", "清洁"), "6532": ("生活服务", "洗涤与其他"),
    "7002": ("运输", "运输管理"),
    "8002": ("农业", "农业管理"),
    "8201": ("农业", "林业主管"), "8203": ("农业", "农业主管"),
    "8311": ("农业", "林业作业"), "8312": ("农业", "渔业"),
    "8411": ("农业", "林业工人"), "8412": ("农业", "农渔工人"),
    "8511": ("矿业", "矿业劳工"),
}
"""官方 4 位(Minor)覆盖 —— 官方把两类完全不同的活编在同一个 3 位里的地方。
原表行间注释逐字折此(2026-08-31 并域):100 专业中层管理:行政/金融/传播三摊子编在
一起。2120 建筑师、城市规划、测绘师;2121 数学、统计、精算、数据科学;2221 建筑技术、
制图、测绘、地理信息。400 公共/教育/社区/公安经理编在一组 —— 按 4 位拆开。600 零售
批发/企业销售/餐饮住宿/客户服务经理编在一组(餐饮住宿见 BUCKETS5)。官方 632
「服务类职业」把厨师和理发师编在一组、652 把餐饮服务和宠物美容编在一组 —— 按 4 位
拆开:6320 厨师、面包师、屠夫;6321 发型师、理发师、美容师;6322 修鞋、家具软垫。
643/652 把餐饮、住宿、旅游编在一起 —— 按 4 位拆到餐饮/住宿:6520 餐饮服务员、肉品
切割;6521 住宿、旅行、旅游、娱乐场馆支持。7002 运输与邮政经理(与建筑设施经理
同组)。8 官方把农林渔和矿油气从经理到劳工一路混编 —— 逐个 4 位拆:8002 农业、园艺、
水产经理;8511 矿与油气钻井劳工(与农业收获劳工同组)。"""

BUCKETS5: dict[str, tuple[str, str]] = {
    "21111": ("农业", "农林专业"),
    "21112": ("农业", "农林专业"),
    "22111": ("农业", "农渔检验"),
    "22112": ("农业", "农林技术"),
    "22113": ("农业", "保育与渔业"),
    "22114": ("农业", "园艺与景观"),
    "75101": ("物流", "仓储搬运"),
    "73400": ("建筑", "重型设备"),
    "73401": ("制造", "机器操作"),
    "10010": ("金融", "金融管理"),
    "10011": ("商务", "商务管理"),
    "10012": ("物流", "采购"),
    "10022": ("商务", "市场管理"),
    "10029": ("商务", "商务管理"),
    "12013": ("物流", "物流主管"),
    "12102": ("物流", "采购"),
    "42200": ("法律", "法律辅助"), "42202": ("教育", "幼教"), "42203": ("教育", "特教"),
    "50012": ("体育", "体育管理"),
    "60030": ("餐饮", "餐饮管理"),
    "60031": ("住宿", "住宿管理"),
    "62020": ("餐饮", "餐饮主管"),
    "62021": ("住宿", "住宿服务"),
    "62022": ("住宿", "旅宿服务"),
    "62024": ("生活服务", "清洁主管"),
    "62200": ("餐饮", "厨房"),
    "65101": ("生活服务", "加油与便利"),
    "74203": ("技工", "维修技工"),
    "22311": ("技工", "维修技工"),
}
"""官方 5 位(Unit)覆盖 —— 单个职业与它所在小组不是一个行业的。
原表行间注释逐字折此(2026-08-31 并域):21111 林业专业人员;21112 农业代表顾问;
22111 农牧渔产品检验员;22112 林业技术员;22114 园艺与景观 ← Frank 实机点名那条;
75101 物料搬运工(与建筑小工同组)。734「操作员、钻工与爆破工」把工地重型设备、
印刷机、矿山爆破编在一组 —— 逐个 5 位拆:73400 挖掘机/推土机操作员,干的是工地活;
73401 印刷机操作员。100 里官方按「行政服务/金融商务」分组,但组里塞的是另一摊 ——
逐个 5 位归位:10010 财务经理(官方编在「行政服务经理」);10011 人力资源经理;
10012 采购经理;10022 广告、营销与公关经理(官方编在「金融商务经理」);10029 其他
商业服务经理;12013 供应链跟踪调度主管(官方与行政财务主管同组);12102 采购代理和
官员。422 准专业:律师助理/社工/幼教/特教编在一个 4 位里 —— 逐个 5 位拆。50012
娱乐体育健身项目主管(与图书馆/演艺经理同组)。体检脚本③ 第二轮红出来的:官方按
「主管/经理」编在零售或专业服务下,但求职者按行业找:60030 餐饮经理 —— 官方编在
「零售批发中层管理」;60031 住宿服务经理;62020 餐饮服务主管;62021 行政管家;
62024 清洁主管 —— 官方与零售主管同组;62200 主厨 —— 官方编在「专业服务」;65101
加油站服务员;74203 汽车/卡车零部件安装维修 —— 官方编在运输组;22311 家电与商用
设备维修 —— 官方编在「工程技术」,但它是修东西的活。"""

SLUGS: dict[str, str] = {
    "管理层": "management", "商务": "business", "行政": "administration", "文员": "office",
    "金融": "finance", "会计": "accounting", "法律": "legal", "IT": "it", "工程": "engineering",
    "科学": "science", "医疗": "healthcare", "教育": "education", "社会服务": "social-services",
    "艺术": "arts", "体育": "sport", "销售": "sales", "零售": "retail", "餐饮": "food-service",
    "住宿": "hospitality", "生活服务": "personal-services", "技工": "trades", "建筑": "construction",
    "运输": "transport", "物流": "logistics", "农业": "agriculture", "矿业": "mining", "制造": "manufacturing",
}
"""大类 → URL slug(/stats/<省>/<slug>、/rankings/daily-top-<slug>)。
前端镜像在 cms/src/app/(frontend)/stats/shared.ts 的 BROAD_SLUGS,勿单改一边。"""

I18N: dict[str, tuple[str, str]] = {
    "管理层": ("Management", "관리직"), "商务": ("Business", "비즈니스"),
    "行政": ("Administration", "행정"), "文员": ("Office clerks", "사무직"),
    "金融": ("Finance", "금융"), "会计": ("Accounting", "회계"),
    "法律": ("Legal", "법률"), "IT": ("IT", "IT"), "工程": ("Engineering", "엔지니어링"),
    "科学": ("Science", "과학"), "医疗": ("Healthcare", "의료"),
    "教育": ("Education", "교육"), "社会服务": ("Social services", "사회서비스"),
    "艺术": ("Arts", "예술"), "体育": ("Sport", "스포츠"),
    "销售": ("Sales", "영업"), "零售": ("Retail", "리테일"),
    "餐饮": ("Food service", "요식업"), "住宿": ("Hospitality", "숙박"),
    "生活服务": ("Personal services", "생활 서비스"),
    "技工": ("Trades", "기능직"), "建筑": ("Construction", "건설"),
    "运输": ("Transport", "운송"), "物流": ("Logistics", "물류"),
    "农业": ("Agriculture", "농업"), "矿业": ("Mining", "광업"),
    "制造": ("Manufacturing", "제조"),
    "高级管理": ("Senior management", "고위 경영"), "商务管理": ("Business managers", "비즈니스 관리"),
    "行政管理": ("Admin services managers", "행정 관리"), "金融管理": ("Finance managers", "금융 관리"),
    "科技管理": ("Tech managers", "기술 관리"), "医疗管理": ("Health managers", "의료 관리"),
    "公共管理": ("Public administration", "공공 행정"), "教育管理": ("Education managers", "교육 관리"),
    "艺术管理": ("Arts managers", "예술 관리"), "体育管理": ("Sport managers", "스포츠 관리"),
    "零售管理": ("Retail managers", "리테일 관리"), "销售管理": ("Sales managers", "영업 관리"),
    "服务管理": ("Service managers", "서비스 관리"),
    "公共安全管理": ("Public safety managers", "공공 안전 관리"),
    "建筑管理": ("Construction managers", "건설 관리"), "运输管理": ("Transport managers", "운송 관리"),
    "矿业管理": ("Mining managers", "광업 관리"), "农业管理": ("Agriculture managers", "농업 관리"),
    "生产管理": ("Production managers", "생산 관리"), "生产主管": ("Production supervisors", "생산 감독"),
    "技工主管": ("Trades supervisors", "기능직 감독"),
    "矿业主管": ("Mining supervisors", "광업 감독"), "林业主管": ("Forestry supervisors", "임업 감독"),
    "农业主管": ("Agriculture supervisors", "농업 감독"),
    "金融": ("Finance", "금융"), "商务与人力": ("Business & HR", "비즈니스·인사"),
    "行政主管": ("Admin supervisors", "행정 감독"), "专业行政": ("Specialized admin", "전문 행정"),
    "会计与保险": ("Accounting & insurance", "회계·보험"), "行政": ("Administration", "행정"),
    "市场管理": ("Marketing managers", "마케팅 관리"), "物流主管": ("Logistics supervisors", "물류 감독"),
    "采购": ("Purchasing", "구매"),
    "物流协调": ("Logistics coordination", "물류 조정"), "办公支持": ("Office support", "사무 지원"),
    "金融支持": ("Finance support", "금융 지원"), "供应链协调": ("Supply chain", "공급망"),
    "数据录入": ("Data entry", "데이터 입력"),
    "科研": ("Research", "연구"), "实验与检测": ("Lab & testing", "실험·검사"),
    "IT 支持": ("IT support", "IT 지원"), "数据分析": ("Data & analytics", "데이터 분석"),
    "工程技术员": ("Engineering technologists", "엔지니어링 기술직"),
    "建筑与规划": ("Architecture & planning", "건축·도시계획"), "建筑与制图": ("Drafting & survey", "제도·측량"),
    "检验与安全": ("Inspection & safety", "검사·안전"),
    "医疗专业": ("Health professionals", "의료 전문직"), "康复治疗": ("Therapy & rehab", "재활 치료"),
    "护理": ("Nursing", "간호"), "医疗技术": ("Medical technology", "의료 기술"),
    "自然疗法": ("Natural healing", "자연 요법"), "医疗辅助": ("Health assistants", "의료 보조"),
    "照护": ("Home care", "홈케어"),
    "法律": ("Legal", "법률"), "法律辅助": ("Paralegals", "법률 보조"),
    "教育": ("Education", "교육"), "社会服务": ("Social services", "사회 서비스"),
    "社会服务辅助": ("Social service support", "사회서비스 보조"),
    "幼教": ("Early childhood education", "보육 교사"), "特教": ("Special needs instruction", "특수 교육"),
    "公共服务": ("Government services", "공공 서비스"), "公共安全": ("Public safety", "공공 안전"),
    "公共安全辅助": ("Public safety support", "공공 안전 보조"),
    "教育辅助": ("Education assistants", "교육 보조"), "校园辅助": ("School support", "학교 지원"),
    "文化艺术": ("Arts & culture", "예술·문화"), "文艺技术": ("Arts technical", "예술 기술직"),
    "体育": ("Sport", "스포츠"), "体育辅助": ("Sport support", "스포츠 지원"),
    "文艺辅助": ("Arts support", "예술 지원"),
    "零售主管": ("Retail supervisors", "리테일 감독"), "专业销售": ("Specialized sales", "전문 영업"),
    "销售": ("Sales", "영업"), "零售": ("Retail", "리테일"), "销售支持": ("Sales support", "영업 지원"),
    "厨房": ("Kitchen", "주방"), "餐饮服务": ("Food & beverage service", "식음료 서비스"),
    "餐饮支持": ("Food service support", "요식 지원"), "餐饮管理": ("Restaurant managers", "요식 관리"),
    "餐饮主管": ("Food service supervisors", "요식 감독"), "住宿管理": ("Accommodation managers", "숙박 관리"),
    "住宿服务": ("Housekeeping", "하우스키핑"), "旅宿服务": ("Travel & tourism", "여행·관광"),
    "旅游服务": ("Tourism services", "관광 서비스"), "旅宿支持": ("Hospitality support", "숙박 지원"),
    "专业服务": ("Specialized services", "전문 서비스"), "个人服务": ("Personal care services", "퍼스널 서비스"),
    "客服与安保": ("Customer service & security", "고객 서비스·경비"), "清洁": ("Cleaning", "청소"),
    "清洁主管": ("Cleaning supervisors", "청소 감독"), "宠物与动物照护": ("Pet & animal care", "반려동물 케어"),
    "加油与便利": ("Service stations", "주유·편의"), "美发美容": ("Hair & beauty", "미용"),
    "修补与手作": ("Repair & craft", "수선·수공"), "洗涤与其他": ("Laundry & other", "세탁·기타"),
    "工业技工": ("Industrial trades", "산업 기능직"), "电气技工": ("Electrical trades", "전기 기능직"),
    "建筑技工": ("Construction trades", "건설 기능직"), "维修技工": ("Maintenance trades", "정비 기능직"),
    "设备操作": ("Equipment operators", "장비 조작"), "其他技工": ("Other trades", "기타 기능직"),
    "建筑工种": ("General construction", "일반 건설"), "楼宇维修": ("Building maintenance", "건물 유지보수"),
    "建筑小工": ("Construction helpers", "건설 보조"), "重型设备": ("Heavy equipment operators", "중장비 조작"),
    "运输": ("Transport", "운송"), "运输调度": ("Transport control", "운송 관제"),
    "运输设备操作": ("Transport equipment", "운송 장비"), "货运司机": ("Truck drivers", "화물 운전"),
    "仓储搬运": ("Warehousing", "창고·하역"), "邮递": ("Mail & courier", "우편·배송"),
    "采掘作业": ("Extraction work", "채굴 작업"), "矿业服务": ("Mining services", "광업 서비스"),
    "矿业劳工": ("Mining labour", "광업 노무"), "钻探爆破": ("Drilling & blasting", "시추·발파"),
    "林业作业": ("Logging operations", "벌목 작업"), "渔业": ("Fishing", "수산업"),
    "林业工人": ("Forestry workers", "임업 노무"), "农渔工人": ("Farm & fishing workers", "농수산 노무"),
    "农林劳工": ("Farm & forestry labour", "농림 노무"), "农林专业": ("Agriculture & forestry", "농림 전문"),
    "农林技术": ("Agri-forestry technicians", "농림 기술"), "农渔检验": ("Food & fish inspection", "농수산 검사"),
    "保育与渔业": ("Conservation & fishery", "자연보호·수산"), "园艺与景观": ("Horticulture & landscaping", "원예·조경"),
    "公用事业操作": ("Utilities operators", "공공설비 조작"), "过程控制": ("Process control", "공정 제어"),
    "航空装配": ("Aircraft assembly", "항공기 조립"), "机器操作": ("Machine operators", "기계 조작"),
    "装配与检验": ("Assembly & inspection", "조립·검사"), "生产劳工": ("Production labour", "생산 노무"),
}
"""分类名的英/韩(**手写**,不让模型再造官方腔)。key = 中文名(大类与中类同表)。
缺的会被体检脚本报出来;前端缺就退中文,不瞎编。
⚠ 本表有 9 个重复键(金融/行政/法律/教育/社会服务/体育/销售/零售/运输 —— 大类段与
中类段各写一遍,python 语义=后键赢,前键是死行;哪个该赢是**分类口径判定**,台账待
Frank 拍,拍完删 pyproject 里本文件的 F601 豁免;2026-08-29 批3 盘出,2026-08-31 并域
原样搬运不裁决)。"""

# =========================================================================
# 3. structure 步(官方层级 + 三语人话名;原 noc_facts/build_statcan_noc_structure.py)
# =========================================================================

STRUCTURE_URL = "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv"
"""官方层级 CSV(StatCan 开放政府许可,与 build_wages 同门户,httpx 直取)。"""

IN_STRUCT_CSV = paths.NOC / "noc-structure.csv"
"""下载缓存(可重下)。"""

OUT_STRUCT = paths.NOC / "structure.json"
"""维护表(本域分类库 / 09 消费):{ levels: {code: {level, en, enShort, zh, ko, *Ui}}, fetched }。"""

STRUCT_CACHE_MIN_BYTES = 10_000
"""缓存判有效的最小字节数(半截下载不算缓存)。"""

STRUCT_TIMEOUT_S = 60
"""层级 CSV 下载超时。"""

ENC_UTF8 = "utf-8"
"""JSON 读写统一编码。"""

ENC_UTF8_SIG = "utf-8-sig"
"""StatCan CSV 带 BOM,按 utf-8-sig 解码。"""

OLLAMA_ENV = "OLLAMA_URL"
"""本地翻译模型地址的环境变量(批量翻译走本地 Ollama 不烧付费 API,宪法既有)。"""

OLLAMA_DEFAULT = "http://192.168.1.150:11434"
"""Ollama 默认地址(盒子,memory: llm-box-access)。"""

MODEL_ENV = "OLLAMA_MODEL"
"""翻译模型名的环境变量。"""

MODEL_DEFAULT = "qwen3.6:latest"
"""默认翻译模型。"""

GEN_URL_TPL = "{base}/api/generate"
"""Ollama 生成端点。"""

TRANSLATE_TIMEOUT_S = 120
"""单条翻译超时。"""

K_RESPONSE = "response"
"""Ollama 返回体里的产出格键。"""

PREFIXES = ["Occupations in ", "Occupations "]
"""只剥**纯套话**前缀。⚠️ 2026-08-03 第一版剥过头了:「Professional occupations in
natural sciences」(211)与「Technical occupations **related to** natural sciences」(221)
双双变成「Natural sciences」—— 那两个词恰恰是这两层的区别(专业 vs 技术),剥掉就是把
两个类别合并成同一个名字。教训与 04g 短名那次一样:**压缩是有损的,损掉的往往正是
区分点**。所以现在只剥「Occupations in」这种一点信息都不带的开头,其余照官方原样
(名字长由控件让,不由名字缩)。"""

PROMPT_TPL = """把下面这个加拿大官方职业分类(NOC 2021)的**类别名**翻译成{lang}。

规则:
- 只输出译名本身,不要解释、不要引号、不要标点结尾。
- 这是**一类职业的名字**(不是某个具体岗位),用求职者看得懂的说法。
- 求准不求文采;**尽量简洁**(中文不超过 16 个字),但不许丢掉限定词。
- **并列项之间要有分隔**:中文用顿号「、」,韩文用「,」—— 不许把几个词粘成一串。
- except X / other than X 译成括号补语:「(不含 X)」。
- 术语注意:trades 指「工种/技工」不是贸易;utilities 指「公用事业」;
  natural sciences=自然科学、applied sciences=应用科学、engineering=工程。

类别名:{title}"""
"""官方名直译提示词(给模型看的归 constants 不进 i18n;逐条校验,不过关留空)。"""

UI_PROMPT_TPL = """下面是加拿大官方职业分类里的一类职业(官方名写得很学术)。
用**招聘网站的分类口吻**给这一类起个名字,翻译成{lang}。

规则:
- 只输出名字本身,不要解释、不要引号。
- **4-10 个字**(韩文相当长度),像招聘网站左侧的分类名。
- 不要「职业」「人员」「相关」「专业」这类套话,不要括号补语,不要「不含 X」。
- 用求职者会说的词:计算机相关就说 IT,护理就说 护理,餐饮就说 餐饮。
- 保留这一类真正的区分点(技术员 vs 专业人员、中层管理 vs 一线)。

官方名:{title}"""
"""人话名提示词(2026-08-03 Frank 实拍「你现在这个大类 中类 小类 让人看不懂」):
官方名是**统计年鉴的话**(「行政服务金融与商业服务及通信专业中层管理职业(不含广播)」),
拿它当界面文案 = 让求职者读普查表。官方名留作数据与灰字小注,显示层用这一版。"""

LANGS = {"zh": "简体中文", "ko": "한국어", "en": "English"}
"""提示词里的语言说法。"""

UI_FIX = {
    ("0", "zh"): "管理层", ("0", "en"): "Management", ("0", "ko"): "관리직",
    ("1", "zh"): "商务与行政", ("1", "en"): "Business & admin", ("1", "ko"): "비즈니스·행정",
    ("2", "zh"): "科技与工程", ("2", "en"): "Tech & engineering", ("2", "ko"): "기술·엔지니어링",
    ("3", "zh"): "医疗与健康", ("3", "en"): "Healthcare", ("3", "ko"): "의료·헬스케어",
    ("4", "zh"): "教育与社会服务", ("4", "en"): "Education & social", ("4", "ko"): "교육·사회서비스",
    ("5", "zh"): "文化艺术与体育", ("5", "en"): "Arts & sport", ("5", "ko"): "예술·스포츠",
    ("6", "zh"): "销售与服务", ("6", "en"): "Sales & service", ("6", "ko"): "영업·서비스",
    ("7", "zh"): "技工与运输", ("7", "en"): "Trades & transport", ("7", "ko"): "기능직·운송",
    ("8", "zh"): "农林渔与资源", ("8", "en"): "Resources & farming", ("8", "ko"): "자원·농업",
    ("9", "zh"): "制造与公用事业", ("9", "en"): "Manufacturing", ("9", "ko"): "제조·공공사업",
}
"""十个大类的人话名**手写**(它们是浏览入口,最该是人话;模型不必掺和)。
官方名照旧在 en/zh 里,界面把它当灰字小注 —— 人话名主文案 + 官方名小注(CLAUDE.md 展示约定)。"""

FIX = {
    ("100", "ko"): "행정, 금융, 비즈니스 서비스 및 통신 전문 중간관리직(방송 제외)",
    ("700", "zh"): "技工与运输中层管理职业",
}
"""人工裁决表(同 04g 的 SHORT_FIX):模型连着几轮都过不了校验的,手写进来 ——
写在脚本里而不是改产出文件,重跑才不会丢。留空也行(前端回退英文),
但这两条是中类,出现频率高。"""

CJK_RE = re.compile(r"[一-鿿]")
"""中文译文校验:必须含汉字。"""

HANGUL_RE = re.compile(r"[가-힯]")
"""韩文译文校验:必须含谚文。"""

LATIN_RE = re.compile(r"[A-Za-z]{4,}")
"""中文译文校验:不许混长段拉丁词。"""

QUOTE_STRIP = "\"“”「」"
"""译文首尾要剥的引号族。"""

NL = "\n"
"""换行符(取模型输出最后一行用)。"""

WANT_LEVELS = ("1", "3", "4")
"""要收的官方层级:大类(1)/ 中类(3)/ 小类(4);major(2) 与 unit(5) 本站不用。"""

COL_LEVEL = "Level"
"""CSV 列:层级。"""

COL_TITLE = "Class title"
"""CSV 列:官方类别名。"""

COL_CODE_PREFIX = "Code"
"""CSV 的码列列名前缀(带 BOM/版本尾巴,前缀匹配定位)。"""

FILL_KEYS = (K_ZH, K_KO, K_ZH_UI, K_KO_UI, K_EN_UI)
"""待翻判定要查齐的五格(有一格空即进 todo)。"""

ARG_LIMIT = "--limit"
"""手动开关:只翻前 N 条(调试)。"""

ARG_RETRANSLATE = "--retranslate"
"""手动开关:全部重翻(默认沿用旧译文增量补)。"""

ZH_MAX_LEN = 40
"""直译校验:超长判不过关(留空重来)。"""

UI_MAX_LEN = 16
"""人话名校验:超长判不过关。"""

UI_BANNED = ("职业", "人员", "(", "(")
"""人话名校验:套话/括号补语一律退回重来。"""

COLLISION_LANGS = ("enShort", "zh", "ko", "zhUi")
"""撞车检测要过的四个名字格。"""

COLLISION_SHOW_MAX = 12
"""撞车报告最多展开的组数。"""

TITLE_SHOW_LEN = 34
"""报行里官方名截断长度(只影响打印,不影响数据)。"""

IN_LINE_TPL = "IN : {url}"
"""输入报行(运行时打印路径,宪法既有)。"""

OUT_LINE_TPL = "OUT: {path}"
"""输出报行。"""

CACHE_HIT_TPL = "  用缓存 {name}"
"""缓存命中报行。"""

DOWNLOAD_TPL = "  下载 {url}"
"""下载报行。"""

LEVEL_COUNT_TPL = "  层级:大类 {broad} · 中类 {mid} · 小类 {fine}"
"""层级计数报行。"""

TODO_TPL = "  待翻 {n} 条(已翻的跳过;--retranslate 全部重来)"
"""待翻计数报行。"""

PROGRESS_TPL = "  [{i}/{n}] {code} {name:<36} 人话 zh={zh} ko={ko}"
"""逐条翻译进度报行。"""

EMPTY_MARK = "(空)"
"""进度报行里空译文的占位。"""

TRANSLATE_FAIL_TPL = "    ! {lang} {title}: {err}"
"""单条翻译失败报行(网络/模型抽风:这一条留空,下次续跑)。"""

COLLISION_WARN_TPL = "  ⚠ {lang} 撞车 {n} 组(**要人工裁决**,写进 FIX 表):"
"""撞车警告头行。**只报不改**,人工裁决(04g 短名教训:逐条翻的模型看不见别的条目,
两个类别翻成同一个名字它不会知道;分类名撞车 = 筛选下拉里出现两个一模一样的选项)。"""

COLLISION_ROW_TPL = "      「{name}」← {codes}"
"""撞车明细行。"""

COLLISION_CODE_TPL = "{code}={title}"
"""撞车明细里的单码说法。"""

COLLISION_SEP = " / "
"""撞车明细里多码的分隔。"""

COLLISION_OK_TPL = "  ✓ {lang} 无撞车(官方父子同名占位 {n} 组不算)"
"""无撞车报行(官方自己就有同名:某一层只有一个孩子时,官方把名字原样往下抄一层占位 ——
89 个中类里 48 个只有一个小类,其中 29 个父子同名,那是「这条分支到此为止」,不是撞车)。"""

STRUCT_DONE_TPL = "写出 {path}  共 {n} 条;留空 zh {zh} · ko {ko}"
"""收口报行(带产出行数,宪法既有)。"""

# =========================================================================
# 4. descriptions 步(官方职业名 + 主要职责;原 noc_facts/build_statcan_noc_descriptions.py)
# =========================================================================

DESC_URL = "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv"
"""官方 Elements CSV(开放政府许可,与 build_wages 同门户)。每个 5 位 NOC 取
Class title(官方名)+ Main duties(主要职责)+ Employment requirements(任职要求)。"""

IN_DESC_CSV = paths.NOC / "noc-elements.csv"
"""下载缓存(可重下)。"""

OUT_DESC = paths.NOC / "descriptions.json"
"""维护表(09 消费,做 noc_descriptions 维度 —— NOC/职位弹框显示官方名+职责)。"""

DESC_TIMEOUT_S = 120
"""Elements CSV 下载超时(~5MB)。"""

DESC_UA = {"User-Agent": "Mozilla/5.0"}
"""下载头(StatCan 静态资源,礼貌标识即可)。"""

ERRORS_REPLACE = "replace"
"""读 Elements CSV 的容错模式:坏字节替换不炸(原脚本既有)。"""

WANT_ELEMENTS = {"Main duties": "duties", "Employment requirements": "requirements"}
"""关注的 element 类型 → 输出键。"""

UNIT_LEVEL = "5"
"""只要 5 位单位组的行。"""

COL_CODE_DESC = "Code - NOC 2021 V1.0"
"""Elements CSV 的码列(此表列名固定,不必前缀匹配)。"""

COL_ETYPE = "Element Type Label English"
"""Elements CSV 列:元素类型。"""

COL_EDESC = "Element Description English"
"""Elements CSV 列:元素内容。"""

DUTIES_LEAD_SUFFIX = "following duties"
"""引导句判尾:「performs some or all of the following duties:」这类只留具体条目。"""

COLON = ":"
"""引导句判尾前要剥的行尾冒号。"""

DESC_SOURCE = "NOC 2021 V1.0 Elements (StatCan)"
"""产出 source 格的值。"""

K_BY_NOC = "byNoc"
"""产出顶层键:按 NOC 归组的条目表。"""

K_URL = "url"
"""产出顶层键:下载 URL(举证链)。"""

K_NOC = "noc"
"""条目键:5 位 NOC 码。"""

K_TITLE = "title"
"""条目键:官方职业名。"""

K_DUTIES = "duties"
"""条目键:主要职责清单。"""

K_REQUIREMENTS = "requirements"
"""条目键:任职要求清单。"""

DESC_CACHE_TPL = "用已缓存 {path}"
"""缓存命中报行。"""

DESC_DL_TPL = "下载 {url}"
"""下载报行。"""

DESC_DONE_TPL = "✓ {path}  ({n} 个 NOC · {wd} 有主要职责)"
"""收口报行(带产出行数)。"""

PROBE_NOCS = ("21331", "31301", "73300")
"""收口抽查的三个探针码(工程/护理/卡车司机,横跨三个 TEER)。"""

PROBE_TPL = "  {noc} {title}: {d} 职责 · {r} 要求"
"""探针报行。"""

TITLE_FALLBACK = "?"
"""探针码查不到时的占位。"""

# =========================================================================
# 5. audit 步(逐职业体检 大类/中类/小类;原 ops/audit_noc_classes.py,2026-08-31 批D 并入)
# =========================================================================

IN_STATS = paths.MART / "stats_occupation.json"
"""输入:每职业一行(province=all 那批带在招量与中位薪资)。数据源是 mart(09 的产出),
不连库、不抓网。"""

IN_DESCR = paths.MART / "noc_descriptions.json"
"""输入:官方名 + 中文名(职业名的真相来源)。"""

OUT_TSV = paths.PROCESSED / "noc_class_audit.tsv"
"""输出:全量逐条(拿去 Excel 里逐行看)。"""

OFFICIAL_BROAD_EN = {
    "0": "Legislative and senior management occupations",
    "1": "Business, finance and administration occupations",
    "2": "Natural and applied sciences and related occupations",
    "3": "Health occupations",
    "4": "Occupations in education, law and social, community and government services",
    "5": "Occupations in art, culture, recreation and sport",
    "6": "Sales and service occupations",
    "7": "Trades, transport and equipment operators and related occupations",
    "8": "Natural resources, agriculture and related production occupations",
    "9": "Occupations in manufacturing and utilities",
}
"""NOC 2021 官方大分类名(第 1 位)。本站的中文简称与它并排摆 —— 差在哪一眼就看得见。
⚠ 零消费者:原 audit_noc_classes.py 里这张表定义了但没有一处读它(并排打印走的是本域
official_broad_of → 第 1 段 OFFICIAL_BROAD 的中文简称);2026-08-31 批D 拆 ops 时按
「行为逐字不变」原样搬来**不裁决**,退不退役(方言律⑨ 零消费者退役)待 Frank 拍。"""

SMELL = [
    (("园艺", "园林", "农场", "农业", "林业", "渔"), "农业"),
    (("矿", "钻井", "爆破"), "矿业"),
    (("焊", "电工", "机械师", "维修", "安装"), "技工"),
    (("管道", "木工", "瓦工", "屋顶", "混凝土", "建筑工"), "建筑"),
    (("司机", "驾驶", "货运"), "运输"),
    (("仓储", "搬运", "供应链"), "物流"),
    (("护士", "护理", "医生", "药剂", "牙科", "理疗"), "医疗"),
    (("教师", "幼教", "讲师"), "教育"),
    (("社工", "社区服务"), "社会服务"),
    (("厨师", "厨工", "餐饮", "服务员"), "餐饮"),
    (("客房", "酒店", "旅游", "住宿"), "住宿"),
    (("清洁", "保洁"), "生活服务"),
    (("收银", "导购", "零售销售"), "零售"),
    (("软件", "程序员", "网页", "数据库", "网络安全"), "IT"),
]
"""关键词线索:职业名里出现这些词时,它「通常」属于右边那个大类。
命中 ≠ 分错(见 audit_noc_classes 的 docstring);只是把该看的行挑出来,省得 494 条一条条扫。"""

AUDIT_LABELS = BROADS + [UNCLASSIFIED]
"""① 段的遍历顺序:本站大类清单 + 未分类兜底桶。"""

ARG_ALL = "--all"
"""手动开关:摘要 + 全量逐条打印(默认只打印每类前几条)。"""

AUDIT_HEAD_TPL = "职业 {n} 个(mart/stats_occupation 的 province=all)\n"
"""开场报行(尾部空行沿原脚本)。"""

SEC1_HEAD = "=== ① 本站浏览分类里装了什么(括号=它们在官方属于哪一组) ==="
"""① 段标题。"""

BROAD_HEAD_TPL = "\n【{label}】 职业 {n} · 在招 {open:,}  ← 官方来源:{srcs}"
"""① 段每个大类的抬头行。"""

SRC_ITEM_TPL = "{k}×{v}"
"""官方来源计数的单项说法。"""

SRC_SEP = "、"
"""官方来源计数 / 最挤中类的分隔(顿号,禁「·」「/」杂糅)。"""

AUDIT_ROW_TPL = "    {noc}  T{teer}  {mid:<10}/{fine:<16} {zh:<22} {open:>6,} 在招"
"""① 段逐职业行(fine/zh 已按 FINE_SHOW_LEN / ZH_SHOW_LEN 截断后入模板)。"""

FINE_SHOW_LEN = 14
"""① 段小类名截断长度(只影响打印,不影响数据)。"""

ZH_SHOW_LEN = 20
"""① 段中文名截断长度。"""

ZH_WIDE_LEN = 24
"""②③ 段中文名截断长度。"""

BROAD_SHOW_MAX = 6
"""① 段每个大类默认展开的职业数(--all 看全量)。"""

BROAD_MORE_TPL = "    …… 其余 {n} 个(--all 看全量,或读 {name})"
"""① 段折叠尾行。"""

SEC2_HEAD = "\n=== ② 中/小类的成色 ==="
"""② 段标题。"""

COVER_OK_TPL = "    ✅ 映射覆盖: {hand} / {n}"
"""② 段:桶表全覆盖。"""

COVER_BAD_TPL = "    ❌ 漏映射 {n} 个(必须补进 noc/constants 的 BUCKETS 表,不许兜底):"
"""② 段:有职业没被桶表覆盖(硬检查,没有兜底)。"""

MISS_ROW_TPL = "        {noc} {zh} {open} 在招"
"""② 段漏映射明细行。"""

BROAD_OK_MSG = "    ✅ 大类值全在本站清单内"
"""② 段:大类值全合法。"""

BROAD_BAD_TPL = "    ❌ {n} 个职业的大类不在清单里"
"""② 段:大类值越出 BROADS 清单。"""

NOFINE_TPL = "    小类 == 中类(等于没有小类)                  : {n:>4} / {total}"
"""② 段:小类退化计数(对齐空格沿原脚本)。"""

MID_TOP_TPL = "    最挤的中类(装的职业数): {items}"
"""② 段:最挤中类行(原 print 两参之间的一个空格已写进模板)。"""

MID_ITEM_TPL = "{m} {n}"
"""最挤中类的单项说法。"""

MID_TOP_MAX = 6
"""最挤中类展开个数。"""

SEC3_HEAD = "\n=== ③ 关键词线索(命中 ≠ 分错,见文件头) ==="
"""③ 段标题。"""

HIT_HEAD_TPL = "    {n} 条名字与所在大类对不上:"
"""③ 段计数行。"""

HIT_ROW_TPL = "    {noc}  在「{broad}」里,名字像「{expect}」  {zh:<26} {open:>6,} 在招"
"""③ 段明细行。"""

HIT_SHOW_MAX = 20
"""③ 段默认展开条数。"""

HIT_MORE_TPL = "    …… 其余 {n} 条(--all)"
"""③ 段折叠尾行。"""

TSV_HEADER = "noc\tteer\t大类\t中类\t小类\t中文名\t官方英文名\t在招\t中小类来源\t有小类\n"
"""全量 TSV 表头。"""

TSV_ROW_TPL = "{noc}\t{teer}\t{broad}\t{mid}\t{fine}\t{zh}\t{en}\t{open}\t{hand}\t{fine_flag}\n"
"""全量 TSV 数据行。"""

HAND_YES = "人工"
"""TSV「中小类来源」列:被桶表点名覆盖。"""

HAND_NO = "前缀兜底"
"""TSV「中小类来源」列:没被桶表覆盖。"""

FINE_NO = "否"
"""TSV「有小类」列:小类 == 中类(等于没有小类)。"""

FINE_YES = "是"
"""TSV「有小类」列:官方在这一级确有更细的划分。"""

TSV_DONE_TPL = "\n全量已写:{path}"
"""收口报行(带产出路径)。"""

K_PROVINCE = "province"
"""stats_occupation 行键:省(只收 province=all 那批)。"""

PROVINCE_ALL = "all"
"""stats_occupation 的全国汇总行标记。"""
