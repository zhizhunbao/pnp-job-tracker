"""
names 域常量 —— 公司名归一的三条正则(方言:constants 只许 import re / paths)。
2026-09-18 起另住「雇主类别」的名字规则(自 mart 域逐字迁入,见文件尾那一段)。

@author Frank
@time 2026-08-31 20:52:27
"""
import re

SUFFIX_RE = re.compile(
    r"\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|lt[eé]e|"
    r"holdings?|group|services?|enterprises?)\b\.?", re.I)
"""公司后缀词(归一时整体去掉)。沿革:pilot 域 _SUFFIX → aip SUFFIX_RE(值一字未改)→
2026-08-31 收拢批随 norm_name 迁入本域。mart 试点段原 PILOT_SUFFIX_RE 与本条逐字相同
(其「词表不同」注释系搬运期陈旧断言,56,909 名全集探针零差异),随收拢删除。"""

ALIAS_SPLIT_RE = re.compile(r"\bo/a\b|\bdba\b|\bd/b/a\b|\bo\.a\.\b")
"""「operating as」别名分隔:切开取前面的主名(输入已小写,故不带 re.I,原值)。"""

APOSTROPHE_RE = re.compile(r"['’]")
"""撇号(直、弯两种)—— 2026-09-06 起先整个删掉再做其它归一:KEEP_RE 把撇号换成空格会让
「Tim Horton's」变成「tim horton s」、与「Tim Hortons」对不上(生产库 56 组同名只差撇号的公司各成两家,
Frank「怎么有两个」);删掉才是同一把尺子。"""

KEEP_RE = re.compile(r"[^a-z0-9& ]")
"""归一后允许保留的字符之外的一切(标点全换空格,& 保留;撇号已在前一步删掉,不到这里)。"""

# 雇主类别(按名字判):2026-09-18 自 mart 域 constants 逐字迁入 —— 雇主池(employers 域)也要按名字判类别,
# 域间不许互借函数,判定只能住基建叶(「这个名字是什么类别的雇主」与「这两个名字是不是同一家」同属名字判定)。

SECTOR_GOVERNMENT = "government"
"""雇主类别(companies.sector 列,键名 K_SECTOR 在 mart 域第 14 段):省市政府(省政府与部厅、市镇政府、原住民政府;
联邦的另归 SECTOR_FEDERAL)。2026-09-05 Frank「公共部门 政府部门 私营企业这些应该是雇主类别吧」—— 与雇主门槛判定拆成两个字段,
按名字规则在这算,库里原 123 行手工值一并覆盖(那批一半是动物医院与民间社团,规则本身错)。空 = 私营企业。
2026-09-18 拆档批:本值收窄为**省级政府与部厅**(值 "government" 不改名 —— 库里与 cms 判定都认这个字面量);
市镇政府 → SECTOR_MUNICIPAL,原住民政府 → SECTOR_INDIGENOUS。"""

SECTOR_FEDERAL = "federal"
"""雇主类别:联邦机关(联邦各部、CRA/CBSA、军警、联邦机构;2026-09-05 Frank「雇主类别细到四档」从政府档拆出:
联邦公务员招聘优先公民/永居、军队要公民,与省市政府对持工签的人是两回事)。"""

