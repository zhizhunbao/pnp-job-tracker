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
"""雇主类别(companies.sector 列,键名 K_SECTOR 在第 14 段):省市政府(省政府与部厅、市镇政府、原住民政府;
联邦的另归 SECTOR_FEDERAL)。2026-09-05 Frank「公共部门 政府部门 私营企业这些应该是雇主类别吧」—— 与雇主门槛判定拆成两个字段,
按名字规则在这算,库里原 123 行手工值一并覆盖(那批一半是动物医院与民间社团,规则本身错)。空 = 私营企业。"""

SECTOR_FEDERAL = "federal"
"""雇主类别:联邦机关(联邦各部、CRA/CBSA、军警、联邦机构;2026-09-05 Frank「雇主类别细到四档」从政府档拆出:
联邦公务员招聘优先公民/永居、军队要公民,与省市政府对持工签的人是两回事)。"""

SECTOR_FEDERAL_RE = re.compile(
    r"^(?:the )?(?:government of canada|gouvernement du canada|canada revenue agency|canada border services"
    r"|royal canadian mounted police|rcmp|canadian armed forces|forces arm[eé]es canadiennes|national defence"
    r"|department of national defence|correctional service canada|service canada|statistics canada"
    r"|public service commission of canada|employment and social development canada"
    r"|immigration, refugees and citizenship canada|public services and procurement canada|parks canada"
    r"|fisheries and oceans canada|transport canada|health canada|environment and climate change canada"
    r"|natural resources canada|agriculture and agri-food canada|innovation, science and economic development canada"
    r"|global affairs canada|canadian coast guard|treasury board of canada|shared services canada"
    r"|library and archives canada|elections canada|veterans affairs canada|indigenous services canada"
    r"|crown-indigenous relations|canadian food inspection agency|canadian security intelligence service"
    r"|national research council)\b",
    re.I,
)
"""联邦机关的名字特征:只认**名字开头**(「Corporate Health Canada」「ALSTOM Transport Canada」这类私企
名字里夹着部门名,不能按子串命中;2026-09-05 原型 97 家,收紧到开头后误伤清零)。"""

SECTOR_PUBLIC = "public"
"""雇主类别:公立机构(卫生局/医院、学区/学校委员会、大学/学院、公营公司/交通)。省提名的雇主门槛不适用。"""

SECTOR_GOV_RE = re.compile(
    r"^(the )?government of\b"
    r"|^(city|town|village|district|township|municipality|county|regional municipality|regional district"
    r"|municipalit[eé]|ville|corporation of the (city|town|township|county|district)) (of|de|du|d')\b"
    r"|^(ministry|minist[eè]re|department|d[eé]partement) (of|de|du|des)\b"
    r"|\b(canada revenue agency|canada border services|royal canadian mounted police|canadian armed forces"
    r"|forces arm[eé]es|correctional service|service canada|statistics canada|legislative assembly"
    r"|public service commission|water security agency)\b"
    r"|\b(first nation|tribal council|m[eé]tis nation|band council)\b",
    re.I,
)
"""政府机关的名字特征(英法两套;2026-09-05 原型跑 mart 52k 家命中 421 家,人眼抽查无误伤)。"""

SECTOR_PUBLIC_RE = re.compile(
    r"\b(health authority|health network|health region|health services authority|r[eé]gie r[eé]gionale"
    r"|regional health|public health|cancer agency|children'?s aid|school district|school division|school board"
    r"|centre de services scolaire|commission scolaire|regional centre for education|conseil scolaire"
    r"|public library|community college|c[eé]gep|university|universit[eé]|polytechnic|national research council"
    r"|bank of canada|canada post|via rail|bc hydro|hydro-qu[eé]bec|hydro qu[eé]bec|saskpower|sasktel"
    r"|manitoba hydro|bc transit|translink|toronto transit|soci[eé]t[eé] de transport|radio-canada"
    r"|crown corporation|ciusss|cisss|hospital)\b",
    re.I,
)
"""公立机构的名字特征(2026-09-05 原型命中 260 家)。"""

SECTOR_VET_RE = re.compile(r"\b(animal|veterinary|pet|vet)\b", re.I)
"""「hospital」的反例:动物医院是私企(库里旧手工值把它们标成公共部门,正是这一撞)。"""
