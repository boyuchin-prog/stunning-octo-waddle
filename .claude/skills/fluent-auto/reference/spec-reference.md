# 规格文件(spec.json)字段说明

- 格式是 JSON,文件编码为 UTF-8。以 `_` 开头的键是注释,会被忽略。
- 相对路径按规格文件所在目录解析。
- 没写的字段使用 `scripts/fluent_auto/spec.py` 里 `DEFAULTS` 的默认值。

## name
算例名称,决定输出目录 `fa_runs/<name>/`。

## fluent

| 字段 | 默认 | 说明 |
|---|---|---|
| `exe` | null | fluent.exe 的路径。留空时依次查找 `%AWP_ROOT221%\fluent\ntbin\win64\fluent.exe` 和 `C:\Program Files\ANSYS Inc\v221\fluent\ntbin\win64\fluent.exe`。也可以写成列表,表示一个包装命令。 |
| `dimension` | 3 | 2 或 3 |
| `double_precision` | true | 双精度(3ddp / 2ddp) |
| `processes` | 4 | 并行核数(`-t4`) |
| `ui_mode` | hidden | `hidden` 对应 `-hidden`,能保存图片;`batch` 对应 `-g`,不能出图 |
| `extra_args` | [] | 追加的 Fluent 启动参数 |
| `timeout_min` | 240 | 单次尝试的超时时间,超时会结束 Fluent 进程树 |
| `allow_non_ascii_paths` | false | 设为 true 时允许中文路径(不建议) |

## input

| 字段 | 说明 |
|---|---|
| `file` | 网格(.msh / .msh.h5 / .msh.gz)或 case(.cas / .cas.h5 / .cas.gz) |
| `kind` | `auto`(按扩展名判断)、`mesh` 或 `case` |
| `scale` | 网格缩放系数。网格是 mm 单位时填 0.001,会在读入后执行 `/mesh/scale` |

## setup(网格输入时默认应用,case 输入时默认不应用)

| 字段 | 说明 |
|---|---|
| `apply` | null 表示自动判断(mesh 为 true,case 为 false)。case 输入也想覆盖设置时设为 true |
| `viscous` | `laminar`、`ke-standard`、`ke-realizable`、`ke-rng`、`kw-standard`、`kw-sst` 或 `sa` |
| `energy` | 是否开启能量方程(第一版没有专门调试,模板标了 VERIFY) |
| `material` | `{"name": "air", "density": 998.2, "viscosity": 0.001003}`,修改已有材料的常数密度和黏度 |
| `boundary_conditions` | 边界条件列表,见下表 |
| `raw_tui` | 原样插入 journal 的 TUI 行。上面不支持的设置都写在这里 |

边界条件支持的写法:

```json
{"zone": "inlet",  "type": "velocity-inlet",  "velocity": 2.0, "turb_intensity": 5, "turb_viscosity_ratio": 10}
{"zone": "inlet",  "type": "mass-flow-inlet", "mass_flow": 0.5}
{"zone": "outlet", "type": "pressure-outlet", "gauge_pressure": 0}
{"zone": "wall",   "type": "wall"}
{"zone": "sym",    "type": "symmetry", "set_type": true}
```

`set_type: true` 会先执行 `zone-type`,用于网格里的 zone 类型不对的情况。
其他边界类型(pressure-inlet、周期边界、移动壁面、壁面粗糙度等)请写进 `raw_tui`。

## surfaces
创建后处理用的截面,目前只支持坐标平面:
```json
{"name": "mid-plane", "type": "plane", "axis": "z", "value": 0.0}
```
`axis: z` 表示 z = value 的平面。

## solver