SECTOR_FEDERAL_RE = re.compile(
    r"^(?:the )?(?:government of canada|gouvernement du canada|canada revenue agency|canada border services"
    r"|royal canadian mounted police|rcmp|canadian armed forces|canadian forces|forces arm[eé]es canadiennes"
    r"|forces canadiennes|services de bien-[eê]tre et moral des forces|national defence"
    r"|department of national defence|correctional service canada|service canada|statistics canada"
    r"|public service commission of canada|employment and social development canada"
    r"|immigration, refugees and citizenship canada|public services and procurement canada|parks canada"
    r"|fisheries and oceans canada|transport canada|health canada|environment and climate change canada"
    r"|natural resources canada|agriculture and agri-food canada|innovation, science and economic development canada"
    r"|global affairs canada|canadian coast guard|treasury board of canada|shared services canada"
    r"|library and archives canada|elections canada|veterans affairs canada|indigenous services canada"
    r"|crown-indigenous relations|canadian food inspection agency|canadian security intelligence service"
    r"|national research council|correctional service of canada|department of [a-z ,&'-]*canada"
    r"|(?:bc )?royal canadian mounted police)\b",
    re.I,
)
"""联邦机关的名字特征:只认**名字开头**(「Corporate Health Canada」「ALSTOM Transport Canada」这类私企
名字里夹着部门名,不能按子串命中;2026-09-05 原型 97 家,收紧到开头后误伤清零)。
2026-09-18 拆档批补三种写法(原先漏进政府档,拆出「省政府」后就成了错档):「Correctional Service **of** Canada」、
「Department of Finance / Justice Canada …」(Department of … Canada 形)、「BC Royal Canadian Mounted Police」。"""

SECTOR_PUBLIC = "public"
"""雇主类别:公立机构(卫生局/医院、学区/学校委员会、大学/学院、公营公司/交通)。省提名的雇主门槛不适用。"""

SECTOR_GOV_RE = re.compile(
    r"^(the )?government of\b"
    r"|^(ministry|department) of\b"
    r"|^(minist[eè]re|d[eé]partement) (de|du|des)\b"
    r"|\b(legislative assembly|public service commission|water security agency)\b",
    re.I,
)
"""政府机关的名字特征(英法两套;2026-09-05 原型跑 mart 52k 家命中 421 家,人眼抽查无误伤)。
2026-09-18 拆档批(Frank「省市区分开比较好吧」):本条只剩**省级政府与部厅**。原来的四支里 ——
市镇一支拆去 SECTOR_MUNI_RE、原住民一支拆去 SECTOR_INDIGENOUS_RE;联邦机关名按子串命中的那一支撤
(联邦的归 SECTOR_FEDERAL_RE 按名字开头判;子串命中把「Nippon Trends Food **Service Canada**, Inc.」判成了政府);
部厅一支改成按语言配对(Ministry / Department **of**、Ministère / Département **de / du / des**),
「Ministère of seafood」这种英法混搭的餐馆名不再命中。"""

SECTOR_MUNICIPAL = "municipal"
"""雇主类别:市镇政府(市、镇、村、乡、县、区域市、魁省 MRC / canton / paroisse、草原省 RM)。2026-09-18 自「省市政府」拆出
(Frank「省市区分开比较好吧」;拆前 441 家政府里 370 家是这一形)。"""

SECTOR_MUNI_RE = re.compile(
    r"^(the )?(city|town|village|district|township|municipality|county|regional municipality|regional district"
    r"|municipalit[eé]|ville|corporation of the (city|town|township|county|district)) (of|de|du|d')\b"
    r"|^(the )?(rural municipality|resort municipality|northern village|local government district) of\b"
    r"|^r\.?m\.? of\b"
    r"|^(mrc|canton|paroisse)\b",
    re.I,
)
"""市镇政府的名字特征:第一支自 SECTOR_GOV_RE 逐字拆来(只加了可选的「The 」,「The Corporation of the County of Dufferin」原先漏判);
后三支 2026-09-18 补:草原省 RM / Rural Municipality、Resort Municipality(惠斯勒)、Northern Village、
Local Government District,魁省 MRC / Canton / Paroisse —— 全是 mart 里原先落在私营的真市镇(实测 30 家)。
「Cité」不收:库里命中的是「Cité Construction」这类私企。"""

SECTOR_INDIGENOUS = "indigenous"
"""雇主类别:原住民政府(First Nation / 部落议会 / 梅蒂斯民族 / Band)。2026-09-18 拆档批自「省市政府」拆出:
拆前非市镇的 70 家里 34 家是这一形,既不是省政府也不是市镇政府,硬塞任一档都是错档。"""

