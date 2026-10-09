---
name: fluent-auto
description: 全流程自动运行 ANSYS Fluent 2022 R1(Windows 桌面版,批处理 journal/TUI 方式)。根据用户的仿真需求写出算例规格,启动 Fluent 求解,解析残差、监视量和质量守恒,发散或不收敛时自动调整数值设置重跑,并与用户给的参考值比对;最后导出报告数据、云图和可选的迭代动画。Use when the user wants to run, automate, debug-to-convergence, or post-process an ANSYS Fluent CFD case (Fluent 仿真、跑算例、收敛调试、导出云图/数据).
---

# fluent-auto:Fluent 2022 R1 全流程自动化

这个 skill 用 Python 脚本驱动 Fluent 的批处理模式,流程是:规格 JSON → TUI journal → `fluent.exe -hidden -wait -i run.jou` → 解析 transcript → 判定 → 自动调数值设置 → 重跑。
PyFluent 官方只支持 2022 R2 及以上,所以这里用 journal + TUI,不用 PyFluent。

脚本入口(下文用 `FA` 代指,`<skill>` 是本 skill 所在目录):

```
python "<skill>/scripts/fa.py" <command> <spec.json>
```

| 命令 | 作用 |
|---|---|
| `example out.json` | 写出示例规格 |
| `check spec.json` | 校验规格,显示 Fluent 启动命令 |
| `inspect spec.json` | 启动 Fluent 读入文件,列出 zone 名、网格质量、计算域尺寸、残差方程(case 输入时) |
| `gen spec.json [-o x.jou]` | 只生成第 1 次的 journal,不运行 |
| `run spec.json` | 全流程:求解 → 判定 → 自动调试 → 导出 → 报告 |
| `status spec.json` | 查看最近一次运行的进度(运行中也可以用) |
| `analyze spec.json x.trn` | 离线解析某个 transcript 并给出判定 |
| `report spec.json <run_dir>` | 重新生成报告(例如装了 matplotlib 之后补画曲线) |

只依赖 Python 3.8+ 标准库。matplotlib(曲线图)、Pillow 或 ffmpeg(动画)是可选的。

## 工作流程

### 1. 收集需求(缺什么问什么,不要替用户编物理参数)

用中文向用户确认下面几项,一次问完,能从文件里查到的就不要问:
- **输入文件**:网格(.msh/.msh.h5)还是已设好的 case(.cas/.cas.h5);路径必须是纯英文。
- **网格单位**:网格输入时跑一次 `inspect`,把计算域尺寸给用户确认;单位是 mm 就设 `input.scale: 0.001`。
- **物理设置**(仅网格输入需要):流体(密度、黏度)、湍流模型(默认推荐 `kw-sst`)、每个边界的类型和数值(速度/质量流量/出口表压)、湍流强度。zone 名用 `inspect` 的结果,不确定对应关系时问用户。
- **关心的结果**:写成 `reports`,例如入口平均压力(压降)、出口质量流量、某个截面的最大速度、壁面力。
- **参考值**:实验值、理论值或期望范围,以及容差(写成 `references`)。用户没有参考值时,只做收敛与守恒检查,并在报告里写明"未做参考值验证"。
- **导出内容**:要哪些云图(场变量 + 面/截面)、哪些面上的数据、要不要迭代动画。

规格字段的完整说明见 `reference/spec-reference.md`,示例见 `templates/example_spec.json`。
规格文件放在用户的算例目录下,不要放进本仓库。

### 2. 校验和首次标定

1. `FA check spec.json`,把所有 `[错误]` 修掉。
2. **在一台电脑上第一次用时必须先标定。** journal 里有些 TUI 命令标了 VERIFY,意思是还没在真实的 2022 R1 上确认过提示顺序。做法:把规格复制一份,设 `"solver": {"iterations": 20, "chunk": 5, "first_order_warmup": 10}`、`"debug": {"max_attempts": 1}`,然后 `run`(这样一阶→二阶切换、报告、云图、导出、保存都会被执行一遍)。如果结果是 `SETUP_ERROR`,按 `reference/tui-notes.md` 的方法修正 `scripts/fluent_auto/tui.py` 里的 `TEMPLATES`(所有 TUI 字符串都集中在那里,只改一处),并在 tui-notes.md 末尾的标定记录里记下改了什么。标定通过后再正式运行。

### 3. 运行

