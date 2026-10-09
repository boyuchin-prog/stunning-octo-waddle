# fluent-auto 使用教程

把 ANSYS Fluent 2022 R1(Windows 桌面版)的计算流程自动化:读网格/case → 设置 → 求解 → 判断收敛 → 自动调参重跑 → 与参考值比对 → 导出数据、云图和动画 → 生成报告。

有两种用法:
- **和 Claude 对话**(推荐):你用中文描述需求,Claude 帮你写规格、运行、调试、汇报。
- **直接用命令行**:不经过 Claude,自己写规格,自己运行。

---

## 一、准备(只做一次)

1. **Fluent 2022 R1**:确认安装位置。默认是 `C:\Program Files\ANSYS Inc\v221\fluent\ntbin\win64\fluent.exe`。
2. **Python 3.8 或更高版本**:在 PowerShell 里执行 `python --version` 检查。安装时勾选 "Add to PATH"。
3. **可选组件**(用来画残差曲线和合成动画):
   ```powershell
   pip install matplotlib pillow
   ```
   想要 mp4 格式的动画,还需要安装 ffmpeg 并加入 PATH;没有 ffmpeg 时会生成 gif。
4. **Claude Code**:用对话方式时需要。安装方法见 https://code.claude.com/docs ,例如:
   ```powershell
   npm install -g @anthropic-ai/claude-code
   ```
5. **获取这个 skill**:
   ```powershell
   git clone https://github.com/boyuchin-prog/stunning-octo-waddle.git
   cd stunning-octo-waddle
   git checkout claude/practical-euler-6b4cbc   # 合并到 main 之前在这个分支上
   ```
6. **安装成全局 skill**(推荐,这样在任何文件夹里都能用):
   ```powershell
   mkdir $env:USERPROFILE\.claude\skills -Force
   Copy-Item -Recurse .claude\skills\fluent-auto $env:USERPROFILE\.claude\skills\
   ```
   如果不复制,也可以在 `stunning-octo-waddle` 文件夹里启动 Claude Code,skill 同样会被加载。

> ⚠️ 算例文件夹和文件名都要用**纯英文**,例如 `D:\cfd\elbow\elbow.msh.h5`。Fluent 2022 R1 遇到中文路径经常读写失败,脚本也会拦截中文路径。

---

## 二、首次标定(只做一次,非常重要)

不同安装、不同版本的 Fluent,命令行(TUI)的提示顺序可能略有差别。这个 skill 里有一部分命令还没有在真实的 2022 R1 上验证过。
第一次使用时,先用一个小算例试跑一次,把有问题的命令修正过来。

**用 Claude 做(推荐)**:在算例文件夹里启动 Claude Code,然后说:

> 用 fluent-auto 帮我做首次标定。网格是 D:\cfd\test\pipe.msh.h5,入口 inlet 速度 1 m/s,出口 outlet 表压 0,流体是空气,k-omega SST。

Claude 会用 20 步的短算例跑一遍。如果报错,它会读 transcript、修正命令模板,再重跑,直到所有命令都能通过。

**手动做**:参见 `reference/tui-notes.md` 中的"标定方法"。

---

## 三、日常使用:和 Claude 对话

1. 打开 PowerShell,进入算例文件夹,启动 Claude Code:
   ```powershell
   cd D:\cfd\elbow
   claude
   ```
2. 用中文描述需求,例如:

   > 用 fluent-auto 跑这个弯管:网格 elbow.msh.h5,单位是 mm。流体是 20°C 的水,入口 inlet 速度 0.4 m/s,湍流强度 5%,出口 outlet 表压 0,k-omega SST。
   > 我关心入口平均压力(压降)和出口质量流量。实验测得压降约 120 Pa,误差 10% 以内算对。
   > 导出 z=0 截面的速度云图和压力云图、出口截面的压力和速度数据,再做一个速度云图随迭代变化的动画。

3. Claude 会依次:
   - 运行 `inspect` 读取网格,把 zone 名称和计算域尺寸给你确认,比如单位是不是 mm;
   - 写出规格文件 `elbow.json`,把不确定的物理参数拿来问你;
   - 后台启动计算,定期汇报进度;
   - 发散或不收敛时自动调整数值设置重算,每次改了什么都会告诉你;
   - 算完后汇报结果表、参考值对比,以及云图、数据和报告的位置。
