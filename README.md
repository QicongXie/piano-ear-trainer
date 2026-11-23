# 🎹 钢琴音感与音准训练器（Piano Ear & Intonation Trainer）

<p align="center">
  <b>简体中文</b> ·
  <a href="README.en.md">English</a>
</p>

基于 Web 的钢琴听觉训练工具，使用 Salamander Grand Piano 真实钢琴采样。除了常规的**单音听辨**，还专门加入了**音准（intonation）训练**——训练你辨别与调准落在钢琴琴键「缝隙」之间的微分音（microtone），特别适合小提琴、二胡等无品/连续音高乐器的音准打磨。

## 🌐 在线体验

无需安装，打开即用（GitHub Pages 静态版）：

**👉 https://qicongxie.github.io/piano-ear-trainer/**

## 📸 界面预览

以下为原版界面截图；当前版的模式入口和横屏琴键以正文说明为准。

| 音感训练 | 音准训练（调准练习） |
|:---:|:---:|
| <img src="docs/screenshot-main.png" width="420" alt="音感训练"> | <img src="docs/screenshot-pitch.png" width="420" alt="音准训练（调准练习）"> |

## ✨ 功能总览

主栏保留音感训练和自由弹奏；偏差方向、调准练习、听音接龙和音程挑战都从「练耳小游戏」直接进入。工具配套统计、进步曲线、记录导出/导入与移动端适配。

偏差方向与调准练习分别统计正确率、连对和总题数，可独立重置。旧版合并题数只归档，不分摊到任一练习；能明确归属的旧曲线和最佳成绩仍留在各自练习中。

首页的低音、高音同时约束所有练习与小游戏。音域太窄时，有的练习会请你放宽范围，而不是播放越界音；自由弹奏保留全部琴键。

### 🎶 听音接龙

从「练耳小游戏」菜单打开。先听一串钢琴音，再用五个音键按顺序复现。每通过一轮，旋律多一个音，从 3 音挑战到 8 音。音域较窄时，可用音键会随之减少。可以不限次数重听，最高过关轮数保存在当前浏览器，不影响其他训练的成绩。

### 🎼 音程挑战

每轮五题。每题听两个钢琴音，猜它们相隔多远；前三题上行，后两题还可能下行。每题可以重听，答完会显示音名、半音数和辨别提示。

### 🎵 音感训练（单音听辨）

- **自定义音域**：在 A0–C8 之间任意设定低音/高音边界。
- **多种参考模式**：无参考（纯听音）、完整半音阶、自然音阶、上下文窗口、仅主音、标准 A（A4=440Hz）、音程参考。
- **提示方式**：高低方向 / 音程距离 / 不提示；答错时在错键上直观标注方向与距离。
- **力度控制**：固定或随机力度，共 6 层（pp / p / mp / mf / f / ff）。
- **智能出题**：薄弱音优先——按每个音的历史错误率加权出题，哪儿弱练哪儿。
- **实时统计**：正确、错误、总题数、连对（含历史最高）、正确率。
- **进步曲线**：累计正确率随练习变化的折线图。

### 🎯 音准训练（微分音 / “缝里的音”）—— 核心特色

以精确的音分（cent，1 个半音 = 100 音分）偏移真实钢琴采样，训练超越平均律的听觉精度。含两个子模式：

- **偏差方向**：先后播放基准音与目标音，判断目标「偏高 / 偏低」。
  - 自适应阶梯：起始 50 音分，答对时**快速下探**，首次答错后转入**精细搜索**逼近你的听辨极限。
  - 难度可达 **2 音分**（远超常人极限）；**5 音分以下的进阶档需要更多连对才能解锁**（3 / 4 / 5 次）。
- **调准练习**：同时/先后播放基准音与一个走音的目标音，拖动滑块把目标音「调准」到与基准合一。
  - 按 **残差**（音分）评分，达标线 ≤ 5 音分；「准点」位置每题随机隐藏，杜绝视觉作弊。
  - 独立试听：重听基准音 / 试听调整音 / 两音同时听（听拍频与和谐度）。
- **薄弱音区加权出题**（可选，默认开）：按各音区历史表现（错误率 / 平均残差）加权，重点强化难练的音区。
- **成绩曲线**：听辨阈值曲线 / 调准残差曲线，数值越低越好，并标注历史最佳。

### 🎹 自由弹奏

