# 🎹 piano-ear-trainer

基于 Web 的视唱练耳训练工具，使用 Salamander Grand Piano 真实钢琴采样，支持单音听辨、自由弹奏等功能。

## 📸 界面预览

![界面截图](docs/screenshot-main.png)

## ✨ 功能特性

- **单音听辨训练**：随机播放钢琴音符，训练音高辨识能力
- **自由弹奏模式**：虚拟钢琴键盘，随意弹奏
- **多力度支持**：6 层力度级别（pp / p / mp / mf / f / ff），可配置随机力度
- **八度参考音**：多种参考音播放策略辅助辨音
- **真实钢琴音色**：基于 Salamander Grand Piano V3 高品质采样
- **多格式支持**：mp3（体积小）和 wav（音质好）
- **多用户支持**：支持多个浏览器同时访问

## 📋 依赖要求

- **Python 3.6+**
- **Flask**：Web 服务框架
- **ffmpeg**：音频格式转换
- **Git LFS**：管理大型采样资源文件

### 安装依赖

```bash
# Ubuntu / Debian
sudo apt install ffmpeg git-lfs

# macOS
brew install ffmpeg git-lfs

# 初始化 Git LFS（仅首次）
git lfs install
```

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:QicongXie/piano-ear-trainer.git
cd piano-ear-trainer
```

### 2. 一键整备

```bash
bash setup.sh
```

此脚本会自动完成：
1. 拉取 Git LFS 资源文件（Salamander 钢琴采样包，约 1.83GB）
2. 解压 tar 采样包
3. 检查并安装 Python 依赖
4. 预处理音频文件（转换为 mp3/wav 格式供网页使用）

### 3. 启动服务

```bash
bash run.sh
```

服务会在后台运行，默认访问地址：http://0.0.0.0:7860

## ⚙️ 配置项

通过环境变量自定义启动参数：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `7860` | 监听端口 |
| `DEBUG` | `false` | 调试模式 |
| `AUDIO_FORMAT` | `mp3` | 音频格式（mp3 / wav） |
| `VELOCITY_LAYERS` | `pp p mp mf f ff` | 力度层（空格分隔） |

### 示例

```bash
# 使用 wav 格式 + 自定义端口
AUDIO_FORMAT=wav PORT=8080 bash run.sh

# 仅使用单力度（节省磁盘空间）
VELOCITY_LAYERS="mf" bash setup.sh && bash run.sh

# 使用全部力度 + wav 高品质模式
AUDIO_FORMAT=wav VELOCITY_LAYERS="pp p mp mf f ff" bash setup.sh
```

## 📁 项目结构

```
piano-ear-trainer/
├── app.py                  # Flask 后端主程序
├── prepare_samples.py      # 钢琴采样预处理脚本
├── run.sh                  # 服务启动脚本（nohup 后台运行）
├── setup.sh                # 一键整备脚本（LFS拉取+解压+预处理）
├── templates/
│   └── index.html          # 前端页面（钢琴键盘 + 训练逻辑）
├── static/
│   └── samples/            # [生成] 预处理后的音频采样文件
├── docs/
│   └── screenshot-main.png # 界面截图
├── SalamanderGrandPianoV3+20161209_48khz24bit.tar  # [LFS] 原始采样包
├── SalamanderGrandPianoV3_48khz24bit/              # [生成] 解压后的原始 WAV
├── .gitignore
├── .gitattributes          # Git LFS 配置
└── README.md
```

> 标注 `[LFS]` 的文件由 Git LFS 管理，标注 `[生成]` 的目录由脚本自动生成，不纳入版本控制。

## 🎵 力度分层方案

原始 Salamander 采样包含 16 级力度（v1-v16），本工具将其映射为 6 个常用力度级别：

| 力度层 | 含义 | 原始力度范围 | 代表力度 |
|--------|------|------------|---------|
| pp | 极弱 (pianissimo) | v1-v3 | v2 |
| p | 弱 (piano) | v4-v6 | v5 |
| mp | 中弱 (mezzo-piano) | v7-v8 | v8 |
| mf | 中强 (mezzo-forte) | v9-v10 | v10 |
| f | 强 (forte) | v11-v13 | v12 |
| ff | 极强 (fortissimo) | v14-v16 | v15 |

## 🛑 停止服务

```bash
# 方法1：启动时会提示 PID
kill <PID>

# 方法2：通过端口查找并终止
lsof -i :7860 -t | xargs kill -9
```

## 📝 查看日志

```bash
tail -f app.log
```

## 🎼 采样来源

[Salamander Grand Piano V3](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) - Alexander Holm 录制的免费钢琴采样，48kHz 24bit 品质。