SECTOR_INDIGENOUS_RE = re.compile(
    r"\b(first nation|tribal council|m[eé]tis nation|band council|indian band|cree nation)\b",
    re.I,
)
"""原住民政府的名字特征:前四词自 SECTOR_GOV_RE 逐字拆来;「Indian Band」「Cree Nation」2026-09-18 补
(Okanagan Indian Band、Peter Ballantyne Cree Nation 等 7 家原先落在私营)。"""

SECTOR_PUBLIC_RE = re.compile(
    r"\b(health authority|health network|health region|health services authority|r[eé]gie r[eé]gionale"
    r"|regional health|public health|cancer agency|children'?s aid|school district|school division|school board"
    r"|centre de services scolaire|commission scolaire|regional centre for education|conseil scolaire"
    r"|public library|community college|c[eé]gep|university|universit[eé]|polytechnic|national research council"
    r"|canada post|via rail|bc hydro|hydro-qu[eé]bec|hydro qu[eé]bec|saskpower|sasktel"
    r"|manitoba hydro|bc transit|translink|toronto transit|soci[eé]t[eé] de transport|radio-canada"
    r"|crown corporation|ciusss|cisss|hospital|health sciences centre|health sciences center|h[oô]pital)\b"
    r"|^bank of canada\b",
    re.I,
)
"""公立机构的名字特征(2026-09-05 原型命中 260 家)。
2026-09-18 拆档批:「bank of canada」自子串组里摘出、改成只认名字开头 —— 子串命中把「Royal Bank of Canada」
「National Bank of Canada」「General Bank of Canada」「Wealth One Bank of Canada」四家商业银行判成了公立机构
(类别要上雇主板当筛选项,这种错用户一眼看得到)。"""

SECTOR_CORP_RE = re.compile(r"\b(inc|ltd|lt[eé]e|limited|llc|private)\b", re.I)
"""公立特征的反例:名字里带公司后缀或「Private」的是私企(2026-09-18:公立档 437 家里 11 家带这类词,10 家是私企 ——
University Plumbing & Heating Ltd.、Braddan / Lakeshore / Point Grey Private Hospital、Legacy Translink Ltd、
University City Clinic Inc.、LMIA 表里「某餐馆 Ltd. + 学区名」的串行名等)。代价 1 家:CHEO 研究所(…Research Institute Inc.)
落回私营,名字上分不出,留账。「corp / corporation」不收:公营公司的全名就带 Corporation。"""

SECTOR_VET_RE = re.compile(r"\b(animal|veterinary|pet|vet)\b", re.I)
"""「hospital」的反例:动物医院是私企(库里旧手工值把它们标成公共部门,正是这一撞)。"""

# 公司分类(按名字判,只管非私营):2026-09-19 Frank「这两个分类应该是属于职位的分类。应该单独弄一个公司的分类。和雇主类型联动。
# 比如 医院 大学 建筑 学院 科技」「如果是政府部门 应该也是有一些分类的」「医院和卫生局不是两个类别吗」。
# 两级联动:第一级 = 上面的雇主类别;第二级跟着第一级走 —— 公立机构按机构种类分,政府四档(联邦 / 省 / 市镇 / 原住民)按职能分,
# 都是名字上看得出来的,住这里;私营那 15 类名字上看不出,由 explore 域的本地模型判、employers 域按在招岗反推兜底,不在本叶。

CATEGORY_NONE = ""
"""公司分类:判不出 / 不归本叶判(私营)。"""

CATEGORY_PUBLIC_OTHER = "public-other"
"""公司分类·公立机构兜底:其他公立(图书馆、儿童保护会这类,名字命中公立特征但不属下面任何一种)。"""

CATEGORY_GOV_ADMIN = "gov-admin"
"""公司分类·政府兜底:综合行政(「City of X」「Government of Y」这类整个政府,名字上不分部门)。"""

