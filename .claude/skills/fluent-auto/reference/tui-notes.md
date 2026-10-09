# TUI 命令说明与标定

Fluent 的 TUI 命令在 journal 里是"按提示顺序给答案":一行里给几个参数,就依次回答几个提示。
提示的个数会随版本、物理模型和当前状态变化(例如开了能量方程后会多出温度相关的提示)。
答案少了,下一行 journal 会被当成答案;多了,多出的部分会被当成新命令。两种情况都会让后面全部错位。
所以 **所有 TUI 字符串都集中在 `scripts/fluent_auto/tui.py` 的 `TEMPLATES` 里**,第一次在你的电脑上用时要标定一遍。

## 验证状态

✅ = 多个版本通用、写法稳定的命令;⚠ = VERIFY,第一次运行时要重点看 transcript。

| 模板 | 命令 | 状态 | 备注 |
|---|---|---|---|
| start/stop_transcript | `/file/start-transcript "path"` | ✅ | |
| batch_options | `/file/set-batch-options no yes yes no` | ⚠ | 预期顺序:confirm overwrite? / exit on error? / hide questions? / redisplay questions?。exit on error=yes 让 TUI 出错时 Fluent 立即退出,方便判定 |
| confirm_overwrite | `/file/confirm-overwrite no` | ✅ | |
| read_case / read_case_data / write_case_data | `/file/read-case "path"` 等 | ✅ | read-case 也能读 .msh |
| mesh_check / mesh_quality / mesh_scale | `/mesh/check`、`/mesh/quality`、`/mesh/scale sx sy sz` | ✅ | |
| list_zones | `/define/boundary-conditions/list-zones` | ✅ | |
| viscous | `/define/models/viscous/kw-sst yes` | ✅ | |
| energy_on | `/define/models/energy yes no no no yes` | ⚠ | 后面几个提示的个数随版本变化 |
| material_change | `/define/materials/change-create air air yes constant ρ no no yes constant μ no no no` | ⚠ | 提示依次是:是否改密度 → 方法 → 值 → 是否改 Cp → 是否改导热系数 → 是否改黏度 → 方法 → 值 → 是否改分子量…,末尾的 no 的个数要以实际为准 |
| zone_type | `/define/boundary-conditions/zone-type inlet velocity-inlet` | ✅ | |
| bc_set + bc_* | `/define/boundary-conditions/set/velocity-inlet inlet () vmag no 2 turb-intensity 5 quit` | ⚠ | `vmag` 后面的 `no` 回答"是否用 profile/expression";湍流强度是百分数还是小数要确认 |
| plane_surface | `/surface/plane-surface name xy-plane 0` | ⚠ | |
| p_v_coupling | `/solve/set/p-v-coupling 20/21/24` | ✅ | 20=SIMPLE,21=SIMPLEC,24=Coupled |
| p_v_controls | `/solve/set/p-v-controls CFL mom p` | ⚠ | **Coupled 默认可能开着 pseudo-transient**,这时提示不同。建议先用 SIMPLE;要用 coupled,先在 GUI 里查看 pseudo-transient 是否勾选 |
| urf | `/solve/set/under-relaxation pressure 0.3` | ✅ | |
| discretization | `/solve/set/discretization-scheme mom 1` | ✅ | 0=一阶迎风,1=二阶迎风;压力:10=Standard,12=Second Order,14=PRESTO! |
| residual_criteria | `/solve/monitors/residual/convergence-criteria v1 v2 ...` | ✅ | 值的个数必须等于方程数(由 equations 决定) |
| init_hybrid | `/solve/initialize/hyb-initialization` | ✅ | |
| init_defaults / init_standard | `/solve/initialize/compute-defaults/all-zones` + `initialize-flow` | ⚠ | |
| iterate | `/solve/iterate N` | ✅ | |
| si_field / si_nofield | `/report/surface-integrals/area-weighted-avg inlet () pressure no` | ✅ | 最后的 no 回答"是否写文件" |
| mass_flux_all | `/report/fluxes/mass-flow yes no` | ⚠ | 预期提示:all boundary zones? / write to file? |
| wall_forces | `/report/forces/wall-forces yes 1 0 0 no` | ⚠ | 预期提示:all wall zones? / 方向分量 / write to file? |
| pic_* | `/display/set/picture/driver png` 等 | ✅/⚠ | use-window-resolution? 待确认 |
| contour_create | `/display/objects/create contour name field velocity-magnitude surfaces-list mid () quit` | ⚠ | 关键字 `surfaces-list` 待确认 |
| restore_view | `/display/views/restore-view front` | ⚠ | 3D 才有 front/isometric 等视图 |
| save_picture | `/display/save-picture "path.png"` | ✅ | 需要 `-hidden`(或 `-gu`)模式;`-g` 不能出图 |
| export_ascii | `/file/export/ascii "f.csv" outlet () yes pressure () no` | ⚠ | 提示依次是:面 → node values? → 变量 → 末尾的选项,要以实际为准 |
| exit | `/exit yes` | ✅ | |

续算(restart)时 journal 读的是上一次保存的 `result.cas.h5`,不会重新创建截面和云图对象,依赖它们已经随 case 一起保存(2022 R1 预期如此)。如果续算时出现 `not found` 的截面或对象报错,就把 `tui.build_run_journal` 里 `if not restart_from:` 下的 `surface_lines` 和 `contour_create_lines` 移到条件外面。

## 标定方法

1. 准备一个很小的网格,最好就是你要算的网格。复制一份规格,设 `"solver": {"iterations": 20, "chunk": 5, "first_order_warmup": 10}` 和 `"debug": {"max_attempts": 1}`,然后 `run`。这样每一类命令(设置、一阶→二阶切换、报告、云图、导出、保存)都会执行一遍。
2. 结果是 `SETUP_ERROR` 时,打开 `attempt_01/transcript.trn`,搜索报错行。往上看,Fluent 会回显它当时在问什么(形如 `xxx? [no]`),以及它把哪段文字当成了答案。
3. 在 Fluent GUI 的 TUI 窗口里**手动敲一遍**这条命令,不带参数,逐个回答提示,把每个提示和你的回答记下来。提示处输入 `?` 可以看帮助;直接回车会采用方括号里的默认值。
4. 把这些回答按顺序写进 `TEMPLATES` 里对应的那一行,只改这一行。
5. 在 `scripts/` 下跑 `python -m unittest discover -s tests`,确认没有改坏逻辑(测试用的是模拟的 Fluent,不会验证 TUI 语法本身)。
6. 重跑第 1 步,直到 20 步的小算例 `PASS` 或者只剩"未收敛"(步数太少,这是正常的)。
7. 在下面的标定记录里写一行。

## 启动参数说明(Windows)

- `-hidden`:批处理模式,GUI 隐藏,可以保存图片。
- `-g`:没有 GUI,也没有图形,不能出图。
- `-wait`:**必须加**,否则 fluent.exe 会立刻返回,脚本会以为已经算完了。
- `-t4`:4 核并行。
- `-i run.jou`:要执行的 journal。

## 标定记录

| 日期 | Fluent 版本 | 模板 | 改动 | 说明 |
|---|---|---|---|---|
| (首次标定后填写) | 2022 R1 | | | |