| 字段 | 默认 | 说明 |
|---|---|---|
| `p_v_coupling` | simple | `simple`、`simplec` 或 `coupled` |
| `courant` | 200 | 仅 coupled 使用 |
| `explicit_urf` | {mom: .75, pressure: .75} | 仅 coupled 使用 |
| `urf` | Fluent 默认值 | 覆盖欠松弛因子,例如 `{"pressure": 0.2, "mom": 0.5}` |
| `second_order` | true | 最终使用二阶格式 |
| `first_order_warmup` | 100 | 切换到二阶之前,先用一阶算的步数 |
| `init` | hybrid | `hybrid` 或 `standard` |
| `iterations` | 1000 | 每次尝试的迭代步数 |
| `chunk` | 50 | 每隔多少步输出一次报告(决定监视量的采样点) |
| `equations` | 自动 | 残差方程顺序。网格输入时按模型推导;case 输入时由 `inspect` 读取 |
| `max_total_iterations` | 6000 | 所有尝试累计迭代步数的上限 |

## reports
每隔 `chunk` 步打印一次,作为监视量和最终结果。

| kind | 需要的字段 | 含义 |
|---|---|---|
| `area-weighted-avg`、`mass-weighted-avg`、`facet-avg`、`facet-max`、`facet-min`、`vertex-avg`、`vertex-max`、`vertex-min`、`integral`、`sum` | `surfaces`、`field` | 面积分类报告 |
| `mass-flow-rate`、`volume-flow-rate`、`area` | `surfaces` | 流量或面积 |
| `wall-forces` | `direction`,例如 `[1,0,0]` | 所有壁面在该方向上的合力(取 Net 行的 total 值) |
| `raw` | `tui` | 自定义的报告命令,取输出中 Net 行或最后一行的数值 |

常用的 field 名:`pressure`(静压)、`total-pressure`、`velocity-magnitude`、`x-velocity`、`turb-kinetic-energy`、`y-plus`、`wall-shear`。

每个报告可以单独设置 `rel_tol`(稳定性容差)和 `abs_floor`(数值接近 0 时用于相对变化的分母)。

## convergence

| 字段 | 默认 | 说明 |
|---|---|---|
| `residual` | 1e-4 | 残差标准(能量方程除外) |
| `residual_energy` | 1e-6 | 能量方程的残差标准 |
| `monitor_window` | 3 | 最后 window+1 个采样点之间的相对变化都要 ≤ `monitor_rel_tol` |
| `monitor_rel_tol` | 0.005 | 监视量的稳定性容差 |
| `check_mass_imbalance` | true | 检查 `/report/fluxes/mass-flow` 的净流量 |
| `mass_imbalance_rel` | 0.002 | 净流量与入流量之比的上限 |
| `accept_flat_residuals` | true | 残差停在 `residual_relaxed` 以下不再下降、监视量稳定且守恒时,按工程收敛接受 |
| `residual_relaxed` | 1e-3 | 上一项使用的放宽标准 |

## references
```json
{"report": "p-in", "expected": 120.0, "rel_tol": 0.1}
{"report": "p-in", "expected": 120.0, "abs_tol": 5}
{"report": "mdot-out", "range": [0.0775, 0.0795], "abs": true}
```
`abs: true` 表示先取绝对值再比较(流量的符号取决于法向约定)。

## exports

| 字段 | 说明 |
|---|---|
| `contours` | `[{"name": "vel-mid", "field": "velocity-magnitude", "surfaces": ["mid-plane"], "view": "front"}]`。view 可选 front/back/left/right/top/bottom/isometric |
| `data` | `[{"name": "outlet-profile", "surfaces": ["outlet"], "fields": ["pressure", "velocity-magnitude"]}]`,导出 ASCII 节点数据 |
| `picture` | 图片分辨率 `{"width": 1600, "height": 1000}` |
| `animation` | `{"enabled": true, "contour": "vel-mid", "every_chunks": 1, "fps": 5}`,每个 chunk 存一帧,最后合成 mp4(需要 ffmpeg)或 gif(需要 Pillow) |

每次尝试结束都会保存 `result.cas.h5`(和 dat),下一次续算或你后续手动查看都用这个文件。

## debug

| 字段 | 默认 | 说明 |
|---|---|---|
| `max_attempts` | 6 | 最多尝试几次 |
| `auto_numeric_fix` | true | 设为 false 时只跑一次,不自动调参 |