虚拟 88 键钢琴，支持鼠标、触屏和电脑键盘。电脑键盘直接覆盖连续 34 个半音（默认 C4–A6），不用切换就能跨八度弹和弦。用 `[` / `]` 或页面上的箭头整体移动音域；鼠标和触屏仍可弹全部 88 键。

手机上先打开「自由弹奏」，再转到横屏。支持触控的手机在较矮的横屏下会自动放大琴键；竖屏也可点「放大琴键」。放大后可横滑琴键，或点箭头每次移动一个八度；这只移动画面，不会改变键盘映射的音高。点「退出」返回普通视图，保持当前横屏方向时不会再次自动放大。

### 🧰 通用能力

- **真实钢琴音色**：基于 Salamander Grand Piano V3 高品质采样，按力度分层、按需懒加载。
- **记录持久化 + 导出/导入**：设置、练习统计、薄弱音分布、进步曲线和听音接龙最佳轮数自动存于浏览器，可用 JSON 备份迁移到另一台电脑。导入不含轮数的旧备份会保留现有接龙纪录。
- **移动端适配**：响应式布局，手机上同样可用（钢琴可横向滑动查看）。
- **键盘快捷键**：音感和音准模式用 `A` 出题，其余模式见下表。

## ⌨️ 键盘快捷键

| 模式 | 按键 |
|---|---|
| 音感训练 | `A` 出题 · `S` 重听 · `D` 播放参考 · `F` 显示答案 |
| 音准 · 偏差方向 | `A` 出题 · `S` 重听 · `D` 偏高 · `F` 偏低 |
| 音准 · 调准练习 | `A` 出题 · `S` 调低 · `D` 调高 · `F` 确认 · `Z` 重听基准音 · `X` 试听调整音 · `C` 两音同时听 |
| 自由弹奏 | 低区白键 `Z X C V B N M , . /`、黑键 `S D G H J L ;`；高区白键 `Q W E R T Y U I O P`、黑键 `2 3 4 6 7 9 0`；`[` / `]` 平移音域 |
| 听音接龙 | `1`–`5` 弹对应音键 |
| 音程挑战 | `1`–`4` 选择答案 |

## 🚀 本地部署

### 本地预览 GitHub Pages 版