CATEGORY_PUBLIC_RULES = (
    ("hospital", re.compile(r"\buniversity health network\b", re.I)),
    ("healthauth", re.compile(
        r"\b(health authority|health network|health region|health services authority|r[eé]gie r[eé]gionale"
        r"|regional health|public health|cancer agency|ciusss|cisss)\b", re.I)),
    ("hospital", re.compile(r"\b(hospital|health sciences centre|health sciences center|h[oô]pital)\b", re.I)),
    ("schoolboard", re.compile(
        r"\b(school district|school division|school board|centre de services scolaire|commission scolaire"
        r"|regional centre for education|conseil scolaire)\b", re.I)),
    ("college", re.compile(r"\b(community college|c[eé]gep|polytechnic)\b", re.I)),
    ("university", re.compile(r"\b(university|universit[eé])\b", re.I)),
    ("transit", re.compile(r"\b(bc transit|translink|toronto transit|soci[eé]t[eé] de transport|via rail)\b", re.I)),
    ("utility", re.compile(r"\b(bc hydro|hydro-qu[eé]bec|hydro qu[eé]bec|saskpower|manitoba hydro)\b", re.I)),
    ("crown", re.compile(r"^bank of canada\b|\b(canada post|sasktel|radio-canada|crown corporation)\b", re.I)),
)
"""公立机构的分类规则,**有序**,先命中先得(键, 名字特征):
- 「University Health Network」是多伦多的医院集团,抢在「health network = 卫生局」之前;
- 卫生局在医院之前(「CIUSSS … Hôpital …」是卫生局在招人);医院在大学之前(「University of Alberta Hospital」是医院);
- 学区在学院 / 大学之前(「Conseil scolaire …」)。
医院与卫生局分两类(Frank「医院和卫生局不是两个类别吗」):按雇主主体分 —— BC / AB / SK / MB 的医院由卫生局统一招人,
那边的医院岗落在卫生局名下,是事实不是错分。特征词全部取自 SECTOR_PUBLIC_RE(只有被它判成公立的名字才会走到这里)。"""

CATEGORY_GOV_RULES = (
    ("gov-defence", re.compile(
        r"\b(armed forces|canadian forces|forces arm[eé]es|forces canadiennes|national defence|d[eé]fense nationale)\b",
        re.I)),
    ("gov-police", re.compile(
        r"\b(police|rcmp|border services|coast guard|security intelligence|fire department|fire rescue"
        r"|emergency services)\b", re.I)),
    ("gov-justice", re.compile(r"\b(justice|correctional|attorney general|solicitor general|courts?)\b", re.I)),
    ("gov-tax", re.compile(r"\b(revenue agency|revenu|finance|finances|treasury board)\b", re.I)),
    ("gov-parks", re.compile(
        r"\b(parks canada|parcs canada|fisheries and oceans|environment|environnement|natural resources"
        r"|ressources naturelles|agriculture|forests?|for[eê]ts|water security agency)\b", re.I)),
    ("gov-infra", re.compile(r"\b(transport canada|transportation|transports|infrastructure|highways)\b", re.I)),
    ("gov-health", re.compile(r"\b(health canada|health|sant[eé]|food inspection)\b", re.I)),
    ("gov-edu", re.compile(r"\b(education|[eé]ducation|advanced education|enseignement)\b", re.I)),
)
"""政府四档(联邦 / 省 / 市镇 / 原住民政府)按职能分的规则,有序,先命中先得(Frank「如果是政府部门 应该也是有一些分类的」):
国防、警务与应急、司法、财税、公园与自然资源、交通与基建、卫生、教育;都不命中 = 综合行政(CATEGORY_GOV_ADMIN)。
国防在警务之前(「Canadian Forces Military Police」归国防)。"""

CATEGORY_GOV_SECTORS = frozenset((SECTOR_FEDERAL, SECTOR_GOVERNMENT, SECTOR_MUNICIPAL, SECTOR_INDIGENOUS))
"""走「按职能分」那套规则的雇主类别(公立机构走机构种类那套;私营不归本叶)。"""