`run` 可能持续几十分钟到几小时,要用后台方式启动(Bash 的 `run_in_background: true`),然后:
- 用 `FA status spec.json` 查看进度(当前迭代步、残差、最新报告值、错误)。不要频繁轮询,间隔按算例规模定,一般 5 到 15 分钟查一次。
- 向用户简短汇报每一次尝试的结果。

`run` 内部的自动调试只改数值设置,改动的完整阶梯见 `reference/debug-playbook.md`:
- **发散**:降低欠松弛因子或 Courant 数,延长一阶预热;不行再改用 SIMPLE 加保守欠松弛;再不行改全程一阶并换一种初始化,收敛后再切回二阶。每次都重新初始化。
- **未收敛**:残差还在下降就从上次的结果续算;停滞或振荡就小幅降低欠松弛后续算。
- **与参考值不符**:先确认是二阶格式,再把残差标准收紧到 1e-5 续算;仍然不符就停下来交给用户。

### 4. 处理结果

读 `<run_dir>/final/report.md` 和 `summary.json`。按 `final_status` 处理:

| 状态 | 你要做的 |
|---|---|
| `PASS` | 向用户汇报:最终报告值、参考值对比、收敛情况,以及云图、数据和报告的路径。可以用 Read 打开云图 png 看一眼,确认画面正常(不是空白、范围合理)。 |
| `SETUP_ERROR` | 这是 journal 语法或规格的问题,由你来修,不需要先问用户。打开对应 attempt 的 `transcript.trn`,定位报错行和它前面回显的 TUI 提示,对照 `reference/tui-notes.md` 找出是哪条命令的提示顺序不对。修 `tui.py` 的模板或规格(包括 `setup.raw_tui`),然后重跑。同一个问题修 3 次还不行就带着 transcript 片段问用户。 |
| `ENV_ERROR` | 看 `launcher.log`:是不是找不到 fluent.exe、许可证不可用、路径含中文、Fluent 中途崩溃。能修的(路径、参数)就修;许可证和安装问题告诉用户。 |
| `TIMEOUT` | 告诉用户,建议增大 `fluent.timeout_min`、增加 `fluent.processes` 或减少单次迭代数。 |
| `NEED_USER` | 数值手段已经用尽,或者问题出在物理层面。把报告里的诊断和 `reference/debug-playbook.md` 中对应的建议整理成选项给用户,例如加密网格、延长出口、换湍流模型、核对边界条件数值或单位。**用户同意之前,不要改物理模型、材料、边界条件或网格。** |

### 5. 交付

给用户的汇报要简短:
- 最终状态,以及尝试了几次、每次改了什么(各一行)。
- 关键结果表:报告值、参考值、误差。
- 文件位置:`final/report.md`、`final/contours/*.png`、`final/data/*.csv`、`final/residuals.csv`、`final/monitors.csv`、动画(如果有),以及最终 case/data 文件路径。
- 如实说明没有验证的部分,例如没有参考值、残差是按工程标准接受的、曲线图因为缺 matplotlib 没画。

## 规则

- **物理层面的改动必须先问用户**,包括湍流模型、材料、边界条件、网格、计算域和能量方程。数值层面的改动(欠松弛、Courant 数、离散格式、初始化、迭代数、残差标准)可以自动做,但要在汇报里写清楚。
- 绝不编造或修饰结果。没收敛就说没收敛,和参考值不符就说不符。
- 不删除用户的网格和 case 文件。所有输出都写在 `run_root`(默认是规格所在目录下的 `fa_runs/<name>/<时间戳>/`)。
- 用户路径和文件名必须是纯英文(`check` 会拦截),否则 Fluent 2022 R1 容易读写失败。
- 改了 `tui.py` 以后,在 `scripts/` 目录下跑一遍 `python -m unittest discover -s tests`,确认解析和流程逻辑没有被改坏。

## 文件

- `scripts/fa.py`:命令行入口
- `scripts/fluent_auto/`
  - `spec.py`:默认值和校验
  - `tui.py`:**所有 TUI 模板**和 journal 生成
  - `parser.py`:transcript 解析
  - `evaluate.py`:判定
  - `strategy.py`:自动调参阶梯
  - `launcher.py`:启动 Fluent
  - `report.py`:报告、CSV、曲线图、动画
- `scripts/tests/`:用模拟的 Fluent(`mock_fluent.py`)做端到端测试
- `reference/spec-reference.md`:规格字段说明
- `reference/debug-playbook.md`:症状、原因和处理方式(自动处理还是问用户)
- `reference/tui-notes.md`:TUI 命令的验证状态、标定方法和标定记录
- `templates/example_spec.json`:示例规格
