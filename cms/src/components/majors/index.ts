/**
 * majors 组件域的桶 —— 专业选择器:从 CIP 2021 全表里挑专业(搜索框 + 左栏 热门 / 16 大类 + 专业类白卡,
 * 在搜时单列结果;多选至多 3 个,搜索框上面一行已选标签)。
 * 边界(2026-10-05 自 gate 桶拆出立域):本桶答「从 CIP 全表里挑专业」—— 浏览、搜索、已选回显、它的取数与行构造器、它的样式;
 * 不认识访客向导(不 import gate)。宿主(眼下只有 gate 的访客第 2 题)管答案落格、题面、钮区、草稿与注册后回职位板,
 * 用法 = 开屏挂 useMajorPicker({ value, onChange })(热门与大类开屏就取),这一题渲 <MajorPicker picker t lang />;
 * 回职位板要专业的本站大类时借 fetchMajor(按码取一行,与选择器回显同一份取数)。
 * 对应 lib 域:lib/majors(/api/majors 取数口)。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */
export { useMajorPicker } from './hooks'
export { MajorPicker } from './majorpicker'
export { fetchMajor } from './functions'