4. 遇到需要改**物理设置**的情况,例如加密网格、换湍流模型、延长出口,Claude 会先问你,不会擅自改。

计算期间你可以随时问"现在算到哪了?",Claude 会运行 `status` 查看进度。

---

## 四、直接用命令行(不经过 Claude)

把 `<skill>` 换成 skill 所在路径,例如 `$env:USERPROFILE\.claude\skills\fluent-auto`:

```powershell
# 1. 写出示例规格并修改
python <skill>\scripts\fa.py example D:\cfd\elbow\elbow.json
notepad D:\cfd\elbow\elbow.json

# 2. 校验规格
python <skill>\scripts\fa.py check D:\cfd\elbow\elbow.json

# 3. 查看网格的 zone 名称、质量和尺寸(会启动一次 Fluent)
python <skill>\scripts\fa.py inspect D:\cfd\elbow\elbow.json

# 4. (可选)只生成 journal 看看
python <skill>\scripts\fa.py gen D:\cfd\elbow\elbow.json -o preview.jou

# 5. 全流程运行
python <skill>\scripts\fa.py run D:\cfd\elbow\elbow.json

# 6. 另开一个窗口查看进度
python <skill>\scripts\fa.py status D:\cfd\elbow\elbow.json
```

规格文件每个字段的含义见 `reference/spec-reference.md`。

---

## 五、输出在哪里

```
D:\cfd\elbow\fa_runs\elbow\20261009-153000\
├─ spec.json                 本次使用的规格(备份)
├─ progress.json             进度
├─ attempt_01\               第 1 次尝试
│   ├─ run.jou               生成的 journal
│   ├─ transcript.trn        Fluent 完整输出
│   ├─ launcher.log          启动命令和控制台输出
│   ├─ attempt.json          解析结果和判定
│   └─ result.cas.h5 / .dat.h5
├─ attempt_02\ ...
└─ final\                    ← 看这里
    ├─ report.md             报告:尝试记录、残差、监视量、守恒、参考值对比
    ├─ summary.json          机器可读的摘要
    ├─ contours\*.png        云图
    ├─ data\*.csv            导出的面数据
    ├─ residuals.csv / residuals.png
    ├─ monitors.csv  / monitors.png
    └─ animation.mp4 / .gif  迭代动画(开启时生成)
```

最终的 case/data 文件就是最后一次尝试目录里的 `result.cas.h5`,可以直接用 Fluent GUI 打开继续后处理。

---

## 六、自动调试做了什么

| 情况 | 自动处理 |
|---|---|
| 发散 | 分三级逐步保守:① 欠松弛/Courant 数降到 0.7 倍,一阶预热加倍;② 改用 SIMPLE + 保守欠松弛;③ 全程一阶 + 换一种初始化,收敛后再切回二阶 |
| 残差还在下降 | 从上次结果续算 |
| 残差停滞或振荡 | 小幅降低欠松弛后续算;残差停在 1e-3 以下、监视量稳定且守恒时,按工程收敛接受 |
| 与参考值不符 | 确认二阶格式,把残差收紧到 1e-5 续算;仍然不符就停下来,带着诊断建议问你 |
| 命令错误 | 停止并报告出错的那一行(Claude 会自动修正命令模板) |

物理模型、材料、边界条件和网格**不会**被自动修改。

---

## 七、常见问题

- **找不到 fluent.exe**:在规格里写 `"fluent": {"exe": "C:/Program Files/ANSYS Inc/v221/fluent/ntbin/win64/fluent.exe"}`。
- **云图是空的或者没有生成**:`fluent.ui_mode` 必须是 `hidden`。另外检查截面是否真的切到了计算域,`inspect` 会显示计算域尺寸。
- **计算一开始就发散**:最常见的原因是网格单位错(mm 被当成 m)。看 `inspect` 显示的尺寸,需要时设 `input.scale: 0.001`。
- **用已经设好的 case**:`input.file` 指向 .cas.h5 即可。默认沿用 case 里的物理设置,只控制数值设置、求解和导出。
- **验证脚本逻辑**(不需要 Fluent):在 `scripts\` 目录下运行 `python -m unittest discover -s tests`。