在仓库根目录运行以下命令，然后打开 [http://127.0.0.1:7860/](http://127.0.0.1:7860/)：

```bash
python3 -m http.server 7860 --bind 127.0.0.1 --directory docs
```

GitHub Pages 使用的就是 `docs/` 里这套前端和 MP3 采样，不需要 Flask 或转换音频。在线版和本地预览分别保存于各自的浏览器站点；切换地址、端口、浏览器或设备时，请用 JSON 导出／导入搬迁记录。

### Flask 本地版

需要自定义采样或启动参数时，再使用 Flask 版：

#### 依赖要求

- **Python 3.6+**
- **Flask**：Web 服务框架
- **ffmpeg**：音频格式转换
- **Git LFS**：管理大型采样资源文件

```bash
# Ubuntu / Debian
sudo apt install ffmpeg git-lfs
# macOS
brew install ffmpeg git-lfs
# 初始化 Git LFS（仅首次）
git lfs install
```

#### 快速开始

```bash
# 1. 克隆仓库
git clone git@github.com:QicongXie/piano-ear-trainer.git
cd piano-ear-trainer

# 2. 一键整备（拉取 LFS 采样 → 解压 → 装依赖 → 预处理音频）
bash setup.sh

# 3. 启动服务
bash run.sh
```

服务默认在后台运行。本机浏览器打开 [http://127.0.0.1:7860/](http://127.0.0.1:7860/)；若只供本机访问，可用 `HOST=127.0.0.1 bash run.sh` 启动。

### 配置项（环境变量）

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `7860` | 监听端口 |
| `DEBUG` | `false` | 调试模式 |
| `AUDIO_FORMAT` | `mp3` | 音频格式（mp3 / wav） |
| `VELOCITY_LAYERS` | `pp p mp mf f ff` | 力度层（空格分隔） |
| `DEFAULT_LOW_NOTE` | `C4` | 默认音域下界 |
| `DEFAULT_HIGH_NOTE` | `A6` | 默认音域上界 |

```bash
# 使用 wav 格式 + 自定义端口
AUDIO_FORMAT=wav PORT=8080 bash run.sh

# 仅使用单力度（节省磁盘空间）
VELOCITY_LAYERS="mf" bash setup.sh && bash run.sh
```

### 停止服务 / 查看日志

```bash
# 停止：把 PID 换成 run.sh 启动时显示的进程号
kill PID
# 日志
tail -f app.log
```

端口已占用时，启动脚本会退出，不会结束占用端口的进程。可尝试 `PORT=7861 bash run.sh`。

## 🛠️ 开发与静态部署

**前端只维护 `templates/index.html`**（Flask 模板版）。GitHub Pages / EdgeOne 使用的 `docs/index.html` 是它的**静态产物**，由 `build-docs.js` 自动生成（把配置占位符替换为写死值、把采样改为相对路径），**请勿手动编辑 `docs/index.html`**。

### 生成静态版

```bash
node build-docs.js   # 从 templates/index.html 生成 docs/index.html
```

### 自动同步（建议装一次 git hook）

装上 pre-commit hook 后，只要提交涉及 `templates/index.html`，会自动重新生成 `docs/index.html` 并加入本次提交，无需手动执行：

```bash
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

> 采样音频 `docs/samples/` 不由脚本管理，始终随仓库维护。

### 部署到 GitHub Pages

`docs/` 已包含生成的页面和采样。在仓库 **Settings → Pages → Deploy from a branch** 选择发布分支和 `/docs` 文件夹（原仓库使用 `main`）。无需额外构建；分支发布完成前，线上页面不会反映本地改动。

### 部署到 EdgeOne Pages

由于 `docs/index.html` 已入库为成品，可直接当静态站发布，无需构建环境：

1. EdgeOne 控制台 → **Pages → 导入 Git 仓库**，授权并选择本仓库；
2. 构建配置：**构建命令留空**、**输出目录（根目录）填 `docs`**、框架预设选 **无 / 静态**；
3. 部署完成后用默认域名访问，或绑定自有域名（国内自定义域名需备案）。

> 改动 `templates/index.html` 后务必先在本地生成并提交 `docs/index.html`（装了上面的 pre-commit hook 即自动完成），EdgeOne 会在下次推送后自动重新部署。

## 📁 项目结构

```
piano-ear-trainer/
├── app.py                  # Flask 后端主程序
├── prepare_samples.py      # 钢琴采样预处理脚本
├── build-docs.js           # 从 templates 生成 docs 静态版的构建脚本
├── run.sh                  # 服务启动脚本（nohup 后台运行）
├── setup.sh                # 一键整备脚本（LFS 拉取 + 解压 + 预处理）
├── scripts/
│   └── git-hooks/
│       └── pre-commit      # 提交时自动重建 docs/index.html 的 git hook
├── templates/
│   └── index.html          # 前端页面（本地 Flask 版，唯一需手改的前端源）
├── docs/                   # GitHub Pages / EdgeOne 静态版（含采样与截图）
│   ├── index.html          # [生成] 由 build-docs.js 从 templates 生成
│   ├── samples/            # 供静态站使用的音频采样
│   ├── screenshot-desktop-practice.png         # 练习与模式入口
│   └── screenshot-mobile-landscape-freeplay.png # 放大琴键
├── static/
│   └── samples/            # [生成] 本地版预处理后的音频采样
├── SalamanderGrandPianoV3+20161209_48khz24bit.tar  # [LFS] 原始采样包
├── README.md               # 中文说明（默认）
├── README.en.md            # 英文说明
├── .gitattributes          # Git LFS 配置
└── .gitignore
```

> 标注 `[LFS]` 的文件由 Git LFS 管理，标注 `[生成]` 的目录由脚本自动生成。

## 🎵 力度分层方案

原始 Salamander 采样包含 16 级力度（v1–v16），本工具映射为 6 个常用力度级别：

| 力度层 | 含义 | 原始力度范围 | 代表力度 |
|--------|------|------------|---------|
| pp | 极弱 (pianissimo) | v1–v3 | v2 |
| p | 弱 (piano) | v4–v6 | v5 |
| mp | 中弱 (mezzo-piano) | v7–v8 | v8 |
| mf | 中强 (mezzo-forte) | v9–v10 | v10 |
| f | 强 (forte) | v11–v13 | v12 |
| ff | 极强 (fortissimo) | v14–v16 | v15 |

## 🎼 采样来源

[Salamander Grand Piano V3](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) — Alexander Holm 录制的免费钢琴采样，48kHz / 24bit 品质。
