#!/bin/bash
# 视唱练耳训练工具 - 一键整备脚本
# 功能: 拉取 LFS 资源 -> 解压采样包 -> 预处理音频文件
# 运行完成后即可直接执行 bash run.sh 启动服务

set -e

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 可配置参数
AUDIO_FORMAT="${AUDIO_FORMAT:-mp3}"
VELOCITY_LAYERS="${VELOCITY_LAYERS:-pp p mp mf f ff}"
DURATION="${DURATION:-4.0}"

TAR_FILE="SalamanderGrandPianoV3+20161209_48khz24bit.tar"
EXTRACT_DIR="SalamanderGrandPianoV3_48khz24bit"
SOURCE_DIR="${EXTRACT_DIR}/48khz24bit"
SAMPLES_DIR="static/samples"

echo "============================================"
echo "  🎹 视唱练耳训练工具 - 一键整备"
echo "  🎵 音频格式: ${AUDIO_FORMAT}"
echo "  🔊 力度层: ${VELOCITY_LAYERS}"
echo "============================================"
echo ""

# ========== 步骤1: Git LFS 拉取 ==========
echo "📦 [1/4] 检查 Git LFS..."
if command -v git-lfs &>/dev/null || git lfs version &>/dev/null 2>&1; then
    echo "  ✅ Git LFS 已安装"
else
    echo "  ❌ 未安装 Git LFS，请先安装: https://git-lfs.com"
    exit 1
fi

if [ ! -f "$TAR_FILE" ] || [ "$(wc -c < "$TAR_FILE")" -lt 1000000 ]; then
    echo "  🔽 正在拉取 LFS 资源文件（约 1.83GB）..."
    git lfs pull
    echo "  ✅ LFS 资源拉取完成"
else
    echo "  ✅ 资源文件已存在，跳过 LFS 拉取"
fi

# ========== 步骤2: 解压 tar 包 ==========
echo ""
echo "📂 [2/4] 检查采样包解压..."
if [ -d "$SOURCE_DIR" ] && [ "$(ls -1 "$SOURCE_DIR"/*.wav 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "  ✅ 采样文件已解压，跳过"
else
    if [ ! -f "$TAR_FILE" ]; then
        echo "  ❌ 未找到采样包: $TAR_FILE"
        echo "     请确保已正确执行 git lfs pull"
        exit 1
    fi
    echo "  📦 正在解压采样包..."
    tar xf "$TAR_FILE"
    echo "  ✅ 解压完成"
fi

# ========== 步骤3: 检查依赖 ==========
echo ""
echo "🔍 [3/4] 检查依赖..."

# 检查 Python
if ! command -v python &>/dev/null; then
    echo "  ❌ 未找到 Python，请先安装 Python 3"
    exit 1
fi
echo "  ✅ Python: $(python --version 2>&1)"

# 检查 ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "  ❌ 未找到 ffmpeg，请先安装:"
    echo "     Ubuntu/Debian: sudo apt install ffmpeg"
    echo "     macOS: brew install ffmpeg"
    exit 1
fi
echo "  ✅ ffmpeg: $(ffmpeg -version 2>&1 | head -1)"

# 安装 Python 依赖
pip install flask -q 2>/dev/null
echo "  ✅ Flask 依赖已安装"

# ========== 步骤4: 预处理采样 ==========
echo ""
echo "🎵 [4/4] 预处理钢琴采样..."
NEED_PREPARE=false

if [ ! -d "$SAMPLES_DIR" ] || [ -z "$(ls -A "$SAMPLES_DIR" 2>/dev/null)" ]; then
    NEED_PREPARE=true
fi

# 检查各力度层文件是否齐全
for layer in $VELOCITY_LAYERS; do
    if ! ls "$SAMPLES_DIR"/*_${layer}.${AUDIO_FORMAT} >/dev/null 2>&1; then
        NEED_PREPARE=true
        break
    fi
done

if [ "$NEED_PREPARE" = "true" ]; then
    echo "  🔄 正在转换音频（格式: ${AUDIO_FORMAT}, 力度层: ${VELOCITY_LAYERS}）..."
    python prepare_samples.py \
        --source-dir "$SOURCE_DIR" \
        --output-dir "$SAMPLES_DIR" \
        --format "$AUDIO_FORMAT" \
        --duration "$DURATION" \
        --layers $VELOCITY_LAYERS
    echo ""
    echo "  ✅ 采样预处理完成"
else
    echo "  ✅ 采样文件已就绪，跳过预处理"
fi

echo ""
echo "============================================"
echo "  🎉 整备完成！"
echo ""
echo "  启动服务:"
echo "    bash run.sh"
echo ""
echo "  自定义启动:"
echo "    PORT=8080 bash run.sh"
echo "============================================"
