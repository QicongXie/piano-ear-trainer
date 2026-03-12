#!/bin/bash
# 视唱练耳训练工具 - 启动脚本

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认参数
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-7860}"
DEBUG="${DEBUG:-false}"

# 音频格式: mp3 或 wav（wav音质更好但文件更大）
AUDIO_FORMAT="${AUDIO_FORMAT:-mp3}"
# 力度层: 可选 pp p mp mf f ff，空格分隔，默认全部
# 若只需单力度（节省空间）: VELOCITY_LAYERS="mp"
VELOCITY_LAYERS="${VELOCITY_LAYERS:-pp p mp mf f ff}"

# 杀死之前占用端口的进程
if lsof -i :${PORT} -t >/dev/null 2>&1; then
    echo "⚠️  端口 ${PORT} 被占用，正在终止旧进程..."
    lsof -i :${PORT} -t | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ 旧进程已终止"
fi

# 检查 Python 依赖
echo "🔍 检查依赖..."
pip install flask -q 2>/dev/null

# 检查采样文件是否已准备（通过检查基础力度 mp 的文件来判断）
SAMPLES_DIR="${SCRIPT_DIR}/static/samples"
NEED_PREPARE=false
if [ ! -d "$SAMPLES_DIR" ] || [ -z "$(ls -A $SAMPLES_DIR 2>/dev/null)" ]; then
    NEED_PREPARE=true
fi

# 检查是否需要准备多力度采样
for layer in $VELOCITY_LAYERS; do
    if [ "$layer" != "single" ] && ! ls "$SAMPLES_DIR"/*_${layer}.${AUDIO_FORMAT} >/dev/null 2>&1; then
        NEED_PREPARE=true
        break
    fi
done

if [ "$NEED_PREPARE" = "true" ]; then
    echo "🎹 正在准备钢琴采样（格式: ${AUDIO_FORMAT}, 力度层: ${VELOCITY_LAYERS}）..."
    python "${SCRIPT_DIR}/prepare_samples.py" \
        --source-dir "${SCRIPT_DIR}/SalamanderGrandPianoV3_48khz24bit/48khz24bit" \
        --output-dir "$SAMPLES_DIR" \
        --format "$AUDIO_FORMAT" \
        --layers $VELOCITY_LAYERS
    echo ""
fi

# 构建启动参数
ARGS="--host $HOST --port $PORT --audio-format $AUDIO_FORMAT"

# 传递可用的力度层列表
ARGS="$ARGS --velocity-layers $VELOCITY_LAYERS"

if [ "$DEBUG" = "true" ]; then
    ARGS="$ARGS --debug"
fi

LOG_FILE="${SCRIPT_DIR}/app.log"

echo "============================================"
echo "  🎹 视唱练耳训练工具"
echo "  📡 地址: http://${HOST}:${PORT}"
echo "  🔧 调试: ${DEBUG}"
echo "  🎵 格式: ${AUDIO_FORMAT}"
echo "  🔊 力度层: ${VELOCITY_LAYERS}"
echo "  📝 日志: ${LOG_FILE}"
echo "============================================"
echo ""

# 使用 nohup 后台启动应用
nohup python "${SCRIPT_DIR}/app.py" $ARGS > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo "✅ 应用已在后台启动，PID: ${APP_PID}"
echo "📝 查看日志: tail -f ${LOG_FILE}"
echo "🛑 停止服务: kill ${APP_PID}"
